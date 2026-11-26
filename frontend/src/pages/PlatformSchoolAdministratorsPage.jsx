import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Copy,
  Link as LinkIcon,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import EmptyState from '../components/common/EmptyState'
import { apiRequest } from '../lib/api'
import './PlatformSchoolAdministratorsPage.css'

function formatDate(value) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function PlatformSchoolAdministratorsPage() {
  const { schoolId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [createdLink, setCreatedLink] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadAdministrators = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiRequest(
        `/platform/schools/${encodeURIComponent(schoolId)}/administrators`
      )
      setData(response.data || null)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load administrators.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadAdministrators()
  }, [loadAdministrators])

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const createInvitation = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    setCreatedLink('')

    try {
      const response = await apiRequest(
        `/platform/schools/${encodeURIComponent(schoolId)}/administrators/invitations`,
        {
          method: 'POST',
          body: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
          },
        }
      )

      const activationUrl = response.data?.activationUrl
      if (!activationUrl) {
        throw new Error('The invitation was created, but no activation link was returned. Refresh the page and check the invitation list.')
      }

      setCreatedLink(activationUrl)
      setForm({ firstName: '', lastName: '', email: '' })
      setNotice('Invitation created. Copy the activation link and share it privately with the administrator.')
      await loadAdministrators()
    } catch (requestError) {
      setError(requestError.message || 'Unable to create the invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(createdLink)
      setNotice('Activation link copied. Share it privately with the invited administrator.')
    } catch {
      setError('Unable to copy automatically. Select and copy the activation link manually.')
    }
  }

  const revokeInvitation = async (invitation) => {
    const confirmed = window.confirm(
      `Revoke the pending invitation for ${invitation.invitedEmail}? The activation link will no longer work.`
    )
    if (!confirmed) return

    setRevokingId(invitation.id)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/platform/schools/${encodeURIComponent(schoolId)}/administrators/invitations/${encodeURIComponent(invitation.id)}`,
        { method: 'DELETE' }
      )
      setNotice('Invitation revoked.')
      if (createdLink) setCreatedLink('')
      await loadAdministrators()
    } catch (requestError) {
      setError(requestError.message || 'Unable to revoke this invitation.')
    } finally {
      setRevokingId('')
    }
  }

  if (loading && !data) {
    return (
      <main className="content platform-school-admins">
        <div className="application-loading" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Loading administrator records…
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="content platform-school-admins">
        <Link className="platform-school-back" to="/platform/administrators">
          <ArrowLeft size={16} aria-hidden="true" /> Back to schools
        </Link>
        {error && <p className="platform-feedback error" role="alert">{error}</p>}
        <section className="panel">
          <EmptyState
            icon={Users}
            title="Administrator records unavailable"
            description="The school may not exist or the records could not be loaded."
          />
          <button className="secondary-button" type="button" onClick={loadAdministrators}>
            Try again
          </button>
        </section>
      </main>
    )
  }

  const { school, administrators = [], invitations = [], limits = {} } = data

  return (
    <main className="content platform-school-admins">
      <Link className="platform-school-back" to="/platform/administrators">
        <ArrowLeft size={16} aria-hidden="true" /> Back to school administrators
      </Link>

      <PageHeading
        eyebrow="School access management"
        title={school.name}
        description="Manage the two administrator positions assigned to this school."
      >
        <button
          type="button"
          className="secondary-button"
          onClick={loadAdministrators}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </PageHeading>

      {error && <p className="platform-feedback error" role="alert">{error}</p>}
      {notice && <p className="platform-feedback success" role="status">{notice}</p>}

      <section className="platform-admin-limit-grid" aria-label="Administrator limits">
        <article className="panel platform-admin-limit-card">
          <span><ShieldCheck size={19} aria-hidden="true" /></span>
          <div><small>Maximum administrators</small><strong>{limits.maximum ?? 2}</strong></div>
        </article>
        <article className="panel platform-admin-limit-card">
          <span><Users size={19} aria-hidden="true" /></span>
          <div><small>Active administrators</small><strong>{limits.active ?? administrators.length}</strong></div>
        </article>
        <article className="panel platform-admin-limit-card">
          <span><LinkIcon size={19} aria-hidden="true" /></span>
          <div><small>Pending invitations</small><strong>{limits.pending ?? invitations.length}</strong></div>
        </article>
        <article className="panel platform-admin-limit-card">
          <span><UserPlus size={19} aria-hidden="true" /></span>
          <div><small>Available positions</small><strong>{limits.available ?? 0}</strong></div>
        </article>
      </section>

      <div className="platform-admin-management-grid">
        <section className="panel platform-admin-form-panel">
          <div className="platform-admin-section-heading">
            <div>
              <h2>Invite an administrator</h2>
              <p>Create a private activation link for a school administrator.</p>
            </div>
          </div>

          {school.approvalStatus === 'APPROVED' && !school.isActive && (
            <p className="platform-admin-info">
              This school is approved but not yet active. You can prepare administrator invitations now; invitees can activate their accounts after the school is activated.
            </p>
          )}

          {school.approvalStatus !== 'APPROVED' ? (
            <p className="platform-admin-info">This school must be approved before administrators can be invited.</p>
          ) : limits.available <= 0 ? (
            <p className="platform-admin-info">Both administrator positions are already active or reserved by pending invitations. Revoke an invitation or resolve an existing position before adding another.</p>
          ) : (
            <form className="platform-admin-invite-form" onSubmit={createInvitation}>
              <div className="platform-admin-form-row">
                <label>
                  First name
                  <input name="firstName" value={form.firstName} onChange={updateField} maxLength={60} autoComplete="given-name" required />
                </label>
                <label>
                  Last name
                  <input name="lastName" value={form.lastName} onChange={updateField} maxLength={60} autoComplete="family-name" required />
                </label>
              </div>
              <label>
                Email address
                <input name="email" type="email" value={form.email} onChange={updateField} maxLength={254} autoComplete="email" required />
              </label>
              <p className="platform-admin-form-note">The invitation link is valid for 48 hours. Chiedza will not email it automatically; share it privately with the intended administrator.</p>
              <button className="primary-button" type="submit" disabled={submitting}>
                <UserPlus size={16} aria-hidden="true" />
                {submitting ? 'Creating invitation…' : 'Create invitation'}
              </button>
            </form>
          )}

          {createdLink && (
            <div className="platform-admin-created-link">
              <strong>Private activation link</strong>
              <p>Copy this link now and send it directly to the invited administrator. It will not be shown again after you leave this page.</p>
              <div className="platform-admin-link-copy">
                <input aria-label="Administrator activation link" value={createdLink} readOnly onFocus={(event) => event.target.select()} />
                <button type="button" className="secondary-button" onClick={copyLink}>
                  <Copy size={15} aria-hidden="true" /> Copy
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel platform-admin-record-panel">
          <div className="platform-admin-section-heading">
            <div>
              <h2>Current administrators</h2>
              <p>Active school administrator accounts.</p>
            </div>
            <span className="platform-admin-section-count">{administrators.length}</span>
          </div>

          {administrators.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No active administrators"
              description="Create an invitation to assign the first administrator."
            />
          ) : (
            <div className="platform-admin-record-list">
              {administrators.map((membership) => (
                <article className="platform-admin-record" key={membership.id}>
                  <span className="platform-admin-avatar">
                    {(membership.user?.firstName?.[0] || 'A').toUpperCase()}
                  </span>
                  <div>
                    <strong>{membership.user?.firstName} {membership.user?.lastName}</strong>
                    <p>{membership.user?.email}</p>
                    <small>Administrator since {formatDate(membership.createdAt)}</small>
                  </div>
                  <span className="platform-admin-active-status">Active</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel platform-admin-record-panel platform-admin-pending-panel">
          <div className="platform-admin-section-heading">
            <div>
              <h2>Pending invitations</h2>
              <p>Invitations awaiting account activation.</p>
            </div>
            <span className="platform-admin-section-count">{invitations.length}</span>
          </div>

          {invitations.length === 0 ? (
            <EmptyState
              icon={LinkIcon}
              title="No pending invitations"
              description="New invitations will appear here until they are accepted, revoked or expire."
            />
          ) : (
            <div className="platform-admin-record-list">
              {invitations.map((invitation) => (
                <article className="platform-admin-pending-record" key={invitation.id}>
                  <div>
                    <strong>{invitation.invitedFirstName} {invitation.invitedLastName}</strong>
                    <p>{invitation.invitedEmail}</p>
                    <small>Expires {formatDate(invitation.expiresAt)}</small>
                  </div>
                  <button
                    type="button"
                    className="platform-admin-revoke-button"
                    onClick={() => revokeInvitation(invitation)}
                    disabled={revokingId === invitation.id}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    {revokingId === invitation.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default PlatformSchoolAdministratorsPage
