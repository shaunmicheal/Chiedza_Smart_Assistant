import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'

const formatDate = (value) => {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function ParentCommunicationPage({ role }) {
  const { user, activeMembership } = useAuth()
  const expectedRole = role === 'teacher' ? 'TEACHER' : 'SCHOOL_ADMIN'

  const schoolId =
    user?.memberships?.find((membership) => membership.role === expectedRole)?.schoolId ||
    activeMembership?.schoolId

  const [drafts, setDrafts] = useState([])
  const [alerts, setAlerts] = useState([])
  const [selectedAlertId, setSelectedAlertId] = useState('')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState(null)
  const [draftText, setDraftText] = useState('')
  const [saving, setSaving] = useState(false)
  const [approvingDraftId, setApprovingDraftId] = useState(null)
  const [pageError, setPageError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadData = useCallback(async () => {
    if (!schoolId) {
      setDrafts([])
      setAlerts([])
      setLoading(false)
      setPageError('Your account is not linked to a school.')
      return
    }

    setLoading(true)
    setPageError('')

    try {
      const [draftResult, alertResult] = await Promise.all([
        apiRequest(`/schools/${encodeURIComponent(schoolId)}/drafts`),
        apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/early-warning/alerts?status=ACTIVE`
        ),
      ])

      setDrafts(Array.isArray(draftResult.data) ? draftResult.data : [])
      setAlerts(Array.isArray(alertResult.data) ? alertResult.data : [])
    } catch (error) {
      setPageError(error.message || 'Unable to load communication data.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGenerateDraft = async (event) => {
    event.preventDefault()
    setActionError('')
    setSuccessMessage('')

    if (!selectedAlertId) {
      setActionError('Select an active alert first.')
      return
    }

    setGenerating(true)

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/drafts/generate`,
        {
          method: 'POST',
          body: {
            alertId: selectedAlertId,
            language,
          },
        }
      )

      setSelectedAlertId('')
      setSuccessMessage('Communication draft generated and saved.')
      await loadData()
    } catch (error) {
      setActionError(error.message || 'Unable to generate the draft.')
    } finally {
      setGenerating(false)
    }
  }

  const startEditing = (draft) => {
    setEditingDraftId(draft.id)
    setDraftText(draft.draftText || '')
    setActionError('')
    setSuccessMessage('')
  }

  const cancelEditing = () => {
    setEditingDraftId(null)
    setDraftText('')
  }

  const handleSaveEdit = async (event) => {
    event.preventDefault()
    setActionError('')
    setSuccessMessage('')

    if (!draftText.trim()) {
      setActionError('The message cannot be empty.')
      return
    }

    setSaving(true)

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/drafts/${encodeURIComponent(editingDraftId)}`,
        {
          method: 'PATCH',
          body: { draftText: draftText.trim() },
        }
      )

      cancelEditing()
      setSuccessMessage('Draft updated successfully.')
      await loadData()
    } catch (error) {
      setActionError(error.message || 'Unable to save the draft.')
    } finally {
      setSaving(false)
    }
  }

  const handleApproveDraft = async (draftId) => {
    const confirmed = window.confirm(
      'Approve this parent communication draft? Approval does not send or deliver the message.'
    )

    if (!confirmed) return

    setApprovingDraftId(draftId)
    setActionError('')
    setSuccessMessage('')

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/drafts/${encodeURIComponent(draftId)}/approve`,
        { method: 'PATCH' }
      )

      setSuccessMessage('Draft approved. It has not been sent to the parent.')
      await loadData()
    } catch (error) {
      setActionError(error.message || 'Unable to approve the draft.')
    } finally {
      setApprovingDraftId(null)
    }
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow={role === 'teacher' ? 'Assigned classes' : 'School communication'}
        title="Parent communication"
        description="Prepare, review and approve supportive messages about learner progress and early-warning alerts."
      />

      <Panel eyebrow="New communication" title="Generate a message draft">
        <form onSubmit={handleGenerateDraft} className="form-inline">
          <div className="form-field">
            <label htmlFor="draft-alert">Active alert</label>
            <select
              id="draft-alert"
              value={selectedAlertId}
              onChange={(event) => setSelectedAlertId(event.target.value)}
              disabled={generating || alerts.length === 0}
              required
            >
              <option value="">Select an alert</option>
              {alerts.map((alert) => (
                <option key={alert.id} value={alert.id}>
                  {alert.learner
                    ? `${alert.learner.firstName} ${alert.learner.lastName}`
                    : alert.class?.name || 'Learner alert'}
                  {' — '}
                  {alert.alertRule?.name || alert.alertRule?.alertType || 'Early warning'}
                </option>
              ))}
            </select>
            {alerts.length === 0 && (
              <small className="field-hint">
                No active alerts are currently available for your account.
              </small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="draft-language">Message language</label>
            <select
              id="draft-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              disabled={generating}
            >
              <option value="en">English</option>
              <option value="sn">Shona</option>
            </select>
          </div>

          <button type="submit" disabled={generating || alerts.length === 0}>
            {generating ? 'Generating…' : 'Generate draft'}
          </button>
        </form>
        <p className="field-hint">
          Review generated text carefully before approving it. Approval does not send a notification.
        </p>
      </Panel>

      {actionError && <p className="form-feedback" role="alert">{actionError}</p>}
      {successMessage && <p className="form-feedback" role="status">{successMessage}</p>}
      {pageError && <p className="form-feedback" role="alert">{pageError}</p>}

      <Panel eyebrow="Saved communication" title="Message drafts">
        {loading ? (
          <p role="status">Loading communication drafts…</p>
        ) : pageError ? (
          <button type="button" onClick={loadData}>Try again</button>
        ) : drafts.length === 0 ? (
          <p role="status">No communication drafts have been created yet.</p>
        ) : (
          <div className="draft-list">
            {drafts.map((draft) => {
              const learner = draft.alert?.learner
              const className = draft.alert?.class?.name || 'Class not specified'
              const learnerName = learner
                ? `${learner.firstName} ${learner.lastName}`
                : 'Learner not specified'
              const alertName =
                draft.alert?.alertRule?.name ||
                draft.alert?.alertType ||
                'Early warning'

              return (
                <article key={draft.id} className="draft-item">
                  <div>
                    <h3>{learnerName}</h3>
                    <p>
                      {className} · {alertName} · {draft.language === 'sn' ? 'Shona' : 'English'}
                    </p>
                    <p>
                      Status: <strong>{draft.status}</strong>
                    </p>
                    <small>
                      Created {formatDate(draft.createdAt)}
                      {draft.createdBy
                        ? ` · ${draft.createdBy.firstName} ${draft.createdBy.lastName}`
                        : ''}
                    </small>
                  </div>

                  {editingDraftId === draft.id ? (
                    <form onSubmit={handleSaveEdit}>
                      <label htmlFor={`draft-text-${draft.id}`}>
                        Parent communication message
                      </label>
                      <textarea
                        id={`draft-text-${draft.id}`}
                        value={draftText}
                        onChange={(event) => setDraftText(event.target.value)}
                        rows={7}
                        maxLength={5000}
                        required
                      />
                      <div className="form-inline">
                        <button type="submit" disabled={saving}>
                          {saving ? 'Saving…' : 'Save changes'}
                        </button>
                        <button type="button" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="draft-content">{draft.draftText}</p>
                      {draft.status === 'DRAFT' && (
                        <div className="form-inline">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => startEditing(draft)}
                          >
                            Edit message
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleApproveDraft(draft.id)}
                            disabled={Boolean(approvingDraftId)}
                          >
                            {approvingDraftId === draft.id ? 'Approving…' : 'Approve draft'}
                          </button>
                        </div>
                      )}
                      {draft.status === 'APPROVED' && (
                        <p className="field-hint">
                          Approved. This message has not been sent or delivered.
                        </p>
                      )}
                    </>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </Panel>
    </main>
  )
}

export default ParentCommunicationPage
