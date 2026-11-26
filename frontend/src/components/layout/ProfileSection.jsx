import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../common/Avatar'
import { useAuth } from '../../context/useAuth'

function ProfileSection({ role, profilePath, settingsPath }) {
  const { user, activeMembership, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  const firstName = user?.firstName?.trim() || ''
  const lastName = user?.lastName?.trim() || ''
  const fullName = `${firstName} ${lastName}`.trim()
  const displayName = fullName || user?.email || 'Signed-in user'
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  const roleLabels = {
    SUPER_ADMIN: 'Platform administrator',
    SCHOOL_ADMIN: 'School administrator',
    TEACHER: 'Teacher',
    PARENT: 'Parent / Guardian',
  }
  const currentRole = user?.platformRole || activeMembership?.role
    || user?.memberships?.[0]?.role
  const roleLabel = roleLabels[currentRole] || role

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleLogout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await logout()
    } catch {
      // AuthContext clears the local session even if the API is unavailable.
    } finally {
      navigate('/login', { replace: true })
      setSigningOut(false)
    }
  }

  return (
    <div className="sidebar-footer" ref={menuRef}>
      {open && (
        <div className="account-menu" role="menu" aria-label="Account menu">
          {profilePath && (
            <Link role="menuitem" to={profilePath} onClick={() => setOpen(false)}>
              <UserRound size={17} aria-hidden="true" />
              My profile
            </Link>
          )}
          {settingsPath && (
            <Link role="menuitem" to={settingsPath} onClick={() => setOpen(false)}>
              <Settings size={17} aria-hidden="true" />
              Settings
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={signingOut}
          >
            <LogOut size={17} aria-hidden="true" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}

      <button
        type="button"
        className="profile-card profile-card-button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar initials={initials} />
        <span className="profile-details">
          <strong title={displayName}>{displayName}</strong>
          <span title={user?.email || ''}>{user?.email || roleLabel}</span>
          <span className="profile-role">{roleLabel}</span>
        </span>
        <ChevronDown
          className={`profile-menu-chevron ${open ? 'open' : ''}`}
          size={17}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

export default ProfileSection
