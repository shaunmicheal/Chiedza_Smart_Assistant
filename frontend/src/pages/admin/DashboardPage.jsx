import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  RefreshCw,
  School,
  Users,
} from 'lucide-react'

import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import Panel from '../../components/common/Panel'

const EMPTY_DASHBOARD = {
  learners: [],
  teachers: [],
  classes: [],
  alerts: [],
}

const getList = (response, label) => {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(`The server returned an invalid ${label} response.`)
  }

  return response.data
}

const formatDate = (value) => {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const formatAlertType = (value) => {
  if (value === 'REPEATED_ABSENCES') return 'Repeated absences'
  if (value === 'ACADEMIC_DECLINE') return 'Academic decline'

  return value?.replaceAll('_', ' ').toLowerCase() || 'Early warning'
}

function OverviewStat({ label, value, description, icon: Icon, tone }) {
  return (
    <article className="overview-stat">
      <div className="overview-stat-top">
        <span className={`overview-stat-icon ${tone}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <span className="overview-stat-caption">{description}</span>
      </div>

      <p className="stat-label">{label}</p>
      <p className="overview-stat-value">{value}</p>
    </article>
  )
}

function DashboardPage() {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId

  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    if (!schoolId) {
      throw new Error('No active school membership was found. Please sign in again.')
    }

    const [learnersResponse, teachersResponse, classesResponse, alertsResponse] =
      await Promise.all([
        apiRequest(`/schools/${schoolId}/learners`),
        apiRequest(`/schools/${schoolId}/teachers`),
        apiRequest(`/schools/${schoolId}/classes`),
        apiRequest(`/schools/${schoolId}/early-warning/alerts?status=ACTIVE`),
      ])

    return {
      learners: getList(learnersResponse, 'learners'),
      teachers: getList(teachersResponse, 'teachers'),
      classes: getList(classesResponse, 'classes'),
      alerts: getList(alertsResponse, 'alerts'),
    }
  }, [schoolId])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setDashboard(await fetchDashboard())
    } catch (requestError) {
      setError(
        requestError.message ||
          'Unable to load the school overview. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [fetchDashboard])

  useEffect(() => {
    let cancelled = false

    const loadInitialDashboard = async () => {
      try {
        const data = await fetchDashboard()
        if (!cancelled) setDashboard(data)
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              'Unable to load the school overview. Please try again.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitialDashboard()

    return () => {
      cancelled = true
    }
  }, [fetchDashboard])

  const activeAlerts = dashboard.alerts

  return (
    <main className="content admin-dashboard">
      <header className="dashboard-page-heading">
        <div>
          <p className="eyebrow">School administration</p>
          <h2>School overview</h2>
          <p>Live information from your school's Chiedza records.</p>
        </div>

        <button
          type="button"
          className="dashboard-refresh"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'refresh-spinning' : ''} />
          {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="dashboard-error" role="alert">
          <AlertTriangle size={19} />
          <div>
            <strong>Unable to load the overview</strong>
            <p>{error}</p>
            <button type="button" onClick={loadDashboard}>
              Try again
            </button>
          </div>
        </div>
      )}

      <section className="stats-grid overview-stats" aria-label="School statistics">
        <OverviewStat
          label="Learners"
          value={loading ? '—' : dashboard.learners.length}
          description="Registered learners"
          icon={Users}
          tone="stat-forest"
        />

        <OverviewStat
          label="Teachers"
          value={loading ? '—' : dashboard.teachers.length}
          description="School teaching staff"
          icon={GraduationCap}
          tone="stat-blue"
        />

        <OverviewStat
          label="Classes"
          value={loading ? '—' : dashboard.classes.length}
          description="Registered classes"
          icon={School}
          tone="stat-gold"
        />

        <OverviewStat
          label="Active alerts"
          value={loading ? '—' : activeAlerts.length}
          description="Require attention"
          icon={AlertTriangle}
          tone="stat-warning"
        />
      </section>

      <section className="dashboard-overview-grid">
        <Panel
          eyebrow="Learner support"
          title="Active early-warning alerts"
          action={
            <Link className="link-button" to="/admin/early-warnings">
              View all <ArrowRight size={14} />
            </Link>
          }
        >
          {loading ? (
            <div className="dashboard-message">Loading active alerts...</div>
          ) : activeAlerts.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">
                <AlertTriangle size={20} />
              </span>
              <strong>No active alerts</strong>
              <p>
                There are currently no active early-warning alerts for this
                school.
              </p>
            </div>
          ) : (
            <ul className="dashboard-alert-list">
              {activeAlerts.slice(0, 5).map((alert) => {
                const learnerName = alert.learner
                  ? `${alert.learner.firstName} ${alert.learner.lastName}`
                  : 'Learner record unavailable'

                return (
                  <li className="dashboard-alert-item" key={alert.id}>
                    <span className="dashboard-alert-icon">
                      <AlertTriangle size={17} />
                    </span>

                    <div className="dashboard-alert-details">
                      <strong>{learnerName}</strong>
                      <span>
                        {formatAlertType(
                          alert.alertRule?.alertType || alert.alertType
                        )}
                      </span>
                      <small>
                        {alert.class?.name || 'Class unavailable'}
                        {' · '}
                        {formatDate(alert.createdAt)}
                      </small>
                    </div>

                    <span className="dashboard-alert-status">Active</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel
          eyebrow="School records"
          title="Your school at a glance"
        >
          {loading ? (
            <div className="dashboard-message">Loading school records...</div>
          ) : (
            <div className="dashboard-record-links">
              <Link to="/admin/learners">
                <span>
                  <Users size={18} />
                  Learner directory
                </span>
                <ArrowRight size={16} />
              </Link>

              <Link to="/admin/teachers">
                <span>
                  <GraduationCap size={18} />
                  Teacher directory
                </span>
                <ArrowRight size={16} />
              </Link>

              <Link to="/admin/classes">
                <span>
                  <School size={18} />
                  Class management
                </span>
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </Panel>
      </section>
    </main>
  )
}

export default DashboardPage
