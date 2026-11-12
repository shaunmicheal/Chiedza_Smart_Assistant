import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import FormField from '../../components/common/FormField'
import { useAuth } from '../../context/useAuth'

const ROLE_HOME = {
  SCHOOL_ADMIN: '/admin/overview',
  TEACHER: '/teacher/overview',
  PARENT: '/parent/overview',
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { user, login, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user) {
      const destination = user.mustChangePassword
        ? '/password-change'
        : ROLE_HOME[user.memberships?.[0]?.role] || '/login'
      navigate(destination, { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback('')
    setLoading(true)

    try {
      const authenticatedUser = await login(email.trim(), password)
      const role = authenticatedUser.memberships?.[0]?.role
      const destination = authenticatedUser.mustChangePassword
        ? '/password-change'
        : ROLE_HOME[role]

      if (!destination) {
        throw new Error('Your account does not have a supported school role.')
      }

      const requestedPath = location.state?.from
      const rolePrefix = destination.split('/')[1]
      const safeRequestedPath =
        requestedPath?.startsWith(`/${rolePrefix}/`)
          ? requestedPath
          : destination

      navigate(safeRequestedPath, { replace: true })
    } catch (error) {
      setFeedback(error.message || 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <main className="route-loading" role="status">
        <span className="loading-spinner" aria-hidden="true" />
        <span>Checking your session…</span>
      </main>
    )
  }

  if (user) {
    const destination = user.mustChangePassword
      ? '/password-change'
      : ROLE_HOME[user.memberships?.[0]?.role] || '/login'
    return <Navigate to={destination} replace />
  }

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Sign in to your school"
      description="Use your school account to continue to Chiedza Smart Assistant."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <FormField id="login-email" label="Email address">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="name@school.org"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FormField>

        <FormField id="login-password" label="Password">
          <div className="password-field">
            <LockKeyhole size={17} aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

        <button
          type="submit"
          className="primary-button auth-submit"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        {feedback && (
          <p className="form-feedback" role="alert">
            {feedback}
          </p>
        )}
      </form>

      <p className="auth-switch">
        Have a parent invitation? <Link to="/activate">Activate your account</Link>
      </p>
    </AuthFrame>
  )
}

export default LoginPage
