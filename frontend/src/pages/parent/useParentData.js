import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api'

export function useParentData(resources = []) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const resourceKey = resources.join('|')

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current
    const requestedResources = resourceKey.split('|').filter(Boolean)

    setLoading(true)
    setError('')

    const results = await Promise.allSettled(
      requestedResources.map(async (resource) => {
        const response = await apiRequest(`/parent/${resource}`)

        if (!response?.success || !Array.isArray(response.data)) {
          throw new Error(
            `The server returned an invalid ${resource} response.`
          )
        }

        return [resource, response.data]
      })
    )

    // Ignore responses from an older refresh or an unmounted page.
    if (currentRequestId !== requestId.current) return

    const successfulEntries = []
    const failures = []

    results.forEach((result, index) => {
      const resource = requestedResources[index]

      if (result.status === 'fulfilled') {
        successfulEntries.push(result.value)
      } else {
        failures.push(
          `${resource}: ${result.reason?.message || 'Unable to load.'}`
        )
      }
    })

    if (successfulEntries.length > 0) {
      setData((previousData) => ({
        ...previousData,
        ...Object.fromEntries(successfulEntries),
      }))
    }

    if (failures.length === 0) {
      setError('')
    } else if (successfulEntries.length > 0) {
      setError(
        `Some information could not be loaded. ${failures.join(' ')}`
      )
    } else {
      setError(
        `Your parent information could not be loaded. ${failures.join(' ')}`
      )
    }

    setLoading(false)
  }, [resourceKey])

  useEffect(() => {
    load()

    return () => {
      requestId.current += 1
    }
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
