import { useMemo, useState } from 'react'
import { Check, CheckCheck, Edit3, Send } from 'lucide-react'
import { initialCommunications, demoClasses, demoNotice } from '../../data/mock/operations'
import DemoNotice from '../../components/common/DemoNotice'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import MessagePreview from '../../components/common/MessagePreview'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import StatusBadge from '../../components/common/StatusBadge'

const communicationStatuses = ['Drafted', 'Pending approval', 'Approved', 'Delivered']
const statusTone = {
  Drafted: 'status-neutral',
  'Pending approval': 'status-warning',
  Approved: 'status-positive',
  Delivered: 'status-positive',
}
const formatDate = (date) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`))

function ParentCommunicationPage({ role }) {
  const isTeacher = role === 'teacher'
  const classOptions = demoClasses.filter((classroom) => !isTeacher || ['Grade 4A', 'Grade 5B'].includes(classroom.name))
  const [messages, setMessages] = useState(initialCommunications)
  const [selectedId, setSelectedId] = useState(initialCommunications[0].id)
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [feedback, setFeedback] = useState('')

  const visibleMessages = useMemo(() => messages.filter((message) => {
    if (isTeacher && !['Grade 4A', 'Grade 5B'].includes(message.className)) return false
    if (statusFilter !== 'all' && message.status !== statusFilter) return false
    if (classFilter !== 'all' && message.className !== classFilter) return false
    return true
  }), [classFilter, isTeacher, messages, statusFilter])
  const selected = visibleMessages.find((message) => message.id === selectedId) ?? visibleMessages[0]

  function updateMessage(id, updates, action) {
    setMessages((current) => current.map((message) => {
      if (message.id !== id) return message
      return {
        ...message,
        ...updates,
        updated: new Date().toISOString().slice(0, 10),
        history: [
          ...message.history,
          {
            date: new Date().toISOString().slice(0, 10),
            action,
            by: `${isTeacher ? 'Teacher' : 'Administrator'} · local demo`,
          },
        ],
      }
    }))
    setFeedback(`${action} updated locally only. No notification was sent.`)
  }

  const counts = communicationStatuses.reduce((result, status) => {
    result[status] = messages.filter((message) =>
      (!isTeacher || ['Grade 4A', 'Grade 5B'].includes(message.className))
      && message.status === status).length
    return result
  }, {})

  return (
    <main className="content">
      <PageHeading
        eyebrow={isTeacher ? 'Assigned classes' : 'School communication'}
        title="Parent communication"
        description="Review supportive in-app messages in English and Shona before they reach families."
      />
      <DemoNotice>
        {demoNotice} Message edits, approvals, and delivery states are local only. No messages are sent; WhatsApp and email are not connected.
      </DemoNotice>
      {feedback && <p className="form-feedback" role="status">{feedback}</p>}

      <section className="message-status-summary" aria-label="Message status summary">
        {communicationStatuses.map((status) => (
          <button
            type="button"
            className={`message-count-card ${statusFilter === status ? 'selected' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            key={status}
          >
            <span>{status}</span><strong>{counts[status]}</strong>
          </button>
        ))}
      </section>

      <section className="communication-workspace" aria-label="Message inbox and preview">
        <Panel eyebrow="Inbox · demonstration messages" title="Message queue">
          <div className="filter-grid message-filters">
            <FormField id="message-status-filter" label="Status">
              <select id="message-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {communicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </FormField>
            <FormField id="message-class-filter" label="Class">
              <select id="message-class-filter" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
                <option value="all">All classes</option>
                {classOptions.map((classroom) => <option key={classroom.id} value={classroom.name}>{classroom.name}</option>)}
              </select>
            </FormField>
          </div>
          {visibleMessages.length === 0 ? (
            <EmptyState title="No messages in this view" description="Change the selected status or class to see other demonstration messages." />
          ) : (
            <ul className="communication-list">
              {visibleMessages.map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    className={`communication-list-item ${selected?.id === message.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedId(message.id); setFeedback('') }}
                  >
                    <span className="communication-list-topline">
                      <strong>{message.learner}</strong>
                      <StatusBadge tone={statusTone[message.status]}>{message.status}</StatusBadge>
                    </span>
                    <span>{message.category} · {message.className}</span>
                    <small>Updated {formatDate(message.updated)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {selected ? (
          <Panel
            eyebrow={`${selected.id} · ${selected.className}`}
            title={selected.learner}
            action={<StatusBadge tone={statusTone[selected.status]}>{selected.status}</StatusBadge>}
          >
            <p className="message-category">{selected.category} · Demonstration AI-assisted draft</p>
            <div className="message-editor">
              <FormField id="message-english" label="English message">
                <textarea
                  id="message-english"
                  rows="5"
                  maxLength="800"
                  value={selected.english}
                  onChange={(event) => setMessages((current) => current.map((message) => message.id === selected.id
                    ? { ...message, english: event.target.value }
                    : message))}
                />
              </FormField>
              <FormField id="message-shona" label="Shona message">
                <textarea
                  id="message-shona"
                  rows="5"
                  maxLength="800"
                  lang="sn"
                  value={selected.shona}
                  onChange={(event) => setMessages((current) => current.map((message) => message.id === selected.id
                    ? { ...message, shona: event.target.value }
                    : message))}
                />
              </FormField>
            </div>
            <div className="message-actions">
              <button type="button" className="secondary-button" onClick={() => updateMessage(selected.id, { status: 'Drafted' }, 'Draft saved')}>
                <Edit3 size={16} aria-hidden="true" /> Save as draft
              </button>
              {selected.status === 'Drafted' && (
                <button type="button" className="secondary-button" onClick={() => updateMessage(selected.id, { status: 'Pending approval' }, 'Submitted for approval')}>
                  <Send size={16} aria-hidden="true" /> Submit for approval
                </button>
              )}
              {selected.status === 'Pending approval' && (
                <button type="button" className="primary-button" onClick={() => updateMessage(selected.id, { status: 'Approved' }, 'Approved')}>
                  <Check size={16} aria-hidden="true" /> Approve message locally
                </button>
              )}
              {!isTeacher && selected.status === 'Approved' && (
                <button type="button" className="primary-button" onClick={() => updateMessage(selected.id, { status: 'Delivered' }, 'Marked as delivered')}>
                  <CheckCheck size={16} aria-hidden="true" /> Mark delivered locally
                </button>
              )}
            </div>
            {selected.status === 'Delivered' && (
              <p className="delivery-note"><CheckCheck size={16} aria-hidden="true" /> Demonstration in-app notification marked delivered. No message was sent.</p>
            )}
            <MessagePreview english={selected.english} shona={selected.shona} />
            <section className="evidence-section" aria-label="Message notification history">
              <h4>Approval and notification history</h4>
              <ul className="activity-list">
                {selected.history.map((entry, index) => (
                  <li className="activity-item" key={`${entry.date}-${entry.action}-${index}`}>
                    <span className="activity-marker" aria-hidden="true" />
                    <span className="activity-copy"><strong>{entry.action}</strong><span>{entry.by}</span></span>
                    <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                  </li>
                ))}
              </ul>
            </section>
          </Panel>
        ) : (
          <Panel eyebrow="Message preview" title="Select a message">
            <EmptyState title="Nothing selected" description="Choose a message from the demonstration inbox." />
          </Panel>
        )}
      </section>
    </main>
  )
}

export default ParentCommunicationPage
