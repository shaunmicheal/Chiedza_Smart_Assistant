import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  GraduationCap,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import PageHeading from '../../components/common/PageHeading'
import './TeacherClassesPage.css'

function TeacherClassesPage() {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId

  const [classes, setClasses] = useState([])
  const [learners, setLearners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadClasses = useCallback(async () => {
    if (!schoolId) {
      throw new Error('No active school was found. Please sign in again.')
    }

    const base = `/schools/${encodeURIComponent(schoolId)}`

    const [classResponse, learnerResponse] = await Promise.all([
      apiRequest(`${base}/classes`),
      apiRequest(`${base}/learners`),
    ])

    if (!classResponse?.success || !Array.isArray(classResponse.data)) {
      throw new Error('The server returned an invalid assigned classes response.')
    }

    if (!learnerResponse?.success || !Array.isArray(learnerResponse.data)) {
      throw new Error('The server returned an invalid learners response.')
    }

    setClasses(classResponse.data)
    setLearners(learnerResponse.data)
  }, [schoolId])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        await loadClasses()
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Unable to load your assigned classes.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [loadClasses])

  const learnerCounts = useMemo(() => {
    return learners.reduce((counts, learner) => {
      if (learner.classId) {
        counts[learner.classId] = (counts[learner.classId] || 0) + 1
      }

      return counts
    }, {})
  }, [learners])

  const totalAssignedLearners = learners.length

  const refresh = async () => {
    setLoading(true)
    setError('')

    try {
      await loadClasses()
    } catch (requestError) {
      setError(requestError.message || 'Unable to refresh your assigned classes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="content teacher-classes-page">
      <PageHeading
        eyebrow="Teaching workspace"
        title="Assigned Classes"
        description="View the classes assigned to you and the learners in each class."
      >
        <div className="learner-heading-actions">
          <button
            type="button"
            className="learner-secondary-button"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'learner-spin' : ''} />
            Refresh
          </button>
        </div>
      </PageHeading>

      {error && (
        <div className="learner-message learner-message-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="learner-stat-row" aria-label="Teaching assignment totals">
        <article className="learner-stat-card">
          <span className="learner-stat-icon">
            <GraduationCap size={20} />
          </span>
          <div>
            <span className="learner-stat-label">Assigned classes</span>
            <strong>{loading ? '—' : classes.length}</strong>
          </div>
        </article>

        <article className="learner-stat-card">
          <span className="learner-stat-icon">
            <Users size={20} />
          </span>
          <div>
            <span className="learner-stat-label">Assigned learners</span>
            <strong>{loading ? '—' : totalAssignedLearners}</strong>
          </div>
        </article>
      </section>

      <section className="learner-table-card">
        <div className="learner-table-heading">
          <div>
            <h3>Your class list</h3>
            <p>Only classes assigned to your teacher account appear here.</p>
          </div>
        </div>

        {loading ? (
          <div className="learner-empty-state" role="status">
            Loading your assigned classes…
          </div>
        ) : classes.length === 0 ? (
          <div className="learner-empty-state">
            <BookOpen size={30} />
            <h3>No classes assigned yet</h3>
            <p>
              Your school administrator needs to assign a class to your teacher
              account before it appears here.
            </p>
          </div>
        ) : (
          <div className="learner-table-scroll">
            <table className="learner-table">
              <thead>
                <tr>
                  <th>Class name</th>
                  <th>Academic year</th>
                  <th>Learners</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((schoolClass) => (
                  <tr key={schoolClass.id}>
                    <td>
                      <strong>{schoolClass.name}</strong>
                    </td>
                    <td>{schoolClass.academicYear || 'Not specified'}</td>
                    <td>
                      <span className="learner-status is-active">
                        {learnerCounts[schoolClass.id] || 0} learners
                      </span>
                    </td>
                    <td>{schoolClass.description || 'No description provided'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default TeacherClassesPage
