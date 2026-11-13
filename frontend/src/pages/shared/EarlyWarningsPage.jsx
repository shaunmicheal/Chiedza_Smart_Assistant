import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'

import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'

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

const formatDateRange = (start, end) => {
  if (!start && !end) return 'Date range unavailable'
  if (!end) return formatDate(start)
  if (!start) return formatDate(end)

  return `${formatDate(start)} – ${formatDate(end)}`
}

const formatStatus = (status) => {
  if (!status) return 'Unknown'

  return status.charAt(0) + status.slice(1).toLowerCase()
}

const formatAlertType = (type) => {
  if (type === 'REPEATED_ABSENCES') return 'Repeated absences'
  if (type === 'ACADEMIC_DECLINE') return 'Academic decline'

  return type?.replaceAll('_', ' ').toLowerCase() ?? 'Early warning'
}

const getLearnerName = (alert) => {
  const learner = alert?.learner

  if (!learner) return 'Learner unavailable'

  return [learner.firstName, learner.lastName].filter(Boolean).join(' ')
    || 'Learner unavailable'
}

const getEvidence = (alert) => {
  if (!alert?.evidence || typeof alert.evidence !== 'object') return {}

  return alert.evidence
}

const getErrorMessage = (error, fallback) => {
  return error?.message || fallback
}

const getList = (response) => {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error('The server returned an invalid alerts response.')
  }

  return response.data
}

