import { useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'

import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import StatusBadge from '../../components/common/StatusBadge'
import AlertItem from '../../components/dashboard/AlertItem'
import LearnerSummaryRow from '../../components/dashboard/LearnerSummaryRow'
import RecentActivityItem from '../../components/dashboard/RecentActivityItem'
import StatCard from '../../components/dashboard/StatCard'

function getToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function humanize(value) {
  if (!value) return 'Early warning'

  return String(value)
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getLearnerName(learner) {
  if (!learner) return 'Learner'

  return (
    `${learner.firstName || ''} ${learner.lastName || ''}`.trim() ||
    'Learner'
  )
}

function TeacherDashboardPage() {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId

  const [dashboard, setDashboard] = useState({
    classes: [],
    learners: [],
    attendance: [],
    assessments: [],
    alerts: [],
    drafts: [],
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resourceErrors, setResourceErrors] = useState([])

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      if (!schoolId) {
        setError(
          'Your teacher account is not linked to a school. Please contact your school administrator.'
        )
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      setResourceErrors([])

      const base = `/schools/${encodeURIComponent(schoolId)}`

      const requests = [
        {
          name: 'Assigned classes',
          key: 'classes',
          request: () => apiRequest(`${base}/classes`),
        },
        {
          name: 'Learners',
          key: 'learners',
          request: () => apiRequest(`${base}/learners`),
        },
        {
          name: "Today's attendance",
          key: 'attendance',
          request: () =>
            apiRequest(`${base}/attendance`, {
              query: { date: getToday() },
            }),
        },
        {
          name: 'Assessments',
          key: 'assessments',
          request: () => apiRequest(`${base}/assessments`),
        },
        {
          name: 'Early warnings',
          key: 'alerts',
          request: () =>
            apiRequest(`${base}/early-warning/alerts`, {
              query: { status: 'ACTIVE' },
            }),
        },
        {
          name: 'Parent communication drafts',
          key: 'drafts',
          request: () => apiRequest(`${base}/drafts`),
        },
      ]

      const results = await Promise.allSettled(
        requests.map((item) => item.request())
      )

      if (!active) return

      const nextDashboard = {
        classes: [],
        learners: [],
        attendance: [],
        assessments: [],
        alerts: [],
        drafts: [],
      }

      const failures = []

      results.forEach((result, index) => {
        const resource = requests[index]

        if (result.status === 'rejected') {
          failures.push(
            `${resource.name}: ${result.reason?.message || 'Unable to load.'}`
          )
          return
        }

        if (!Array.isArray(result.value?.data)) {
          failures.push(
            `${resource.name}: The server returned an unexpected response.`
          )
          return
        }

        nextDashboard[resource.key] = result.value.data
      })

      setDashboard(nextDashboard)
      setResourceErrors(failures)

      if (failures.length === requests.length) {
        setError(
          'The dashboard could not load its information. Please check your connection and try again.'
        )
      }

      setLoading(false)
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [schoolId])

  const {
    classes,
    learners,
    attendance,
    assessments,
    alerts,
    drafts,
  } = dashboard

  const learnersByClass = learners.reduce((totals, learner) => {
    totals[learner.classId] = (totals[learner.classId] || 0) + 1
    return totals
  }, {})

  const classNames = Object.fromEntries(
    classes.map((classroom) => [classroom.id, classroom.name])
  )

  const presentCount = attendance.filter(
    (record) => record.status === 'PRESENT'
  ).length

  const lateCount = attendance.filter(
    (record) => record.status === 'LATE'
  ).length

  const markedCount = attendance.length
  const unmarkedCount = Math.max(learners.length - markedCount, 0)

  const pendingDrafts = drafts.filter(
    (draft) => draft.status === 'DRAFT'
  )

  const recentAssessments = assessments.slice(0, 4)
  const visibleAlerts = alerts.slice(0, 4)
  const visibleDrafts = pendingDrafts.slice(0, 4)

  return (
    <main className="content">
      <PageHeading
        eyebrow="Welcome"
        title="Your teaching overview"
        description="A live overview of your assigned classes, learners and teaching activities."
      />

      {loading && (
        <p className="demo-notice" role="status">
          Loading your teaching information…
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && resourceErrors.length > 0 && (
        <div className="demo-notice" role="status">
          <strong>Some information could not be loaded.</strong>
          <ul>
            {resourceErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <section
        className="stats-grid teacher-stats"
        aria-label="Teaching statistics"
      >
        <StatCard
          label="Assigned learners"
          value={loading ? '—' : learners.length}
          change="Across your assigned classes"
          tone="positive"
          icon="learners"
        />

        <StatCard
          label="Present today"
          value={
            loading
              ? '—'
              : learners.length > 0
                ? `${presentCount} / ${learners.length}`
                : '—'
          }
          change={
            loading
              ? 'Loading attendance'
              : `${markedCount} marked · ${unmarkedCount} not marked`
          }
          tone="positive"
          icon="attendance"
        />

        <StatCard
          label="Active warnings"
          value={loading ? '—' : alerts.length}
          change="In your assigned classes"
          tone="warning"
          icon="risk"
        />
      </section>

      <section
        className="panel-grid panels-top teacher-dashboard-grid"
        aria-label="Classes and learner support"
      >
        <Panel eyebrow="Your classes" title="Assigned class summary">
          {classes.length > 0 ? (
            <ul className="class-summary-list">
              {classes.map((classroom) => (
                <li className="class-summary-item" key={classroom.id}>
                  <span>
                    <strong>{classroom.name}</strong>
                    <span>{classroom.academicYear || 'Assigned class'}</span>
                  </span>

                  <StatusBadge tone="positive">
                    {learnersByClass[classroom.id] || 0} learners
                  </StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {loading
                ? 'Loading assigned classes…'
                : 'No classes are currently assigned to your account.'}
            </p>
          )}
        </Panel>

        <Panel eyebrow="Early warning system" title="Learners needing attention">
          {visibleAlerts.length > 0 ? (
            <ul className="learner-list">
              {visibleAlerts.map((alert) => {
                const learner = alert.learner
                const learnerClass =
                  alert.class?.name ||
                  classNames[learner?.classId] ||
                  'Assigned class'

                const suppliedPriority =
                  alert.severity || alert.priority || null

                const priority = ['high', 'medium', 'low'].includes(
                  String(suppliedPriority).toLowerCase()
                )
                  ? String(suppliedPriority).toLowerCase()
                  : null

                return (
                  <LearnerSummaryRow
                    key={alert.id}
                    name={getLearnerName(learner)}
                    className={learnerClass}
                    risk={humanize(
                      alert.alertRule?.name ||
                      alert.alertRule?.alertType ||
                      alert.alertType
                    )}
                    priority={priority}
                  />
                )
              })}
            </ul>
          ) : (
            <p>
              {loading
                ? 'Loading early warnings…'
                : 'There are no active early warnings in your assigned classes.'}
            </p>
          )}
        </Panel>
      </section>

      <section
        className="panel-grid panels-bottom teacher-dashboard-grid"
        aria-label="Assessments and parent communication"
      >
        <Panel eyebrow="Assessment records" title="Recent assessments">
          {recentAssessments.length > 0 ? (
            <ul className="activity-list">
              {recentAssessments.map((assessment) => (
                <RecentActivityItem
                  key={assessment.id}
                  title={assessment.title}
                  detail={`${assessment.schoolClass?.name || classNames[assessment.classId] || 'Assigned class'} · ${assessment._count?.results ?? 0} results recorded`}
                  time={formatDate(assessment.date)}
                />
              ))}
            </ul>
          ) : (
            <p>
              {loading
                ? 'Loading assessments…'
                : 'No assessments have been created for your assigned classes yet.'}
            </p>
          )}
        </Panel>

        <Panel eyebrow="Parent communication" title="Pending parent drafts">
          {visibleDrafts.length > 0 ? (
            <ul className="alert-list">
              {visibleDrafts.map((draft) => {
                const learner = draft.alert?.learner

                const learnerClass =
                  draft.alert?.class?.name ||
                  classNames[learner?.classId] ||
                  'Assigned class'

                return (
                  <AlertItem
                    key={draft.id}
                    title={`${getLearnerName(learner)} · ${draft.language || 'Parent'} message`}
                    detail={`${learnerClass} · ${humanize(draft.status)}`}
                    level="info"
                    time={formatDate(draft.createdAt)}
                  />
                )
              })}
            </ul>
          ) : (
            <p>
              {loading
                ? 'Loading parent drafts…'
                : 'There are no pending parent communication drafts.'}
            </p>
          )}
        </Panel>
      </section>
    </main>
  )
}

export default TeacherDashboardPage
