import { useCallback, useEffect, useState } from 'react'
import { Copy, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import '../parent/ParentPortal.css'
import './ParentManagementPage.css'

const getList = (response, label) => {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(`The server returned an invalid ${label} response.`)
  }
  return response.data
}

function ParentManagementPage() {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId

  const [parents, setParents] = useState([])
  const [learners, setLearners] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    learnerId: '',
    relationship: 'Parent',
  })

  const loadData = useCallback(async () => {
    if (!schoolId) throw new Error('No active school was found. Please sign in again.')

    const [parentResponse, learnerResponse] = await Promise.all([
      apiRequest(`/schools/${encodeURIComponent(schoolId)}/parents`),
      apiRequest(`/schools/${encodeURIComponent(schoolId)}/learners`),
    ])

    setParents(getList(parentResponse, 'parents'))
    setLearners(getList(learnerResponse, 'learners'))
  }, [schoolId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        await loadData()
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || 'Unable to load parent records.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [loadData])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      learnerId: '',
      relationship: 'Parent',
    })
    setFormError('')
    setShowForm(false)
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setFormError('')
    setSuccess('')
    setCreatedCredentials(null)
    setCopied(false)

    if (!schoolId) {
      setFormError('Your active school could not be identified. Please sign in again.')
      return
    }

    if (!form.learnerId) {
      setFormError('Please select the learner to link to this parent.')
      return
    }

    setSaving(true)

    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        learnerId: form.learnerId,
        relationship: form.relationship.trim(),
      }

      const response = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/parents`,
        { method: 'POST', body }
      )

      if (!response?.success || !response.data?.parent) {
        throw new Error('The server returned an invalid parent creation response.')
      }

      const { parent, accountCreated, tempPassword } = response.data

      if (accountCreated && tempPassword) {
        setCreatedCredentials({ parent, tempPassword })
        setSuccess(`Parent account created for ${parent.firstName} ${parent.lastName}.`)
      } else {
        setSuccess(`The learner was linked to the existing parent account (${parent.email}). No new password was issued.`)
      }

      await loadData()
      resetForm()
    } catch (requestError) {
      setFormError(requestError.message || 'Unable to create or link this parent.')
    } finally {
      setSaving(false)
    }
  }

  const refresh = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await loadData()
    } catch (requestError) {
      setError(requestError.message || 'Unable to refresh parent records.')
    } finally {
      setLoading(false)
    }
  }

  const copyCredentials = async () => {
    if (!createdCredentials) return

    const text = [
      `Chiedza parent account`,
      `Email: ${createdCredentials.parent.email}`,
      `Temporary password: ${createdCredentials.tempPassword}`,
      `Please sign in and change your password.`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
      setError('Clipboard access was blocked. You can select and copy the credentials manually.')
    }
  }

  return (
    <main className="content parent-management">
      <PageHeading
        eyebrow="School administration"
        title="Parents and guardians"
        description="Create parent accounts and link guardians to their learners."
      >
        <button
          type="button"
          className="learner-secondary-button"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
        <button
          type="button"
          className="learner-primary-button"
          onClick={() => {
            setShowForm((value) => !value)
            setFormError('')
          }}
        >
          <UserPlus size={16} />
          Add parent
        </button>
      </PageHeading>

      {error && <div className="parent-data-message error" role="alert">{error}</div>}
      {success && <div className="parent-data-message success" role="status">{success}</div>}

      {createdCredentials && (
        <section className="parent-credentials" aria-labelledby="parent-credentials-title">
          <div className="parent-credentials-heading">
            <ShieldCheck size={21} />
            <div>
              <h2 id="parent-credentials-title">Temporary login credentials</h2>
              <p>Share these credentials with the parent through a secure channel. They must change the password after signing in.</p>
            </div>
          </div>
          <div className="parent-credentials-details">
            <div>
              <span>Email address</span>
              <strong>{createdCredentials.parent.email}</strong>
            </div>
            <div>
              <span>Temporary password</span>
              <strong className="parent-temp-password">{createdCredentials.tempPassword}</strong>
            </div>
          </div>
          <div className="parent-credentials-actions">
            <button type="button" className="learner-primary-button" onClick={copyCredentials}>
              <Copy size={15} />
              {copied ? 'Copied' : 'Copy credentials'}
            </button>
            <button type="button" className="learner-secondary-button" onClick={() => setCreatedCredentials(null)}>
              Dismiss
            </button>
          </div>
        </section>
      )}

      {showForm && (
        <section className="learner-form-card" aria-labelledby="parent-form-title">
          <div className="parent-form-heading">
            <div>
              <p className="eyebrow">Parent account</p>
              <h2 id="parent-form-title">Add a parent or guardian</h2>
            </div>
          </div>

          <p className="parent-form-guidance">
            Use the parent's email address. If an existing parent account in this school uses that email, the selected learner will be linked to it.
          </p>

          <form onSubmit={handleCreate}>
            <div className="parent-form-grid">
              <FormField label="First name">
                <input name="firstName" value={form.firstName} onChange={updateField} required maxLength={60} />
              </FormField>
              <FormField label="Last name">
                <input name="lastName" value={form.lastName} onChange={updateField} required maxLength={60} />
              </FormField>
              <FormField label="Email address">
                <input name="email" type="email" value={form.email} onChange={updateField} required maxLength={254} />
              </FormField>
              <FormField label="Phone number (optional)">
                <input name="phone" type="tel" value={form.phone} onChange={updateField} maxLength={30} />
              </FormField>
              <FormField label="Learner">
                <select name="learnerId" value={form.learnerId} onChange={updateField} required>
                  <option value="">Select a learner</option>
                  {learners.map((learner) => (
                    <option key={learner.id} value={learner.id}>
                      {learner.firstName} {learner.lastName} — {learner.schoolClass?.name || 'No class'}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Relationship">
                <select name="relationship" value={form.relationship} onChange={updateField} required>
                  <option value="Parent">Parent</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
            </div>

            {formError && <p className="parent-form-error" role="alert">{formError}</p>}

            <div className="parent-form-actions">
              <button type="button" className="learner-secondary-button" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="learner-primary-button" disabled={saving || learners.length === 0}>
                <UserPlus size={16} />
                {saving ? 'Saving…' : 'Create / link parent'}
              </button>
            </div>
            {learners.length === 0 && (
              <p className="parent-form-guidance">Register at least one learner before adding a parent account.</p>
            )}
          </form>
        </section>
      )}

      <Panel
        eyebrow={`${parents.length} parent ${parents.length === 1 ? 'account' : 'accounts'}`}
        title="Registered parents and guardians"
      >
        {loading ? (
          <div className="parent-page-loading">Loading parent records…</div>
        ) : parents.length === 0 ? (
          <EmptyState
            title="No parents registered yet"
            description="Create a parent account and link it to a learner to get started."
            icon={Users}
          />
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr><th>Parent / guardian</th><th>Email</th><th>Phone</th><th>Linked learners</th></tr>
              </thead>
              <tbody>
                {parents.map((parent) => (
                  <tr key={parent.id}>
                    <td><strong>{parent.firstName} {parent.lastName}</strong></td>
                    <td>{parent.email}</td>
                    <td>{parent.phone || '—'}</td>
                    <td>
                      <div className="parent-linked-learners">
                        {(parent.children || []).map((child) => (
                          <span className="parent-record-tag" key={child.parentLinkId || child.id}>
                            {child.firstName} {child.lastName}
                            {child.schoolClass?.name ? ` · ${child.schoolClass.name}` : ''}
                            {child.relationship ? ` · ${child.relationship}` : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  )
}

export default ParentManagementPage
