import { Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../common/Avatar'

function ProfileSection({ role, settingsPath }) {
  const profile =
    role === 'Administrator'
      ? { initials: 'SM', name: 'Sipho Moyo', label: 'Administrator · demo' }
      : { initials: role === 'Teacher' ? 'T' : 'P', name: `${role} account`, label: 'Demonstration profile' }

  return (
    <div className="sidebar-footer">
      <div className="profile-card">
        <Avatar initials={profile.initials} />
        <div>
          <strong>{profile.name}</strong>
          <span>{profile.label}</span>
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
