import { AuthContext } from './auth-context'
import { useCallback, useEffect, useState } from 'react'
import {
  apiRequest,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../lib/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [activeMembership, setActiveMembership] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const result = await apiRequest('/auth/me')
    const authenticatedUser = result.data
    setUser(authenticatedUser)
    setActiveMembership(authenticatedUser.memberships?.[0] ?? null)
    return authenticatedUser
  }, [])

  useEffect(() => {
    const restoreSession = async () => {
      if (!getStoredToken()) {
        setLoading(false)
        return
      }

      try {
        await refreshUser()
      } catch {
        clearStoredToken()
        setUser(null)
        setActiveMembership(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [refreshUser])

  const login = async (email, password) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    })

    if (!result.data?.token) {
      throw new Error('The server did not return an authentication token.')
    }

    setStoredToken(result.data.token)

    try {
      const authenticatedUser = await refreshUser()

      if (!authenticatedUser.memberships?.length) {
        throw new Error(
          'Your account is not linked to a school. Please contact your school administrator.'
        )
      }

      return authenticatedUser
    } catch (error) {
      clearStoredToken()
      setUser(null)
      setActiveMembership(null)
      throw error
    }
  }

  const logout = async () => {
    try {
      if (getStoredToken()) {
        await apiRequest('/auth/logout', { method: 'POST' })
      }
    } finally {
      clearStoredToken()
      setUser(null)
      setActiveMembership(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        mustChangePassword: Boolean(user?.mustChangePassword),
        activeMembership,
        setActiveMembership,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
