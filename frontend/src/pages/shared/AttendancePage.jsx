import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw, Save, Search } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import StatusBadge from '../../components/common/StatusBadge'

const attendanceStatuses = [
  { value: 'PRESENT', label: 'Present', tone: 'status-positive' },
  { value: 'ABSENT', label: 'Absent', tone: 'severity-high' },
  { value: 'LATE', label: 'Late', tone: 'status-warning' },
  { value: 'EXCUSED', label: 'Excused', tone: 'status-neutral' },
]

const statusDetails = Object.fromEntries(
  attendanceStatuses.map((status) => [status.value, status])
)

const getToday = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDate = (value) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(`${value}T00:00:00`)
  )

function AttendancePage({ role }) {
  const { user, activeMembership } = useAuth()
  const isTeacher = role === 'teacher'
  const requiredRole = isTeacher ? 'TEACHER' : 'SCHOOL_ADMIN'

  const membership =
    activeMembership?.role === requiredRole
      ? activeMembership
      : user?.memberships?.find(
          (item) => item.role === requiredRole
        )

  const schoolId = membership?.schoolId

  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(isTeacher ? '' : 'all')
  const [date, setDate] = useState(getToday())
  const [learners, setLearners] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [statuses, setStatuses] = useState({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingRegister, setLoadingRegister] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let active = true

    async function loadClasses() {
      if (!schoolId) {
        setClasses([])
        setLoadingClasses(false)
        return
      }

      setLoadingClasses(true)
      setPageError('')

      try {
        const result = await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/classes`
        )

        if (!active) return

        const actualClasses = Array.isArray(result.data) ? result.data : []
        setClasses(actualClasses)

        if (isTeacher) {
          setSelectedClass(actualClasses[0]?.id || '')
        } else {
          setSelectedClass('all')
        }
      } catch (error) {
        if (active) {
          setClasses([])
          setPageError(error.message || 'Unable to load school classes.')
        }
      } finally {
        if (active) setLoadingClasses(false)
      }
    }

    loadClasses()

    return () => {
      active = false
    }
  }, [schoolId, isTeacher])

  const loadRegister = useCallback(async () => {
    if (!schoolId || !date || (isTeacher && !selectedClass)) {
      setLearners([])
      setAttendanceRecords([])
      setStatuses({})
      return
    }

    setLoadingRegister(true)
    setPageError('')
    setSaveMessage('')
    setSaveError('')

    try {
      const query = new URLSearchParams({ date })

      if (selectedClass && selectedClass !== 'all') {
        query.set('classId', selectedClass)
      }

      const learnerQuery = new URLSearchParams()
      if (selectedClass && selectedClass !== 'all') {
        learnerQuery.set('classId', selectedClass)
      }

      const learnerPath =
        `/schools/${encodeURIComponent(schoolId)}/learners` +
        (learnerQuery.size ? `?${learnerQuery.toString()}` : '')

      const attendancePath =
        `/schools/${encodeURIComponent(schoolId)}/attendance?${query.toString()}`

      const [learnerResult, attendanceResult] = await Promise.all([
        apiRequest(learnerPath),
        apiRequest(attendancePath),
      ])

      const actualLearners = Array.isArray(learnerResult.data)
        ? learnerResult.data
        : []
      const actualRecords = Array.isArray(attendanceResult.data)
        ? attendanceResult.data
        : []

      const nextStatuses = {}
      actualRecords.forEach((record) => {
        nextStatuses[record.learnerId] = record.status
      })

      setLearners(actualLearners)
      setAttendanceRecords(actualRecords)
      setStatuses(nextStatuses)
      return true
    } catch (error) {
      setLearners([])
      setAttendanceRecords([])
      setStatuses({})
      setPageError(error.message || 'Unable to load the attendance register.')
      return false
    } finally {
      setLoadingRegister(false)
    }
  }, [schoolId, date, selectedClass, isTeacher])

  useEffect(() => {
    if (loadingClasses) return

    loadRegister()
  }, [loadingClasses, loadRegister])

  const recordByLearner = useMemo(
    () => new Map(attendanceRecords.map((record) => [record.learnerId, record])),
    [attendanceRecords]
  )

  const visibleLearners = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return learners.filter((learner) => {
      const fullName = `${learner.firstName || ''} ${learner.lastName || ''}`
        .trim()
        .toLowerCase()

      const matchesSearch =
        !searchTerm ||
        fullName.includes(searchTerm) ||
        (learner.admissionNumber || '').toLowerCase().includes(searchTerm)

      const status = statuses[learner.id] || ''
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'unmarked' && !status) ||
        status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [learners, search, statuses, statusFilter])

  const summary = useMemo(() => {
    const totals = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      UNMARKED: 0,
    }

    learners.forEach((learner) => {
      const status = statuses[learner.id]
      if (status && totals[status] !== undefined) {
        totals[status] += 1
      } else {
        totals.UNMARKED += 1
      }
    })

    return totals
  }, [learners, statuses])

  const markedCount =
    summary.PRESENT + summary.ABSENT + summary.LATE + summary.EXCUSED

  const attendanceRate = markedCount
    ? `${Math.round(
        ((summary.PRESENT + summary.LATE) / markedCount) * 100
      )}%`
    : '—'

  const hasChanges = learners.some((learner) => {
    const selectedStatus = statuses[learner.id] || ''
    const existingStatus = recordByLearner.get(learner.id)?.status || ''
    return selectedStatus !== existingStatus
  })

  function changeStatus(learnerId, status) {
    setStatuses((current) => ({
      ...current,
      [learnerId]: status,
    }))
    setSaveMessage('')
    setSaveError('')
  }

  async function saveAttendance() {
    if (!schoolId || !selectedClass && isTeacher) return

    const changedLearners = learners.filter((learner) => {
      const selectedStatus = statuses[learner.id] || ''
      const existingStatus = recordByLearner.get(learner.id)?.status || ''
      return selectedStatus && selectedStatus !== existingStatus
    })

    if (changedLearners.length === 0) {
      setSaveMessage('There are no attendance changes to save.')
      return
    }

    setSaving(true)
    setSaveMessage('')
    setSaveError('')

    const results = await Promise.allSettled(
      changedLearners.map((learner) => {
        const existingRecord = recordByLearner.get(learner.id)
        const body = {
          status: statuses[learner.id],
          ...(existingRecord
            ? {}
            : {
                learnerId: learner.id,
                date,
              }),
        }

        const path = existingRecord
          ? `/schools/${encodeURIComponent(schoolId)}/attendance/${encodeURIComponent(existingRecord.id)}`
          : `/schools/${encodeURIComponent(schoolId)}/attendance`

        return apiRequest(path, {
          method: existingRecord ? 'PATCH' : 'POST',
          body,
        })
      })
    )

    const succeeded = results.filter(
      (result) => result.status === 'fulfilled'
    ).length
    const failed = results.length - succeeded

    const refreshed = await loadRegister()

    if (failed === 0 && refreshed) {
      setSaveMessage(
        `${succeeded} attendance ${succeeded === 1 ? 'record' : 'records'} saved successfully.`
      )
    } else if (failed === 0 && !refreshed) {
      setSaveError(
        `${succeeded} record(s) were saved, but the register could not be refreshed. Use Refresh to confirm the latest records.`
      )
    } else {
      setSaveError(
        `${succeeded} record(s) saved, but ${failed} could not be saved. Review the register and try again.`
      )
    }

    setSaving(false)
  }

  const selectedClassName =
    selectedClass === 'all'
      ? 'All classes'
      : classes.find((classroom) => classroom.id === selectedClass)?.name ||
        'Selected class'

  if (!schoolId) {
    return (
      <main className="content">
        <PageHeading
          eyebrow="School operations"
          title="Attendance"
          description="Your account is not linked to a school membership for this workspace."
        />
        <EmptyState
          title="School membership unavailable"
          description="Contact your school administrator to check your account access."
        />
      </main>
    )
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow={isTeacher ? 'Assigned classes' : 'School operations'}
        title="Attendance"
        description={
          isTeacher
            ? 'Record and review attendance for learners in your assigned classes.'
            : 'Record and review actual learner attendance across your school.'
        }
      />

      {pageError && (
        <div className="form-feedback form-feedback-error" role="alert">
          {pageError}
        </div>
      )}

      {saveMessage && (
        <p className="form-feedback" role="status">
          <Check size={16} aria-hidden="true" /> {saveMessage}
        </p>
      )}

      {saveError && (
        <div className="form-feedback form-feedback-error" role="alert">
          {saveError}
        </div>
      )}

      <Panel
        eyebrow="Attendance register"
        title="Choose class and date"
        action={
          <button
            type="button"
            className="secondary-button"
            onClick={loadRegister}
            disabled={loadingRegister || saving || loadingClasses}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        }
      >
        <div className="filter-grid attendance-controls">
          <FormField id="attendance-class" label="Class">
            <select
              id="attendance-class"
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              disabled={loadingClasses || saving || (isTeacher && !classes.length)}
            >
              {!isTeacher && <option value="all">All classes</option>}
              {classes.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                  {classroom.academicYear ? ` (${classroom.academicYear})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="attendance-date" label="Attendance date">
            <input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={saving}
            />
          </FormField>

          <FormField id="attendance-search" label="Search learner">
            <div className="input-with-icon">
              <Search size={16} aria-hidden="true" />
              <input
                id="attendance-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or admission number"
              />
            </div>
          </FormField>

          <FormField id="attendance-status-filter" label="Filter status">
            <select
              id="attendance-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {attendanceStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
              <option value="unmarked">Not marked</option>
            </select>
          </FormField>
        </div>
      </Panel>

      <section className="attendance-summary" aria-label="Attendance summary">
        <article className="summary-card">
          <span>Attendance rate</span>
          <strong>{attendanceRate}</strong>
        </article>
        {attendanceStatuses.map((status) => (
          <article
            className={`summary-card summary-${status.value.toLowerCase()}`}
            key={status.value}
          >
            <span>{status.label}</span>
            <strong>{summary[status.value]}</strong>
          </article>
        ))}
        <article className="summary-card">
          <span>Not marked</span>
          <strong>{summary.UNMARKED}</strong>
        </article>
      </section>

      <Panel
        eyebrow={`${learners.length} learners · ${formatDate(date)}`}
        title={selectedClassName}
        action={
          <button
            type="button"
            className="primary-button"
            onClick={saveAttendance}
            disabled={
              loadingRegister ||
              loadingClasses ||
              saving ||
              !hasChanges
            }
          >
            <Save size={16} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save attendance'}
          </button>
        }
      >
        {loadingClasses || loadingRegister ? (
          <p role="status" aria-live="polite">
            Loading the attendance register…
          </p>
        ) : isTeacher && classes.length === 0 ? (
          <EmptyState
            title="No assigned classes"
            description="Your account has no class assignments yet. Ask the administrator to assign you to a class."
          />
        ) : learners.length === 0 ? (
          <EmptyState
            title="No learners found"
            description="There are no learners in this class or school yet. Once learners are registered, they will appear here."
          />
        ) : visibleLearners.length === 0 ? (
          <EmptyState
            title="No matching learners"
            description="Try changing the search term or attendance status filter."
          />
        ) : (
          <div className="responsive-register" role="table" aria-label="Learner attendance register">
            <div className="register-row register-header" role="row">
              <span role="columnheader">Learner</span>
              <span role="columnheader">Class</span>
              <span role="columnheader">Current status</span>
              <span role="columnheader">Set attendance</span>
            </div>

            {visibleLearners.map((learner) => {
              const status = statuses[learner.id] || ''
              const statusInfo = statusDetails[status]
              const classroomName =
                learner.schoolClass?.name ||
                classes.find((classroom) => classroom.id === learner.classId)?.name ||
                '—'

              return (
                <div className="register-row" role="row" key={learner.id}>
                  <span className="register-learner" role="cell">
                    <strong>
                      {learner.firstName} {learner.lastName}
                    </strong>
                    <small>
                      {learner.admissionNumber || 'No admission number'}
                    </small>
                  </span>

                  <span role="cell">{classroomName}</span>

                  <span role="cell">
                    <StatusBadge tone={statusInfo?.tone || 'status-neutral'}>
                      {statusInfo?.label || 'Not marked'}
                    </StatusBadge>
                  </span>

                  <span role="cell">
                    <select
                      className="attendance-status-select"
                      aria-label={`Attendance status for ${learner.firstName} ${learner.lastName}`}
                      value={status}
                      onChange={(event) =>
                        changeStatus(learner.id, event.target.value)
                      }
                      disabled={saving}
                    >
                      <option value="">Not marked</option>
                      {attendanceStatuses.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {learners.length > 0 && (
          <p className="field-hint">
            Changes are not saved until you select Save attendance. Existing
            records are updated; new records are created only for learners
            without an attendance record for this date.
          </p>
        )}
      </Panel>
    </main>
  )
}

export default AttendancePage
