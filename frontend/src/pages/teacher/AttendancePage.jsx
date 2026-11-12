import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { apiRequest } from "../../lib/api";

import Panel from "../../components/common/Panel";
import PageHeading from "../../components/common/PageHeading";
import StatusBadge from "../../components/common/StatusBadge";
import { FormField } from "../../components/common/FormField";
import { Button } from "../../components/common/Button";
import { Alert } from "../../components/common/Alert";

function AttendancePage() {
  const { user } = useAuth();

  // Check if teacher has assigned classes
  const schoolId = user?.memberships?.find((m) => m.role === "TEACHER")?.schoolId;
  // State for class selection
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState("");

  // State for attendance form
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [attendanceStatus, setAttendanceStatus] = useState("PRESENT");
  const [attendanceLearners, setAttendanceLearners] = useState([]);
  const [loadingLearners, setLoadingLearners] = useState(true);
  const [learnersError, setLearnersError] = useState("");

  // State for submitted attendance
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // 1. Load available classes
  useEffect(() => {
    const loadClasses = async () => {
      if (!schoolId) {
        setClasses([]);
        setLoadingClasses(false);
        return;
      }

      setLoadingClasses(true);
      setClassesError("");

      try {
        const result = await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/classes`,
          { method: "GET", auth: true }
        );

        if (Array.isArray(result.data)) {
          setClasses(result.data);
          // Select the first class automatically
          if (result.data.length > 0) {
            setSelectedClass(result.data[0].id);
          }
        }
      } catch (error) {
        setClassesError(
          error.message || "Unable to load classes. Please try again."
        );
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, [schoolId]);

  // 2. Load learners for selected class
  useEffect(() => {
    const loadLearners = async () => {
      if (!selectedClass || !schoolId) {
        setAttendanceLearners([]);
        setLoadingLearners(false);
        return;
      }

      setLoadingLearners(true);
      setLearnersError("");

      try {
        const result = await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/learners`,
          {
            method: "GET",
            auth: true,
            query: { classId: selectedClass },
          }
        );

        if (Array.isArray(result.data)) {
          setAttendanceLearners(result.data);
        }
      } catch (error) {
        setLearnersError(
          error.message || "Unable to load learners. Please try again."
        );
      } finally {
        setLoadingLearners(false);
      }
    };

    loadLearners();
  }, [schoolId, selectedClass]);

  // 3. Handle attendance submission
  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSaveSuccess(false);
    setSaveError("");

    if (!selectedClass) {
      setSaveError("Please select a class first");
      setSubmitting(false);
      return;
    }

    // Build attendance records for each learner
    const attendanceRecords = attendanceLearners.map((learner) => ({
      learnerId: learner.id,
      status: attendanceStatus,
      date: attendanceDate,
      schoolId: schoolId,
      classId: selectedClass,
      recordedById: user?.id,
    }));

    try {
      const result = await apiRequest(
        `/api/schools/${encodeURIComponent(schoolId)}/attendance`,
        {
          method: "POST",
          auth: true,
          body: { attendanceRecords },
        }
      );

      if (result.success) {
        setSaveSuccess(true);
        setSaveError("");
        // Refresh learners data
        const idx = classes.findIndex((c) => c.id === selectedClass);
        if (idx >= 0) {
          const classObj = classes[idx];
          const classLearnersPromise = apiRequest(
            `/schools/${encodeURIComponent(schoolId)}/learners`,
            { method: "GET", auth: true, query: { classId: selectedClass } }
          );
          // Just reset the learners state
          setAttendanceLearners([]);
          setLoadingLearners(true);
        }
      } else {
        setSaveError(result.message || "Unable to save attendance.");
      }
    } catch (error) {
      setSaveError(error.message || "Unable to save attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!schoolId) return null;

  return (
    <main className="content">
      <PageHeading
        eyebrow="Attendance"
        title="Record Attendance"
        description="Record attendance for learners in your assigned classes."
      />

      <Panel eyebrow="Select Class" title="Choose Class">
        {loadingClasses ? (
          <p role="status" aria-live="polite">Loading classes...</p>
        ) : classesError ? (
          <div role="alert">
            <p>{classesError}</p>
            <button onClick={() => setClassesError("")}>Try again</button>
          </div>
        ) : !classes.length ? (
          <p role="status">No classes found. Contact your administrator.</p>
        ) : (
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            aria-label="Select class"
            disabled={submitting}
          >
            <option value="">-- Select a class --</option>
            {classes.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name} {classroom.academicYear ? `(${classroom.academicYear})` : ""}
              </option>
            ))}
          </select>
        )}

        {selectedClass && (
          <p className="class-selected">
            Selected: {classes.find((c) => c.id === selectedClass)?.name || "Unknown class"}
          </p>
        )}
      </Panel>

      <Panel eyebrow="Learners" title="Learners in class">
        {loadingLearners ? (
          <p role="status" aria-live="polite">Loading learners...</p>
        ) : learnersError ? (
          <div role="alert">
            <p>{learnersError}</p>
            <button onClick={() => setLearnersError("")}>Try again</button>
          </div>
        ) : attendanceLearners.length === 0 ? (
          <p role="status">No learners found in this class.</p>
        ) : (
          <ul className="learner-attendance-list">
            {attendanceLearners.map((learner) => (
              <li key={learner.id} className="learner-attendance-item">
                <span className="learner-name">
                  {learner.firstName} {learner.lastName}
                </span>
                <select
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value)}
                  aria-label="Attendance status"
                  data-learner-id={learner.id}
                  className="status-select"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="EXCUSED">Excused</option>
                </select>
              </li>
            ))}
          </ul>
        )}

        {selectedClass && (
          <p className="status-instruction">
            Select a status for each learner, then click "Save Attendance"
          </p>
        )}
      </Panel>

      <Panel eyebrow="Save Attendance" title="Save Attendance Records">
        {submitting ? (
          <p role="status" aria-live="polite">Saving attendance...</p>
        ) : saveSuccess ? (
          <div role="alert" className="success">
            <p>Attendance saved successfully.</p>
            <button onClick={() => setSaveSuccess(false)}>Close</button>
          </div>
        ) : saveError ? (
          <div role="alert" className="error">
            <p>{saveError}</p>
            <button onClick={() => setSaveError("")}>Try again</button>
          </div>
        ) : (
          <form onSubmit={handleSaveAttendance} className="attendance-form">
            <Button type="submit" disabled={!selectedClass || submitting} color="primary">
              {submitting ? "Saving…" : "Save Attendance"}
            </Button>
            <Button type="button" onClick={() => setSelectedClass(null)} disabled={submitting}>
              Cancel
            </Button>
          </form>
        )}
      </Panel>
    </main>
  );
}

export default AttendancePage;
