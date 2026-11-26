import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, RefreshCw, Users } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import EmptyState from '../components/common/EmptyState'
import { apiRequest } from '../lib/api'
import './PlatformAdministratorsPage.css'

function PlatformAdministratorsPage() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSchools = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiRequest('/platform/schools', {
        query: { approvalStatus: 'APPROVED', isActive: 'true' },
      })
      setSchools(Array.isArray(response.data) ? response.data : [])
    } catch (requestError) {
      setError(requestError.message || 'Unable to load schools.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSchools()
  }, [loadSchools])

  return (
    <main className="content platform-administrators">
      <PageHeading
        eyebrow="Platform administration"
        title="School administrators"
        description="Choose an active school to manage its administrator accounts and invitations."
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

      {error && <p className="platform-feedback error" role="alert">{error}</p>}

      <section className="panel platform-admin-directory">
        <div className="platform-admin-directory-heading">
          <div>
            <h2>Active approved schools</h2>
            <p>Select a school to view its administrators.</p>
          </div>
          <span className="platform-admin-count">
            {loading ? '—' : schools.length} schools
          </span>
        </div>

        {loading ? (
          <div className="application-loading" role="status">
            <span className="loading-spinner" aria-hidden="true" />
            Loading schools…
          </div>
        ) : schools.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No active schools yet"
            description="Approved and active schools will appear here when they are ready for administrator management."
          />
        ) : (
          <div className="platform-admin-school-list">
            {schools.map((school) => (
              <article className="platform-admin-school" key={school.id}>
                <span className="platform-admin-school-icon">
                  <Building2 size={21} aria-hidden="true" />
                </span>
                <div className="platform-admin-school-info">
                  <h3>{school.name}</h3>
                  <p>{school.email || school.address || 'School contact details not provided'}</p>
                  <div className="platform-admin-school-meta">
                    <span><Users size={14} aria-hidden="true" /> {school.counts?.administrators ?? 0} active administrators</span>
                    <span>{school.counts?.activeMembers ?? 0} active members</span>
                  </div>
                </div>
                <Link
                  className="platform-admin-manage-link"
                  to={`/platform/schools/${encodeURIComponent(school.id)}/administrators`}
                >
                  Manage <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default PlatformAdministratorsPage
