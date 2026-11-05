import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import {
  attendanceHistory,
  attendanceTrendByMonth,
  demoClasses,
  demoLearners,
  demoNotice,
  initialAttendanceRecords,
} from '../../data/mock/operations'
import DemoNotice from '../../components/common/DemoNotice'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import StatusBadge from '../../components/common/StatusBadge'
import { AttendanceChart } from '../../components/dashboard/DashboardCharts'

const attendanceStatuses = ['Present', 'Absent', 'Late', 'Excused']
const statusTones = {
  Present: 'status-positive',
  Absent: 'severity-high',
  Late: 'status-warning',
  Excused: 'status-neutral',
  Unmarked: 'status-neutral',
}
const initialDate = '2026-11-05'
const emptyRecords = []
const formatDate = (date) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`))

function AttendancePage({ role }) {
  const isTeacher = role === 'teacher'
  const classes = demoClasses.filter((classroom) => !isTeacher || ['Grade 4A', 'Grade 5B'].includes(classroom.name))
  const [className, setClassName] = useState(isTeacher ? 'Grade 4A' : 'all')
  const [date, setDate] = useState(initialDate)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRecords, setDateRecords] = useState({ [initialDate]: initialAttendanceRecords })
  const [historyRows, setHistoryRows] = useState(attendanceHistory)
  const [saved, setSaved] = useState(false)
  const records = dateRecords[date] ?? emptyRecords

  const visibleRecords = useMemo(() => records
    .filter((record) => className === 'all' || record.className === className)
    .filter((record) => !isTeacher || ['Grade 4A', 'Grade 5B'].includes(record.className))
    .map((record) => ({
      ...record,
      learner: demoLearners.find((learner) => learner.id === record.learnerId),
    }))
    .filter(({ learner, status }) => learner
      && learner.name.toLowerCase().includes(search.trim().toLowerCase())
      && (statusFilter === 'all' || (statusFilter === 'unmarked' ? !status : status === statusFilter))),
  [className, isTeacher, records, search, statusFilter])

  const summary = visibleRecords.reduce((totals, record) => {
    const status = record.status || 'Unmarked'
    totals[status] = (totals[status] ?? 0) + 1
    return totals
  }, { Present: 0, Absent: 0, Late: 0, Excused: 0, Unmarked: 0 })
  const markedCount = visibleRecords.length - summary.Unmarked
  const attendancePercent = markedCount
    ? `${Math.round(((summary.Present + summary.Late) / markedCount) * 100)}%`
    : '—'

  function changeStatus(learnerId, status) {
    setDateRecords((current) => ({
      ...current,
      [date]: current[date].map((record) => record.learnerId === learnerId ? { ...record, status } : record),
    }))
    setSaved(false)
  }

  function chooseDate(nextDate) {
    setDateRecords((current) => ({
      ...current,
      ...(current[nextDate] ? {} : {
        [nextDate]: demoLearners
          .filter((learner) => !isTeacher || ['Grade 4A', 'Grade 5B'].includes(learner.className))
          .map((learner) => ({ learnerId: learner.id, className: learner.className, status: '' })),
      }),
    }))
    setDate(nextDate)
    setSaved(false)
  }

  function saveReview() {
    const selectedClasses = className === 'all'
      ? [...new Set(records.map((record) => record.className))]
      : [className]
    const summaries = selectedClasses.map((selectedClass) => {
      const classRecords = records.filter((record) => record.className === selectedClass)
      return {
        date,
        className: selectedClass,
        present: classRecords.filter((record) => record.status === 'Present').length,
        absent: classRecords.filter((record) => record.status === 'Absent').length,
        late: classRecords.filter((record) => record.status === 'Late').length,
        excused: classRecords.filter((record) => record.status === 'Excused').length,
      }
    })
    setHistoryRows((current) => [
      ...current.filter((item) => !summaries.some((summary) => summary.date === item.date && summary.className === item.className)),
      ...summaries,
    ])
    setSaved(true)
  }

  const histories = historyRows.filter((item) => className === 'all' || item.className === className)

  return (
    <main className="content">
      <PageHeading
        eyebrow={isTeacher ? 'Assigned classes' : 'School operations'}
        title="Attendance"
        description={isTeacher ? 'Take attendance for your assigned classes.' : 'Record and review daily learner attendance.'}
      />
      <DemoNotice>{demoNotice} Status changes are held in page state and are not submitted to a backend.</DemoNotice>
      {saved && <p className="form-feedback" role="status"><Check size={16} aria-hidden="true" /> Attendance marked as reviewed locally for {date}.</p>}

      <Panel eyebrow="Attendance register" title="Choose class and date">
        <div className="filter-grid attendance-controls">
          <FormField id="attendance-class" label="Class">
            <select id="attendance-class" value={className} onChange={(event) => { setClassName(event.target.value); setSaved(false) }}>
              {!isTeacher && <option value="all">All classes</option>}
              {classes.map((classroom) => <option key={classroom.id} value={classroom.name}>{classroom.name}</option>)}
            </select>
          </FormField>
          <FormField id="attendance-date" label="Attendance date">
            <input id="attendance-date" type="date" value={date} onChange={(event) => chooseDate(event.target.value)} />
          </FormField>
          <FormField id="attendance-search" label="Search learner">
            <div className="input-with-icon">
              <Search size={16} aria-hidden="true" />
              <input id="attendance-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Learner name" />
            </div>
          </FormField>
          <FormField id="attendance-status-filter" label="Filter status">
            <select id="attendance-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              <option value="unmarked">Not marked</option>
            </select>
          </FormField>
        </div>
      </Panel>

      <section className="attendance-summary" aria-label="Attendance summary">
        <article className="summary-card"><span>Attendance rate</span><strong>{attendancePercent}</strong></article>
        {attendanceStatuses.map((status) => (
          <article className={`summary-card summary-${status.toLowerCase()}`} key={status}>
            <span>{status}</span><strong>{summary[status]}</strong>
          </article>
        ))}
        <article className="summary-card"><span>Not marked</span><strong>{summary.Unmarked}</strong></article>
      </section>

      <Panel
        eyebrow={`${visibleRecords.length} learners · ${formatDate(date)}`}
        title={className === 'all' ? 'Learner register' : className}
        action={
          <button type="button" className="primary-button" onClick={saveReview} disabled={!records.length}>
            <Check size={16} aria-hidden="true" /> Save review locally
          </button>
        }
      >
        {visibleRecords.length === 0 ? (
          <EmptyState title="No learners found" description="Change the selected class, search term, or status filter." />
        ) : (
          <div className="responsive-register" role="table" aria-label="Learner attendance register">
            <div className="register-row register-header" role="row">
              <span role="columnheader">Learner</span>
              <span role="columnheader">Class</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Set attendance</span>
            </div>
            {visibleRecords.map(({ learner, className: learnerClass, status }) => (
              <div className="register-row" role="row" key={learner.id}>
                <span className="register-learner" role="cell">
                  <strong>{learner.name}</strong><small>Demo learner</small>
                </span>
                <span role="cell">{learnerClass}</span>
                <span role="cell"><StatusBadge tone={statusTones[status || 'Unmarked']}>{status || 'Not marked'}</StatusBadge></span>
                <span role="cell">
                  <select
                    className="attendance-status-select"
                    aria-label={`Attendance status for ${learner.name}`}
                    value={status}
                    onChange={(event) => changeStatus(learner.id, event.target.value)}
                  >
                    <option value="">Not marked</option>
                    {attendanceStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <section className="panel-grid attendance-lower-grid" aria-label="Attendance trend and history">
        <AttendanceChart
          data={attendanceTrendByMonth}
          eyebrow="School demonstration data"
          title="Attendance trend"
          ariaLabel="Demonstration attendance trend by month"
        />
        <Panel eyebrow="Previous registers · demo" title="Attendance history">
          {histories.length === 0 ? (
            <EmptyState title="No register history" description="No demonstration history is available for this class." />
          ) : (
            <ul className="history-list">
              {histories.map((history) => (
                <li className="history-row" key={`${history.className}-${history.date}`}>
                  <span><strong>{history.className}</strong><time dateTime={history.date}>{formatDate(history.date)}</time></span>
                  <span>{history.present} present · {history.absent} absent · {history.late} late · {history.excused} excused</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </main>
  )
}

export default AttendancePage
