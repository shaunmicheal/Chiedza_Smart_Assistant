import {
  ArrowUpRight,
  CalendarCheck2,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DEMO_DATA_NOTICE,
  dashboardStats,
  parentMessages,
  recentAlerts,
  riskLearners,
} from '../../data/mock/dashboard'
import AlertItem from '../../components/dashboard/AlertItem'
import { AssessmentChart, AttendanceChart } from '../../components/dashboard/DashboardCharts'
import DashboardHero from '../../components/dashboard/DashboardHero'
import LearnerSummaryRow from '../../components/dashboard/LearnerSummaryRow'
import ParentMessageRow from '../../components/dashboard/ParentMessageRow'
import StatCard from '../../components/dashboard/StatCard'
import Panel from '../../components/common/Panel'

function DashboardPage() {
  return (
    <main className="content">
      <p className="demo-notice" role="note">{DEMO_DATA_NOTICE}</p>
      <DashboardHero />

      <section className="stats-grid" aria-label="School overview statistics">
        {dashboardStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <section className="panel-grid panels-top" aria-label="Attendance and early warnings">
        <AttendanceChart />
        <Panel
          eyebrow="Needs review"
          title="Recent alerts"
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

      <section className="bottom-grid" aria-label="Learner support and quick actions">
        <Panel
          eyebrow="Attendance and assessment patterns"
          title="Learners to review"
          action={<Link className="link-button" to="/admin/learners">View learners</Link>}
        >
          <ul className="learner-list">
            {riskLearners.map((learner) => <LearnerSummaryRow key={learner.name} {...learner} />)}
          </ul>
        </Panel>
        <Panel eyebrow="Quick actions" title="Staff workflow">
          <div className="action-stack">
            <Link className="action-button" to="/admin/attendance">
              <CalendarCheck2 size={18} aria-hidden="true" />
              Review attendance
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link className="action-button" to="/admin/assessments">
              <UserRound size={18} aria-hidden="true" />
              Record assessment progress
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link className="action-button" to="/admin/parent-communication">
              <MessageSquareText size={18} aria-hidden="true" />
              Prepare a parent message
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link className="action-button" to="/admin/early-warnings">
              <ShieldCheck size={18} aria-hidden="true" />
              Review early warnings
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </Panel>
      </section>
    </main>
  )
}

export default DashboardPage
