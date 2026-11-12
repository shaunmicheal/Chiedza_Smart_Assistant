import { CalendarCheck2 } from 'lucide-react'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import EmptyState from '../../components/common/EmptyState'
import { useParentData, learnerName, formatParentDate } from './useParentData'
import './ParentPortal.css'

function ParentAttendancePage() {
  const { data, loading, error, refresh } = useParentData(['attendance'])
  const records = data.attendance || []

  const present = records.filter((record) => record.status === 'PRESENT').length
  const absent = records.filter((record) => record.status === 'ABSENT').length
  const excused = records.filter((record) => record.status === 'EXCUSED').length
  const rate = records.length ? Math.round((present / records.length) * 100) : null

  return (
    <main className="content parent-portal">
      <PageHeading
        eyebrow="Linked learners"
        title="Attendance"
        description="Attendance records for learners linked to your parent account."
      />

      {error && <div className="parent-data-message error" role="alert">{error}</div>}

      <section className="parent-record-grid" aria-label="Attendance summary">
        <article className="parent-record-card">
          <h3>Attendance rate</h3>
          <span className="parent-record-value">{rate === null ? '—' : `${rate}%`}</span>
          <p>Based on records currently available</p>
        </article>
        <article className="parent-record-card">
          <h3>Present</h3>
          <span className="parent-record-value">{loading ? '—' : present}</span>
          <p>Recorded present days</p>
        </article>
        <article className="parent-record-card">
          <h3>Absent</h3>
          <span className="parent-record-value">{loading ? '—' : absent}</span>
          <p>Recorded absent days</p>
        </article>
        <article className="parent-record-card">
          <h3>Excused</h3>
          <span className="parent-record-value">{loading ? '—' : excused}</span>
          <p>Recorded excused absences</p>
        </article>
      </section>

      <Panel
        eyebrow={`${records.length} attendance ${records.length === 1 ? 'record' : 'records'}`}
        title="Attendance history"
        action={<button type="button" className="learner-secondary-button" onClick={refresh} disabled={loading}>Refresh</button>}
      >
        {loading ? (
          <div className="parent-page-loading">Loading attendance records…</div>
        ) : records.length === 0 ? (
          <EmptyState
            title="No attendance records yet"
            description="Attendance entries will appear here after the school records them."
            icon={CalendarCheck2}
          />
        ) : (
          <div className="parent-table-wrap">
            <table className="parent-table">
              <thead>
                <tr><th>Learner</th><th>Class</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{learnerName(record.learner)}</strong></td>
                    <td>{record.learner?.schoolClass?.name || '—'}</td>
                    <td>{formatParentDate(record.date)}</td>
                    <td>
                      <span className={`parent-record-tag ${record.status === 'ABSENT' ? 'absent' : record.status === 'PRESENT' ? 'present' : ''}`}>
                        {record.status || 'Not specified'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  )
}

export default ParentAttendancePage
