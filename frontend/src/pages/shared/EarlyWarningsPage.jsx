import { useMemo, useState } from 'react'
import { Check, Clock3, Search, ShieldCheck } from 'lucide-react'
import { demoAlerts, demoClasses, demoNotice } from '../../data/mock/operations'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import DemoNotice from '../../components/common/DemoNotice'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import StatusBadge from '../../components/common/StatusBadge'

const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })
const formatDate = (date) => dateFormatter.format(new Date(`${date}T00:00:00`))

function EarlyWarningsPage({ role }) {
  const isTeacher = role === 'teacher'
  const [alerts, setAlerts] = useState(demoAlerts)
  const [selectedId, setSelectedId] = useState(demoAlerts[0]?.id ?? '')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [resolveId, setResolveId] = useState('')
  const [feedback, setFeedback] = useState('')

  const visibleAlerts = useMemo(() => alerts.filter((alert) => {
    if (isTeacher && !['Grade 4A', 'Grade 5B'].includes(alert.className)) return false
    if (typeFilter !== 'all' && alert.category !== typeFilter) return false
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false
    if (classFilter !== 'all' && alert.className !== classFilter) return false
    return alert.learner.toLowerCase().includes(search.trim().toLowerCase())
  }), [alerts, classFilter, isTeacher, search, statusFilter, typeFilter])

  const selectedAlert = visibleAlerts.find((alert) => alert.id === selectedId)
    ?? visibleAlerts[0]

  const counts = useMemo(() => {
    const scoped = alerts.filter((alert) => !isTeacher || ['Grade 4A', 'Grade 5B'].includes(alert.className))
    return {
      active: scoped.filter((alert) => alert.status === 'Active').length,
      attendance: scoped.filter((alert) => alert.category === 'attendance' && alert.status === 'Active').length,
      academic: scoped.filter((alert) => alert.category === 'academic' && alert.status === 'Active').length,
      acknowledged: scoped.filter((alert) => alert.status === 'Acknowledged').length,
      resolved: scoped.filter((alert) => alert.status === 'Resolved').length,
    }
  }, [alerts, isTeacher])

  function updateAlert(alertId, nextStatus) {
    setAlerts((current) => current.map((alert) => {
      if (alert.id !== alertId) return alert
      return {
        ...alert,
        status: nextStatus,
        history: [
          ...alert.history,
          {
            date: new Date().toISOString().slice(0, 10),
            action: nextStatus,
            by: `${isTeacher ? 'Teacher' : 'Administrator'} · local demo`,
          },
        ],
      }
    }))
    setFeedback(`Alert ${alertId} marked ${nextStatus.toLowerCase()} locally. This change is not saved to a school system.`)
    setResolveId('')
  }

  const classes = demoClasses.filter((item) => !isTeacher || ['Grade 4A', 'Grade 5B'].includes(item.name))

  return (
    <main className="content">
      <PageHeading
        eyebrow={isTeacher ? 'Assigned classes' : 'School-level monitoring'}
        title="Early-warning alerts"
        description={isTeacher
          ? 'Review demonstration alerts for assigned classes only.'
          : 'Review repeated absences and declining assessment results across the demonstration school.'}
      />
      <DemoNotice>{demoNotice} Alert actions update this page locally only.</DemoNotice>
      {feedback && <p className="form-feedback" role="status">{feedback}</p>}

      <section className="stats-grid alert-summary-grid" aria-label="Alert summary">
        <article className="summary-card"><span>Active alerts</span><strong>{counts.active}</strong><ShieldCheck size={18} aria-hidden="true" /></article>
        <article className="summary-card"><span>Repeated absences</span><strong>{counts.attendance}</strong><Clock3 size={18} aria-hidden="true" /></article>
        <article className="summary-card"><span>Academic decline</span><strong>{counts.academic}</strong><span className="summary-icon">%</span></article>
        <article className="summary-card"><span>Acknowledged</span><strong>{counts.acknowledged}</strong><Check size={18} aria-hidden="true" /></article>
        <article className="summary-card"><span>Resolved</span><strong>{counts.resolved}</strong><Check size={18} aria-hidden="true" /></article>
      </section>

      <Panel eyebrow="Alert inbox" title="Find an alert">
        <div className="filter-grid alert-filters">
          <FormField id="alert-search" label="Search learner">
            <div className="input-with-icon">
              <Search size={16} aria-hidden="true" />
              <input
                id="alert-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Learner name"
              />
            </div>
          </FormField>
          <FormField id="alert-type-filter" label="Alert type">
            <select id="alert-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All alert types</option>
              <option value="attendance">Repeated absences</option>
              <option value="academic">Declining marks</option>
            </select>
          </FormField>
          <FormField id="alert-status-filter" label="Status">
            <select id="alert-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>
          </FormField>
          <FormField id="alert-class-filter" label="Class">
            <select id="alert-class-filter" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="all">All classes</option>
              {classes.map((classroom) => <option key={classroom.id} value={classroom.name}>{classroom.name}</option>)}
            </select>
          </FormField>
        </div>
      </Panel>

      <section className="alert-workspace" aria-label="Alert list and details">
        <Panel eyebrow={`${visibleAlerts.length} matching`} title="Alerts">
          {visibleAlerts.length === 0 ? (
            <EmptyState title="No alerts match these filters" description="Try a different learner name, alert type, status, or class." />
          ) : (
            <ul className="alert-record-list">
              {visibleAlerts.map((alert) => (
                <li key={alert.id}>
                  <button
                    type="button"
                    className={`alert-record ${selectedAlert?.id === alert.id ? 'selected' : ''}`}
                    onClick={() => setSelectedId(alert.id)}
                    aria-current={selectedAlert?.id === alert.id ? 'true' : undefined}
                  >
                    <span className={`alert-record-indicator ${alert.severity}`} aria-hidden="true" />
                    <span className="alert-record-main">
                      <strong>{alert.learner}</strong>
                      <span>{alert.className} · {alert.type}</span>
                      <span className="alert-record-evidence">{alert.evidence}</span>
                    </span>
                    <span className="alert-record-meta">
                      <StatusBadge tone={`status-${alert.status.toLowerCase()}`}>{alert.status}</StatusBadge>
                      <time dateTime={alert.detected}>{formatDate(alert.detected)}</time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {selectedAlert && (
          <Panel
            eyebrow={`${selectedAlert.id} · ${selectedAlert.className}`}
            title={selectedAlert.learner}
            className="alert-detail-panel"
          >
            <div className="detail-meta">
              <StatusBadge tone={`status-${selectedAlert.status.toLowerCase()}`}>{selectedAlert.status}</StatusBadge>
              <StatusBadge tone={`severity-${selectedAlert.severity}`}>{selectedAlert.type}</StatusBadge>
              <span>Detected {formatDate(selectedAlert.detected)}</span>
            </div>
            <div className="evidence-explanation">
              <strong>Why this alert was triggered</strong>
              <p>{selectedAlert.explanation}</p>
              <p>{selectedAlert.evidence}</p>
            </div>

            {selectedAlert.category === 'attendance' ? (
              <section className="evidence-section" aria-label="Attendance evidence">
                <h4>Attendance evidence</h4>
                <ul className="evidence-list">
                  {selectedAlert.attendanceEvidence.map((item) => (
                    <li key={`${selectedAlert.id}-${item.date}`}>
                      <time dateTime={item.date}>{formatDate(item.date)}</time>
                      <StatusBadge tone="status-active">{item.status}</StatusBadge>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="evidence-section" aria-label="Assessment history evidence">
                <h4>Assessment history</h4>
                <ul className="evidence-list">
                  {selectedAlert.assessmentHistory.map((item) => (
                    <li key={`${selectedAlert.id}-${item.date}`}>
                      <span><strong>{item.title}</strong><small>{formatDate(item.date)}</small></span>
                      <strong>{Math.round((item.score / item.maximum) * 100)}%</strong>
                    </li>
                  ))}
                </ul>
                {selectedAlert.assessmentHistory.length > 1 && (
                  <p className="comparison-note">
                    Change: {Math.round((selectedAlert.assessmentHistory.at(-1).score / selectedAlert.assessmentHistory.at(-1).maximum) * 100)
                      - Math.round((selectedAlert.assessmentHistory[0].score / selectedAlert.assessmentHistory[0].maximum) * 100)} percentage points.
                  </p>
                )}
              </section>
            )}

            <section className="evidence-section" aria-label="Alert history">
              <h4>Alert history</h4>
              <ul className="activity-list">
                {selectedAlert.history.map((entry, index) => (
                  <li className="activity-item" key={`${entry.date}-${entry.action}-${index}`}>
                    <span className="activity-marker" aria-hidden="true" />
                    <span className="activity-copy"><strong>{entry.action}</strong><span>{entry.by}</span></span>
                    <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                  </li>
                ))}
              </ul>
            </section>
            <div className="alert-actions">
              {selectedAlert.status === 'Active' && (
                <button className="secondary-button" type="button" onClick={() => updateAlert(selectedAlert.id, 'Acknowledged')}>
                  <Check size={16} aria-hidden="true" /> Acknowledge alert
                </button>
              )}
              {selectedAlert.status !== 'Resolved' && (
                <button className="danger-button" type="button" onClick={() => setResolveId(selectedAlert.id)}>
                  Resolve alert
                </button>
              )}
            </div>
          </Panel>
        )}
      </section>
      {resolveId && (
        <ConfirmDialog
          title="Resolve this alert?"
          description="This will mark the demonstration alert as resolved in this page only. No school record will be changed."
          confirmLabel="Resolve alert"
          onCancel={() => setResolveId('')}
          onConfirm={() => updateAlert(resolveId, 'Resolved')}
        />
      )}
    </main>
  )
}

export default EarlyWarningsPage
