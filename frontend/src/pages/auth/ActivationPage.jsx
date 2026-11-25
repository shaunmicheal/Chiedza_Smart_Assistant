import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import FormField from '../../components/common/FormField'
import { apiRequest } from '../../lib/api'

function ActivationPage() {
  const navigate = useNavigate()
  const tokenRead = useRef(false)

  const [token, setToken] = useState('')
  const [tokenChecked, setTokenChecked] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    if (tokenRead.current) return
    tokenRead.current = true

    const params = new URLSearchParams(window.location.hash.slice(1))
    const invitationToken = params.get('token') || ''

    // Remove the sensitive token from the address bar immediately.
    if (window.location.hash) {
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.search}`
      )
    }

    setToken(invitationToken)
    setTokenChecked(true)
  }, [])

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

    if (!token) {
      setFeedback('This activation link is missing its security token.')
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
          token,
          password: form.password,
        },
      })

      if (!response?.success || !response.data) {
        throw new Error('The server returned an invalid activation response.')
      }

      setActivated(true)
      setToken('')
      setFeedback(
        response.message || 'Your parent account has been activated. You can now sign in.'
      )
    } catch (error) {
      setFeedback(
        error.message || 'Unable to activate this invitation. Please contact your school.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!tokenChecked) {
    return (
      <AuthFrame
        eyebrow="Parent / guardian invitation"
        title="Preparing activation"
        description="Checking your secure invitation link."
      >
        <p className="form-feedback" role="status">Please wait…</p>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame
      eyebrow="Parent / guardian invitation"
      title={
        activated
          ? 'Account activated'
          : token
            ? 'Activate your account'
            : 'Invitation unavailable'
      }
      description={
        activated
          ? 'Your parent account is ready. You can now sign in.'
          : token
            ? 'Confirm your name and create a secure password for your parent account.'
            : 'This link is missing its invitation token. Ask your school administrator for a valid activation link.'
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
      ) : token ? (
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

          <FormField
            id="activation-password"
            label="Create password"
            hint="Use at least 8 characters."
          >
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

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={loading}
          >
            {loading ? 'Activating account…' : 'Activate account'}
          </button>

          {feedback && <p className="form-feedback" role="alert">{feedback}</p>}
        </form>
      ) : (
        <div>
          <p className="form-feedback" role="alert">
            Your activation link may be incomplete, expired or already used.
            Please contact your school administrator for assistance.
          </p>
          <button
            type="button"
            className="primary-button auth-submit"
            onClick={() => navigate('/login', { replace: true })}
          >
            Return to sign in
          </button>
        </div>
      )}
    </AuthFrame>
  )
}

export default ActivationPage
