import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import '../admin/NotificationsPage.css'

function formatDate(value) {
  if (!value) return 'Not available'

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function NotificationsPage() {
  const { user, activeMembership } = useAuth()

  const schoolId =
    (activeMembership?.role === 'TEACHER' && activeMembership.schoolId) ||
    user?.memberships?.find(
      (membership) => membership.role === 'TEACHER' && membership.isActive
    )?.schoolId

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState('')
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      setError('Your account is not linked to an active teacher membership.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const [inboxResult, countResult] = await Promise.all([
        apiRequest(`/schools/${encodeURIComponent(schoolId)}/notifications/inbox`),
        apiRequest(`/schools/${encodeURIComponent(schoolId)}/notifications/unread-count`),
      ])

      setNotifications(Array.isArray(inboxResult.data) ? inboxResult.data : [])
      setUnreadCount(countResult.data?.count ?? 0)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your notifications.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const markAsRead = async (recipient) => {
    if (!schoolId || !recipient?.notificationId || processingId) return

    setProcessingId(recipient.id)
    setError('')

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/notifications/${encodeURIComponent(recipient.notificationId)}/read`,
        { method: 'PATCH' }
      )

      setNotifications((current) =>
        current.map((item) =>
          item.id === recipient.id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      )
      setUnreadCount((current) => Math.max(0, current - 1))
      window.dispatchEvent(new Event('chiedza:notifications-updated'))
    } catch (requestError) {
      setError(requestError.message || 'Unable to update this notification.')
    } finally {
      setProcessingId('')
    }
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow="School communication"
        title="Notifications"
        description="Messages and updates sent to you by your school administrator."
      />

      {error && <p className="notification-feedback error" role="alert">{error}</p>}

      <Panel
        eyebrow="Your inbox"
        title="School updates"
        action={<span className="notification-history-count">{unreadCount} unread</span>}
      >
        {loading ? (
          <p role="status">Loading your notifications…</p>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={28} aria-hidden="true" />
            <strong>Your inbox is clear</strong>
            <p>School notifications sent to you will appear here.</p>
          </div>
        ) : (
          <div className="notification-history-list">
            {notifications.map((recipient) => {
              const item = recipient.notification
              const isRead = Boolean(recipient.readAt)
              const sender = item?.createdBy?.user
              const senderName =
                `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim() ||
                'School administrator'

              return (
                <article
                  className={`notification-history-item teacher-notification ${isRead ? 'is-read' : 'is-unread'}`}
                  key={recipient.id}
                >
                  <div className="notification-item-topline">
                    <span className={`notification-priority ${item?.priority?.toLowerCase()}`}>
                      {item?.priority || 'NORMAL'}
                    </span>
                    <time>{formatDate(item?.createdAt)}</time>
                  </div>

                  <h4>{item?.title}</h4>
                  <p className="notification-message">{item?.message}</p>

                  <div className="notification-teacher-footer">
                    <span>From {senderName}</span>
                    {isRead ? (
                      <span className="read-status">
                        <CheckCheck size={15} aria-hidden="true" />
                        Read {formatDate(recipient.readAt)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => markAsRead(recipient)}
                        disabled={Boolean(processingId)}
                      >
                        {processingId === recipient.id ? 'Updating…' : 'Mark as read'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Panel>
    </main>
  )
}

export default NotificationsPage
