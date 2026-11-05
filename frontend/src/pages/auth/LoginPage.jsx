import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import FormField from '../../components/common/FormField'

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback('')
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      setFeedback('Sign-in is not connected yet. No account was authenticated.')
    }, 500)
  }

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Sign in to your school"
      description="Use your school account to continue to Chiedza Smart Assistant."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <FormField id="login-email" label="Email address">
          <input id="login-email" type="email" autoComplete="email" placeholder="name@school.org" required />
        </FormField>
        <FormField id="login-password" label="Password">
          <div className="password-field">
            <LockKeyhole size={17} aria-hidden="true" />
            <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" minLength="8" required />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
        </FormField>
        <button type="submit" className="primary-button auth-submit" disabled={loading}>
          {loading ? 'Checking…' : 'Sign in'}
        </button>
        {feedback && <p className="form-feedback" role="status">{feedback}</p>}
      </form>
      <p className="auth-switch">
        Have a parent invitation? <Link to="/activate">Activate your account</Link>
      </p>
    </AuthFrame>
  )
}

export default LoginPage
