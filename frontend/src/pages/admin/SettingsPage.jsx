import { useCallback, useEffect, useState } from 'react'
import { Save, School, RefreshCw } from 'lucide-react'

import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  address: '',
}

function SettingsPage() {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const loadSchool = useCallback(async () => {
    if (!schoolId) {
      setError('No active school membership was found. Please sign in again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest(`/schools/${encodeURIComponent(schoolId)}`)

      if (!response?.success || !response.data) {
        throw new Error('The server returned an invalid school profile.')
      }

      const school = response.data

      setForm({
        name: school.name ?? '',
        email: school.email ?? '',
        phone: school.phone ?? '',
        address: school.address ?? '',
      })
    } catch (err) {
      setError(err.message || 'Unable to load the school profile.')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadSchool()
  }, [loadSchool])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFeedback('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!schoolId || saving) return

    setSaving(true)
    setError('')
    setFeedback('')

    try {
      const response = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
          }),
        },
      )

      if (!response?.success || !response.data) {
        throw new Error('The server could not confirm the school profile update.')
      }

      const school = response.data

      setForm({
        name: school.name ?? '',
        email: school.email ?? '',
        phone: school.phone ?? '',
        address: school.address ?? '',
      })

      setFeedback('School profile updated successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save the school profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow="School administration"
        title="Settings"
        description="Manage your school's registered contact and profile information."
      />

      {error && (
        <p className="form-feedback" role="alert">
          {error}
        </p>
      )}

      {feedback && (
        <p className="form-feedback" role="status">
          {feedback}
        </p>
      )}

      <Panel eyebrow="School profile" title="Organisation information">
        {loading ? (
          <p role="status">Loading school information...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="settings-options">
              <label className="settings-option">
                <span className="settings-option-icon">
                  <School size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>School name</strong>
                  <small>The registered name of your school.</small>
                </span>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>

              <label className="settings-option">
                <span className="settings-option-icon">
                  <School size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>School email</strong>
                  <small>Official school contact email address.</small>
                </span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  maxLength={254}
                />
              </label>

              <label className="settings-option">
                <span className="settings-option-icon">
                  <School size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>Phone number</strong>
                  <small>School telephone or mobile contact.</small>
                </span>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={30}
                />
              </label>

              <label className="settings-option">
                <span className="settings-option-icon">
                  <School size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>School address</strong>
                  <small>Physical location of the school.</small>
                </span>
                <input
                  name="address"
                  type="text"
                  value={form.address}
                  onChange={handleChange}
                  maxLength={200}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                <Save size={16} aria-hidden="true" />
                {saving ? 'Saving...' : 'Save school profile'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={loadSchool}
                disabled={saving || loading}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reload
              </button>
            </div>
          </form>
        )}
      </Panel>
    </main>
  )
}

export default SettingsPage
