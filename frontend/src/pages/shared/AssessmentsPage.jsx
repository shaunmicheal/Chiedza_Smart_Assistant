import { useMemo, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import {
  demoClasses,
  demoLearners,
  demoNotice,
  initialAssessments,
} from '../../data/mock/operations'
import DemoNotice from '../../components/common/DemoNotice'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import { AssessmentChart, PerformanceTrendChart } from '../../components/dashboard/DashboardCharts'

const formatDate = (date) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`))

function averageScore(assessment) {
  const completed = assessment.results.filter((result) => result.score !== '' && result.score !== null && Number.isFinite(Number(result.score)))
  if (!completed.length) return 0
  return Math.round(completed.reduce((sum, result) => sum + (Number(result.score) / assessment.maximum) * 100, 0) / completed.length)
}

function AssessmentsPage({ role }) {
  const isTeacher = role === 'teacher'
  const classes = demoClasses.filter((classroom) => !isTeacher || ['Grade 4A', 'Grade 5B'].includes(classroom.name))
  const [assessments, setAssessments] = useState(initialAssessments)
  const [selectedId, setSelectedId] = useState(initialAssessments[0].id)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [search, setSearch] = useState('')
  const [scoreErrors, setScoreErrors] = useState({})
  const [feedback, setFeedback] = useState('')
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    subject: '',
    className: classes[0]?.name ?? '',
    date: '2026-11-05',
    maximum: '100',
  })

  const scopedAssessments = useMemo(() => assessments.filter((assessment) =>
    !isTeacher || ['Grade 4A', 'Grade 5B'].includes(assessment.className)),
  [assessments, isTeacher])
  const selectedAssessment = scopedAssessments.find((assessment) => assessment.id === selectedId)
    ?? scopedAssessments[0]
  const filteredAssessments = scopedAssessments.filter((assessment) =>
    `${assessment.title} ${assessment.subject} ${assessment.className}`.toLowerCase().includes(search.trim().toLowerCase()))
  const performanceByClass = classes.map((classroom) => {
    const classAssessments = scopedAssessments.filter((assessment) => assessment.className === classroom.name)
    const results = classAssessments.flatMap((assessment) => assessment.results)
      .filter((result) => result.score !== '' && result.score !== null)
    const score = results.length
      ? Math.round(results.reduce((sum, result) => sum + (Number(result.score) / classAssessments.find((assessment) => assessment.results.includes(result)).maximum) * 100, 0) / results.length)
      : 0
    return { group: classroom.name, score }
  }).filter((item) => item.score > 0)
  const trend = scopedAssessments
    .filter((assessment) => assessment.results.some((result) => result.score !== '' && result.score !== null))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((assessment) => ({
      dateLabel: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${assessment.date}T00:00:00`)),
      average: averageScore(assessment),
      title: assessment.title,
    }))

  function createAssessment(event) {
    event.preventDefault()
    const maximum = Number(newAssessment.maximum)
    if (!newAssessment.title.trim() || !newAssessment.subject.trim() || !newAssessment.date || !Number.isFinite(maximum) || maximum <= 0) {
      setFeedback('Enter an assessment title, subject, date, and a maximum score greater than zero.')
      return
    }

    const assessment = {
      id: `as-local-${Date.now()}`,
      title: newAssessment.title.trim(),
      subject: newAssessment.subject.trim(),
      className: newAssessment.className,
      date: newAssessment.date,
      maximum,
      results: demoLearners
        .filter((learner) => learner.className === newAssessment.className)
        .map((learner) => ({ learnerId: learner.id, score: '' })),
    }
    setAssessments((current) => [assessment, ...current])
    setSelectedId(assessment.id)
    setShowCreateForm(false)
    setNewAssessment((current) => ({ ...current, title: '', subject: '', maximum: '100' }))
    setFeedback('Assessment added in this page only. It has not been saved to a school system.')
  }

  function updateScore(learnerId, rawValue) {
    const raw = rawValue.trim()
    const numeric = raw === '' ? '' : Number(raw)
    const error = raw !== '' && (!Number.isFinite(numeric) || numeric < 0 || numeric > selectedAssessment.maximum)
      ? `Enter a score from 0 to ${selectedAssessment.maximum}.`
      : ''
    setScoreErrors((current) => ({ ...current, [learnerId]: error }))
    setFeedback('')
    if (error) return
    setAssessments((current) => current.map((assessment) => assessment.id !== selectedAssessment.id
      ? assessment
      : {
          ...assessment,
          results: assessment.results.map((result) => result.learnerId === learnerId
            ? { ...result, score: numeric }
            : result),
        }))
  }

  function saveResults() {
    if (Object.values(scoreErrors).some(Boolean)) return
    setFeedback('Assessment results updated in this page only. They have not been saved to a school system.')
  }

  const selectedLearners = selectedAssessment
    ? demoLearners.filter((learner) => learner.className === selectedAssessment.className)
    : []
  const assessedCount = selectedAssessment?.results.filter((result) => result.score !== '' && result.score !== null).length ?? 0
  const currentAverage = selectedAssessment ? averageScore(selectedAssessment) : 0

  return (
    <main className="content">
      <PageHeading
        eyebrow={isTeacher ? 'Assigned classes' : 'School operations'}
        title="Assessments"
        description="Create assessments, enter learner scores, and review class performance."
      >
        <button type="button" className="primary-button" onClick={() => setShowCreateForm((show) => !show)}>
          <Plus size={16} aria-hidden="true" /> {showCreateForm ? 'Close form' : 'New assessment'}
        </button>
      </PageHeading>
      <DemoNotice>{demoNotice} Assessment records and score edits are local demonstration state only.</DemoNotice>
      {feedback && <p className="form-feedback" role="status">{feedback}</p>}

      {showCreateForm && (
        <Panel eyebrow="Local demonstration form" title="Create assessment">
          <form className="form-grid assessment-create-form" onSubmit={createAssessment}>
            <FormField id="assessment-title" label="Assessment title">
              <input id="assessment-title" value={newAssessment.title} onChange={(event) => setNewAssessment({ ...newAssessment, title: event.target.value })} required maxLength={100} />
            </FormField>
            <FormField id="assessment-subject" label="Subject">
              <input id="assessment-subject" value={newAssessment.subject} onChange={(event) => setNewAssessment({ ...newAssessment, subject: event.target.value })} required maxLength={60} />
            </FormField>
            <FormField id="assessment-class" label="Class">
              <select id="assessment-class" value={newAssessment.className} onChange={(event) => setNewAssessment({ ...newAssessment, className: event.target.value })}>
                {classes.map((classroom) => <option key={classroom.id} value={classroom.name}>{classroom.name}</option>)}
              </select>
            </FormField>
            <FormField id="assessment-date" label="Assessment date">
              <input id="assessment-date" type="date" value={newAssessment.date} onChange={(event) => setNewAssessment({ ...newAssessment, date: event.target.value })} required />
            </FormField>
            <FormField id="assessment-maximum" label="Maximum score" hint="Must be a number greater than zero.">
              <input id="assessment-maximum" type="number" min="1" step="1" value={newAssessment.maximum} onChange={(event) => setNewAssessment({ ...newAssessment, maximum: event.target.value })} required />
            </FormField>
            <div className="form-actions">
              <button type="submit" className="primary-button">Create demonstration assessment</button>
            </div>
          </form>
        </Panel>
      )}

      <section className="assessment-overview-grid">
        <Panel eyebrow="Assessment register" title="Assessments">
          <FormField id="assessment-search" label="Search assessments">
            <input id="assessment-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, subject, or class" />
          </FormField>
          {filteredAssessments.length === 0 ? (
            <EmptyState title="No assessments found" description="Try another search or create a new demonstration assessment." />
          ) : (
            <ul className="assessment-list">
              {filteredAssessments.map((assessment) => (
                <li key={assessment.id}>
                  <button
                    className={`assessment-list-item ${selectedAssessment?.id === assessment.id ? 'selected' : ''}`}
                    type="button"
                    onClick={() => { setSelectedId(assessment.id); setScoreErrors({}); setFeedback('') }}
                  >
                    <span><strong>{assessment.title}</strong><small>{assessment.subject} · {assessment.className}</small></span>
                    <span><time dateTime={assessment.date}>{formatDate(assessment.date)}</time><small>Max {assessment.maximum}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {selectedAssessment && (
          <Panel
            eyebrow={`${selectedAssessment.subject} · ${selectedAssessment.className}`}
            title={selectedAssessment.title}
            action={<button type="button" className="secondary-button" onClick={saveResults}><Save size={16} aria-hidden="true" /> Save results locally</button>}
          >
            <div className="assessment-summary">
              <span><strong>{selectedAssessment.maximum}</strong> maximum score</span>
              <span><strong>{assessedCount}</strong> of {selectedLearners.length} scores entered</span>
              <span><strong>{assessedCount ? `${currentAverage}%` : '—'}</strong> class average</span>
            </div>
            <div className="responsive-register" role="table" aria-label={`Results for ${selectedAssessment.title}`}>
              <div className="register-row register-header" role="row">
                <span role="columnheader">Learner</span><span role="columnheader">Score</span><span role="columnheader">Maximum</span><span role="columnheader">Percentage</span>
              </div>
              {selectedLearners.map((learner) => {
                const result = selectedAssessment.results.find((item) => item.learnerId === learner.id)
                const percent = result?.score !== '' && result?.score !== null && result
                  ? `${Math.round((Number(result.score) / selectedAssessment.maximum) * 100)}%`
                  : '—'
                return (
                  <div className="register-row results-row" role="row" key={learner.id}>
                    <span className="register-learner" role="cell"><strong>{learner.name}</strong><small>Demo learner</small></span>
                    <span role="cell">
                      <input
                        className="score-entry"
                        type="number"
                        min="0"
                        max={selectedAssessment.maximum}
                        step="any"
                        inputMode="decimal"
                        aria-label={`Score for ${learner.name}`}
                        aria-invalid={Boolean(scoreErrors[learner.id])}
                        aria-describedby={scoreErrors[learner.id] ? `score-error-${learner.id}` : undefined}
                        value={result?.score ?? ''}
                        onChange={(event) => updateScore(learner.id, event.target.value)}
                      />
                      {scoreErrors[learner.id] && <small className="field-error" id={`score-error-${learner.id}`}>{scoreErrors[learner.id]}</small>}
                    </span>
                    <span role="cell">{selectedAssessment.maximum}</span>
                    <strong role="cell">{percent}</strong>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
      </section>

      <section className="panel-grid assessment-charts" aria-label="Assessment performance">
        {performanceByClass.length > 0
          ? <AssessmentChart data={performanceByClass} title="Class performance summary" eyebrow="Demonstration averages" ariaLabel="Demonstration class performance averages" />
          : <Panel eyebrow="Class averages" title="Performance summary"><EmptyState title="No scored results yet" description="Enter scores to see class averages." /></Panel>}
        {trend.length > 0
          ? <PerformanceTrendChart data={trend} />
          : <Panel eyebrow="Results over time" title="Performance trend"><EmptyState title="No assessment history yet" description="Entered results will appear here as a demonstration trend." /></Panel>}
      </section>
    </main>
  )
}

export default AssessmentsPage
