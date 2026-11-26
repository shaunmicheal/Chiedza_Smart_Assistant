import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  Check,
  Clock3,
  RefreshCw,
  X,
} from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import EmptyState from '../components/common/EmptyState'
import { apiRequest } from '../lib/api'
import './PlatformApplicationsPage.css'

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED']

function formatDate(value) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function PlatformApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedFilter = searchParams.get('status')
  const initialFilter = FILTERS.includes(requestedFilter) ? requestedFilter : 'PENDING'
  const [applications, setApplications] = useState([])
  const [filter, setFilter] = useState(initialFilter)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [rejectingId, setRejectingId] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadApplications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/platform/applications', {
        query: { status: filter === 'ALL' ? undefined : filter },
      })

      setApplications(Array.isArray(result.data) ? result.data : [])
    } catch (requestError) {
      setError(requestError.message || 'Unable to load school applications.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  useEffect(() => {
    const requested = searchParams.get('status')
    const nextFilter = FILTERS.includes(requested) ? requested : 'PENDING'
    if (nextFilter !== filter) setFilter(nextFilter)
  }, [searchParams, filter])

  const changeFilter = (status) => {
    setFilter(status)
    const nextParams = new URLSearchParams(searchParams)
    if (status === 'PENDING') {
      nextParams.delete('status')
    } else {
      nextParams.set('status', status)
    }
    setSearchParams(nextParams)
  }

  const approveApplication = async (application) => {
    const confirmed = window.confirm(
      `Approve ${application.schoolName}? This creates an approved school, but school access remains inactive until you activate it separately.`
    )

    if (!confirmed) return

    setBusyId(application.id)
    setError('')
    setNotice('')

    try {
      const result = await apiRequest(
        `/platform/applications/${encodeURIComponent(application.id)}/approve`,
        { method: 'POST', body: {} }
      )

      setNotice(result.message || `${application.schoolName} was approved.`)
      await loadApplications()
    } catch (requestError) {
      setError(requestError.message || 'Unable to approve this application.')
    } finally {
      setBusyId('')
    }
  }

  const rejectApplication = async (applicationId) => {
    if (rejectionReason.trim().length < 5) {
      setError('Please provide a rejection reason of at least five characters.')
      return
    }

    setBusyId(applicationId)
    setError('')
    setNotice('')

    try {
      const result = await apiRequest(
        `/platform/applications/${encodeURIComponent(applicationId)}/reject`,
        {
          method: 'POST',
          body: { reason: rejectionReason.trim() },
        }
      )

      setNotice(result.message || 'Application rejected.')
      setRejectingId('')
      setRejectionReason('')
      await loadApplications()
    } catch (requestError) {
      setError(requestError.message || 'Unable to reject this application.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="content platform-applications">
      <PageHeading
        eyebrow="Platform administration"
        title="School applications"
        description="Review applications submitted by schools that want to join Chiedza."
      >
        <button
          type="button"
          className="secondary-button"
          onClick={loadApplications}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </PageHeading>

      <div className="application-filter-row" aria-label="Filter applications">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={`application-filter ${filter === status ? 'selected' : ''}`}
            onClick={() => changeFilter(status)}
            aria-pressed={filter === status}
          >
            {status === 'ALL' ? 'All applications' : status.toLowerCase()}
          </button>
        ))}
      </div>

      {error && <p className="platform-feedback error" role="alert">{error}</p>}
      {notice && <p className="platform-feedback success" role="status">{notice}</p>}

      {loading ? (
        <div className="application-loading" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Loading applications…
        </div>
      ) : applications.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={Building2}
            title="No applications found"
            description={
              filter === 'PENDING'
                ? 'There are no school applications waiting for review.'
                : 'There are no applications matching this filter.'
            }
          />
        </section>
      ) : (
        <div className="application-list">
          {applications.map((application) => {
            const isPending = application.status === 'PENDING'
            const isBusy = busyId === application.id

            return (
              <article className="panel application-card" key={application.id}>
                <div className="application-card-heading">
                  <div className="application-school-icon">
                    <Building2 size={21} aria-hidden="true" />
                  </div>

                  <div className="application-school-title">
                    <h3>{application.schoolName}</h3>
                    <p>Submitted {formatDate(application.createdAt)}</p>
                  </div>

                  <span className={`application-status ${application.status.toLowerCase()}`}>
                    {application.status}
                  </span>
                </div>

                <div className="application-details">
                  <div>
                    <span className="application-detail-label">Applicant</span>
                    <strong>
                      {application.applicantFirstName} {application.applicantLastName}
                    </strong>
                  </div>

                  <div>
                    <span className="application-detail-label">Applicant email</span>
                    <strong>{application.applicantEmail}</strong>
                  </div>

                  <div>
                    <span className="application-detail-label">School contact</span>
                    <strong>{application.schoolEmail || 'Not provided'}</strong>
                  </div>

                  <div>
                    <span className="application-detail-label">Phone</span>
                    <strong>
                      {application.schoolPhone ||
                        application.applicantPhone ||
                        'Not provided'}
                    </strong>
                  </div>

                  <div className="application-address">
                    <span className="application-detail-label">School address</span>
                    <strong>{application.address}</strong>
                  </div>
                </div>

                {application.status === 'REJECTED' && application.rejectionReason && (
                  <p className="application-rejection-note">
                    <strong>Rejection reason:</strong> {application.rejectionReason}
                  </p>
                )}

                {application.status === 'APPROVED' && application.school && (
                  <p className="application-approved-note">
                    <Check size={16} aria-hidden="true" />
                    School created: {application.school.name}. Access remains inactive until separately activated.
                  </p>
                )}

                {isPending && (
                  <div className="application-actions">
                    {rejectingId === application.id ? (
                      <div className="application-rejection-form">
                        <label htmlFor={`reason-${application.id}`}>
                          Reason for rejection
                        </label>
                        <textarea
                          id={`reason-${application.id}`}
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                          placeholder="Explain why this application cannot be approved."
                          minLength={5}
                          maxLength={500}
                          rows={3}
                        />
                        <div className="application-action-buttons">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setRejectingId('')
                              setRejectionReason('')
                              setError('')
                            }}
                            disabled={isBusy}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="application-reject-button"
                            onClick={() => rejectApplication(application.id)}
                            disabled={isBusy}
                          >
                            {isBusy ? 'Rejecting…' : 'Confirm rejection'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="application-approve-button"
                          onClick={() => approveApplication(application)}
                          disabled={isBusy}
                        >
                          <Check size={16} aria-hidden="true" />
                          {isBusy ? 'Processing…' : 'Approve application'}
                        </button>

                        <button
                          type="button"
                          className="application-reject-button"
                          onClick={() => {
                            setRejectingId(application.id)
                            setRejectionReason('')
                            setError('')
                          }}
                          disabled={isBusy}
                        >
                          <X size={16} aria-hidden="true" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                )}

                {application.reviewedAt && (
                  <p className="application-review-date">
                    <Clock3 size={14} aria-hidden="true" />
                    Reviewed {formatDate(application.reviewedAt)}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default PlatformApplicationsPage
