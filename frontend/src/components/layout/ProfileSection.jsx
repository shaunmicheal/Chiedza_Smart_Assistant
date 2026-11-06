import { Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../common/Avatar'
import { useAuth } from '../../context/useAuth'

function ProfileSection({ role, settingsPath }) {
  const { user, activeMembership } = useAuth()

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
    SCHOOL_ADMIN: 'School administrator',
    TEACHER: 'Teacher',
    PARENT: 'Parent / Guardian',
  }

  const membershipRole = activeMembership?.role
  const roleLabel = roleLabels[membershipRole] || role

  return (
    <div className="sidebar-footer">
      <div className="profile-card">
        <Avatar initials={initials} />
        <div className="profile-details">
          <strong title={displayName}>{displayName}</strong>
          <span title={user?.email || ''}>{user?.email || roleLabel}</span>
          <span className="profile-role">{roleLabel}</span>
        </div>
      </div>

      {settingsPath && (
        <Link className="settings-btn" to={settingsPath}>
          <Settings size={16} aria-hidden="true" />
          Settings
        </Link>
      )}
    </div>
  )
}

export default ProfileSection
