const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '')

const TOKEN_KEY = 'chiedza_access_token'

export const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY)

export const setStoredToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export const clearStoredToken = () => {
  sessionStorage.removeItem(TOKEN_KEY)
}

export const apiRequest = async (path, options = {}) => {
  const { auth = true, body, headers = {}, ...requestOptions } = options
  const token = getStoredToken()

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
    })
  } catch {
    throw new Error(
      'Unable to reach Chiedza. Check your internet connection and API configuration.'
    )
  }

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(
      result.message || result.error || `Request failed (${response.status}).`
    )
    error.status = response.status
    throw error
  }

  return result
}
