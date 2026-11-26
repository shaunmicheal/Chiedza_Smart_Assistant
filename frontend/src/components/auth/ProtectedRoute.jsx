import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const ROLE_HOME = {
  SCHOOL_ADMIN: '/admin/overview',
  TEACHER: '/teacher/overview',
  PARENT: '/parent/overview',
}

function getUserHome(user) {
  if (user?.platformRole === 'SUPER_ADMIN') {
    return '/platform/overview'
  }

  const role = user?.memberships?.[0]?.role
  return ROLE_HOME[role] || '/login'
}

function ProtectedRoute({
  role,
  platformRole,
  allowPasswordChange = false,
  children,
}) {
  const { user, loading, setActiveMembership } = useAuth()
  const location = useLocation()

  const membership = role
    ? user?.memberships?.find((item) => item.role === role)
    : null

  useEffect(() => {
    if (membership) {
      setActiveMembership(membership)
    }
  }, [membership, setActiveMembership])

  if (loading) {
    return (
      <main className="route-loading" role="status">
        <span className="loading-spinner" aria-hidden="true" />
        <span>Checking your Chiedza session…</span>
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
      return <Navigate to={getUserHome(user)} replace />
    }

    return children
  }

  if (user.mustChangePassword) {
    return <Navigate to="/password-change" replace />
  }

  if (platformRole) {
    if (user.platformRole !== platformRole) {
      return <Navigate to={getUserHome(user)} replace />
    }

    return children
  }

  // Platform administrators must not enter school workspaces.
  if (user.platformRole === 'SUPER_ADMIN') {
    return <Navigate to="/platform/overview" replace />
  }

  if (!membership) {
    return <Navigate to={getUserHome(user)} replace />
  }

  return children
}

export default ProtectedRoute
