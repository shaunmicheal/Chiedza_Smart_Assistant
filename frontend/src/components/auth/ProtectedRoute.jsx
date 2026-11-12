import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const ROLE_HOME = {
  SCHOOL_ADMIN: '/admin/overview',
  TEACHER: '/teacher/overview',
  PARENT: '/parent/overview',
}

function ProtectedRoute({ role, allowPasswordChange = false, children }) {
  const { user, loading, setActiveMembership } = useAuth()
  const location = useLocation()

  const membership = role
    ? user?.memberships?.find((item) => item.role === role)
    : null

  useEffect(() => {
    if (membership) setActiveMembership(membership)
  }, [membership, setActiveMembership])

  if (loading) {
    return (
      <main className="route-loading" role="status">
        <span className="loading-spinner" aria-hidden="true" />
        <span>Checking your school session…</span>
      </main>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (allowPasswordChange) {
    if (!user.mustChangePassword) {
      const fallback = user.memberships?.[0]
      return <Navigate to={ROLE_HOME[fallback?.role] || '/login'} replace />
    }
    return children
  }

  if (user.mustChangePassword) {
    return <Navigate to="/password-change" replace />
  }

  if (!membership) {
    const fallback = user.memberships?.[0]
    return (
      <Navigate
        to={ROLE_HOME[fallback?.role] || '/login'}
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
