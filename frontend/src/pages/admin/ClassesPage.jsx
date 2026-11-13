import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import '../shared/LearnerDirectory.css'

function ClassesPage() {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId

  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    academicYear: '2026',
    description: '',
  })

  const loadClasses = useCallback(async () => {
    if (!schoolId) {
      throw new Error('No active school was found. Please sign in again.')
    }

    const response = await apiRequest(
      `/schools/${encodeURIComponent(schoolId)}/classes`
    )

    if (!response?.success || !Array.isArray(response.data)) {
      throw new Error('The server returned an invalid classes response.')
    }

    setClasses(response.data)
  }, [schoolId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        await loadClasses()
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'Unable to load classes.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [loadClasses])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setForm({
      name: '',
      academicYear: '2026',
      description: '',
    })
    setFormError('')
    setShowForm(false)
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setFormError('')
    setSuccess('')

    if (!schoolId) {
      setFormError('Your school session could not be identified. Please sign in again.')
      return
    }

    const body = {
      name: form.name.trim(),
      academicYear: form.academicYear.trim(),
      ...(form.description.trim()
        ? { description: form.description.trim() }
        : {}),
    }

    if (!body.name || !body.academicYear) {
      setFormError('Enter a class name and academic year.')
      return
    }

    setSaving(true)

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/classes`,
        {
          method: 'POST',
          body,
        }
      )

      await loadClasses()
      setSuccess(`${body.name} was created successfully.`)
      resetForm()
    } catch (requestError) {
      setFormError(
        requestError.message || 'Unable to create this class. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const refresh = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await loadClasses()
    } catch (requestError) {
      setError(requestError.message || 'Unable to refresh classes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="content learner-directory">
      <PageHeading
        eyebrow="School administration"
        title="Classes"
        description="Create and manage the classes that organise your school's learners and teachers."
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

          <button
            type="button"
            className="learner-primary-button"
            onClick={() => {
              setFormError('')
              setSuccess('')
              setShowForm(true)
            }}
          >
            <Plus size={17} />
            Create class
          </button>
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
          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="learner-stat-row" aria-label="Class totals">
        <article className="learner-stat-card">
          <span className="learner-stat-icon">
            <GraduationCap size={20} />
          </span>
          <div>
            <span className="learner-stat-label">Total classes</span>
            <strong>{loading ? '—' : classes.length}</strong>
          </div>
        </article>

        <article className="learner-stat-card">
          <span className="learner-stat-icon">
            <BookOpen size={20} />
          </span>
          <div>
            <span className="learner-stat-label">Academic years</span>
            <strong>
              {loading
                ? '—'
                : new Set(classes.map((schoolClass) => schoolClass.academicYear)).size}
            </strong>
          </div>
        </article>
      </section>

      {showForm && (
        <section className="learner-form-card" aria-labelledby="class-form-title">
          <div className="learner-form-heading">
            <div>
              <p className="eyebrow">New school record</p>
              <h3 id="class-form-title">Create a class</h3>
              <p>Add a class before registering learners or assigning teachers.</p>
            </div>

            <button
              type="button"
              className="learner-close-button"
              onClick={resetForm}
              aria-label="Close class form"
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

          <form onSubmit={handleCreate}>
            <div className="learner-form-grid">
              <FormField
                id="className"
                label="Class name"
                hint="For example, ECD A, ECD B or Grade 1."
              >
                <input
                  id="className"
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="Enter class name"
                  maxLength={80}
                  required
                />
              </FormField>

              <FormField
                id="academicYear"
                label="Academic year"
                hint="Enter the year this class belongs to."
              >
                <input
                  id="academicYear"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={updateField}
                  placeholder="e.g. 2026"
                  maxLength={20}
                  required
                />
              </FormField>

              <FormField
                id="classDescription"
                label="Description"
                hint="Optional. Maximum 200 characters."
              >
                <input
                  id="classDescription"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Brief class description"
                  maxLength={200}
                />
              </FormField>
            </div>

            <div className="learner-form-footer">
              <p>The class will be saved to your school's records.</p>
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
                  disabled={saving}
                >
                  {saving ? 'Creating…' : 'Save class'}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="learner-table-card">
        <div className="learner-table-heading">
          <div>
            <h3>Class directory</h3>
            <p>
              {loading
                ? 'Loading school records…'
                : `${classes.length} ${classes.length === 1 ? 'class' : 'classes'} registered`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="learner-loading">Loading class records…</div>
        ) : classes.length === 0 ? (
          <EmptyState
            title="No classes created yet"
            description="Create your first class to start registering learners and assigning teachers."
            icon={BookOpen}
          />
        ) : (
          <div className="learner-table-scroll">
            <table className="learner-table">
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Academic year</th>
                  <th scope="col">Description</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((schoolClass) => (
                  <tr key={schoolClass.id}>
                    <td><strong>{schoolClass.name}</strong></td>
                    <td>{schoolClass.academicYear}</td>
                    <td>{schoolClass.description || '—'}</td>
                    <td>
                      {schoolClass.createdAt
                        ? new Intl.DateTimeFormat('en', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }).format(new Date(schoolClass.createdAt))
                        : '—'}
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

export default ClassesPage
