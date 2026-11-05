import {
  linkedChildAttendanceRate,
  linkedChildAttendanceTrend,
  linkedChildDemo,
} from '../../data/mock/parentDashboard'
import DemoNotice from '../../components/common/DemoNotice'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import { AttendanceChart } from '../../components/dashboard/DashboardCharts'
import { CalendarCheck2 } from 'lucide-react'

function ParentAttendancePage() {
  return (
    <main className="content">
      <PageHeading eyebrow="Linked child" title="Attendance" description={`Attendance summary for ${linkedChildDemo.name} · ${linkedChildDemo.className}`} />
      <DemoNotice>Linked-child demonstration summary only. No attendance records are connected to a school system.</DemoNotice>
      <section className="parent-attendance-summary">
        <article className="summary-card"><CalendarCheck2 size={18} aria-hidden="true" /><span>Attendance summary</span><strong>{linkedChildAttendanceRate}</strong><small>Demonstration term rate</small></article>
        <article className="summary-card"><span>Days present</span><strong>{linkedChildDemo.attendanceDaysPresent}</strong><small>Example count only</small></article>
        <article className="summary-card"><span>Days absent</span><strong>{linkedChildDemo.attendanceDaysAbsent}</strong><small>Example count only</small></article>
      </section>
      <AttendanceChart data={linkedChildAttendanceTrend} eyebrow="Linked child · demo" title="Attendance over time" ariaLabel={`Demonstration attendance trend for ${linkedChildDemo.name}`} />
      <Panel eyebrow="Attendance history · demo" title="Recent record">
        <ul className="history-list">
          <li className="history-row"><span><strong>{linkedChildDemo.name}</strong><time dateTime="2026-11-04">4 November 2026</time></span><strong>Present</strong></li>
          <li className="history-row"><span><strong>{linkedChildDemo.name}</strong><time dateTime="2026-11-03">3 November 2026</time></span><strong>Present</strong></li>
        </ul>
      </Panel>
    </main>
  )
}

export default ParentAttendancePage
