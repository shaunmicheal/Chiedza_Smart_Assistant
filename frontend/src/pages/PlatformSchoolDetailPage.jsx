import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  RefreshCw,
  Clock3,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import EmptyState from '../components/common/EmptyState'
import { apiRequest } from '../lib/api'
import './PlatformSchoolDetailPage.css'

function formatDate(value) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function roleLabel(role) {
  const labels = {
    SCHOOL_ADMIN: 'School administrator',
    TEACHER: 'Teacher',
    PARENT: 'Parent',
    STAFF: 'Staff',
  }

  return labels[role] || role?.replaceAll('_', ' ') || 'Unknown'
}

function PlatformSchoolDetailPage() {
  const { schoolId } = useParams()
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadSchool = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        `/platform/schools/${encodeURIComponent(schoolId)}`
      )
      setSchool(result.data || null)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load school details.')
      setSchool(null)
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadSchool()
  }, [loadSchool])

  const changeStatus = async () => {
    if (!school || school.approvalStatus !== 'APPROVED') return

    const nextStatus = !school.isActive

    const confirmed = window.confirm(
      nextStatus
        ? `Activate ${school.name}? Eligible school users will regain access.`
        : `Deactivate ${school.name}? School users will lose access until it is activated again.`
    )

    if (!confirmed) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const result = await apiRequest(
        `/platform/schools/${encodeURIComponent(school.id)}/status`,
        {
          method: 'PATCH',
          body: { isActive: nextStatus },
        }
      )

      setSchool((current) => ({
        ...current,
        isActive: result.data.isActive,
      }))

      setNotice(result.message || 'School access status updated.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to update school status.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="content platform-school-detail">
        <div className="application-loading" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Loading school details…
        </div>
      </main>
    )
  }

  if (!school) {
    return (
      <main className="content platform-school-detail">
        <Link className="platform-school-back" to="/platform/schools">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to schools
        </Link>
        {error && <p className="platform-feedback error" role="alert">{error}</p>}
        <section className="panel">
          <EmptyState
            icon={Building2}
            title="School not found"
            description="This school may have been removed or the link may be incorrect."
          />
        </section>
      </main>
    )
  }

  const counts = school.counts || {}
  const application = school.application
  const memberships = school.recentMemberships || []
  const canManageAccess = school.approvalStatus === 'APPROVED'

  return (
    <main className="content platform-school-detail">
      <Link className="platform-school-back" to="/platform/schools">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to schools
      </Link>

      <PageHeading
        eyebrow="Platform administration / Schools"
        title={school.name}
        description={`School record created ${formatDate(school.createdAt)}.`}
      >
        <button
          type="button"
          className="secondary-button"
          onClick={loadSchool}
          disabled={loading || busy}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </PageHeading>

      {error && <p className="platform-feedback error" role="alert">{error}</p>}
      {notice && <p className="platform-feedback success" role="status">{notice}</p>}

      <section className="panel platform-school-detail-overview">
        <div className="platform-school-detail-heading">
          <span className="platform-school-detail-icon">
            <Building2 size={25} aria-hidden="true" />
          </span>
          <div>
            <h3>{school.name}</h3>
            <p>{school.slug || 'School record'}</p>
          </div>
          <div className="platform-school-statuses">
            <span className={`application-status ${(school.approvalStatus || 'PENDING').toLowerCase()}`}>
              {school.approvalStatus || 'PENDING'}
            </span>
            <span className={`platform-access-status ${school.isActive ? 'active' : 'suspended'}`}>
              {school.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="platform-school-detail-contact">
          <div>
            <Mail size={17} aria-hidden="true" />
            <span>{school.email || 'No school email provided'}</span>
          </div>
          <div>
            <Phone size={17} aria-hidden="true" />
            <span>{school.phone || 'No phone provided'}</span>
          </div>
          <div>
            <MapPin size={17} aria-hidden="true" />
            <span>{school.address || 'No address provided'}</span>
          </div>
        </div>

        <div className="platform-school-detail-actions">
          {school.approvalStatus === 'APPROVED' && (
            <Link
              className="secondary-button"
              to={`/platform/schools/${encodeURIComponent(school.id)}/administrators`}
            >
              Manage administrators
            </Link>
          )}

          {canManageAccess && (
            <button
              type="button"
              className={school.isActive ? 'application-reject-button' : 'application-approve-button'}
              onClick={changeStatus}
              disabled={busy}
            >
              {busy
                ? 'Updating…'
                : school.isActive
                  ? 'Deactivate school access'
                  : 'Activate school access'}
            </button>
          )}
        </div>
        {school.approvalStatus !== 'APPROVED' && (
          <p className="platform-school-access-note">
            School access can be managed after the application is approved.
          </p>
        )}
      </section>

      <section className="platform-school-detail-stats" aria-label="School statistics">
        <article className="panel platform-school-detail-stat">
          <Users size={19} aria-hidden="true" />
          <span>Active members</span>
          <strong>{counts.activeMembers ?? 0}</strong>
        </article>
        <article className="panel platform-school-detail-stat">
          <GraduationCap size={19} aria-hidden="true" />
          <span>Learners</span>
          <strong>{counts.learners ?? 0}</strong>
        </article>
        <article className="panel platform-school-detail-stat">
          <BookOpen size={19} aria-hidden="true" />
          <span>Classes</span>
          <strong>{counts.classes ?? 0}</strong>
        </article>
      </section>

      <section className="panel platform-school-detail-section">
        <div className="platform-school-section-heading">
          <div>
            <h3>School membership</h3>
            <p>Role breakdown and the most recent membership records.</p>
          </div>
        </div>

        <div className="platform-school-membership-summary">
          <div><strong>{counts.administrators ?? 0}</strong><span>Administrators</span></div>
          <div><strong>{counts.teachers ?? 0}</strong><span>Teachers</span></div>
          <div><strong>{counts.parents ?? 0}</strong><span>Parents</span></div>
          <div><strong>{counts.otherStaff ?? 0}</strong><span>Other staff</span></div>
        </div>

        {memberships.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No membership records"
            description="No school memberships have been recorded yet."
          />
        ) : (
          <div className="platform-school-membership-list">
            {memberships.map((membership) => {
              const user = membership.user || {}
              const userActive = membership.isActive && user.isActive

              return (
                <article className="platform-school-membership-row" key={membership.id}>
                  <div className="platform-school-member-avatar">
                    {(user.firstName?.[0] || '?').toUpperCase()}
                    {(user.lastName?.[0] || '').toUpperCase()}
                  </div>
                  <div className="platform-school-member-info">
                    <strong>
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user'}
                    </strong>
                    <span>{user.email || 'No email provided'}</span>
                    <small>{roleLabel(membership.role)}</small>
                  </div>
                  <div className="platform-school-member-status">
                    <span className={userActive ? 'active' : 'inactive'}>
                      {userActive ? 'Active' : 'Inactive'}
                    </span>
                    <small>
                      <Clock3 size={12} aria-hidden="true" />
                      {formatDate(membership.createdAt)}
                    </small>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel platform-school-detail-section">
        <div className="platform-school-section-heading">
          <div>
            <h3>Application record</h3>
            <p>Original application and review information.</p>
          </div>
          {application && (
            <span className={`application-status ${application.status.toLowerCase()}`}>
              {application.status}
            </span>
          )}
        </div>

        {application ? (
          <div className="platform-school-application-info">
            <div>
              <span>Applicant</span>
              <strong>
                {application.applicantFirstName} {application.applicantLastName}
              </strong>
            </div>
            <div>
              <span>Applicant email</span>
              <strong>{application.applicantEmail}</strong>
            </div>
            <div>
              <span>Submitted</span>
              <strong>{formatDate(application.createdAt)}</strong>
            </div>
            <div>
              <span>Reviewed</span>
              <strong>{formatDate(application.reviewedAt)}</strong>
            </div>
          </div>
        ) : (
          <p className="platform-school-no-application">
            No linked school application is available for this record.
          </p>
        )}
      </section>
    </main>
  )
}

export default PlatformSchoolDetailPage
