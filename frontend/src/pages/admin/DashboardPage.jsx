import { Link } from 'react-router-dom'
import {
  DEMO_DATA_NOTICE,
  dashboardStats,
  parentMessages,
  recentActivity,
  recentAlerts,
  riskLearners,
} from '../../data/mock/dashboard'
import AlertItem from '../../components/dashboard/AlertItem'
import { AssessmentChart, AttendanceChart } from '../../components/dashboard/DashboardCharts'
import LearnerSummaryRow from '../../components/dashboard/LearnerSummaryRow'
import ParentMessageRow from '../../components/dashboard/ParentMessageRow'
import RecentActivityItem from '../../components/dashboard/RecentActivityItem'
import StatCard from '../../components/dashboard/StatCard'
import Panel from '../../components/common/Panel'

function DashboardPage() {
  return (
    <main className="content">
      <p className="demo-notice" role="note">{DEMO_DATA_NOTICE}</p>

      <section className="stats-grid" aria-label="School-level overview">
        {dashboardStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <section className="panel-grid panels-top" aria-label="Attendance and active early warnings">
        <AttendanceChart />
        <Panel
          eyebrow="School-level overview"
          title="Active early-warning alerts"
          action={<Link className="link-button" to="/admin/early-warnings">View all</Link>}
        >
          <ul className="alert-list">
            {recentAlerts.map((alert) => <AlertItem key={alert.title} {...alert} />)}
          </ul>
        </Panel>
      </section>

      <section className="panel-grid panels-bottom" aria-label="Assessment and parent communication">
        <AssessmentChart />
        <Panel
          eyebrow="English and Shona"
          title="Parent communication"
          action={<Link className="link-button" to="/admin/parent-communication">Open messages</Link>}
        >
          <ul className="message-list">
            {parentMessages.map((message) => <ParentMessageRow key={message.name} {...message} />)}
          </ul>
        </Panel>
      </section>

      <section className="bottom-grid" aria-label="Learner support and recent activity">
        <Panel
          eyebrow="Attendance and assessment patterns"
          title="Learners to review"
          action={<Link className="link-button" to="/admin/learners">View learners</Link>}
        >
          <ul className="learner-list">
            {riskLearners.map((learner) => <LearnerSummaryRow key={learner.name} {...learner} />)}
          </ul>
        </Panel>
        <Panel eyebrow="Recent activity" title="School activity">
          <ul className="activity-list">
            {recentActivity.map((item) => <RecentActivityItem key={item.title} {...item} />)}
          </ul>
        </Panel>
      </section>
    </main>
  )
}

export default DashboardPage
