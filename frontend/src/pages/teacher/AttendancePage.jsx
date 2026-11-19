import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../lib/api'

import Panel from '../../components/common/Panel'
import PageHeading from '../../components/common/PageHeading'
import { Button } from '../../components/common/Button'

function getToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function AttendancePage() {
  const { user } = useAuth()
  const schoolId = user?.memberships?.find(
    (membership) => membership.role === 'TEACHER'
  )?.schoolId

  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [classesError, setClassesError] = useState('')

  const [attendanceDate, setAttendanceDate] = useState(getToday)
  const [attendanceLearners, setAttendanceLearners] = useState([])
  const [attendanceStatuses, setAttendanceStatuses] = useState({})
  const [existingRecords, setExistingRecords] = useState({})
  const [loadingLearners, setLoadingLearners] = useState(false)
  const [learnersError, setLearnersError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  const loadClasses = useCallback(async () => {
    if (!schoolId) {
      setClasses([])
      setLoadingClasses(false)
      return
    }

    setLoadingClasses(true)
    setClassesError('')

    try {
      const result = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/classes`
      )
      const availableClasses = Array.isArray(result.data) ? result.data : []

      setClasses(availableClasses)
      setSelectedClass((current) =>
        current && availableClasses.some((item) => item.id === current)
          ? current
          : availableClasses[0]?.id || ''
      )
    } catch (error) {
      setClassesError(error.message || 'Unable to load assigned classes.')
    } finally {
      setLoadingClasses(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const loadAttendance = useCallback(async () => {
    if (!schoolId || !selectedClass || !attendanceDate) {
      setAttendanceLearners([])
      setAttendanceStatuses({})
      setExistingRecords({})
      setLoadingLearners(false)
      return
    }

    setLoadingLearners(true)
    setLearnersError('')
    setSaveError('')
    setSaveSuccess('')

    try {
      const [learnerResult, attendanceResult] = await Promise.all([
        apiRequest(`/schools/${encodeURIComponent(schoolId)}/learners`, {
          query: { classId: selectedClass },
        }),
        apiRequest(`/schools/${encodeURIComponent(schoolId)}/attendance`, {
          query: { classId: selectedClass, date: attendanceDate },
        }),
      ])

      const learners = Array.isArray(learnerResult.data)
        ? learnerResult.data
        : []
      const records = Array.isArray(attendanceResult.data)
        ? attendanceResult.data
        : []

      const recordsByLearner = Object.fromEntries(
        records.map((record) => [record.learnerId, record])
      )

      setAttendanceLearners(learners)
      setExistingRecords(recordsByLearner)
      setAttendanceStatuses(
        Object.fromEntries(
          learners.map((learner) => [
            learner.id,
            recordsByLearner[learner.id]?.status || 'PRESENT',
          ])
        )
      )
    } catch (error) {
      setAttendanceLearners([])
      setExistingRecords({})
      setAttendanceStatuses({})
      setLearnersError(
        error.message || 'Unable to load learners and attendance.'
      )
    } finally {
      setLoadingLearners(false)
    }
  }, [schoolId, selectedClass, attendanceDate])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  const handleSaveAttendance = async (event) => {
    event.preventDefault()

    if (
      !schoolId ||
      !selectedClass ||
      !attendanceDate ||
      !attendanceLearners.length ||
      submitting
    ) {
      return
    }

    setSubmitting(true)
    setSaveSuccess('')
    setSaveError('')

    let savedCount = 0
    const failures = []

    for (const learner of attendanceLearners) {
      const existingRecord = existingRecords[learner.id]
      const status = attendanceStatuses[learner.id] || 'PRESENT'

      try {
        const result = existingRecord
          ? await apiRequest(
              `/schools/${encodeURIComponent(schoolId)}/attendance/${encodeURIComponent(existingRecord.id)}`,
              { method: 'PATCH', body: { status } }
            )
          : await apiRequest(
              `/schools/${encodeURIComponent(schoolId)}/attendance`,
              {
                method: 'POST',
                body: {
                  learnerId: learner.id,
                  date: attendanceDate,
                  status,
                },
              }
            )

        if (!result.success) {
          throw new Error(result.message || 'Attendance was not saved.')
        }

        savedCount += 1
      } catch (error) {
        failures.push(
          `${learner.firstName} ${learner.lastName}: ${error.message}`
        )
      }
    }

    await loadAttendance()

    if (failures.length === 0) {
      setSaveSuccess(`Attendance saved for all ${savedCount} learners.`)
    } else {
      setSaveError(
        `${savedCount} of ${attendanceLearners.length} records saved. ${failures.join(' | ')}`
      )
    }

    setSubmitting(false)
  }

  const resetChanges = () => {
    setAttendanceStatuses(
      Object.fromEntries(
        attendanceLearners.map((learner) => [
          learner.id,
          existingRecords[learner.id]?.status || 'PRESENT',
        ])
      )
    )
  }

  if (!schoolId) {
    return (
      <main className="content">
        <PageHeading
          eyebrow="Attendance"
          title="Record Attendance"
          description="Your account does not currently have a teacher school membership."
        />
      </main>
    )
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow="Attendance"
        title="Record Attendance"
        description="Record or correct attendance for learners in your assigned classes."
      />

      <Panel eyebrow="Attendance details" title="Choose class and date">
        {loadingClasses ? (
          <p role="status">Loading classes...</p>
        ) : classesError ? (
          <div role="alert">
            <p>{classesError}</p>
            <button type="button" onClick={loadClasses}>
              Retry loading classes
            </button>
          </div>
        ) : classes.length === 0 ? (
          <p role="status">
            No assigned classes were found. Contact your administrator.
          </p>
        ) : (
          <div className="attendance-controls">
            <label className="form-field">
              <span>Class</span>
              <select
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                disabled={submitting}
              >
                <option value="">Select a class</option>
                {classes.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Attendance date</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                disabled={submitting}
                required
              />
            </label>
          </div>
        )}
      </Panel>

      <Panel eyebrow="Class register" title="Learner attendance">
        {loadingLearners ? (
          <p role="status" aria-live="polite">
            Loading learners and saved attendance...
          </p>
        ) : learnersError ? (
          <div role="alert">
            <p>{learnersError}</p>
            <button
              type="button"
              onClick={loadAttendance}
            >
              Retry loading register
            </button>
          </div>
        ) : !selectedClass ? (
          <p role="status">Select a class to view its learners.</p>
        ) : attendanceLearners.length === 0 ? (
          <p role="status">No learners are registered in this class yet.</p>
        ) : (
          <form onSubmit={handleSaveAttendance}>
            <ul className="learner-attendance-list">
              {attendanceLearners.map((learner) => {
                const hasRecord = Boolean(existingRecords[learner.id])

                return (
                  <li key={learner.id} className="learner-attendance-item">
                    <span className="learner-name">
                      {learner.firstName} {learner.lastName}
                    </span>

                    <span className="attendance-learner-status">
                      <select
                        value={attendanceStatuses[learner.id] || 'PRESENT'}
                        onChange={(event) =>
                          setAttendanceStatuses((current) => ({
                            ...current,
                            [learner.id]: event.target.value,
                          }))
                        }
                        aria-label={`Attendance status for ${learner.firstName} ${learner.lastName}`}
                        className="status-select"
                        disabled={submitting}
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                        <option value="EXCUSED">Excused</option>
                      </select>
                      <small>
                        {hasRecord ? 'Saved record · will update' : 'Not yet recorded'}
                      </small>
                    </span>
                  </li>
                )
              })}
            </ul>

            <p className="status-instruction">
              Existing records for this date are loaded automatically. Change
              any status and save to create or correct the register.
            </p>

            {saveSuccess && (
              <p role="status" className="success">{saveSuccess}</p>
            )}
            {saveError && (
              <p role="alert" className="error">{saveError}</p>
            )}

            <div className="attendance-form">
              <Button type="submit" disabled={submitting} color="primary">
                {submitting ? 'Saving attendance…' : 'Save Attendance'}
              </Button>
              <button type="button" onClick={resetChanges} disabled={submitting}>
                Reset changes
              </button>
            </div>
          </form>
        )}
      </Panel>
    </main>
  )
}

export default AttendancePage
