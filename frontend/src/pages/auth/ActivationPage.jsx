import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import FormField from '../../components/common/FormField'
import { apiRequest } from '../../lib/api'

function ActivationPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    invitationCode: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [activated, setActivated] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback('')

    if (form.password !== form.confirmPassword) {
      setFeedback('The passwords do not match. Please check both entries.')
      return
    }

    setLoading(true)

    try {
      const response = await apiRequest('/parent-invitations/activate', {
        method: 'POST',
        auth: false,
        body: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          invitationCode: form.invitationCode.trim(),
          password: form.password,
        },
      })

      if (!response?.success || !response.data?.id) {
        throw new Error('The server returned an invalid activation response.')
      }

      setActivated(true)
      setFeedback('Your parent account has been activated successfully. You can now sign in.')
    } catch (error) {
      setFeedback(error.message || 'Unable to activate this invitation. Please check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="Parent / guardian invitation"
      title={activated ? 'Account activated' : 'Activate your account'}
      description={
        activated
          ? 'Your parent account is ready.'
          : 'Enter the details shared by your school and choose a secure password.'
      }
    >
      {activated ? (
        <>
          <p className="form-feedback" role="status">{feedback}</p>
          <button
            type="button"
            className="primary-button auth-submit"
            onClick={() => navigate('/login', { replace: true })}
          >
            Continue to sign in
          </button>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <FormField id="activation-first-name" label="First name">
            <input
              id="activation-first-name"
              name="firstName"
              autoComplete="given-name"
              value={form.firstName}
              onChange={updateField}
              maxLength={60}
              required
            />
          </FormField>

          <FormField id="activation-last-name" label="Last name">
            <input
              id="activation-last-name"
              name="lastName"
              autoComplete="family-name"
              value={form.lastName}
              onChange={updateField}
              maxLength={60}
              required
            />
          </FormField>

          <FormField id="activation-email" label="Email address">
            <input
              id="activation-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              maxLength={254}
              required
            />
          </FormField>

          <FormField
            id="invitation-code"
            label="Invitation code"
            hint="Use the code provided by your school. It can only be used once."
          >
            <input
              id="invitation-code"
              name="invitationCode"
              autoComplete="one-time-code"
              value={form.invitationCode}
              onChange={updateField}
              required
            />
          </FormField>

          <FormField id="activation-password" label="Create password" hint="Use at least 8 characters.">
            <div className="password-field">
              <input
                id="activation-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={form.password}
                onChange={updateField}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword
                  ? <EyeOff size={17} aria-hidden="true" />
                  : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
          </FormField>

          <FormField id="confirm-password" label="Confirm password">
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={form.confirmPassword}
              onChange={updateField}
              required
            />
          </FormField>

          <button type="submit" className="primary-button auth-submit" disabled={loading}>
            {loading ? 'Activating account…' : 'Activate account'}
          </button>

          {feedback && <p className="form-feedback" role="alert">{feedback}</p>}
        </form>
      )}

      <p className="auth-switch">
        Already activated? <Link to="/login">Return to sign in</Link>
      </p>
    </AuthFrame>
  )
}

export default ActivationPage
