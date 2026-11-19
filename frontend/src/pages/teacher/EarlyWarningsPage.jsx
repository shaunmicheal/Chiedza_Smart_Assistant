import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'

import Panel from '../../components/common/Panel'
import PageHeading from '../../components/common/PageHeading'
import AlertItem from '../../components/dashboard/AlertItem'

function formatAssessment(value) {
  if (!value || typeof value !== 'object') {
    return value == null ? 'Not available' : String(value)
  }

  const name =
    value.title || value.name || value.assessmentTitle || 'Assessment'
  const score = value.percentage ?? value.score
  const date = value.date
    ? new Date(value.date).toLocaleDateString()
    : ''

  return [
    name,
    score !== undefined ? `${score}%` : '',
    date,
  ].filter(Boolean).join(' · ')
}

function describeEvidence(alert) {
  const evidence =
    alert.evidence && typeof alert.evidence === 'object'
      ? alert.evidence
      : {}

  if (alert.alertType === 'REPEATED_ABSENCES') {
    const count = evidence.absenceCount ?? alert.absencesCount
    const threshold = evidence.threshold
    const period = evidence.observationPeriodDays
    const details = []

    if (count !== undefined) {
      details.push(`${count} recorded absences`)
    }

    if (threshold !== undefined) {
      details.push(`alert threshold: ${threshold}`)
    }

    if (period !== undefined) {
      details.push(`observed over ${period} days`)
    }

    return details.length
      ? details.join(' · ')
      : 'Repeated absences were detected. Review the learner attendance record.'
  }

  if (alert.alertType === 'ACADEMIC_DECLINE') {
    const details = []
    const compared =
      evidence.assessmentsCompared ?? alert.assessmentsCompared
    const threshold =
      evidence.declineThreshold ?? alert.declineThreshold

    if (compared !== undefined) {
      details.push(`${compared} assessments compared`)
    }

    if (threshold !== undefined) {
      details.push(`${threshold}% decline threshold`)
    }

    if (evidence.firstAssessment) {
      details.push(
        `Earlier: ${formatAssessment(evidence.firstAssessment)}`
      )
    }

    if (evidence.lastAssessment) {
      details.push(
        `Latest: ${formatAssessment(evidence.lastAssessment)}`
      )
    }

    return details.length
      ? details.join(' · ')
      : 'A decline in assessment performance was detected. Review the learner results.'
  }

  return 'Review the alert details and the learner record.'
}

function EarlyWarningsPage() {
  const { user } = useAuth()

  const schoolId = user?.memberships?.find(
    (membership) => membership.role === 'TEACHER'
  )?.schoolId

  const [earlyWarnings, setEarlyWarnings] = useState([])
  const [loadingEarlyWarnings, setLoadingEarlyWarnings] = useState(true)
  const [earlyWarningsError, setEarlyWarningsError] = useState('')
  const [processingAlertId, setProcessingAlertId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const loadEarlyWarnings = useCallback(async () => {
    if (!schoolId) {
      setEarlyWarnings([])
      setLoadingEarlyWarnings(false)
      return
    }

    setLoadingEarlyWarnings(true)
    setEarlyWarningsError('')

    try {
      const result = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/early-warning/alerts`,
        {
          query: { status: 'ACTIVE' },
        }
      )

      setEarlyWarnings(
        Array.isArray(result.data) ? result.data : []
      )
    } catch (error) {
      setEarlyWarningsError(
        error.message || 'Unable to load early warnings.'
      )
    } finally {
      setLoadingEarlyWarnings(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadEarlyWarnings()
  }, [loadEarlyWarnings])

  const handleAlertAction = async (alertId, action) => {
    if (!schoolId || !alertId || processingAlertId) return

    setProcessingAlertId(alertId)
    setActionError('')
    setActionSuccess('')

    try {
      const result = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/early-warning/alerts/${encodeURIComponent(alertId)}/${action}`,
        { method: 'PATCH' }
      )

      if (!result.success) {
        throw new Error(
          result.message || 'Unable to update this alert.'
        )
      }

      setEarlyWarnings((current) =>
        current.filter((alert) => alert.id !== alertId)
      )

      setActionSuccess(
        action === 'acknowledge'
          ? 'Alert acknowledged.'
          : 'Alert resolved.'
      )
    } catch (error) {
      setActionError(
        error.message || 'Unable to update this alert.'
      )
    } finally {
      setProcessingAlertId(null)
    }
  }

  if (!schoolId) {
    return (
      <main className="content">
        <PageHeading
          eyebrow="Early Warnings"
          title="Active Alerts"
          description="Your account does not currently have a teacher school membership."
        />
      </main>
    )
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow="Early Warnings"
        title="Active Alerts"
        description="Review attendance and academic alerts for learners in your assigned classes."
      />

      <Panel eyebrow="Assigned classes" title="Active Early Warnings">
        {loadingEarlyWarnings ? (
          <p role="status" aria-live="polite">
            Loading early warnings...
          </p>
        ) : earlyWarningsError ? (
          <div role="alert">
            <p>{earlyWarningsError}</p>
            <button type="button" onClick={loadEarlyWarnings}>
              Retry loading alerts
            </button>
          </div>
        ) : earlyWarnings.length === 0 ? (
          <p role="status">
            There are no active early warnings for your assigned classes.
          </p>
        ) : (
          <ul className="alert-list">
            {earlyWarnings.map((alert) => {
              const learnerName = alert.learner
                ? `${alert.learner.firstName} ${alert.learner.lastName}`
                : 'Class-level alert'

              const className =
                alert.class?.name || 'Class not specified'

              const title =
                alert.alertRule?.name ||
                (alert.alertType === 'REPEATED_ABSENCES'
                  ? 'Repeated absences'
                  : alert.alertType === 'ACADEMIC_DECLINE'
                    ? 'Academic decline'
                    : 'Early warning')

              const isProcessing = processingAlertId === alert.id

              return (
                <AlertItem
                  key={alert.id}
                  title={title}
                  detail={`${learnerName} · ${className} · ${describeEvidence(alert)}`}
                  level="info"
                  time={
                    alert.createdAt
                      ? new Date(alert.createdAt).toLocaleDateString()
                      : ''
                  }
                  action={
                    <div className="alert-actions">
                      <button
                        type="button"
                        disabled={Boolean(processingAlertId)}
                        onClick={() =>
                          handleAlertAction(alert.id, 'acknowledge')
                        }
                      >
                        {isProcessing ? 'Updating…' : 'Acknowledge'}
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(processingAlertId)}
                        onClick={() =>
                          handleAlertAction(alert.id, 'resolve')
                        }
                      >
                        Resolve
                      </button>
                    </div>
                  }
                />
              )
            })}
          </ul>
        )}

        {actionError && (
          <p role="alert" className="error">
            {actionError}
          </p>
        )}

        {actionSuccess && (
          <p role="status" className="success">
            {actionSuccess}
          </p>
        )}
      </Panel>
    </main>
  )
}

export default EarlyWarningsPage
