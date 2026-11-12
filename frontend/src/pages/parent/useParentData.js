import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'

export function useParentData(resources = []) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const entries = await Promise.all(
        resources.map(async (resource) => {
          const response = await apiRequest(`/parent/${resource}`)

          if (!response?.success || !Array.isArray(response.data)) {
            throw new Error(`The server returned an invalid ${resource} response.`)
          }

          return [resource, response.data]
        })
      )

      setData(Object.fromEntries(entries))
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your school information.')
    } finally {
      setLoading(false)
    }
  }, [resources.join('|')])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}

export function formatParentDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function learnerName(learner) {
  if (!learner) return 'Learner'
  return `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || 'Learner'
}

export function percentage(score, maximum) {
  const value = Number(score)
  const total = Number(maximum)

  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return null
  }

  return Math.round((value / total) * 100)
}
