import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  Copy,
  CircleX,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import './TeacherManagementPage.css'
import { useAutoDismiss } from '../../hooks/useAutoDismiss'

const getList = (response, label) => {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(`The server returned an invalid ${label} response.`)
  }

  return response.data
}

const getTeacherName = (teacher) => {
  const user = teacher?.user || {}
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed teacher'
}

function TeacherManagementPage() {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId

  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  useAutoDismiss(success, setSuccess)
  const [showForm, setShowForm] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })

  const [assignment, setAssignment] = useState({
    membershipId: '',
    classId: '',
  })

  const loadData = useCallback(async () => {
    if (!schoolId) {
      throw new Error('No active school was found. Please sign in again.')
    }

    const encodedSchoolId = encodeURIComponent(schoolId)

    const [teacherResponse, classResponse] = await Promise.all([
      apiRequest(`/schools/${encodedSchoolId}/teachers`),
      apiRequest(`/schools/${encodedSchoolId}/classes`),
    ])

    setTeachers(getList(teacherResponse, 'teachers'))
    setClasses(getList(classResponse, 'classes'))
  }, [schoolId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        await loadData()
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'Unable to load teacher records.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [loadData])

  const refresh = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await loadData()
    } catch (requestError) {
      setError(requestError.message || 'Unable to refresh teacher records.')
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const updateAssignment = (event) => {
    const { name, value } = event.target
    setAssignment((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', email: '' })
    setFormError('')
    setShowForm(false)
  }

  const handleResetPassword = async (teacher) => {
    if (!teacher || !schoolId) return

    const confirmed = window.confirm(
      `Reset the password for ${getTeacherName(teacher)}?\n\nA new temporary password will be generated. Their current password will stop working.`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')
    setCredentials(null)

    try {
      const res = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/teachers/${encodeURIComponent(teacher.id)}/reset-password`,
        {
          method: 'POST',
          auth: true,
        }
      )

      if (!res.success || !res.data?.tempPassword) {
        throw new Error(res.message || 'The server did not return a temporary password.')
      }

      setCredentials({
        name: getTeacherName(teacher),
        email: teacher.user?.email || '',
        tempPassword: res.data.tempPassword,
      })
      setCopied(false)
      setSuccess(`A new temporary password was generated for ${getTeacherName(teacher)}.`)
    } catch (err) {
      setError(err.message || 'Failed to reset password.')
    }
  }

  const openResetPassword = (teacher) => {
    handleResetPassword(teacher)
  }

  const handleRemoveTeacher = async (teacherId) => {
    if (!teacherId || !schoolId || saving) return

    const confirmed = window.confirm(
      'Are you sure you want to remove this teacher from the school?\n\n' +
      'This removes the teacher from this school but does not delete their account. ' +
      'Historical attendance, assessment records, and other activity will be preserved.'
    )

    if (!confirmed) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/teachers/${encodeURIComponent(teacherId)}`,
        {
          method: 'DELETE',
          auth: true,
        }
      )

      setSuccess('Teacher removed from school successfully.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to remove teacher.')
    } finally {
      setSaving(false)
    }
  }

  const createTeacher = async (event) => {
    event.preventDefault()
    setFormError('')
    setError('')
    setSuccess('')
    setCredentials(null)
    setCopied(false)

    if (!schoolId) {
      setFormError('Your active school could not be identified. Please sign in again.')
      return
    }

    setSaving(true)

    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
      }

      const response = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/teachers`,
        { method: 'POST', body }
      )

      if (!response?.success || !response.data?.membership) {
        throw new Error('The server returned an invalid teacher creation response.')
      }

      const { membership, tempPassword, accountCreated } = response.data
      const teacherName = getTeacherName(membership)

      if (tempPassword) {
        setCredentials({
          name: teacherName,
          email: membership.user?.email || body.email,
          tempPassword,
        })
      }

      setSuccess(
        accountCreated
          ? `${teacherName} was added successfully. A new account was created with a temporary password.`
          : `${teacherName} was re-enrolled successfully. Their existing account and current password remain unchanged.`
      )
      await loadData()
      resetForm()
    } catch (requestError) {
      setFormError(requestError.message || 'Unable to create the teacher account.')
    } finally {
      setSaving(false)
    }
  }

  const assignTeacher = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!schoolId || !assignment.membershipId || !assignment.classId) {
      setError('Select both a teacher and a class before assigning.')
      return
    }

    setAssigning(true)

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(assignment.classId)}/teachers`,
        {
          method: 'POST',
          body: { membershipId: assignment.membershipId },
        }
      )

      const teacher = teachers.find((item) => item.id === assignment.membershipId)
      const schoolClass = classes.find((item) => item.id === assignment.classId)

      setSuccess(
        `${getTeacherName(teacher)} was assigned to ${schoolClass?.name || 'the selected class'}.`
      )
      setAssignment({ membershipId: '', classId: '' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message || 'Unable to assign this teacher to the class.')
    } finally {
      setAssigning(false)
    }
  }

  const removeAssignment = async (teacher, schoolClass) => {
    const confirmed = window.confirm(
      `Remove ${getTeacherName(teacher)} from ${schoolClass.name}?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(schoolClass.id)}/teachers/${encodeURIComponent(teacher.id)}`,
        { method: 'DELETE' }
      )

      setSuccess(`${getTeacherName(teacher)} was removed from ${schoolClass.name}.`)
      await loadData()
    } catch (requestError) {
      setError(requestError.message || 'Unable to remove this class assignment.')
    }
  }

  const copyCredentials = async () => {
    if (!credentials) return

    const text = [
      'Chiedza teacher account',
      `Name: ${credentials.name}`,
      `Email: ${credentials.email}`,
      `Temporary password: ${credentials.tempPassword}`,
      'Please sign in and change your password.',
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setError('Clipboard access was blocked. Select and copy the credentials manually.')
    }
  }

  return (
    <main className="content teacher-management">
      <PageHeading
        eyebrow="School administration"
        title="Teachers"
        description="Create teacher accounts and manage their class assignments."
      >
        <button
          type="button"
          className="learner-secondary-button"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'learner-spin' : ''} />
          Refresh
        </button>

        <button
          type="button"
          className="learner-primary-button"
          onClick={() => {
            setShowForm((current) => !current)
            setFormError('')
          }}
        >
          <UserPlus size={16} />
          Add teacher
        </button>
      </PageHeading>

      {error && <div className="teacher-notice error" role="alert">{error}</div>}
      {success && <div className="teacher-notice success" role="status">{success}</div>}

      {credentials && (
        <section className="teacher-credentials" aria-labelledby="teacher-credentials-title">
          <div className="teacher-credentials-heading">
            <ShieldCheck size={22} />
            <div>
              <h2 id="teacher-credentials-title">Temporary login credentials</h2>
              <p>
                Share these credentials securely with the teacher. They must change
                the password after their first sign-in.
              </p>
            </div>
            <button
              type="button"
              className="teacher-icon-button"
              onClick={() => setCredentials(null)}
              aria-label="Dismiss credentials"
            >
              <X size={18} />
            </button>
          </div>

          <div className="teacher-credentials-details">
            <div>
              <span>Teacher</span>
              <strong>{credentials.name}</strong>
            </div>
            <div>
              <span>Email address</span>
              <strong>{credentials.email}</strong>
            </div>
            <div>
              <span>Temporary password</span>
              <strong className="teacher-temp-password">{credentials.tempPassword}</strong>
            </div>
          </div>

          <button
            type="button"
            className="learner-primary-button"
            onClick={copyCredentials}
          >
            <Copy size={15} />
            {copied ? 'Copied' : 'Copy credentials'}
          </button>
        </section>
      )}

      {showForm && (
        <section className="teacher-form-card" aria-labelledby="teacher-form-title">
          <div className="teacher-section-heading">
            <div>
              <p className="eyebrow">Teacher account</p>
              <h2 id="teacher-form-title">Add or re-enrol a teacher</h2>
            </div>
          </div>

          <p className="teacher-guidance">
            Enter the teacher's details. Chiedza creates a new account with a
            temporary password, or re-enrols an existing teacher account without
            changing their current password.
          </p>

          <form onSubmit={createTeacher}>
            <div className="teacher-form-grid">
              <FormField label="First name">
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={updateForm}
                  required
                  maxLength={60}
                  autoComplete="given-name"
                />
              </FormField>

              <FormField label="Last name">
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={updateForm}
                  required
                  maxLength={60}
                  autoComplete="family-name"
                />
              </FormField>

              <FormField label="Email address">
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateForm}
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </FormField>
            </div>

            {formError && <div className="teacher-notice error" role="alert">{formError}</div>}

            <div className="teacher-form-actions">
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
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Add or re-enrol teacher'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="teacher-assignment-card">
        <div className="teacher-section-heading">
          <div>
            <p className="eyebrow">Class allocation</p>
            <h2>Assign a teacher to a class</h2>
          </div>
          <BookOpen size={22} />
        </div>

        <form className="teacher-assignment-form" onSubmit={assignTeacher}>
          <FormField label="Teacher">
            <select
              name="membershipId"
              value={assignment.membershipId}
              onChange={updateAssignment}
              required
            >
              <option value="">Select a teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {getTeacherName(teacher)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Class">
            <select
              name="classId"
              value={assignment.classId}
              onChange={updateAssignment}
              required
            >
              <option value="">Select a class</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name} — {schoolClass.academicYear}
                </option>
              ))}
            </select>
          </FormField>

          <button
            type="submit"
            className="learner-primary-button"
            disabled={assigning || teachers.length === 0 || classes.length === 0}
          >
            {assigning ? 'Assigning…' : 'Assign class'}
          </button>
        </form>

        {teachers.length === 0 && !loading && (
          <p className="teacher-inline-note">Create a teacher account before assigning classes.</p>
        )}

        {classes.length === 0 && !loading && (
          <p className="teacher-inline-note">Create a class before assigning a teacher.</p>
        )}
      </section>

      <section className="teacher-directory-card">
        <div className="teacher-directory-heading">
          <div>
            <h2>Teacher directory</h2>
            <p>
              {loading
                ? 'Loading school records…'
                : `${teachers.length} ${teachers.length === 1 ? 'teacher' : 'teachers'} registered`}
            </p>
          </div>
          <Users size={21} />
        </div>

        {loading ? (
          <div className="teacher-loading">Loading teacher records…</div>
        ) : teachers.length === 0 ? (
          <EmptyState
            title="No teachers registered yet"
            description="Create a teacher account to start assigning classes."
            icon={GraduationCap}
          />
        ) : (
          <div className="teacher-list">
            {teachers.map((teacher) => {
              const assignedClasses = teacher.classTeachers || []
              const user = teacher.user || {}

              return (
                <article className="teacher-card" key={teacher.id}>
                  <div className="teacher-card-main">
                    <span className="teacher-avatar">
                      {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}
                    </span>

                    <div className="teacher-card-identity">
                      <h3>{getTeacherName(teacher)}</h3>
                      <p>{user.email || 'No email address'}</p>
                      <span className={`teacher-account-status ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active account' : 'Inactive account'}
                      </span>
                    </div>
                  </div>

                  <div className="teacher-card-assignments">
                    <h4>Assigned classes</h4>

                    {assignedClasses.length === 0 ? (
                      <p className="teacher-unassigned">No classes assigned yet.</p>
                    ) : (
                      <div className="teacher-assignment-tags">
                        {assignedClasses.map((item) => {
                          const schoolClass = item.schoolClass
                          if (!schoolClass) return null

                          return (
                            <span className="teacher-assignment-tag" key={item.id}>
                              {schoolClass.name}
                              <button
                                type="button"
                                onClick={() => removeAssignment(teacher, schoolClass)}
                                aria-label={`Remove ${getTeacherName(teacher)} from ${schoolClass.name}`}
                                title="Remove assignment"
                              >
                                <X size={13} />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* Reset Password and Remove from School actions */}
                    {user.isActive && (
                      <div className="teacher-card-actions">
                        <button
                          type="button"
                          onClick={() => openResetPassword(teacher)}
                          className="teacher-action-button"
                        >
                          <RefreshCw size={16} /> Reset Password
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeacher(teacher.id)}
                          className="teacher-action-button teacher-action-button-danger"
                        >
                          <CircleX size={16} /> Remove from School
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

export default TeacherManagementPage
