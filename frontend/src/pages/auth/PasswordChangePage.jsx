import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import FormField from '../../components/common/FormField'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'

const ROLE_HOME = {
  SCHOOL_ADMIN: '/admin/overview',
  TEACHER: '/teacher/overview',
  PARENT: '/parent/overview',
}

function PasswordChangePage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Your new password must contain at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    if (currentPassword === newPassword) {
      setError('Choose a password different from your temporary password.')
      return
    }

    setLoading(true)

    try {
      await apiRequest('/auth/password-change', {
        method: 'POST',
        body: { currentPassword, newPassword, confirmPassword },
      })

      const updatedUser = await refreshUser()
      const destination =
        ROLE_HOME[updatedUser.memberships?.[0]?.role] || '/login'

      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Password change failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Account security"
      title="Create your new password"
      description={`Welcome${user?.firstName ? `, ${user.firstName}` : ''}. Change your temporary password before continuing to your school workspace.`}
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <FormField id="current-password" label="Current temporary password">
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </FormField>

        <FormField id="new-password" label="New password">
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </FormField>

        <FormField id="confirm-password" label="Confirm new password">
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </FormField>

        {error && <p className="form-feedback" role="alert">{error}</p>}

        <button
          type="submit"
          className="primary-button auth-submit"
          disabled={loading}
        >
          {loading ? 'Updating password…' : 'Save new password'}
        </button>
      </form>
    </AuthFrame>
  )
}

export default PasswordChangePage
