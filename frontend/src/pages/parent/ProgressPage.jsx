import { BookOpen } from 'lucide-react'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import EmptyState from '../../components/common/EmptyState'
import { useParentData, learnerName, formatParentDate, percentage } from './useParentData'
import './ParentPortal.css'

function ProgressPage() {
  const { data, loading, error, refresh } = useParentData(['assessments'])
  const results = data.assessments || []

  return (
    <main className="content parent-portal">
      <PageHeading
        eyebrow="Linked learners"
        title="Academic progress"
        description="Assessment results recorded for learners linked to your account."
      />

      {error && <div className="parent-data-message error" role="alert">{error}</div>}

      <Panel
        eyebrow={`${results.length} assessment ${results.length === 1 ? 'result' : 'results'}`}
        title="Assessment results"
        action={<button type="button" className="learner-secondary-button" onClick={refresh} disabled={loading}>Refresh</button>}
      >
        {loading ? (
          <div className="parent-page-loading">Loading assessment results…</div>
        ) : results.length === 0 ? (
          <EmptyState
            title="No assessment results yet"
            description="Results will appear here after teachers record and publish assessment marks."
            icon={BookOpen}
          />
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr><th>Learner</th><th>Assessment</th><th>Date</th><th>Score</th><th>Percentage</th></tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const assessment = result.assessment || {}
                  const scorePercent = percentage(result.score, assessment.maxScore)
                  return (
                    <tr key={result.id}>
                      <td><strong>{learnerName(result.learner)}</strong></td>
                      <td>{assessment.title || 'Assessment'}</td>
                      <td>{formatParentDate(assessment.date || result.createdAt)}</td>
                      <td>{result.score ?? '—'} / {assessment.maxScore ?? '—'}</td>
                      <td>{scorePercent === null ? '—' : `${scorePercent}%`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  )
}

export default ProgressPage
