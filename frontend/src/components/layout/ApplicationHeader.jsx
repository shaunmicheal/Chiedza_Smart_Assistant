import { useEffect, useState } from 'react'
import { Bell, ChevronRight, LogOut } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'

function ApplicationHeader({ config, title }) {
  const { user, activeMembership, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const isTeacherWorkspace = config.basePath === '/teacher'

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'School workspace'

  const teacherMembership =
    activeMembership?.role === 'TEACHER'
      ? activeMembership
      : user?.memberships?.find(
          (membership) => membership.role === 'TEACHER' && membership.isActive
        )

  useEffect(() => {
    if (config.basePath !== '/teacher' || !teacherMembership?.schoolId) {
      return
    }

    let cancelled = false

    const loadUnreadCount = async () => {
      try {
        const result = await apiRequest(
          `/schools/${encodeURIComponent(teacherMembership.schoolId)}/notifications/unread-count`
        )

        if (!cancelled) {
          setUnreadCount(result.data?.count ?? 0)
        }
      } catch {
        if (!cancelled) setUnreadCount(0)
      }
    }

    loadUnreadCount()

    const handleUpdate = () => loadUnreadCount()
    const handleFocus = () => loadUnreadCount()
    const refreshInterval = window.setInterval(loadUnreadCount, 60000)

    window.addEventListener('chiedza:notifications-updated', handleUpdate)
    window.addEventListener('focus', handleFocus)

    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
      window.removeEventListener('chiedza:notifications-updated', handleUpdate)
      window.removeEventListener('focus', handleFocus)
    }
  }, [config.basePath, teacherMembership?.schoolId, location.pathname])

  const handleLogout = async () => {
    if (signingOut) return

    setSigningOut(true)

    try {
      await logout()
    } catch {
      // Local session is cleared even if the server cannot be reached.
    } finally {
      navigate('/login', { replace: true })
      setSigningOut(false)
    }
  }

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
        <span className="header-context" title={user?.email || ''}>
          {displayName}
        </span>

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

        <button
          type="button"
          className="secondary-button"
          onClick={handleLogout}
          disabled={signingOut}
        >
          <LogOut size={16} aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </header>
  )
}

export default ApplicationHeader
