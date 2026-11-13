import { useCallback, useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'

const ruleDefinitions = [
  {
    type: 'REPEATED_ABSENCES',
    name: 'Repeated Absences',
    description: 'Identify learners with repeated absences during an observation period.',
    fields: [
      { key: 'absenceThreshold', label: 'Absence threshold', hint: 'Number of absences before an alert is raised.', min: 1, max: 30 },
      { key: 'observationPeriodDays', label: 'Observation period (days)', hint: 'Number of days over which absences are evaluated.', min: 1, max: 90 },
    ],
    defaults: { absenceThreshold: 3, observationPeriodDays: 5 },
  },
  {
    type: 'ACADEMIC_DECLINE',
    name: 'Academic Decline',
    description: 'Identify a decline in assessment performance across multiple assessments.',
    fields: [
      { key: 'minAssessments', label: 'Minimum assessments', hint: 'Number of assessments required for comparison.', min: 1, max: 20 },
      { key: 'declinePercentage', label: 'Decline threshold (%)', hint: 'Percentage decline used to raise an alert.', min: 1, max: 100 },
    ],
    defaults: { minAssessments: 3, declinePercentage: 20 },
  },
]

function AlertRulesPage() {
  const { user, activeMembership } = useAuth()
  const schoolId =
    user?.memberships?.find((membership) => membership.role === 'SCHOOL_ADMIN')?.schoolId ||
    activeMembership?.schoolId

  const [rules, setRules] = useState([])
  const [configs, setConfigs] = useState({
    REPEATED_ABSENCES: { ...ruleDefinitions[0].defaults },
    ACADEMIC_DECLINE: { ...ruleDefinitions[1].defaults },
  })
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState('')
  const [changingId, setChangingId] = useState('')
  const [pageError, setPageError] = useState('')
  const [feedback, setFeedback] = useState('')

  const loadRules = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      setPageError('Your account is not linked to a school.')
      return
    }

    setLoading(true)
    setPageError('')

    try {
      const result = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/early-warning/rules`
      )
      const loadedRules = Array.isArray(result.data) ? result.data : []

      setRules(loadedRules)
      setConfigs((current) => {
        const next = { ...current }

        for (const definition of ruleDefinitions) {
          const existing = loadedRules.find((rule) => rule.alertType === definition.type)
          if (existing?.config) {
            next[definition.type] = {
              ...definition.defaults,
              ...existing.config,
            }
          }
        }

        return next
      })
    } catch (error) {
      setPageError(error.message || 'Unable to load alert rules.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const updateConfig = (type, key, value) => {
    setConfigs((current) => ({
      ...current,
      [type]: {
        ...current[type],
        [key]: value,
      },
    }))
  }

  const saveRule = async (event, definition) => {
    event.preventDefault()
    setSavingType(definition.type)
    setPageError('')
    setFeedback('')

    const existing = rules.find((rule) => rule.alertType === definition.type)
    const config = {}

    for (const field of definition.fields) {
      const value = Number(configs[definition.type][field.key])
      if (!Number.isInteger(value) || value < field.min || value > field.max) {
        setPageError(`${field.label} must be between ${field.min} and ${field.max}.`)
        setSavingType('')
        return
      }
      config[field.key] = value
    }

    try {
      if (existing) {
        await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/early-warning/rules/${encodeURIComponent(existing.id)}`,
          {
            method: 'PATCH',
            body: { config, isActive: true },
          }
        )
      } else {
        await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/early-warning/rules`,
          {
            method: 'POST',
            body: {
              name: definition.name,
              alertType: definition.type,
              config,
            },
          }
        )
      }

      setFeedback(`${definition.name} rule saved and activated.`)
      await loadRules()
    } catch (error) {
      setPageError(error.message || 'Unable to save this rule.')
    } finally {
      setSavingType('')
    }
  }

  const changeRuleStatus = async (rule) => {
    setChangingId(rule.id)
    setPageError('')
    setFeedback('')

    try {
      if (rule.isActive) {
        await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/early-warning/rules/${encodeURIComponent(rule.id)}`,
          { method: 'DELETE' }
        )
        setFeedback(`${rule.name} rule deactivated.`)
      } else {
        await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/early-warning/rules/${encodeURIComponent(rule.id)}`,
          {
            method: 'PATCH',
            body: { isActive: true },
          }
        )
        setFeedback(`${rule.name} rule activated.`)
      }

      await loadRules()
    } catch (error) {
      setPageError(error.message || 'Unable to update this rule.')
    } finally {
      setChangingId('')
    }
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow="Administrator configuration"
        title="Alert rules"
        description="Configure the attendance and assessment patterns that trigger early-warning alerts for your school."
      />

      {pageError && <p className="form-feedback" role="alert">{pageError}</p>}
      {feedback && <p className="form-feedback" role="status">{feedback}</p>}

      {loading ? (
        <Panel eyebrow="School configuration" title="Loading alert rules">
          <p role="status">Retrieving your school's current rules…</p>
        </Panel>
      ) : (
        <section className="form-grid alert-rules-form">
          {ruleDefinitions.map((definition) => {
            const existing = rules.find((rule) => rule.alertType === definition.type)
            const active = existing?.isActive ?? false

            return (
              <Panel
                key={definition.type}
                eyebrow="Early-warning configuration"
                title={definition.name}
              >
                <p>{definition.description}</p>

                <div className="rule-toggle">
                  <span>
                    <strong>{active ? 'Active' : 'Inactive'}</strong>
                    <small>
                      {existing
                        ? 'This rule is saved in your school configuration.'
                        : 'This rule has not been created for your school yet.'}
                    </small>
                  </span>
                  {existing && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => changeRuleStatus(existing)}
                      disabled={Boolean(changingId)}
                    >
                      {changingId === existing.id
                        ? 'Updating…'
                        : active
                          ? 'Deactivate'
                          : 'Activate'}
                    </button>
                  )}
                </div>

                <form
                  className="form-grid"
                  onSubmit={(event) => saveRule(event, definition)}
                >
                  {definition.fields.map((field) => (
                    <div className="form-field" key={field.key}>
                      <label htmlFor={`${definition.type}-${field.key}`}>
                        {field.label}
                      </label>
                      <input
                        id={`${definition.type}-${field.key}`}
                        type="number"
                        min={field.min}
                        max={field.max}
                        step="1"
                        required
                        value={configs[definition.type][field.key]}
                        onChange={(event) =>
                          updateConfig(definition.type, field.key, event.target.value)
                        }
                      />
                      <small className="field-hint">{field.hint}</small>
                    </div>
                  ))}

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={Boolean(savingType) || Boolean(changingId)}
                    >
                      <SlidersHorizontal size={16} aria-hidden="true" />
                      {savingType === definition.type
                        ? 'Saving…'
                        : existing
                          ? 'Save rule settings'
                          : 'Create and activate rule'}
                    </button>
                  </div>
                </form>
              </Panel>
            )
          })}
        </section>
      )}
    </main>
  )
}

export default AlertRulesPage
