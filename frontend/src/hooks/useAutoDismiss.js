import { useEffect } from 'react'

export function useAutoDismiss(message, clearMessage, delay = 2000) {
  useEffect(() => {
    if (!message) return undefined

    const timeoutId = window.setTimeout(() => {
      clearMessage('')
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [message, clearMessage, delay])
}
