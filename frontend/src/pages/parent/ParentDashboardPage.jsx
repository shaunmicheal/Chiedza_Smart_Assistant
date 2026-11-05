import { CalendarCheck2, GraduationCap, Languages } from 'lucide-react'
import { DEMO_DATA_NOTICE } from '../../data/mock/dashboard'
import {
  linkedChildAssessments,
  linkedChildAttendanceTrend,
  linkedChildDemo,
  parentNotifications,
  parentOverviewStats,
  parentSchoolMessages,
} from '../../data/mock/parentDashboard'
import Avatar from '../../components/common/Avatar'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import AlertItem from '../../components/dashboard/AlertItem'
import { AssessmentChart, AttendanceChart } from '../../components/dashboard/DashboardCharts'
import StatCard from '../../components/dashboard/StatCard'

function ParentDashboardPage() {
  return (
    <main className="content">
      <PageHeading
        eyebrow="Welcome"
        title="Your family overview"
        description="School updates for your linked child, with communication context in English and Shona."
      />
      <p className="demo-notice" role="note">
        {DEMO_DATA_NOTICE} Only the single linked-child example below is shown; future records must be limited to children linked to the signed-in guardian.
      </p>

      <Panel eyebrow="Linked child · demonstration" title="Child summary">
        <div className="linked-child-summary">
          <Avatar initials={linkedChildDemo.initials} />
          <div className="linked-child-details">
            <strong>{linkedChildDemo.name}</strong>
            <span>{linkedChildDemo.className} · {linkedChildDemo.relation}</span>
          </div>
          <span className="linked-child-scope">
            <CalendarCheck2 size={16} aria-hidden="true" />
            Linked-child view
          </span>
        </div>
      </Panel>

      <section className="stats-grid parent-stats" aria-label="Linked child summary">
        {parentOverviewStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </section>

      <section className="panel-grid panels-top parent-dashboard-grid" aria-label="Linked child attendance and academic progress">
        <AttendanceChart
          data={linkedChildAttendanceTrend}
          eyebrow="Linked child · demo"
          title="Attendance overview"
          ariaLabel="Demonstration attendance overview for the linked child"
        />
        <AssessmentChart
          data={linkedChildAssessments}
          eyebrow="Linked child · demo"
          title="Academic progress"
          ariaLabel="Demonstration academic progress for the linked child"
        />
      </section>

      <section className="panel-grid panels-bottom parent-dashboard-grid" aria-label="School messages and notifications">
        <Panel eyebrow="English and Shona · demonstration messages" title="Recent school messages">
          <ul className="parent-school-message-list">
            {parentSchoolMessages.map((message) => (
              <li className="parent-school-message" key={message.title}>
                <div className="parent-message-title">
                  <Languages size={17} aria-hidden="true" />
                  <strong>{message.title}</strong>
                  <time>{message.time}</time>
                </div>
                <p><span className="language-label">English</span>{message.english}</p>
                <p><span className="language-label">Shona</span>{message.shona}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel eyebrow="Linked child · demo" title="In-app notifications">
          <ul className="alert-list">
            {parentNotifications.map((notification) => (
              <AlertItem key={notification.title} {...notification} />
            ))}
          </ul>
        </Panel>
      </section>
      <p className="parent-privacy-note">
        <GraduationCap size={16} aria-hidden="true" />
        This view is designed for updates about linked children only. Internal staff notes and other learners’ information are not included.
      </p>
    </main>
  )
}

export default ParentDashboardPage
