import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import FormField from '../../components/common/FormField'

function ActivationPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback('')
    const formData = new FormData(event.currentTarget)
    const password = formData.get('password')
    const confirmation = formData.get('confirmPassword')
    if (password !== confirmation) {
      setFeedback('The passwords do not match. Please check both entries.')
      return
    }

    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      setFeedback('Invitation activation is not connected yet. No account was created.')
    }, 500)
  }

  return (
    <AuthFrame
      eyebrow="Parent / guardian invitation"
      title="Activate your account"
      description="Set a password using the invitation details shared with you by your school."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <FormField id="activation-email" label="Email address">
          <input id="activation-email" type="email" name="email" autoComplete="email" required />
        </FormField>
        <FormField id="invitation-code" label="Invitation code" hint="Use the code provided by your school.">
          <input id="invitation-code" name="invitationCode" autoComplete="one-time-code" required />
        </FormField>
        <FormField id="activation-password" label="Create password" hint="Use at least 8 characters.">
          <div className="password-field">
            <input id="activation-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" required />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
        </FormField>
        <FormField id="confirm-password" label="Confirm password">
          <input id="confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" required />
        </FormField>
        <button type="submit" className="primary-button auth-submit" disabled={loading}>
          {loading ? 'Checking invitation…' : 'Activate account'}
        </button>
        {feedback && <p className="form-feedback" role="status">{feedback}</p>}
      </form>
      <p className="auth-switch">
        Already activated? <Link to="/login">Return to sign in</Link>
      </p>
    </AuthFrame>
  )
}

export default ActivationPage
