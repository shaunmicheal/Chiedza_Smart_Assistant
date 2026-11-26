import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import FormField from '../../components/common/FormField'
import { apiRequest } from '../../lib/api'
import './AdminActivationPage.css'

function AdminActivationPage() {
  const navigate = useNavigate()
  const tokenRead = useRef(false)

  const [token, setToken] = useState('')
  const [tokenChecked, setTokenChecked] = useState(false)
  const [accountType, setAccountType] = useState('new')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    existingPassword: '',
  })
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
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback('')

    if (!token) {
      setFeedback('This activation link is missing its security token.')
      return
    }

    if (accountType === 'new' && form.password !== form.confirmPassword) {
      setFeedback('The passwords do not match. Please check both entries.')
      return
    }

    setLoading(true)

    const body = accountType === 'existing'
      ? { token, existingPassword: form.existingPassword }
      : {
          token,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          password: form.password,
        }

    try {
      const response = await apiRequest('/admin-invitations/activate', {
        method: 'POST',
        auth: false,
        body,
      })

      if (!response?.success || !response.data?.user) {
        throw new Error('The server returned an invalid activation response.')
      }

      setActivated(true)
      setToken('')
      setForm({
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        existingPassword: '',
      })
      setFeedback(response.message || 'Your school administrator account is ready. You can now sign in.')
    } catch (requestError) {
      setFeedback(requestError.message || 'Unable to activate this invitation. Please contact the platform administrator.')
    } finally {
      setLoading(false)
    }
  }

  if (!tokenChecked) {
    return (
      <AuthFrame
        eyebrow="School administrator invitation"
        title="Preparing activation"
        description="Checking your secure invitation link."
      >
        <p className="form-feedback" role="status">Please wait…</p>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame
      eyebrow="School administrator invitation"
      title={activated ? 'Account activated' : token ? 'Activate your account' : 'Invitation unavailable'}
      description={
        activated
          ? 'Your school administrator access is ready. You can now sign in to Chiedza.'
          : token
            ? 'Complete the steps below to activate your school administrator access.'
            : 'This link is missing its invitation token. Ask the platform administrator for a valid invitation link.'
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
        <form className="auth-form admin-activation-form" onSubmit={handleSubmit}>
          <div className="admin-activation-choice" role="group" aria-label="Account type">
            <button
              type="button"
              className={accountType === 'new' ? 'active' : ''}
              onClick={() => { setAccountType('new'); setFeedback('') }}
              aria-pressed={accountType === 'new'}
            >
              New Chiedza account
            </button>
            <button
              type="button"
              className={accountType === 'existing' ? 'active' : ''}
              onClick={() => { setAccountType('existing'); setFeedback('') }}
              aria-pressed={accountType === 'existing'}
            >
              I already have an account
            </button>
          </div>

          {accountType === 'new' ? (
            <>
              <FormField id="admin-activation-first-name" label="First name">
                <input
                  id="admin-activation-first-name"
                  name="firstName"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={updateField}
                  maxLength={60}
                  required
                />
              </FormField>

              <FormField id="admin-activation-last-name" label="Last name">
                <input
                  id="admin-activation-last-name"
                  name="lastName"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={updateField}
                  maxLength={60}
                  required
                />
              </FormField>

              <FormField id="admin-activation-password" label="Create password" hint="Use at least 8 characters.">
                <input
                  id="admin-activation-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={form.password}
                  onChange={updateField}
                  required
                />
              </FormField>

              <FormField id="admin-activation-confirm" label="Confirm password">
                <input
                  id="admin-activation-confirm"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={form.confirmPassword}
                  onChange={updateField}
                  required
                />
              </FormField>
            </>
          ) : (
            <FormField
              id="admin-existing-password"
              label="Your current Chiedza password"
              hint="This confirms ownership of your existing account. Your password will not be changed."
            >
              <input
                id="admin-existing-password"
                name="existingPassword"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                value={form.existingPassword}
                onChange={updateField}
                required
              />
            </FormField>
          )}

          {feedback && <p className="form-feedback" role="alert">{feedback}</p>}

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={loading}
          >
            {loading ? 'Activating account…' : 'Activate administrator account'}
          </button>
        </form>
      ) : (
        <p className="form-feedback" role="alert">{feedback || 'No valid invitation token was found.'}</p>
      )}

      <p className="auth-switch">
        Already activated? <a href="/login">Sign in to Chiedza</a>
      </p>
    </AuthFrame>
  )
}

export default AdminActivationPage
