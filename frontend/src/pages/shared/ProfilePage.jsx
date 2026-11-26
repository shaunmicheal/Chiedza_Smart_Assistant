import { useEffect, useState } from 'react'
import { LockKeyhole, UserRound } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import Avatar from '../../components/common/Avatar'
import './ProfilePage.css'

function ProfilePage({ role }) {
  const { user, activeMembership, refreshUser } = useAuth()

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  })

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    setProfile({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    })
  }, [user])

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const currentRole = user?.platformRole || activeMembership?.role || user?.memberships?.[0]?.role
  const roleLabels = {
    SUPER_ADMIN: 'Platform administrator',
    SCHOOL_ADMIN: 'School administrator',
    TEACHER: 'Teacher',
    PARENT: 'Parent / guardian',
  }
  const roleLabel = roleLabels[currentRole] || role || 'Account'

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfile((previous) => ({ ...previous, [name]: value }))
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileError('')
    setProfileMessage('')
    setProfileLoading(true)

    try {
      await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: {
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          phone: profile.phone.trim(),
        },
      })

      await refreshUser()
      setProfileMessage('Your profile has been updated successfully.')
    } catch (error) {
      setProfileError(error.message || 'Unable to update your profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')

    if (passwords.newPassword.length < 8) {
      setPasswordError('Your new password must contain at least 8 characters.')
      return
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('Your new passwords do not match.')
      return
    }

    if (passwords.currentPassword === passwords.newPassword) {
      setPasswordError('Choose a password different from your current password.')
      return
    }

    setPasswordLoading(true)

    try {
      await apiRequest('/auth/password-change', {
        method: 'POST',
        body: passwords,
      })

      await refreshUser()

      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      setPasswordMessage('Your password has been changed successfully.')
    } catch (error) {
      setPasswordError(error.message || 'Unable to change your password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow="Account settings"
        title="My profile"
        description="Manage your personal information and account security."
      />

      <Panel eyebrow="Account information" title="Personal details">
        <div className="profile-account-summary">
          <Avatar initials={initials || 'U'} />
          <div className="profile-account-details">
            <strong>{fullName || 'Your account'}</strong>
            <span>{roleLabel}</span>
            <span>{user?.email || ''}</span>
          </div>
          <UserRound size={22} aria-hidden="true" />
        </div>

        <form className="profile-settings-form" onSubmit={handleProfileSubmit}>
          <div className="profile-settings-grid">
            <div className="form-field">
              <label htmlFor="profile-first-name">First name</label>
              <input
                id="profile-first-name"
                name="firstName"
                value={profile.firstName}
                onChange={handleProfileChange}
                maxLength={60}
                autoComplete="given-name"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="profile-last-name">Last name</label>
              <input
                id="profile-last-name"
                name="lastName"
                value={profile.lastName}
                onChange={handleProfileChange}
                maxLength={60}
                autoComplete="family-name"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="profile-email">Email address</label>
              <input
                id="profile-email"
                type="email"
                value={user?.email || ''}
                disabled
                readOnly
              />
              <span className="field-hint">
                Contact your school administrator if your email needs to change.
              </span>
            </div>

            <div className="form-field">
              <label htmlFor="profile-phone">Phone number</label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                value={profile.phone}
                onChange={handleProfileChange}
                maxLength={30}
                autoComplete="tel"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          {profileError && (
            <p className="profile-feedback error" role="alert">{profileError}</p>
          )}

          {profileMessage && (
            <p className="profile-feedback success" role="status">{profileMessage}</p>
          )}

          <button className="primary-button" type="submit" disabled={profileLoading}>
            {profileLoading ? 'Saving changes…' : 'Save profile'}
          </button>
        </form>
      </Panel>

      <Panel eyebrow="Account security" title="Change password">
        <div className="profile-security-heading">
          <LockKeyhole size={21} aria-hidden="true" />
          <p>Enter your current password and choose a new password for your account.</p>
        </div>

        <form className="profile-settings-form" onSubmit={handlePasswordChange}>
          <div className="profile-settings-grid">
            <div className="form-field">
              <label htmlFor="profile-current-password">Current password</label>
              <input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords((previous) => ({
                  ...previous,
                  currentPassword: event.target.value,
                }))}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="profile-new-password">New password</label>
              <input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={passwords.newPassword}
                onChange={(event) => setPasswords((previous) => ({
                  ...previous,
                  newPassword: event.target.value,
                }))}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="profile-confirm-password">Confirm new password</label>
              <input
                id="profile-confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={passwords.confirmPassword}
                onChange={(event) => setPasswords((previous) => ({
                  ...previous,
                  confirmPassword: event.target.value,
                }))}
                required
              />
            </div>
          </div>

          {passwordError && (
            <p className="profile-feedback error" role="alert">{passwordError}</p>
          )}

          {passwordMessage && (
            <p className="profile-feedback success" role="status">{passwordMessage}</p>
          )}

          <button className="primary-button" type="submit" disabled={passwordLoading}>
            {passwordLoading ? 'Updating password…' : 'Change password'}
          </button>
        </form>
      </Panel>
    </main>
  )
}

export default ProfilePage
