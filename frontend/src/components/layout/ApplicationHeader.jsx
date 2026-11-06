import { useState } from 'react'
import { Bell, ChevronRight, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

function ApplicationHeader({ config, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'School workspace'

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
          className="icon-button"
          to={config.notificationsPath}
          aria-label="Open notifications"
        >
          <Bell size={18} aria-hidden="true" />
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
