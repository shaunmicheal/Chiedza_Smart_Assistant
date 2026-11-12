import { UserRound } from 'lucide-react'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import EmptyState from '../../components/common/EmptyState'
import { useParentData, learnerName, formatParentDate } from './useParentData'
import './ParentPortal.css'

function ChildrenPage() {
  const { data, loading, error, refresh } = useParentData(['children'])
  const children = data.children || []

  return (
    <main className="content parent-portal">
      <PageHeading
        eyebrow="Parent / guardian workspace"
        title="My children"
        description="Learner profiles linked to your signed-in parent account."
      />

      {error && <div className="parent-data-message error" role="alert">{error}</div>}

      <Panel
        eyebrow={`${children.length} linked ${children.length === 1 ? 'record' : 'records'}`}
        title="Linked learner profiles"
        action={<button type="button" className="learner-secondary-button" onClick={refresh} disabled={loading}>Refresh</button>}
      >
        {loading ? (
          <div className="parent-page-loading">Loading linked children…</div>
        ) : children.length === 0 ? (
          <EmptyState
            title="No children linked yet"
            description="Please contact your school administrator if you believe a learner should be linked to your account."
            icon={UserRound}
          />
        ) : (
          <div className="parent-record-grid">
            {children.map((link) => {
              const learner = link.learner || {}
              return (
                <article className="parent-record-card" key={link.id}>
                  <h3>{learnerName(learner)}</h3>
                  <p>{learner.schoolClass?.name || 'Class not assigned'}</p>
                  <p>{learner.school?.name || 'School information unavailable'}</p>
                  <div className="parent-record-meta">
                    <span className="parent-record-tag">{link.relationship || 'Guardian'}</span>
                    {learner.admissionNumber && (
                      <span className="parent-record-tag">{learner.admissionNumber}</span>
                    )}
                  </div>
                  <p>Date of birth: {formatParentDate(learner.dateOfBirth)}</p>
                </article>
              )
            })}
          </div>
        )}
      </Panel>
    </main>
  )
}

export default ChildrenPage
