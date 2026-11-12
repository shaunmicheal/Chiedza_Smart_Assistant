import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Save, RefreshCw } from 'lucide-react'

import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'

import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import {
  AssessmentChart,
  PerformanceTrendChart,
} from '../../components/dashboard/DashboardCharts'

const getList = (response, label) => {
  if (!response?.success || !Array.isArray(response.data)) {
    throw new Error(`The server returned an invalid ${label} response.`)
  }

  return response.data
}

const getRecord = (response, label) => {
  if (!response?.success || !response.data) {
    throw new Error(`The server returned an invalid ${label} response.`)
  }

  return response.data
}

const getLocalDate = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10)
}

const formatDate = (value) => {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const learnerName = (learner) =>
  `${learner?.firstName ?? ''} ${learner?.lastName ?? ''}`.trim() ||
  'Learner record unavailable'

function AssessmentsPage({ role }) {
  const { activeMembership } = useAuth()
  const schoolId = activeMembership?.schoolId
  const isTeacher = role === 'teacher'

  const [classes, setClasses] = useState([])
  const [assessments, setAssessments] = useState([])
  const [learners, setLearners] = useState([])
  const [selectedId, setSelectedId] = useState('')

  const [selectedDetail, setSelectedDetail] = useState(null)
  const [scores, setScores] = useState({})
  const [savedScores, setSavedScores] = useState({})

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)

  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [newAssessment, setNewAssessment] = useState({
    title: '',
    description: '',
    classId: '',
    date: getLocalDate(),
    maxScore: '100',
  })

  const selectedAssessment = assessments.find(
    (assessment) => assessment.id === selectedId
  )

  const resultByLearner = useMemo(() => {
    const resultMap = {}

    for (const result of selectedDetail?.results ?? []) {
      resultMap[result.learnerId] = result
    }

    return resultMap
  }, [selectedDetail])

  const filteredAssessments = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return assessments

    return assessments.filter((assessment) => {
      const className = assessment.schoolClass?.name ?? ''

      return `${assessment.title} ${assessment.description ?? ''} ${className}`
        .toLowerCase()
        .includes(term)
    })
  }, [assessments, search])

  const completedScores = learners
    .map((learner) => {
      const raw = scores[learner.id]

      if (raw === undefined || raw === '') return null

      const value = Number(raw)

      return Number.isFinite(value) ? value : null
    })
    .filter((value) => value !== null)

  const assessedCount = completedScores.length

  const currentAverage =
    assessedCount && selectedAssessment?.maxScore
      ? Math.round(
          completedScores.reduce((total, score) => total + score, 0) /
            assessedCount /
            selectedAssessment.maxScore *
            100
        )
      : 0

  const performanceByClass =
    assessedCount && selectedAssessment
      ? [
          {
            group: selectedAssessment.schoolClass?.name ?? 'Selected class',
            score: currentAverage,
          },
        ]
      : []

  const trend =
    assessedCount && selectedAssessment
      ? [
          {
            dateLabel: new Intl.DateTimeFormat('en', {
              month: 'short',
              day: 'numeric',
            }).format(new Date(`${String(selectedAssessment.date).slice(0, 10)}T00:00:00`)),
            average: currentAverage,
            title: selectedAssessment.title,
          },
        ]
      : []

  const loadRegister = useCallback(async () => {
    if (!schoolId) {
      throw new Error(
        'No active school membership was found. Please sign in again.'
      )
    }

    const [classesResponse, assessmentsResponse] = await Promise.all([
      apiRequest(`/schools/${schoolId}/classes`),
      apiRequest(`/schools/${schoolId}/assessments`),
    ])

    const classRecords = getList(classesResponse, 'classes')
    const assessmentRecords = getList(
      assessmentsResponse,
      'assessments'
    )

    setClasses(classRecords)
    setAssessments(assessmentRecords)

    setNewAssessment((current) => ({
      ...current,
      classId:
        current.classId && classRecords.some((item) => item.id === current.classId)
          ? current.classId
          : classRecords[0]?.id ?? '',
    }))

    setSelectedId((current) => {
      if (current && assessmentRecords.some((item) => item.id === current)) {
        return current
      }

      return assessmentRecords[0]?.id ?? ''
    })
  }, [schoolId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        if (!schoolId) {
          throw new Error(
            'No active school membership was found. Please sign in again.'
          )
        }

        const [classesResponse, assessmentsResponse] = await Promise.all([
          apiRequest(`/schools/${schoolId}/classes`),
          apiRequest(`/schools/${schoolId}/assessments`),
        ])

        const classRecords = getList(classesResponse, 'classes')
        const assessmentRecords = getList(
          assessmentsResponse,
          'assessments'
        )

        if (cancelled) return

        setClasses(classRecords)
        setAssessments(assessmentRecords)

        setNewAssessment((current) => ({
          ...current,
          classId:
            current.classId &&
            classRecords.some((item) => item.id === current.classId)
              ? current.classId
              : classRecords[0]?.id ?? '',
        }))

        setSelectedId((current) => {
          if (current && assessmentRecords.some((item) => item.id === current)) {
            return current
          }

          return assessmentRecords[0]?.id ?? ''
        })
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              'Unable to load assessments. Please try again.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [schoolId])

  useEffect(() => {
    let cancelled = false

    const loadSelectedAssessment = async () => {
      if (!schoolId || !selectedId) {
        setSelectedDetail(null)
        setLearners([])
        setScores({})
        setSavedScores({})
        return
      }

      setDetailLoading(true)
      setFeedback('')

      try {
        const detailResponse = await apiRequest(
          `/schools/${schoolId}/assessments/${selectedId}`
        )

        const detail = getRecord(detailResponse, 'assessment')

        const learnersResponse = await apiRequest(
          `/schools/${schoolId}/learners?classId=${encodeURIComponent(detail.classId)}`
        )

        const learnerRecords = getList(learnersResponse, 'learners')

        if (cancelled) return

        const initialScores = {}

        for (const result of detail.results ?? []) {
          initialScores[result.learnerId] = String(result.score)
        }

        setSelectedDetail(detail)
        setLearners(learnerRecords)
        setScores(initialScores)
        setSavedScores(initialScores)
      } catch (requestError) {
        if (!cancelled) {
          setSelectedDetail(null)
          setLearners([])
          setScores({})
          setSavedScores({})
          setError(
            requestError.message ||
              'Unable to load this assessment and its learners.'
          )
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    loadSelectedAssessment()

    return () => {
      cancelled = true
    }
  }, [schoolId, selectedId])

  function handleScoreChange(learnerId, value) {
    setScores((current) => ({
      ...current,
      [learnerId]: value,
    }))
    setFeedback('')
  }

  async function createAssessment(event) {
    event.preventDefault()
    setError('')
    setFeedback('')

    if (!newAssessment.classId) {
      setError('Select a class before creating an assessment.')
      return
    }

    const maxScore = Number(newAssessment.maxScore)

    if (
      !newAssessment.title.trim() ||
      !newAssessment.date ||
      !Number.isInteger(maxScore) ||
      maxScore < 1 ||
      maxScore > 1000
    ) {
      setError(
        'Enter an assessment title, date, and a whole-number maximum score between 1 and 1000.'
      )
      return
    }

    setCreating(true)

    try {
      const response = await apiRequest(
        `/schools/${schoolId}/assessments`,
        {
          method: 'POST',
          body: {
            classId: newAssessment.classId,
            title: newAssessment.title.trim(),
            description: newAssessment.description.trim() || null,
            date: newAssessment.date,
            maxScore,
          },
        }
      )

      const created = getRecord(response, 'new assessment')

      setAssessments((current) => [
        created,
        ...current.filter((item) => item.id !== created.id),
      ])

      setSelectedId(created.id)
      setShowCreateForm(false)

      setNewAssessment((current) => ({
        ...current,
        title: '',
        description: '',
        date: getLocalDate(),
        maxScore: '100',
      }))

      setFeedback('Assessment created and saved successfully.')
    } catch (requestError) {
      setError(
        requestError.message || 'Unable to create the assessment.'
      )
    } finally {
      setCreating(false)
    }
  }

  async function saveResults() {
    if (!selectedAssessment || !selectedDetail) return

    setError('')
    setFeedback('')

    const pendingChanges = []

    for (const learner of learners) {
      const rawValue = scores[learner.id] ?? ''
      const existingResult = resultByLearner[learner.id]
      const savedValue = savedScores[learner.id]

      if (rawValue === '') {
        if (existingResult) {
          setError(
            `The saved score for ${learnerName(learner)} cannot be cleared. Enter a replacement score instead.`
          )
          return
        }

        continue
      }

      const score = Number(rawValue)

      if (
        !Number.isInteger(score) ||
        score < 0 ||
        score > selectedAssessment.maxScore
      ) {
        setError(
          `Enter a whole-number score from 0 to ${selectedAssessment.maxScore} for ${learnerName(learner)}.`
        )
        return
      }

      if (savedValue !== undefined && Number(savedValue) === score) {
        continue
      }

      pendingChanges.push({
        learnerId: learner.id,
        resultId: existingResult?.id,
        score,
      })
    }

    if (!pendingChanges.length) {
      setFeedback('There are no new score changes to save.')
      return
    }

    setSaving(true)

    let savedCount = 0

    try {
      for (const change of pendingChanges) {
        if (change.resultId) {
          await apiRequest(
            `/schools/${schoolId}/assessments/${selectedId}/results/${change.resultId}`,
            {
              method: 'PATCH',
              body: { score: change.score },
            }
          )
        } else {
          await apiRequest(
            `/schools/${schoolId}/assessments/${selectedId}/results`,
            {
              method: 'POST',
              body: {
                learnerId: change.learnerId,
                score: change.score,
              },
            }
          )
        }

        savedCount += 1
      }

      const refreshedResponse = await apiRequest(
        `/schools/${schoolId}/assessments/${selectedId}`
      )

      const refreshedDetail = getRecord(
        refreshedResponse,
        'updated assessment'
      )

      const refreshedScores = {}

      for (const result of refreshedDetail.results ?? []) {
        refreshedScores[result.learnerId] = String(result.score)
      }

      setSelectedDetail(refreshedDetail)
      setScores(refreshedScores)
      setSavedScores(refreshedScores)

      setFeedback(
        `${savedCount} learner score${savedCount === 1 ? '' : 's'} saved successfully.`
      )

      await loadRegister()
    } catch (requestError) {
      setError(
        savedCount > 0
          ? `${savedCount} score(s) were saved before an error occurred: ${requestError.message}. Refresh the assessment to check the saved records.`
          : requestError.message || 'Unable to save assessment results.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function refreshPage() {
    setError('')
    setFeedback('')

    try {
      await loadRegister()
    } catch (requestError) {
      setError(requestError.message || 'Unable to refresh assessments.')
    }
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow={isTeacher ? 'Assigned classes' : 'School operations'}
        title="Assessments"
        description="Create assessments, record learner scores, and review actual class performance."
      >
        <button
          type="button"
          className="secondary-button"
          onClick={refreshPage}
          disabled={loading || saving}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={() => setShowCreateForm((current) => !current)}
          disabled={loading || classes.length === 0}
        >
          <Plus size={16} aria-hidden="true" />
          {showCreateForm ? 'Close form' : 'New assessment'}
        </button>
      </PageHeading>

      {error && (
        <div className="dashboard-error" role="alert">
          <strong>Something went wrong</strong>
          <p>{error}</p>
        </div>
      )}

      {feedback && (
        <p className="form-feedback" role="status">
          {feedback}
        </p>
      )}

      {showCreateForm && (
        <Panel eyebrow="School records" title="Create assessment">
          {classes.length === 0 ? (
            <EmptyState
              title="No classes available"
              description="Create a school class before adding an assessment."
            />
          ) : (
            <form
              className="form-grid assessment-create-form"
              onSubmit={createAssessment}
            >
              <FormField id="assessment-title" label="Assessment title">
                <input
                  id="assessment-title"
                  value={newAssessment.title}
                  onChange={(event) =>
                    setNewAssessment((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                  maxLength={120}
                  placeholder="e.g. Mathematics Term 3 Test"
                />
              </FormField>

              <FormField
                id="assessment-description"
                label="Description"
                hint="Optional. Add details about the assessment."
              >
                <textarea
                  id="assessment-description"
                  value={newAssessment.description}
                  onChange={(event) =>
                    setNewAssessment((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  maxLength={500}
                  rows={3}
                />
              </FormField>

              <FormField id="assessment-class" label="Class">
                <select
                  id="assessment-class"
                  value={newAssessment.classId}
                  onChange={(event) =>
                    setNewAssessment((current) => ({
                      ...current,
                      classId: event.target.value,
                    }))
                  }
                  required
                >
                  {classes.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name} · {classroom.academicYear}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="assessment-date" label="Assessment date">
                <input
                  id="assessment-date"
                  type="date"
                  value={newAssessment.date}
                  onChange={(event) =>
                    setNewAssessment((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>

              <FormField
                id="assessment-maximum"
                label="Maximum score"
                hint="Use a whole number between 1 and 1000."
              >
                <input
                  id="assessment-maximum"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={newAssessment.maxScore}
                  onChange={(event) =>
                    setNewAssessment((current) => ({
                      ...current,
                      maxScore: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create assessment'}
                </button>
              </div>
            </form>
          )}
        </Panel>
      )}

      {loading ? (
        <Panel eyebrow="School records" title="Assessments">
          <p>Loading your school's assessment records...</p>
        </Panel>
      ) : (
        <>
          <section className="assessment-overview-grid">
            <Panel eyebrow="School register" title="Assessments">
              <FormField
                id="assessment-search"
                label="Search assessments"
              >
                <input
                  id="assessment-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title or class"
                />
              </FormField>

              {filteredAssessments.length === 0 ? (
                <EmptyState
                  title={
                    assessments.length === 0
                      ? 'No assessments recorded yet'
                      : 'No matching assessments'
                  }
                  description={
                    assessments.length === 0
                      ? 'Create your first assessment to begin recording learner results.'
                      : 'Try a different search term.'
                  }
                />
              ) : (
                <ul className="assessment-list">
                  {filteredAssessments.map((assessment) => (
                    <li key={assessment.id}>
                      <button
                        className={`assessment-list-item ${
                          selectedId === assessment.id ? 'selected' : ''
                        }`}
                        type="button"
                        onClick={() => {
                          setSelectedId(assessment.id)
                          setError('')
                          setFeedback('')
                        }}
                      >
                        <span>
                          <strong>{assessment.title}</strong>
                          <small>
                            {assessment.schoolClass?.name ??
                              'Class unavailable'}
                          </small>
                        </span>

                        <span>
                          <time dateTime={String(assessment.date).slice(0, 10)}>
                            {formatDate(assessment.date)}
                          </time>
                          <small>Max {assessment.maxScore}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              eyebrow={
                selectedAssessment?.schoolClass?.name ??
                'Assessment results'
              }
              title={selectedAssessment?.title ?? 'Select an assessment'}
              action={
                selectedAssessment ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={saveResults}
                    disabled={saving || detailLoading || !selectedDetail}
                  >
                    <Save size={16} aria-hidden="true" />
                    {saving ? 'Saving...' : 'Save results'}
                  </button>
                ) : null
              }
            >
              {!selectedAssessment ? (
                <EmptyState
                  title="No assessment selected"
                  description="Create an assessment or select an existing one."
                />
              ) : detailLoading ? (
                <p>Loading assessment results and learners...</p>
              ) : (
                <>
                  {selectedDetail?.description && (
                    <p>{selectedDetail.description}</p>
                  )}

                  <div className="assessment-summary">
                    <span>
                      <strong>{selectedAssessment.maxScore}</strong>
                      {' '}maximum score
                    </span>

                    <span>
                      <strong>{assessedCount}</strong>
                      {' '}of {learners.length} scores entered
                    </span>

                    <span>
                      <strong>
                        {assessedCount ? `${currentAverage}%` : '—'}
                      </strong>
                      {' '}class average
                    </span>
                  </div>

                  {learners.length === 0 ? (
                    <EmptyState
                      title="No learners in this class"
                      description="Add learners to this class before recording assessment scores."
                    />
                  ) : (
                    <div
                      className="responsive-register"
                      role="table"
                      aria-label={`Results for ${selectedAssessment.title}`}
                    >
                      <div
                        className="register-row register-header"
                        role="row"
                      >
                        <span role="columnheader">Learner</span>
                        <span role="columnheader">Score</span>
                        <span role="columnheader">Maximum</span>
                        <span role="columnheader">Percentage</span>
                      </div>

                      {learners.map((learner) => {
                        const rawScore = scores[learner.id] ?? ''
                        const numericScore =
                          rawScore === '' ? null : Number(rawScore)

                        const percentage =
                          numericScore !== null &&
                          Number.isFinite(numericScore)
                            ? `${Math.round(
                                (numericScore / selectedAssessment.maxScore) *
                                  100
                              )}%`
                            : '—'

                        const existingResult = resultByLearner[learner.id]

                        return (
                          <div
                            className="register-row results-row"
                            role="row"
                            key={learner.id}
                          >
                            <span
                              className="register-learner"
                              role="cell"
                            >
                              <strong>{learnerName(learner)}</strong>
                              <small>
                                {learner.admissionNumber}
                                {!learner.isActive ? ' · Inactive' : ''}
                              </small>
                            </span>

                            <span role="cell">
                              <input
                                className="score-entry"
                                type="number"
                                min="0"
                                max={selectedAssessment.maxScore}
                                step="1"
                                inputMode="numeric"
                                aria-label={`Score for ${learnerName(learner)}`}
                                value={rawScore}
                                onChange={(event) =>
                                  handleScoreChange(
                                    learner.id,
                                    event.target.value
                                  )
                                }
                                disabled={saving}
                              />
                            </span>

                            <span role="cell">
                              {selectedAssessment.maxScore}
                            </span>

                            <strong role="cell">{percentage}</strong>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {learners.length > 0 && (
                    <p className="form-hint">
                      {saving
                        ? 'Saving learner scores to the school database...'
                        : 'Enter scores and select Save results to store them in the school database.'}
                    </p>
                  )}
                </>
              )}
            </Panel>
          </section>

          <section
            className="panel-grid assessment-charts"
            aria-label="Assessment performance"
          >
            {performanceByClass.length > 0 ? (
              <AssessmentChart
                data={performanceByClass}
                title="Selected class performance"
                eyebrow="Saved and entered scores"
                ariaLabel="Selected class assessment average"
              />
            ) : (
              <Panel eyebrow="Class averages" title="Performance summary">
                <EmptyState
                  title="No scored results yet"
                  description="Enter learner scores to calculate the class average."
                />
              </Panel>
            )}

            {trend.length > 0 ? (
              <PerformanceTrendChart data={trend} />
            ) : (
              <Panel eyebrow="Assessment results" title="Performance overview">
                <EmptyState
                  title="No assessment results yet"
                  description="Performance information will appear after scores have been entered."
                />
              </Panel>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default AssessmentsPage
