import { useCallback, useEffect, useState } from 'react'
import {
  Copy,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  Mail,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import '../parent/ParentPortal.css'
import './ParentManagementPage.css'
import { useAutoDismiss } from '../../hooks/useAutoDismiss'

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
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [revokingId, setRevokingId] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [invitationError, setInvitationError] = useState('')
  const [success, setSuccess] = useState('')
  useAutoDismiss(success, setSuccess)

  const [showForm, setShowForm] = useState(false)
  const [showInvitationForm, setShowInvitationForm] = useState(false)
  const [newInvitation, setNewInvitation] = useState(null)
  const [invitationCopied, setInvitationCopied] = useState(false)

  const [form, setForm] = useState({
    email: '',
    learnerId: '',
    relationship: 'Parent',
  })

  const [invitationForm, setInvitationForm] = useState({
    email: '',
    learnerId: '',
  })

  const loadData = useCallback(async () => {
    if (!schoolId) {
      throw new Error('No active school was found. Please sign in again.')
    }

    const encodedSchoolId = encodeURIComponent(schoolId)

    const [parentResponse, learnerResponse, invitationResponse] =
      await Promise.all([
        apiRequest(`/schools/${encodedSchoolId}/parents`),
        apiRequest(`/schools/${encodedSchoolId}/learners`),
        apiRequest(`/schools/${encodedSchoolId}/parent-invitations`),
      ])

    setParents(getList(parentResponse, 'parents'))
    setLearners(getList(learnerResponse, 'learners'))
    setInvitations(getList(invitationResponse, 'parent invitations'))
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
          setError(requestError.message || 'Unable to load parent records.')
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

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const updateInvitationField = (event) => {
    const { name, value } = event.target
    setInvitationForm((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setForm({
      email: '',
      learnerId: '',
      relationship: 'Parent',
    })
    setFormError('')
    setShowForm(false)
  }

  const resetInvitationForm = () => {
    setInvitationForm({ email: '', learnerId: '' })
    setInvitationError('')
    setShowInvitationForm(false)
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setFormError('')
    setSuccess('')

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
        email: form.email.trim(),
        learnerId: form.learnerId,
        relationship: form.relationship.trim(),
      }

      const response = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/parents`,
        { method: 'POST', body }
      )

      if (!response?.success || !response.data?.parent) {
        throw new Error('The server returned an invalid parent linking response.')
      }

      setSuccess(
        `The learner was linked to the existing parent account (${response.data.parent.email}).`
      )

      await loadData()
      resetForm()
    } catch (requestError) {
      setFormError(
        requestError.message || 'Unable to link this parent to the learner.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCreateInvitation = async (event) => {
    event.preventDefault()
    setInvitationError('')
    setSuccess('')
    setNewInvitation(null)
    setInvitationCopied(false)

    if (!schoolId) {
      setInvitationError('Your active school could not be identified. Please sign in again.')
      return
    }

    if (!invitationForm.learnerId) {
      setInvitationError('Please select the learner for this invitation.')
      return
    }

    setInviting(true)

    try {
      const response = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/parent-invitations`,
        {
          method: 'POST',
          body: {
            email: invitationForm.email.trim(),
            learnerId: invitationForm.learnerId,
          },
        }
      )

      if (
        !response?.success ||
        !response.data?.invitation ||
        !response.data?.activationUrl
      ) {
        throw new Error('The server did not return a valid activation link.')
      }

      setNewInvitation(response.data)
      setSuccess(`Activation link created for ${invitationForm.email.trim()}.`)

      await loadData()
      resetInvitationForm()
    } catch (requestError) {
      setInvitationError(
        requestError.message || 'Unable to create this invitation.'
      )
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvitation = async (invitationId) => {
    if (!schoolId || !invitationId) return

    setRevokingId(invitationId)
    setError('')
    setSuccess('')

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/parent-invitations/${encodeURIComponent(invitationId)}`,
        { method: 'DELETE' }
      )

      setSuccess('The invitation has been revoked.')
      await loadData()
    } catch (requestError) {
      setError(requestError.message || 'Unable to revoke this invitation.')
    } finally {
      setRevokingId('')
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

  const copyActivationLink = async () => {
    if (!newInvitation?.activationUrl) return

    try {
      await navigator.clipboard.writeText(newInvitation.activationUrl)
      setInvitationCopied(true)
    } catch {
      setInvitationCopied(false)
      setError('Clipboard access was blocked. Select and copy the activation link manually.')
    }
  }

  const getLearnerName = (invitation) => {
    const learner = invitation.learner

    return learner
      ? `${learner.firstName} ${learner.lastName}`
      : 'Learner'
  }

  const formatDate = (value) => {
    if (!value) return '—'

    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
  }

  return (
    <main className="content parent-management">
      <PageHeading
        eyebrow="School administration"
        title="Parents and guardians"
        description="Link existing parent accounts to learners or invite new parents to activate their own accounts."
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
          className="learner-secondary-button"
          onClick={() => {
            setShowInvitationForm((value) => !value)
            setShowForm(false)
            setInvitationError('')
          }}
        >
          <Mail size={16} />
          Invite parent
        </button>

        <button
          type="button"
          className="learner-primary-button"
          onClick={() => {
            setShowForm((value) => !value)
            setShowInvitationForm(false)
            setFormError('')
          }}
        >
          <UserPlus size={16} />
          Add parent
        </button>
      </PageHeading>

      {error && (
        <div className="parent-data-message error" role="alert">{error}</div>
      )}

      {success && (
        <div className="parent-data-message success" role="status">{success}</div>
      )}

      {newInvitation && (
        <section
          className="parent-credentials parent-invitation-result"
          aria-labelledby="invitation-result-title"
        >
          <div className="parent-credentials-heading">
            <ShieldCheck size={21} />
            <div>
              <h2 id="invitation-result-title">Activation link created</h2>
              <p>
                Share this link privately with the invited parent. It can only
                be used once and expires
                {newInvitation.invitation.expiresAt
                  ? ` on ${formatDate(newInvitation.invitation.expiresAt)}.`
                  : ' after 48 hours.'}
                {' '}The link is shown here only once.
              </p>
            </div>
          </div>

          <div className="parent-invitation-code">
            <span>Secure parent activation link</span>
            <input
              type="text"
              readOnly
              aria-label="Parent activation link"
              value={newInvitation.activationUrl}
              onFocus={(event) => event.target.select()}
            />
          </div>

          <div className="parent-credentials-actions">
            <button
              type="button"
              className="learner-primary-button"
              onClick={copyActivationLink}
            >
              <Copy size={15} />
              {invitationCopied ? 'Copied' : 'Copy activation link'}
            </button>

            <button
              type="button"
              className="learner-secondary-button"
              onClick={() => {
                setNewInvitation(null)
                setInvitationCopied(false)
              }}
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {showInvitationForm && (
        <section
          className="learner-form-card"
          aria-labelledby="parent-invitation-form-title"
        >
          <div className="parent-form-heading">
            <div>
              <p className="eyebrow">Self-service activation</p>
              <h2 id="parent-invitation-form-title">Invite a parent or guardian</h2>
            </div>
          </div>

          <p className="parent-form-guidance">
            Enter the parent's email and select their learner. Chiedza will
            generate a secure activation link. The school must share the link
            privately; no email is sent automatically.
          </p>

          <form onSubmit={handleCreateInvitation}>
            <div className="parent-form-grid">
              <FormField id="invitation-email" label="Parent email address">
                <input
                  id="invitation-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={invitationForm.email}
                  onChange={updateInvitationField}
                  maxLength={254}
                  required
                />
              </FormField>

              <FormField id="invitation-learner" label="Learner">
                <select
                  id="invitation-learner"
                  name="learnerId"
                  value={invitationForm.learnerId}
                  onChange={updateInvitationField}
                  required
                >
                  <option value="">Select a learner</option>
                  {learners.map((learner) => (
                    <option key={learner.id} value={learner.id}>
                      {learner.firstName} {learner.lastName} — {learner.schoolClass?.name || 'No class'}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {invitationError && (
              <p className="parent-form-error" role="alert">{invitationError}</p>
            )}

            <div className="parent-form-actions">
              <button
                type="button"
                className="learner-secondary-button"
                onClick={resetInvitationForm}
                disabled={inviting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="learner-primary-button"
                disabled={inviting || learners.length === 0}
              >
                <Mail size={16} />
                {inviting ? 'Creating link…' : 'Create activation link'}
              </button>
            </div>

            {learners.length === 0 && (
              <p className="parent-form-guidance">
                Register at least one learner before issuing an invitation.
              </p>
            )}
          </form>
        </section>
      )}

      {showForm && (
        <section className="learner-form-card" aria-labelledby="parent-form-title">
          <div className="parent-form-heading">
            <div>
              <p className="eyebrow">Existing parent account</p>
              <h2 id="parent-form-title">Link a parent or guardian</h2>
            </div>
          </div>

          <p className="parent-form-guidance">
            Enter the email address used by an existing parent account in this
            school, then select the learner and relationship. To create a new
            account, use Invite parent instead.
          </p>

          <form onSubmit={handleCreate}>
            <div className="parent-form-grid">
              <FormField id="parent-email" label="Parent email address">
                <input
                  id="parent-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={updateField}
                  required
                  maxLength={254}
                />
              </FormField>

              <FormField id="parent-learner" label="Learner">
                <select
                  id="parent-learner"
                  name="learnerId"
                  value={form.learnerId}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a learner</option>
                  {learners.map((learner) => (
                    <option key={learner.id} value={learner.id}>
                      {learner.firstName} {learner.lastName} — {learner.schoolClass?.name || 'No class'}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="parent-relationship" label="Relationship">
                <select
                  id="parent-relationship"
                  name="relationship"
                  value={form.relationship}
                  onChange={updateField}
                  required
                >
                  <option value="Parent">Parent</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
            </div>

            {formError && (
              <p className="parent-form-error" role="alert">{formError}</p>
            )}

            <div className="parent-form-actions">
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
                disabled={saving || learners.length === 0}
              >
                <UserPlus size={16} />
                {saving ? 'Linking…' : 'Link parent to learner'}
              </button>
            </div>

            {learners.length === 0 && (
              <p className="parent-form-guidance">
                Register at least one learner before linking a parent account.
              </p>
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
            description="Link an existing parent account or invite a parent to activate a new account."
            icon={Users}
          />
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr>
                  <th>Parent / guardian</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Linked learners</th>
                </tr>
              </thead>
              <tbody>
                {parents.map((parent) => (
                  <tr key={parent.id}>
                    <td>
                      <strong>{parent.firstName} {parent.lastName}</strong>
                    </td>
                    <td>{parent.email}</td>
                    <td>{parent.phone || '—'}</td>
                    <td>
                      <div className="parent-linked-learners">
                        {(parent.children || []).map((child) => (
                          <span
                            className="parent-record-tag"
                            key={child.parentLinkId || child.id}
                          >
                            {child.firstName} {child.lastName}
                            {child.schoolClass?.name
                              ? ` · ${child.schoolClass.name}`
                              : ''}
                            {child.relationship
                              ? ` · ${child.relationship}`
                              : ''}
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

      <Panel
        eyebrow={`${invitations.length} invitation ${invitations.length === 1 ? 'record' : 'records'}`}
        title="Parent invitations"
      >
        {loading ? (
          <div className="parent-page-loading">Loading invitations…</div>
        ) : invitations.length === 0 ? (
          <EmptyState
            title="No parent invitations yet"
            description="Use Invite parent to create a one-time activation link for a learner's parent or guardian."
            icon={Mail}
          />
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table parent-invitation-table">
              <thead>
                <tr>
                  <th>Invited parent</th>
                  <th>Learner</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>{invitation.invitedEmail || '—'}</td>
                    <td>{getLearnerName(invitation)}</td>
                    <td>
                      <span
                        className={`parent-invitation-status status-${String(invitation.status || '').toLowerCase()}`}
                      >
                        {invitation.status || 'Unknown'}
                      </span>
                    </td>
                    <td>{formatDate(invitation.expiresAt)}</td>
                    <td>
                      {invitation.status === 'PENDING' ? (
                        <button
                          type="button"
                          className="parent-revoke-button"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          disabled={revokingId === invitation.id}
                        >
                          <XCircle size={15} />
                          {revokingId === invitation.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      ) : '—'}
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
