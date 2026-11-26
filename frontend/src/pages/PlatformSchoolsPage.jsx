import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import EmptyState from '../components/common/EmptyState'
import { apiRequest } from '../lib/api'
import './PlatformSchoolsPage.css'

const APPROVAL_FILTERS = [
  { value: '', label: 'All approval statuses' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
]

const ACCESS_FILTERS = [
  { value: '', label: 'All access statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

function formatDate(value) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function PlatformSchoolsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedAccess = searchParams.get('isActive')
  const initialAccess = ['true', 'false'].includes(requestedAccess) ? requestedAccess : ''
  const [schools, setSchools] = useState([])
  const [search, setSearch] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('')
  const [isActive, setIsActive] = useState(initialAccess)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadSchools = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/platform/schools', {
        query: {
          search: search.trim() || undefined,
          approvalStatus: approvalStatus || undefined,
          isActive: isActive || undefined,
        },
      })

      setSchools(Array.isArray(result.data) ? result.data : [])
    } catch (requestError) {
      setError(requestError.message || 'Unable to load schools.')
    } finally {
      setLoading(false)
    }
  }, [search, approvalStatus, isActive])

  useEffect(() => {
    const timeout = window.setTimeout(loadSchools, 300)
    return () => window.clearTimeout(timeout)
  }, [loadSchools])

  useEffect(() => {
    const requested = searchParams.get('isActive')
    const nextAccess = ['true', 'false'].includes(requested) ? requested : ''
    if (nextAccess !== isActive) setIsActive(nextAccess)
  }, [searchParams, isActive])

  const changeAccessFilter = (value) => {
    setIsActive(value)
    const nextParams = new URLSearchParams(searchParams)
    if (value) {
      nextParams.set('isActive', value)
    } else {
      nextParams.delete('isActive')
    }
    setSearchParams(nextParams)
  }

  const changeSchoolStatus = async (school) => {
    const nextStatus = !school.isActive
    const action = nextStatus ? 'activate' : 'deactivate'

    const confirmed = window.confirm(
      nextStatus
        ? `Activate ${school.name}? Its eligible school users will regain access.`
        : `Deactivate ${school.name}? Its school users will lose access to Chiedza until the school is activated again.`
    )

    if (!confirmed) return

    setBusyId(school.id)
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

      setNotice(
        result.message ||
        `${school.name} was ${nextStatus ? 'activated' : 'deactivated'}.`
      )

      await loadSchools()
    } catch (requestError) {
      setError(requestError.message || `Unable to ${action} this school.`)
    } finally {
      setBusyId('')
    }
  }

  const approvedCount = schools.filter(
    (school) => school.approvalStatus === 'APPROVED'
  ).length

  const activeCount = schools.filter(
    (school) => school.isActive
  ).length

  const pendingCount = schools.filter(
    (school) => school.approvalStatus === 'PENDING'
  ).length

  return (
    <main className="content platform-schools">
      <PageHeading
        eyebrow="Platform administration"
        title="Schools"
        description="Monitor schools on Chiedza and manage their platform access."
      >
        <button
          type="button"
          className="secondary-button"
          onClick={loadSchools}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </PageHeading>

      <section className="platform-school-summary" aria-label="School summary">
        <article className="panel platform-school-stat">
          <span className="platform-school-stat-icon">
            <Building2 size={19} aria-hidden="true" />
          </span>
          <div>
            <span>Total results</span>
            <strong>{loading ? '—' : schools.length}</strong>
          </div>
        </article>

        <article className="panel platform-school-stat">
          <span className="platform-school-stat-icon">
            <ShieldCheck size={19} aria-hidden="true" />
          </span>
          <div>
            <span>Approved results</span>
            <strong>{loading ? '—' : approvedCount}</strong>
          </div>
        </article>

        <article className="panel platform-school-stat">
          <span className="platform-school-stat-icon">
            <Building2 size={19} aria-hidden="true" />
          </span>
          <div>
            <span>Active results</span>
            <strong>{loading ? '—' : activeCount}</strong>
          </div>
        </article>

        <article className="panel platform-school-stat">
          <span className="platform-school-stat-icon">
            <ShieldAlert size={19} aria-hidden="true" />
          </span>
          <div>
            <span>Pending results</span>
            <strong>{loading ? '—' : pendingCount}</strong>
          </div>
        </article>
      </section>

      <section className="panel platform-school-filters">
        <div className="platform-school-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search school name, email, slug or address"
            aria-label="Search schools"
          />
        </div>

        <select
          value={approvalStatus}
          onChange={(event) => setApprovalStatus(event.target.value)}
          aria-label="Filter by approval status"
        >
          {APPROVAL_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>

        <select
          value={isActive}
          onChange={(event) => changeAccessFilter(event.target.value)}
          aria-label="Filter by access status"
        >
          {ACCESS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </section>

      {error && (
        <p className="platform-feedback error" role="alert">{error}</p>
      )}

      {notice && (
        <p className="platform-feedback success" role="status">{notice}</p>
      )}

      {loading ? (
        <div className="application-loading" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Loading schools…
        </div>
      ) : schools.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={Building2}
            title="No schools found"
            description="Try changing your search or filters. Approved schools will appear here once they have been created."
          />
        </section>
      ) : (
        <div className="platform-school-list">
          {schools.map((school) => {
            const counts = school.counts || {}
            const canManageAccess = school.approvalStatus === 'APPROVED'
            const isBusy = busyId === school.id

            return (
              <article className="panel platform-school-card" key={school.id}>
                <div className="platform-school-card-heading">
                  <div className="application-school-icon">
                    <Building2 size={21} aria-hidden="true" />
                  </div>

                  <div className="platform-school-title">
                    <h3>{school.name}</h3>
                    <p>{school.slug || 'School record'} · Added {formatDate(school.createdAt)}</p>
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

                <div className="platform-school-contact">
                  <span>{school.email || 'No school email provided'}</span>
                  <span>{school.phone || 'No phone provided'}</span>
                  <span>{school.address || 'No address provided'}</span>
                </div>

                <div className="platform-school-counts">
                  <div>
                    <Users size={16} aria-hidden="true" />
                    <span><strong>{counts.activeMembers ?? 0}</strong> active members</span>
                  </div>
                  <div>
                    <GraduationCap size={16} aria-hidden="true" />
                    <span><strong>{counts.learners ?? 0}</strong> learners</span>
                  </div>
                  <div>
                    <BookOpen size={16} aria-hidden="true" />
                    <span><strong>{counts.classes ?? 0}</strong> classes</span>
                  </div>
                </div>

                <div className="platform-school-role-counts">
                  <span>{counts.administrators ?? 0} administrators</span>
                  <span>{counts.teachers ?? 0} teachers</span>
                  <span>{counts.parents ?? 0} parents</span>
                  <span>{counts.otherStaff ?? 0} other staff</span>
                </div>

                <div className="platform-school-card-actions">
                  <Link
                    className="platform-school-details-link"
                    to={`/platform/schools/${encodeURIComponent(school.id)}`}
                  >
                    View details
                  </Link>
                  {canManageAccess ? (
                    <button
                      type="button"
                      className={school.isActive ? 'application-reject-button' : 'application-approve-button'}
                      onClick={() => changeSchoolStatus(school)}
                      disabled={isBusy}
                    >
                      {isBusy
                        ? 'Updating…'
                        : school.isActive
                          ? 'Deactivate school'
                          : 'Activate school'}
                    </button>
                  ) : (
                    <p className="platform-school-access-note">
                      Access management is available after an application is approved.
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default PlatformSchoolsPage
