import { useEffect, useState } from 'react'
import { Bell, ChevronRight, Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'

function ApplicationHeader({ config, title, onMenuToggle, menuOpen = false }) {
  const { user, activeMembership } = useAuth()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const isTeacherWorkspace = config.basePath === '/teacher'

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : 'School workspace'

  const teacherMembership =
    activeMembership?.role === 'TEACHER'
      ? activeMembership
      : user?.memberships?.find(
          (membership) => membership.role === 'TEACHER' && membership.isActive
        )

  useEffect(() => {
    if (!isTeacherWorkspace || !teacherMembership?.schoolId) return undefined

    let cancelled = false
    const loadUnreadCount = async () => {
      try {
        const result = await apiRequest(
          `/schools/${encodeURIComponent(teacherMembership.schoolId)}/notifications/unread-count`
        )
        if (!cancelled) setUnreadCount(result.data?.count ?? 0)
      } catch {
        if (!cancelled) setUnreadCount(0)
      }
    }

    loadUnreadCount()
    const handleUpdate = () => loadUnreadCount()
    const refreshInterval = window.setInterval(loadUnreadCount, 60000)
    window.addEventListener('chiedza:notifications-updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)

    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
      window.removeEventListener('chiedza:notifications-updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
    }
  }, [isTeacherWorkspace, teacherMembership?.schoolId, location.pathname])

  return (
    <header className="topbar">
      <div className="header-title-wrap">
        <div className="crumbs" aria-label="Breadcrumb">
          <Link to={config.overviewPath}>Home</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{title}</span>
        </div>
        <h1>{title}</h1>
      </div>

      <div className="header-tools">
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="workspace-sidebar"
        >
          <Menu size={21} aria-hidden="true" />
        </button>

        <span className="header-context" title={user?.email || ''}>
          {displayName}
        </span>

        {config.notificationsPath && (
          <Link
            className="icon-button notification-bell"
            to={config.notificationsPath}
            aria-label={
              isTeacherWorkspace && unreadCount > 0
                ? `Open notifications, ${unreadCount} unread`
                : 'Open notifications'
            }
          >
            <Bell size={18} aria-hidden="true" />
            {isTeacherWorkspace && unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  )
}

export default ApplicationHeader
