import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Send } from 'lucide-react'
import AuthFrame from './AuthFrame'
import '../PlatformApplicationsPage.css'
import FormField from '../../components/common/FormField'
import { apiRequest } from '../../lib/api'

const initialForm = {
  schoolName: '',
  applicantFirstName: '',
  applicantLastName: '',
  applicantEmail: '',
  applicantPhone: '',
  schoolEmail: '',
  schoolPhone: '',
  address: '',
}

function SchoolApplicationPage() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await apiRequest('/school-applications', {
        method: 'POST',
        auth: false,
        body: {
          ...form,
          applicantEmail: form.applicantEmail.trim().toLowerCase(),
          schoolEmail: form.schoolEmail.trim().toLowerCase(),
        },
      })

      setSubmitted(true)
    } catch (requestError) {
      setError(requestError.message || 'We could not submit your application.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame
      eyebrow="School registration"
      title={submitted ? 'Application received' : 'Bring your school to Chiedza'}
      description={
        submitted
          ? 'Thank you for your interest. Your application has been submitted for review.'
          : 'Tell us about your school and the person submitting this application.'
      }
    >
      {submitted ? (
        <div className="school-application-success" role="status">
          <CheckCircle2 size={38} aria-hidden="true" />
          <h2>Thank you for applying.</h2>
          <p>
            Your application is now awaiting review. Submitting an application
            does not create a school account or provide access to Chiedza.
          </p>
          <p>
            You can return to the sign-in page while your application is reviewed.
          </p>
          <Link className="primary-button" to="/login">
            Return to sign in
          </Link>
        </div>
      ) : (
        <form className="auth-form school-application-form" onSubmit={handleSubmit}>
          <div className="school-form-section">
            <h2>School details</h2>
            <FormField id="application-school-name" label="School name">
              <input
                id="application-school-name"
                name="schoolName"
                value={form.schoolName}
                onChange={updateField}
                placeholder="e.g. Sunrise Primary School"
                minLength={2}
                maxLength={120}
                required
              />
            </FormField>

            <FormField id="application-address" label="School address">
              <input
                id="application-address"
                name="address"
                value={form.address}
                onChange={updateField}
                placeholder="Town, suburb and physical address"
                minLength={5}
                maxLength={250}
                required
              />
            </FormField>

            <div className="school-form-grid">
              <FormField id="application-school-email" label="School email (optional)">
                <input
                  id="application-school-email"
                  name="schoolEmail"
                  type="email"
                  value={form.schoolEmail}
                  onChange={updateField}
                  placeholder="office@school.org"
                  maxLength={254}
                />
              </FormField>

              <FormField id="application-school-phone" label="School phone (optional)">
                <input
                  id="application-school-phone"
                  name="schoolPhone"
                  type="tel"
                  value={form.schoolPhone}
                  onChange={updateField}
                  placeholder="School contact number"
                  maxLength={30}
                />
              </FormField>
            </div>
          </div>

          <div className="school-form-section">
            <h2>Applicant details</h2>
            <div className="school-form-grid">
              <FormField id="application-first-name" label="First name">
                <input
                  id="application-first-name"
                  name="applicantFirstName"
                  value={form.applicantFirstName}
                  onChange={updateField}
                  autoComplete="given-name"
                  maxLength={60}
                  required
                />
              </FormField>

              <FormField id="application-last-name" label="Last name">
                <input
                  id="application-last-name"
                  name="applicantLastName"
                  value={form.applicantLastName}
                  onChange={updateField}
                  autoComplete="family-name"
                  maxLength={60}
                  required
                />
              </FormField>
            </div>

            <FormField id="application-applicant-email" label="Your email address">
              <input
                id="application-applicant-email"
                name="applicantEmail"
                type="email"
                value={form.applicantEmail}
                onChange={updateField}
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={254}
                required
              />
            </FormField>

            <FormField id="application-applicant-phone" label="Your phone number (optional)">
              <input
                id="application-applicant-phone"
                name="applicantPhone"
                type="tel"
                value={form.applicantPhone}
                onChange={updateField}
                autoComplete="tel"
                placeholder="Your contact number"
                maxLength={30}
              />
            </FormField>
          </div>

          {error && (
            <p className="form-feedback" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={loading}
          >
            <Send size={16} aria-hidden="true" />
            {loading ? 'Submitting application…' : 'Submit school application'}
          </button>

          <p className="school-application-footnote">
            Applications are reviewed before a school is created or given access.
          </p>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      )}
    </AuthFrame>
  )
}

export default SchoolApplicationPage
