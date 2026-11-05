import { DEMO_DATA_NOTICE } from '../../data/mock/dashboard'
import {
  pendingParentDrafts,
  recentAssessmentActivity,
  teacherAssignedClasses,
  teacherAttendanceTrend,
  teacherLearnersNeedingAttention,
  teacherOverviewStats,
} from '../../data/mock/teacherDashboard'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import StatusBadge from '../../components/common/StatusBadge'
import AlertItem from '../../components/dashboard/AlertItem'
import { AttendanceChart } from '../../components/dashboard/DashboardCharts'
import LearnerSummaryRow from '../../components/dashboard/LearnerSummaryRow'
import RecentActivityItem from '../../components/dashboard/RecentActivityItem'
import StatCard from '../../components/dashboard/StatCard'

function TeacherDashboardPage() {
  return (
    <main className="content">
      <PageHeading
        eyebrow="Welcome"
        title="Your teaching overview"
        description="This workspace is scoped to assigned classes and learners. Access limits will be enforced by the future backend."
      />
      <p className="demo-notice" role="note">
        {DEMO_DATA_NOTICE} Assigned classes and attendance summaries below are examples only.
      </p>

      <Panel eyebrow="Your classes" title="Assigned class summary">
        <ul className="class-summary-list">
          {teacherAssignedClasses.map((classroom) => (
            <li className="class-summary-item" key={classroom.name}>
              <span>
                <strong>{classroom.name}</strong>
                <span>{classroom.note}</span>
              </span>
              <StatusBadge tone="positive">{classroom.learners} learners</StatusBadge>
            </li>
          ))}
        </ul>
      </Panel>

      <section className="stats-grid teacher-stats" aria-label="Assigned classes summary">
        {teacherOverviewStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <section className="panel-grid panels-top teacher-dashboard-grid" aria-label="Attendance and learner support">
        <AttendanceChart
          data={teacherAttendanceTrend}
          eyebrow="Assigned classes · demo"
          title="Attendance trend"
          ariaLabel="Demonstration attendance trend for assigned classes"
        />
        <Panel eyebrow="Early warnings · demo" title="Learners needing attention">
          <ul className="learner-list">
            {teacherLearnersNeedingAttention.map((learner) => (
              <LearnerSummaryRow key={learner.name} {...learner} />
            ))}
          </ul>
        </Panel>
      </section>

      <section className="panel-grid panels-bottom teacher-dashboard-grid" aria-label="Assessment and parent messages">
        <Panel eyebrow="Recent assessment activity · demo" title="Assessment activity">
          <ul className="activity-list">
            {recentAssessmentActivity.map((item) => (
              <RecentActivityItem
                key={`${item.subject}-${item.className}`}
                title={`${item.subject} · ${item.className}`}
                detail={item.activity}
                time={item.time}
              />
            ))}
          </ul>
        </Panel>
        <Panel eyebrow="English and Shona · demo" title="Pending parent drafts">
          <ul className="alert-list">
            {pendingParentDrafts.map((draft) => (
              <AlertItem
                key={`${draft.language}-${draft.className}`}
                title={`${draft.language} message`}
                detail={`${draft.status} · ${draft.className}`}
                level="info"
                time="Demo"
              />
            ))}
          </ul>
        </Panel>
      </section>
    </main>
  )
}

export default TeacherDashboardPage
