import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  GraduationCap,
  RefreshCw,
  School,
  XCircle,
} from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import EmptyState from '../components/common/EmptyState'
import { apiRequest } from '../lib/api'
import './PlatformOverviewPage.css'

const EMPTY_OVERVIEW = {
  counts: {
    schools: 0,
    activeSchools: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    learners: 0,
  },
  recentApplications: [],
}

const STATISTICS = [
  {
    key: 'schools',
    label: 'Total schools',
    description: 'Registered on Chiedza',
    icon: Building2,
    tone: 'forest',
    href: '/platform/schools',
  },
  {
    key: 'activeSchools',
    label: 'Active schools',
    description: 'Approved and active',
    icon: School,
    tone: 'blue',
    href: '/platform/schools?isActive=true',
  },
  {
    key: 'pendingApplications',
    label: 'Pending applications',
    description: 'Awaiting your review',
    icon: Clock3,
    tone: 'amber',
    href: '/platform/applications?status=PENDING',
  },
  {
    key: 'approvedApplications',
    label: 'Approved applications',
    description: 'Successfully approved',
    icon: CheckCircle2,
    tone: 'green',
    href: '/platform/applications?status=APPROVED',
  },
  {
    key: 'rejectedApplications',
    label: 'Rejected applications',
    description: 'Applications declined',
    icon: XCircle,
    tone: 'coral',
    href: '/platform/applications?status=REJECTED',
  },
  {
    key: 'learners',
    label: 'Total learners',
    description: 'Across all schools',
    icon: GraduationCap,
    tone: 'purple',
    href: '/platform/schools',
  },
]

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function PlatformOverviewPage() {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiRequest('/platform/overview')

      if (!response?.success || !response.data?.counts) {
        throw new Error('The server returned an invalid platform overview.')
      }

      setOverview({
        counts: response.data.counts,
        recentApplications: Array.isArray(response.data.recentApplications)
          ? response.data.recentApplications
          : [],
      })
    } catch (requestError) {
      setError(
        requestError.message || 'Unable to load the platform overview.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  return (
    <main className="content platform-overview">
      <PageHeading
        eyebrow="Platform administration"
        title="Platform overview"
        description="A live view of schools, applications and learners across Chiedza."
      >
        <button
          type="button"
          className="secondary-button"
          onClick={loadOverview}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? 'platform-refresh-spinning' : ''}
            aria-hidden="true"
          />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </PageHeading>

      {error && (
        <div className="platform-overview-error" role="alert">
          <strong>Unable to load the overview</strong>
          <p>{error}</p>
          <button type="button" onClick={loadOverview} disabled={loading}>
            Try again
          </button>
        </div>
      )}

      <section
        className="platform-overview-stats"
        aria-label="Platform statistics"
      >
        {STATISTICS.map((stat) => {
          const Icon = stat.icon

          return (
            <Link
              className="platform-stat-card"
              key={stat.key}
              to={stat.href}
              aria-label={`View ${stat.label.toLowerCase()}`}
            >
              <div className="platform-stat-heading">
                <span className={`platform-stat-icon ${stat.tone}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="platform-stat-description">
                  {stat.description}
                </span>
              </div>

              <p className="platform-stat-label">{stat.label}</p>
              <p className="platform-stat-value" aria-live="polite">
                {loading ? '—' : (overview.counts[stat.key] ?? 0).toLocaleString()}
              </p>
            </Link>
          )
        })}
      </section>

      <section className="platform-overview-lower">
        <div className="panel platform-recent-panel">
          <div className="platform-section-heading">
            <div>
              <p className="eyebrow">Latest submissions</p>
              <h3>Recent school applications</h3>
            </div>

            <Link className="platform-text-link" to="/platform/applications">
              View all <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <p className="platform-overview-message" role="status">
              Loading recent applications…
            </p>
          ) : overview.recentApplications.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No applications yet"
              description="New school applications will appear here when they are submitted."
            />
          ) : (
            <div className="platform-recent-list">
              {overview.recentApplications.map((application) => (
                <article
                  className="platform-recent-item"
                  key={application.id}
                >
                  <span className="platform-recent-icon">
                    <Building2 size={18} aria-hidden="true" />
                  </span>

                  <div className="platform-recent-details">
                    <strong>{application.schoolName}</strong>
                    <span>
                      {application.applicantFirstName}{' '}
                      {application.applicantLastName}
                    </span>
                    <small>{application.applicantEmail}</small>
                  </div>

                  <div className="platform-recent-meta">
                    <span
                      className={`platform-application-status ${application.status.toLowerCase()}`}
                    >
                      {application.status}
                    </span>
                    <time dateTime={application.createdAt}>
                      {formatDate(application.createdAt)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="panel platform-quick-panel">
          <p className="eyebrow">Platform workspace</p>
          <h3>Quick access</h3>
          <p className="platform-quick-description">
            Continue managing the Chiedza platform.
          </p>

          <Link to="/platform/applications">
            <span>
              <Clock3 size={18} aria-hidden="true" />
              Review applications
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <Link to="/platform/schools">
            <span>
              <Building2 size={18} aria-hidden="true" />
              Manage schools
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <Link to="/platform/administrators">
            <span>
              <GraduationCap size={18} aria-hidden="true" />
              School administrators
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </section>
    </main>
  )
}

export default PlatformOverviewPage
