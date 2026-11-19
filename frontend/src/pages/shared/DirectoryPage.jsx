import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Pencil,
  Power,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import './LearnerDirectory.css'
import { useAutoDismiss } from '../../hooks/useAutoDismiss'

const getList = (response, label) => {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(`The server returned an invalid ${label} response.`)
  }

  return response.data
}

const formatDate = (value) => {
  if (!value) return 'Not provided'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not provided'

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const toDateInput = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

function LearnerDirectory({ role }) {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId
  const isAdmin = role === 'admin'

  const [learners, setLearners] = useState([])
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  useAutoDismiss(success, setSuccess)

  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    admissionNumber: '',
    classId: '',
    dateOfBirth: '',
  })

  const [editingLearner, setEditingLearner] = useState(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    admissionNumber: '',
    classId: '',
    dateOfBirth: '',
  })
  const [editError, setEditError] = useState('')

  const loadDirectory = useCallback(async () => {
    if (!schoolId) {
      throw new Error('No active school was found. Please sign in again.')
    }

    const [learnerResponse, classResponse] = await Promise.all([
      apiRequest(`/schools/${encodeURIComponent(schoolId)}/learners`),
      apiRequest(`/schools/${encodeURIComponent(schoolId)}/classes`),
    ])

    setLearners(getList(learnerResponse, 'learners'))
    setClasses(getList(classResponse, 'classes'))
  }, [schoolId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        await loadDirectory()
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'Unable to load learner records.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [loadDirectory])

  const filteredLearners = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return learners

    return learners.filter((learner) => {
      const searchable = [
        learner.firstName,
        learner.lastName,
        learner.admissionNumber,
        learner.schoolClass?.name,
      ].filter(Boolean).join(' ')

      return searchable.toLowerCase().includes(term)
    })
  }, [learners, search])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const updateEditField = (event) => {
    const { name, value } = event.target
    setEditForm((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      admissionNumber: '',
      classId: '',
      dateOfBirth: '',
    })
    setFormError('')
    setShowForm(false)
  }

  const openEditForm = (learner) => {
    setShowForm(false)
    setFormError('')
    setSuccess('')
    setEditError('')
    setEditingLearner(learner)

    setEditForm({
      firstName: learner.firstName || '',
      lastName: learner.lastName || '',
      admissionNumber: learner.admissionNumber || '',
      classId: learner.classId || '',
      dateOfBirth: toDateInput(learner.dateOfBirth),
    })
  }

  const closeEditForm = () => {
    setEditingLearner(null)
    setEditError('')
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setFormError('')
    setSuccess('')

    if (!schoolId) {
      setFormError('Your school session could not be identified. Please sign in again.')
      return
    }

    if (!form.classId) {
      setFormError('Please select a class for this learner.')
      return
    }

    setSaving(true)

    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        admissionNumber: form.admissionNumber.trim(),
        classId: form.classId,
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
      }

      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/learners`,
        {
          method: 'POST',
          body,
        }
      )

      await loadDirectory()
      setSuccess(`${body.firstName} ${body.lastName} was registered successfully.`)
      resetForm()
    } catch (requestError) {
      setFormError(
        requestError.message || 'Unable to register this learner. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateLearner = async (event) => {
    event.preventDefault()
    setEditError('')
    setSuccess('')

    if (!schoolId || !editingLearner) {
      setEditError('The learner record could not be identified. Please refresh the page.')
      return
    }

    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setEditError('First name and last name are required.')
      return
    }

    setSaving(true)

    try {
      const body = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        dateOfBirth: editForm.dateOfBirth || null,
      }

      if (isAdmin) {
        if (!editForm.admissionNumber.trim()) {
          setEditError('Admission number is required.')
          setSaving(false)
          return
        }

        if (!editForm.classId) {
          setEditError('Please select a class for this learner.')
          setSaving(false)
          return
        }

        body.admissionNumber = editForm.admissionNumber.trim()
        body.classId = editForm.classId
      }

      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/learners/${encodeURIComponent(editingLearner.id)}`,
        {
          method: 'PATCH',
          body,
        }
      )

      const learnerName = `${body.firstName} ${body.lastName}`
      await loadDirectory()
      closeEditForm()
      setSuccess(`${learnerName}'s details were updated successfully.`)
    } catch (requestError) {
      setEditError(
        requestError.message || 'Unable to update this learner. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleToggleLearnerStatus = async (learner) => {
    if (!isAdmin || !schoolId || updatingStatusId) return

    const nextActive = !learner.isActive
    const learnerName = `${learner.firstName} ${learner.lastName}`

    const confirmationMessage = nextActive
      ? `Reactivate ${learnerName}? Their verified parent links will become visible in the parent portal again.`
      : `Deactivate ${learnerName}? Parent portal access will be hidden, pending invitations will be revoked, and existing attendance and assessment records will be retained.`

    if (!window.confirm(confirmationMessage)) return

    setUpdatingStatusId(learner.id)
    setError('')
    setSuccess('')

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/learners/${encodeURIComponent(learner.id)}`,
        {
          method: 'PATCH',
          body: { isActive: nextActive },
        }
      )

      await loadDirectory()
      setSuccess(
        nextActive
          ? `${learnerName} was reactivated. Their verified parent links are available again.`
          : `${learnerName} was deactivated. Their existing records were retained.`
      )
    } catch (requestError) {
      setError(requestError.message || 'Unable to update this learner status.')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const refresh = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await loadDirectory()
    } catch (requestError) {
      setError(requestError.message || 'Unable to refresh learner records.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="content learner-directory">
      <PageHeading
        eyebrow={isAdmin ? 'School administration' : 'Teaching workspace'}
        title="Learners"
        description={
          isAdmin
            ? 'Manage learner records and register new learners into your school.'
            : 'View and update learners in the classes assigned to you.'
        }
      >
        <div className="learner-heading-actions">
          <button
            type="button"
            className="learner-secondary-button"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'learner-spin' : ''} />
            Refresh
          </button>

          {isAdmin && (
            <button
              type="button"
              className="learner-primary-button"
              onClick={() => {
                closeEditForm()
                setFormError('')
                setSuccess('')
                setShowForm(true)
              }}
            >
              <Plus size={17} />
              Register learner
            </button>
          )}
        </div>
      </PageHeading>

      {error && (
        <div className="learner-message learner-message-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="learner-message learner-message-success" role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="learner-stat-row" aria-label="Learner totals">
        <article className="learner-stat-card">
          <span className="learner-stat-icon"><Users size={20} /></span>
          <div>
            <span className="learner-stat-label">Registered learners</span>
            <strong>{loading ? '—' : learners.length}</strong>
          </div>
        </article>

        <article className="learner-stat-card">
          <span className="learner-stat-icon"><GraduationCap size={20} /></span>
          <div>
            <span className="learner-stat-label">Classes available</span>
            <strong>{loading ? '—' : classes.length}</strong>
          </div>
        </article>
      </section>

      {editingLearner && (
        <section className="learner-form-card" aria-labelledby="learner-edit-title">
          <div className="learner-form-heading">
            <div>
              <p className="eyebrow">Learner record</p>
              <h3 id="learner-edit-title">Edit learner details</h3>
              <p>
                {isAdmin
                  ? 'Update the learner details and class assignment.'
                  : 'Update the learner name or date of birth.'}
              </p>
            </div>
            <button
              type="button"
              className="learner-close-button"
              onClick={closeEditForm}
              aria-label="Close edit form"
              disabled={saving}
            >
              <X size={19} />
            </button>
          </div>

          {editError && (
            <div className="learner-message learner-message-error" role="alert">
              <AlertCircle size={18} />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateLearner}>
            <div className="learner-form-grid">
              <FormField id="editFirstName" label="First name">
                <input
                  id="editFirstName"
                  name="firstName"
                  value={editForm.firstName}
                  onChange={updateEditField}
                  placeholder="Enter first name"
                  maxLength={60}
                  autoComplete="given-name"
                  required
                />
              </FormField>

              <FormField id="editLastName" label="Last name">
                <input
                  id="editLastName"
                  name="lastName"
                  value={editForm.lastName}
                  onChange={updateEditField}
                  placeholder="Enter last name"
                  maxLength={60}
                  autoComplete="family-name"
                  required
                />
              </FormField>

              <FormField id="editDateOfBirth" label="Date of birth" hint="Optional.">
                <input
                  id="editDateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={updateEditField}
                />
              </FormField>

              {isAdmin && (
                <>
                  <FormField id="editAdmissionNumber" label="Admission number">
                    <input
                      id="editAdmissionNumber"
                      name="admissionNumber"
                      value={editForm.admissionNumber}
                      onChange={updateEditField}
                      maxLength={40}
                      required
                    />
                  </FormField>

                  <FormField id="editClassId" label="Assigned class">
                    <select
                      id="editClassId"
                      name="classId"
                      value={editForm.classId}
                      onChange={updateEditField}
                      required
                    >
                      <option value="">Select a class</option>
                      {classes.map((schoolClass) => (
                        <option key={schoolClass.id} value={schoolClass.id}>
                          {schoolClass.name}
                          {schoolClass.academicYear ? ` · ${schoolClass.academicYear}` : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </>
              )}
            </div>

            <div className="learner-form-footer">
              <p>
                {isAdmin
                  ? 'Changes will be saved to the school learner record.'
                  : 'Your changes will be saved to this learner record.'}
              </p>
              <div>
                <button
                  type="button"
                  className="learner-secondary-button"
                  onClick={closeEditForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="learner-primary-button"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {showForm && isAdmin && (
        <section className="learner-form-card" aria-labelledby="learner-form-title">
          <div className="learner-form-heading">
            <div>
              <p className="eyebrow">New school record</p>
              <h3 id="learner-form-title">Register a learner</h3>
              <p>Enter the learner's details and assign them to a class.</p>
            </div>
            <button
              type="button"
              className="learner-close-button"
              onClick={resetForm}
              aria-label="Close registration form"
              disabled={saving}
            >
              <X size={19} />
            </button>
          </div>

          {formError && (
            <div className="learner-message learner-message-error" role="alert">
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="learner-form-grid">
              <FormField id="firstName" label="First name">
                <input
                  id="firstName"
                  name="firstName"
                  value={form.firstName}
                  onChange={updateField}
                  placeholder="Enter first name"
                  maxLength={60}
                  autoComplete="given-name"
                  required
                />
              </FormField>

              <FormField id="lastName" label="Last name">
                <input
                  id="lastName"
                  name="lastName"
                  value={form.lastName}
                  onChange={updateField}
                  placeholder="Enter last name"
                  maxLength={60}
                  autoComplete="family-name"
                  required
                />
              </FormField>

              <FormField
                id="admissionNumber"
                label="Admission number"
                hint="This number must be unique within the school."
              >
                <input
                  id="admissionNumber"
                  name="admissionNumber"
                  value={form.admissionNumber}
                  onChange={updateField}
                  placeholder="e.g. CH-2026-001"
                  maxLength={40}
                  required
                />
              </FormField>

              <FormField id="classId" label="Assign to class">
                <select
                  id="classId"
                  name="classId"
                  value={form.classId}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}
                      {schoolClass.academicYear ? ` · ${schoolClass.academicYear}` : ''}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <span className="field-hint">
                    No classes are available. Create a class before registering a learner.
                  </span>
                )}
              </FormField>

              <FormField
                id="dateOfBirth"
                label="Date of birth"
                hint="Optional."
              >
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={updateField}
                />
              </FormField>
            </div>

            <div className="learner-form-footer">
              <p>All records are saved to the school's learner database.</p>
              <div>
                <button
                  type="button"
                  className="learner-secondary-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="learner-primary-button"
                  disabled={saving || classes.length === 0}
                >
                  {saving ? 'Registering…' : 'Save learner'}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="learner-table-card">
        <div className="learner-table-heading">
          <div>
            <h3>Learner directory</h3>
            <p>
              {loading
                ? 'Loading school records…'
                : `${filteredLearners.length} of ${learners.length} learners`}
            </p>
          </div>

          <label className="learner-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, admission no. or class"
              aria-label="Search learners"
            />
          </label>
        </div>

        {loading ? (
          <div className="learner-loading">Loading learner records…</div>
        ) : filteredLearners.length === 0 ? (
          <EmptyState
            title={search ? 'No matching learners' : 'No learners registered yet'}
            description={
              search
                ? 'Try another name, admission number or class.'
                : isAdmin
                  ? 'Register the first learner to start building your school directory.'
                  : 'Learners will appear here when they are registered in your assigned classes.'
            }
            icon={Users}
          />
        ) : (
          <div className="learner-table-scroll">
            <table className="learner-table">
              <thead>
                <tr>
                  <th scope="col">Learner</th>
                  <th scope="col">Admission number</th>
                  <th scope="col">Class</th>
                  <th scope="col">Date of birth</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearners.map((learner) => (
                  <tr key={learner.id}>
                    <td>
                      <div className="learner-name-cell">
                        <span className="learner-avatar">
                          {`${learner.firstName?.[0] || ''}${learner.lastName?.[0] || ''}`.toUpperCase()}
                        </span>
                        <strong>{learner.firstName} {learner.lastName}</strong>
                      </div>
                    </td>
                    <td>{learner.admissionNumber}</td>
                    <td>{learner.schoolClass?.name || 'Unassigned'}</td>
                    <td>{formatDate(learner.dateOfBirth)}</td>
                    <td>
                      <span className={`learner-status ${learner.isActive ? 'is-active' : 'is-inactive'}`}>
                        {learner.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="learner-row-actions">
                        <button
                          type="button"
                          className="learner-edit-button"
                          onClick={() => openEditForm(learner)}
                          aria-label={`Edit ${learner.firstName} ${learner.lastName}`}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="learner-status-action"
                            onClick={() => handleToggleLearnerStatus(learner)}
                            disabled={updatingStatusId !== null}
                            aria-label={`${learner.isActive ? 'Deactivate' : 'Reactivate'} ${learner.firstName} ${learner.lastName}`}
                          >
                            {updatingStatusId === learner.id ? (
                              <RefreshCw size={14} className="learner-spin" />
                            ) : (
                              <Power size={14} />
                            )}
                            {learner.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default LearnerDirectory
