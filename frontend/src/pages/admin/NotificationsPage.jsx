import { useCallback, useEffect, useState } from 'react'
import { Bell, Send, Users } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import './NotificationsPage.css'

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'IMPORTANT', label: 'Important' },
  { value: 'URGENT', label: 'Urgent' },
]

function formatDate(value) {
  if (!value) return 'Not available'

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function teacherName(teacher) {
  return `${teacher?.user?.firstName || ''} ${teacher?.user?.lastName || ''}`.trim() ||
    teacher?.user?.email ||
    'Teacher'
}

function NotificationsPage() {
  const { user, activeMembership } = useAuth()

  const schoolId =
    (activeMembership?.role === 'SCHOOL_ADMIN' && activeMembership.schoolId) ||
    user?.memberships?.find(
      (membership) => membership.role === 'SCHOOL_ADMIN' && membership.isActive
    )?.schoolId

  const [teachers, setTeachers] = useState([])
  const [notifications, setNotifications] = useState([])
  const [recipientType, setRecipientType] = useState('ALL_TEACHERS')
  const [selectedTeachers, setSelectedTeachers] = useState([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const loadData = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      setError('Your account is not linked to an active school administrator membership.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const [teacherResult, notificationResult] = await Promise.all([
        apiRequest(`/schools/${encodeURIComponent(schoolId)}/notifications/recipients`),
        apiRequest(`/schools/${encodeURIComponent(schoolId)}/notifications`),
      ])

      setTeachers(Array.isArray(teacherResult.data) ? teacherResult.data : [])
      setNotifications(
        Array.isArray(notificationResult.data) ? notificationResult.data : []
      )
    } catch (requestError) {
      setError(requestError.message || 'Unable to load school notifications.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleTeacher = (membershipId) => {
    setSelectedTeachers((current) =>
      current.includes(membershipId)
        ? current.filter((id) => id !== membershipId)
        : [...current, membershipId]
    )
  }

  const handleSend = async (event) => {
    event.preventDefault()
    if (!schoolId || sending) return

    setError('')
    setFeedback('')

    if (recipientType === 'SELECTED_TEACHERS' && selectedTeachers.length === 0) {
      setError('Select at least one teacher to receive this notification.')
      return
    }

    setSending(true)

    try {
      await apiRequest(`/schools/${encodeURIComponent(schoolId)}/notifications`, {
        method: 'POST',
        body: {
          title,
          message,
          priority,
          recipientType,
          ...(recipientType === 'SELECTED_TEACHERS'
            ? { recipientMembershipIds: selectedTeachers }
            : {}),
        },
      })

      setTitle('')
      setMessage('')
      setPriority('NORMAL')
      setRecipientType('ALL_TEACHERS')
      setSelectedTeachers([])
      setFeedback('Notification sent successfully.')
      await loadData()
    } catch (requestError) {
      setError(requestError.message || 'Unable to send this notification.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow="School communication"
        title="Notifications"
        description="Send important school updates to all teachers or selected members of your teaching team."
      />

      {error && <p className="notification-feedback error" role="alert">{error}</p>}
      {feedback && <p className="notification-feedback success" role="status">{feedback}</p>}

      <div className="notification-admin-grid">
        <Panel
          eyebrow="Compose"
          title="New notification"
        >
          <form className="notification-form" onSubmit={handleSend}>
            <label className="notification-field">
              <span>Notification title</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={120}
                placeholder="e.g. Staff meeting this Friday"
                required
              />
            </label>

            <label className="notification-field">
              <span>Message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={3000}
                rows={5}
                placeholder="Write the information teachers need to know..."
                required
              />
              <small>{message.length}/3000 characters</small>
            </label>

            <fieldset className="notification-fieldset">
              <legend>Recipients</legend>

              <label className="notification-choice">
                <input
                  type="radio"
                  name="recipientType"
                  value="ALL_TEACHERS"
                  checked={recipientType === 'ALL_TEACHERS'}
                  onChange={() => setRecipientType('ALL_TEACHERS')}
                />
                <span>
                  <strong>All teachers</strong>
                  <small>Send to every active teacher in this school.</small>
                </span>
              </label>

              <label className="notification-choice">
                <input
                  type="radio"
                  name="recipientType"
                  value="SELECTED_TEACHERS"
                  checked={recipientType === 'SELECTED_TEACHERS'}
                  onChange={() => setRecipientType('SELECTED_TEACHERS')}
                />
                <span>
                  <strong>Selected teachers</strong>
                  <small>Choose specific teachers to receive this message.</small>
                </span>
              </label>
            </fieldset>

            {recipientType === 'SELECTED_TEACHERS' && (
              <div className="notification-teacher-picker">
                <div className="notification-picker-heading">
                  <strong>Choose teachers</strong>
                  <span>{selectedTeachers.length} selected</span>
                </div>

                {teachers.length === 0 ? (
                  <p>No active teachers are available.</p>
                ) : (
                  teachers.map((teacher) => (
                    <label className="notification-teacher-option" key={teacher.id}>
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(teacher.id)}
                        onChange={() => toggleTeacher(teacher.id)}
                      />
                      <span>
                        <strong>{teacherName(teacher)}</strong>
                        <small>{teacher.user?.email}</small>
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            <label className="notification-field">
              <span>Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {PRIORITIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="primary-button notification-send-button"
              disabled={sending || teachers.length === 0}
            >
              <Send size={16} aria-hidden="true" />
              {sending ? 'Sending…' : 'Send notification'}
            </button>
          </form>
        </Panel>

        <Panel
          eyebrow="Delivery overview"
          title="Notification history"
          action={<span className="notification-history-count">{notifications.length} sent</span>}
        >
          {loading ? (
            <p role="status">Loading notification history…</p>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <Bell size={28} aria-hidden="true" />
              <strong>No notifications sent yet</strong>
              <p>Notifications you send to teachers will appear here.</p>
            </div>
          ) : (
            <div className="notification-history-list">
              {notifications.map((item) => {
                const recipients = item.recipients || []
                const readCount = recipients.filter((recipient) => recipient.readAt).length

                return (
                  <article className="notification-history-item" key={item.id}>
                    <div className="notification-item-topline">
                      <span className={`notification-priority ${item.priority?.toLowerCase()}`}>
                        {item.priority || 'NORMAL'}
                      </span>
                      <time>{formatDate(item.createdAt)}</time>
                    </div>

                    <h4>{item.title}</h4>
                    <p className="notification-message">{item.message}</p>

                    <div className="notification-delivery-summary">
                      <span><Users size={15} aria-hidden="true" /> {recipients.length} recipients</span>
                      <span>{readCount} read</span>
                      <span>{recipients.length - readCount} unread</span>
                    </div>

                    <details className="notification-recipient-details">
                      <summary>View recipient status</summary>
                      <ul>
                        {recipients.map((recipient) => (
                          <li key={recipient.id}>
                            <span>{teacherName(recipient.membership)}</span>
                            <span className={recipient.readAt ? 'read-status' : 'unread-status'}>
                              {recipient.readAt
                                ? `Read ${formatDate(recipient.readAt)}`
                                : 'Unread'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </article>
                )
              })}
            </div>
          )}
        </Panel>
      </div>
    </main>
  )
}

export default NotificationsPage