function EvidenceDetails({ alert }) {
  const evidence = getEvidence(alert)

  if (alert.alertType === 'REPEATED_ABSENCES') {
    const absenceCount = evidence.absenceCount ?? alert.absencesCount
    const threshold = evidence.threshold
    const observationPeriod = evidence.observationPeriodDays
    const start = evidence.absenceDateRange ?? alert.absenceDateRange
    const end = evidence.dateRangeEnd

    return (
      <div className="evidence-section">
        <h3>Attendance evidence</h3>

        <div className="alert-record-evidence">
          <div>
            <span>Recorded absences</span>
            <strong>{absenceCount ?? 'Not available'}</strong>
          </div>

          <div>
            <span>Configured threshold</span>
            <strong>{threshold != null ? `${threshold} absences` : 'Not available'}</strong>
          </div>

          <div>
            <span>Observation period</span>
            <strong>
              {observationPeriod != null
                ? `${observationPeriod} days`
                : 'Not available'}
            </strong>
          </div>

          <div>
            <span>Date range</span>
            <strong>{formatDateRange(start, end)}</strong>
          </div>
        </div>
      </div>
    )
  }

  if (alert.alertType === 'ACADEMIC_DECLINE') {
    const first = evidence.firstAssessment
    const last = evidence.lastAssessment

    return (
      <div className="evidence-section">
        <h3>Assessment evidence</h3>

        <div className="alert-record-evidence">
          <div>
            <span>Assessments compared</span>
            <strong>
              {evidence.assessmentsCompared ?? alert.assessmentsCompared ?? 'Not available'}
            </strong>
          </div>

          <div>
            <span>Required decline</span>
            <strong>
              {evidence.declineThreshold ?? alert.declineThreshold ?? 'Not available'}
              {evidence.declineThreshold != null || alert.declineThreshold != null
                ? '%'
                : ''}
            </strong>
          </div>
        </div>

        <div className="alert-assessment-comparison">
          <div>
            <span>Earlier assessment</span>
            <h4>{first?.title || 'Assessment unavailable'}</h4>
            <strong>
              {first?.percentage != null
                ? `${first.percentage}%`
                : 'Score unavailable'}
            </strong>
            <p>
              {first?.score != null && first?.maxScore != null
                ? `${first.score} / ${first.maxScore}`
                : 'Score details unavailable'}
            </p>
            <small>{formatDate(first?.date)}</small>
          </div>

          <div>
            <span>Latest assessment</span>
            <h4>{last?.title || 'Assessment unavailable'}</h4>
            <strong>
              {last?.percentage != null
                ? `${last.percentage}%`
                : 'Score unavailable'}
            </strong>
            <p>
              {last?.score != null && last?.maxScore != null
                ? `${last.score} / ${last.maxScore}`
                : 'Score details unavailable'}
            </p>
            <small>{formatDate(last?.date)}</small>
          </div>
        </div>

        {evidence.firstAssessment && evidence.lastAssessment && (
          <p className="alert-evidence-summary">
            The recorded performance declined by{' '}
            <strong>
              {Math.round(
                evidence.firstAssessment.percentage -
                evidence.lastAssessment.percentage
              )} percentage points
            </strong>{' '}
            between these assessments.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="evidence-section">
      <h3>Evidence</h3>
      <p>Detailed evidence is not available for this alert.</p>
    </div>
  )
}

function EarlyWarningsPage() {
  const { activeMembership } = useAuth()

  const schoolId = activeMembership?.schoolId
  const role = activeMembership?.role
  const isTeacher = role === 'TEACHER'

  const [alerts, setAlerts] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [detailRefreshKey, setDetailRefreshKey] = useState(0)

  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [resolveId, setResolveId] = useState('')

  const alertsPath = schoolId
    ? `/schools/${encodeURIComponent(schoolId)}/early-warning/alerts`
    : ''

  const loadAlerts = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      setError('Your account is not connected to a school membership.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest(alertsPath)
      const data = getList(response)

      setAlerts(data)

      setSelectedId((currentId) => {
        if (currentId && data.some((alert) => alert.id === currentId)) {
          return currentId
        }

        return data[0]?.id ?? ''
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to load early warnings.'))
      setAlerts([])
      setSelectedId('')
    } finally {
      setLoading(false)
    }
  }, [alertsPath, schoolId])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  useEffect(() => {
    if (!schoolId || !selectedId) {
      setSelectedDetail(null)
      return
    }

    let cancelled = false

    const loadDetail = async () => {
      setDetailLoading(true)

      try {
        const response = await apiRequest(
          `${alertsPath}/${encodeURIComponent(selectedId)}`
        )

        if (!response?.success || !response.data) {
          throw new Error('The server returned an invalid alert detail response.')
        }

        if (!cancelled) {
          setSelectedDetail(response.data)
        }
      } catch (requestError) {
        if (!cancelled) {
          setSelectedDetail(null)
          setFeedback(
            getErrorMessage(requestError, 'Unable to load alert details.')
          )
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
        }
      }
    }

    loadDetail()

    return () => {
      cancelled = true
    }
  }, [alertsPath, schoolId, selectedId, detailRefreshKey])

  const classOptions = useMemo(() => {
    const classes = new Map()

    alerts.forEach((alert) => {
      if (alert.class?.id) {
        classes.set(alert.class.id, alert.class.name || 'Unnamed class')
      }
    })

    return Array.from(classes.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [alerts])

  const visibleAlerts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return alerts.filter((alert) => {
      if (typeFilter !== 'all' && alert.alertType !== typeFilter) return false
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false
      if (classFilter !== 'all' && alert.class?.id !== classFilter) return false

      if (query) {
        const learnerName = getLearnerName(alert).toLowerCase()
        const className = (alert.class?.name || '').toLowerCase()

        if (!learnerName.includes(query) && !className.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [alerts, classFilter, search, statusFilter, typeFilter])

  useEffect(() => {
    if (visibleAlerts.length === 0) {
      if (selectedId) setSelectedId('')
      return
    }

    if (!visibleAlerts.some((alert) => alert.id === selectedId)) {
      setSelectedId(visibleAlerts[0].id)
    }
  }, [visibleAlerts, selectedId])

  const selectedAlert = visibleAlerts.find(
    (alert) => alert.id === selectedId
  ) ?? visibleAlerts[0] ?? null

  const activeCount = alerts.filter((alert) => alert.status === 'ACTIVE').length
  const acknowledgedCount = alerts.filter(
    (alert) => alert.status === 'ACKNOWLEDGED'
  ).length
  const resolvedCount = alerts.filter(
    (alert) => alert.status === 'RESOLVED'
  ).length

  const handleStatusChange = async (alertId, action) => {
    if (!schoolId || !alertId || actionLoading) return

    setActionLoading(true)
    setFeedback('')

    try {
      const response = await apiRequest(
        `${alertsPath}/${encodeURIComponent(alertId)}/${action}`,
        { method: 'PATCH' }
      )

      if (!response?.success) {
        throw new Error('The server could not update this alert.')
      }

      setFeedback(
        action === 'acknowledge'
          ? 'Alert acknowledged successfully.'
          : 'Alert resolved successfully.'
      )

      setResolveId('')
      setDetailRefreshKey((current) => current + 1)
      await loadAlerts()
    } catch (requestError) {
      setFeedback(
        getErrorMessage(requestError, 'Unable to update this alert.')
      )
    } finally {
      setActionLoading(false)
    }
  }

  const history = selectedDetail?.alertStatusHistories ?? []

  return (
    <div className="page-content">
      <PageHeading
        title="Early warnings"
        description={
          isTeacher
            ? 'Review attendance and academic concerns for your assigned classes.'
            : 'Monitor learner attendance and academic performance concerns across your school.'
        }
      />

      {feedback && (
        <div className="alert-feedback" role="status">
          {feedback}
          <button
            type="button"
            onClick={() => setFeedback('')}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={loadAlerts}>
            Try again
          </button>
        </div>
      )}

      <div className="alert-summary-grid">
        <div className="alert-summary-card">
          <span>Active alerts</span>
          <strong>{activeCount}</strong>
          <small>Require attention</small>
        </div>

        <div className="alert-summary-card">
          <span>Acknowledged</span>
          <strong>{acknowledgedCount}</strong>
          <small>Being followed up</small>
        </div>

        <div className="alert-summary-card">
          <span>Resolved</span>
          <strong>{resolvedCount}</strong>
          <small>Marked as addressed</small>
        </div>

        <div className="alert-summary-card">
          <span>Total alerts</span>
          <strong>{alerts.length}</strong>
          <small>Available records</small>
        </div>
      </div>

      <div className="alert-workspace">
        <Panel>
          <div className="alert-list-heading">
            <div>
              <h2>Alert records</h2>
              <p>{visibleAlerts.length} matching records</p>
            </div>

            <button
              type="button"
              className="alert-refresh-button"
              onClick={loadAlerts}
              disabled={loading}
              aria-label="Refresh alerts"
            >
              <RefreshCw size={17} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="alert-filter-controls">
            <label className="alert-search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search learners or classes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label>
              <span className="sr-only">Alert type</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">All alert types</option>
                <option value="REPEATED_ABSENCES">Repeated absences</option>
                <option value="ACADEMIC_DECLINE">Academic decline</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Alert status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Class</span>
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
              >
                <option value="all">All classes</option>
                {classOptions.map((classOption) => (
                  <option key={classOption.id} value={classOption.id}>
                    {classOption.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="alert-empty-state">
              <RefreshCw size={22} className="spin" />
              <p>Loading early warnings...</p>
            </div>
          ) : visibleAlerts.length === 0 ? (
            <div className="alert-empty-state">
              <ShieldCheck size={28} />
              <h3>No matching alerts</h3>
              <p>
                {alerts.length === 0
                  ? 'There are no early warning records available for your account yet.'
                  : 'Try changing your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="alert-record-list">
              {visibleAlerts.map((alert) => (
                <button
                  type="button"
                  key={alert.id}
                  className={`alert-record ${selectedAlert?.id === alert.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(alert.id)}
                >
                  <span
                    className={`alert-record-indicator ${
                      alert.alertType === 'ACADEMIC_DECLINE' ? 'low' : 'high'
                    }`}
                  />

                  <span className="alert-record-main">
                    <strong>{getLearnerName(alert)}</strong>
                    <span>{alert.class?.name || 'Class unavailable'}</span>
                    <span>{formatAlertType(alert.alertType)}</span>
                  </span>

                  <span className="alert-record-meta">
                    <span className={`alert-status status-${alert.status?.toLowerCase()}`}>
                      {formatStatus(alert.status)}
                    </span>
                    <small>{formatDate(alert.createdAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          {!selectedAlert ? (
            <div className="alert-empty-state">
              <AlertTriangle size={26} />
              <h3>Select an alert</h3>
              <p>Choose an alert record to review its evidence and history.</p>
            </div>
          ) : (
            <div className="alert-detail">
              <div className="alert-detail-heading">
                <div>
                  <span className="alert-detail-type">
                    {formatAlertType(selectedAlert.alertType)}
                  </span>
                  <h2>{getLearnerName(selectedAlert)}</h2>
                  <p>{selectedAlert.class?.name || 'Class unavailable'}</p>
                </div>

                <span className={`alert-status status-${selectedAlert.status?.toLowerCase()}`}>
                  {formatStatus(selectedAlert.status)}
                </span>
              </div>

              <div className="alert-detail-meta">
                <div>
                  <span>Created</span>
                  <strong>{formatDate(selectedAlert.createdAt)}</strong>
                </div>

                <div>
                  <span>Alert rule</span>
                  <strong>
                    {selectedAlert.alertRule?.name || 'Rule unavailable'}
                  </strong>
                </div>
              </div>

              {detailLoading ? (
                <div className="alert-empty-state">
                  <RefreshCw size={20} className="spin" />
                  <p>Loading alert details...</p>
                </div>
              ) : (
                <>
                  <EvidenceDetails alert={selectedDetail || selectedAlert} />

                  <div className="evidence-section">
                    <h3>Status history</h3>

                    {history.length === 0 ? (
                      <p>No status changes have been recorded yet.</p>
                    ) : (
                      <div className="alert-history-list">
                        {history.map((item) => (
                          <div className="alert-history-item" key={item.id}>
                            <span className="alert-history-icon">
                              <Clock3 size={16} />
                            </span>

                            <div>
                              <strong>
                                {formatStatus(item.fromStatus)} →{' '}
                                {formatStatus(item.toStatus)}
                              </strong>
                              <p>
                                {formatDate(item.changedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="alert-actions">
                    {selectedAlert.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={actionLoading}
                        onClick={() =>
                          handleStatusChange(selectedAlert.id, 'acknowledge')
                        }
                      >
                        <Check size={17} />
                        Acknowledge
                      </button>
                    )}

                    {['ACTIVE', 'ACKNOWLEDGED'].includes(selectedAlert.status) && (
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={actionLoading}
                        onClick={() => setResolveId(selectedAlert.id)}
                      >
                        <ShieldCheck size={17} />
                        Resolve alert
                      </button>
                    )}

                    {actionLoading && <span>Updating alert...</span>}
                  </div>
                </>
              )}
            </div>
          )}
        </Panel>
      </div>

      {resolveId && (
        <ConfirmDialog
          title="Resolve this alert?"
          description="This will mark the alert as resolved and record the status change in its history."
          confirmLabel="Resolve alert"
          busy={actionLoading}
          onCancel={() => setResolveId('')}
          onConfirm={() => handleStatusChange(resolveId, 'resolve')}
        />
      )}
    </div>
  )
}

export default EarlyWarningsPage
