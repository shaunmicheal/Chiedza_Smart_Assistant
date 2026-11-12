import { CalendarCheck2, GraduationCap, Languages } from 'lucide-react'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import EmptyState from '../../components/common/EmptyState'
import {
  useParentData,
  learnerName,
  formatParentDate,
  percentage,
} from './useParentData'
import './ParentPortal.css'

function ParentDashboardPage() {
  const { data, loading, error, refresh } = useParentData([
    'children',
    'attendance',
    'assessments',
    'messages',
  ])

  const children = data.children || []
  const attendance = data.attendance || []
  const assessments = data.assessments || []
  const messages = data.messages || []

  const presentCount = attendance.filter((item) => item.status === 'PRESENT').length
  const attendanceRate = attendance.length
    ? Math.round((presentCount / attendance.length) * 100)
    : null

  const scoredResults = assessments
    .map((result) => percentage(result.score, result.assessment?.maxScore))
    .filter((value) => value !== null)

  const averageScore = scoredResults.length
    ? Math.round(scoredResults.reduce((total, value) => total + value, 0) / scoredResults.length)
    : null

  const recentMessages = messages.slice(0, 3)

  return (
    <main className="content parent-portal">
      <PageHeading
        eyebrow="Parent / guardian workspace"
        title="Your family overview"
        description="A summary of attendance, academic progress and approved school messages for your linked learners."
      />

      {error && (
        <div className="parent-data-message error" role="alert">
          {error}
          <button type="button" className="learner-secondary-button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      <section className="parent-record-grid" aria-label="Family overview">
        <article className="parent-record-card">
          <h3>Linked learners</h3>
          <span className="parent-record-value">{loading ? '—' : children.length}</span>
          <p>Children connected to your account</p>
        </article>
        <article className="parent-record-card">
          <h3>Attendance rate</h3>
          <span className="parent-record-value">
            {loading || attendanceRate === null ? '—' : `${attendanceRate}%`}
          </span>
          <p>Based on recorded attendance</p>
        </article>
        <article className="parent-record-card">
          <h3>Average assessment score</h3>
          <span className="parent-record-value">
            {loading || averageScore === null ? '—' : `${averageScore}%`}
          </span>
          <p>Average of available assessment percentages</p>
        </article>
        <article className="parent-record-card">
          <h3>Approved messages</h3>
          <span className="parent-record-value">{loading ? '—' : messages.length}</span>
          <p>Messages shared by the school</p>
        </article>
      </section>

      <Panel
        eyebrow="Your linked learners"
        title="Children"
        action={
          <button type="button" className="learner-secondary-button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        }
      >
        {loading ? (
          <div className="parent-page-loading">Loading your family overview…</div>
        ) : children.length === 0 ? (
          <EmptyState
            title="No linked learners yet"
            description="Contact your school administrator if you believe a learner should be linked to your account."
            icon={GraduationCap}
          />
        ) : (
          <div className="parent-record-grid">
            {children.map((link) => (
              <article className="parent-record-card" key={link.id}>
                <h3>{learnerName(link.learner)}</h3>
                <p>{link.learner?.schoolClass?.name || 'Class not assigned'}</p>
                <p>{link.learner?.school?.name || 'School information unavailable'}</p>
                <div className="parent-record-meta">
                  <span className="parent-record-tag">{link.relationship || 'Guardian'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel eyebrow="School communication" title="Recent approved messages">
        {loading ? (
          <div className="parent-page-loading">Loading messages…</div>
        ) : recentMessages.length === 0 ? (
          <EmptyState
            title="No approved messages yet"
            description="Messages shared by the school about your linked learners will appear here."
            icon={Languages}
          />
        ) : (
          <div className="parent-portal">
            {recentMessages.map((message) => (
              <article className="parent-message-card" key={message.id}>
                <div className="parent-record-meta">
                  <span className="parent-record-tag">
                    {message.language === 'sn' ? 'Shona' : message.language === 'en' ? 'English' : message.language}
                  </span>
                  {message.alert?.alertType && (
                    <span className="parent-record-tag">
                      {message.alert.alertType.replaceAll('_', ' ')}
                    </span>
                  )}
                </div>
                <h3>{learnerName(message.alert?.learner)}</h3>
                <time>{formatParentDate(message.approvedAt || message.createdAt)}</time>
                <p>{message.draftText}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <p className="parent-privacy-note">
        <CalendarCheck2 size={16} aria-hidden="true" />
        This workspace displays information for learners linked to your account. Internal staff notes and other learners’ records are not included.
      </p>
    </main>
  )
}

export default ParentDashboardPage
