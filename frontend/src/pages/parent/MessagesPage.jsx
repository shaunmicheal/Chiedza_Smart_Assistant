import { Languages, MessageSquareText } from 'lucide-react'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import EmptyState from '../../components/common/EmptyState'
import { useParentData, learnerName, formatParentDate } from './useParentData'
import './ParentPortal.css'

const languageName = (language) => {
  if (language === 'sn') return 'Shona'
  if (language === 'en') return 'English'
  return language || 'Language not specified'
}

function MessagesPage() {
  const { data, loading, error, refresh } = useParentData(['messages'])
  const messages = data.messages || []

  return (
    <main className="content parent-portal">
      <PageHeading
        eyebrow="School communication"
        title="Messages"
        description="Approved messages shared by the school about your linked learners."
      />

      {error && <div className="parent-data-message error" role="alert">{error}</div>}

      <Panel
        eyebrow={`${messages.length} approved ${messages.length === 1 ? 'message' : 'messages'}`}
        title="Messages from your school"
        action={<button type="button" className="learner-secondary-button" onClick={refresh} disabled={loading}>Refresh</button>}
      >
        {loading ? (
          <div className="parent-page-loading">Loading school messages…</div>
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Approved school messages about your linked learners will appear here."
            icon={MessageSquareText}
          />
        ) : (
          <div className="parent-portal">
            {messages.map((message) => (
              <article className="parent-message-card" key={message.id}>
                <div className="parent-record-meta">
                  <span className="parent-record-tag">
                    <Languages size={13} /> {languageName(message.language)}
                  </span>
                  {message.alert?.alertType && (
                    <span className="parent-record-tag">{message.alert.alertType.replaceAll('_', ' ')}</span>
                  )}
                </div>
                <h3>{learnerName(message.alert?.learner)}</h3>
                <time>{formatParentDate(message.approvedAt || message.createdAt)}</time>
                <p lang={message.language || undefined}>{message.draftText}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </main>
  )
}

export default MessagesPage
