import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { apiRequest } from "../../lib/api";

import Panel from "../../components/common/Panel";
import PageHeading from "../../components/common/PageHeading";
import { FormField } from "../../components/common/FormField";
import { Button } from "../../components/common/Button";

function AssessmentsPage() {
  const { user } = useAuth();

  // Check if teacher has assigned classes
  const schoolId = user?.memberships?.find((m) => m.role === "TEACHER")?.schoolId;
  // State for class selection
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState("");

  // State for assessment creation
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDescription, setAssessmentDescription] = useState("");
  const [assessmentMaxScore, setAssessmentMaxScore] = useState(100);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [createAssessmentError, setCreateAssessmentError] = useState("");

  // State for existing assessments
  const [assessments, setAssessments] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [assessmentsError, setAssessmentsError] = useState("");

  // State for assessment results
  const [assessmentResults, setAssessmentResults] = useState({});
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultsError, setResultsError] = useState("");

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

  // 2. Load existing assessments
  useEffect(() => {
    const loadAssessments = async () => {
      if (!schoolId) {
        setAssessments([]);
        setLoadingAssessments(false);
        return;
      }

      setLoadingAssessments(true);
      setAssessmentsError("");

      try {
        const result = await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/assessments`,
          { method: "GET", auth: true }
        );

        if (Array.isArray(result.data)) {
          setAssessments(result.data);
        }
      } catch (error) {
        setAssessmentsError(
          error.message || "Unable to load assessments. Please try again."
        );
      } finally {
        setLoadingAssessments(false);
      }
    };

    loadAssessments();
  }, [schoolId]);

  // 3. Load assessment results for each assessment
  useEffect(() => {
    const loadResults = async () => {
      if (!selectedClass || !schoolId) {
        setAssessmentResults({});
        setLoadingResults(false);
        return;
      }

      setLoadingResults(true);
      setResultsError("");

      try {
        // Get assessment IDs
        const assessmentIds = assessments.map((a) => a.id);

        if (assessmentIds.length === 0) {
          setAssessmentResults({});
          setLoadingResults(false);
          return;
        }

        // Load results for each assessment
        const resultPromises = assessmentIds.map((id) =>
          apiRequest(
            `/schools/${encodeURIComponent(schoolId)}/assessments/${id}/results`,
            { method: "GET", auth: true }
          )
        );

        const results = await Promise.all(resultPromises);
        const resultsMap = {};

        results.forEach((result, index) => {
          resultsMap[assessmentIds[index]] = result.data || [];
        });

        setAssessmentResults(resultsMap);
      } catch (error) {
        setResultsError(
          error.message || "Unable to load assessment results."
        );
      } finally {
        setLoadingResults(false);
      }
    };

    loadResults();
  }, [schoolId, assessments, selectedClass]);

  // 4. Create new assessment
  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    setCreateAssessmentError("");

    if (!assessmentTitle.trim()) {
      setCreateAssessmentError("Assessment title is required");
      return;
    }

    if (!selectedClass) {
      setCreateAssessmentError("Please select a class first");
      return;
    }

    setCreatingAssessment(true);

    try {
      const result = await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/assessments`,
        {
          method: "POST",
          auth: true,
          body: {
            title: assessmentTitle.trim(),
            description: assessmentDescription.trim() || "",
            classId: selectedClass,
            maxScore: parseInt(assessmentMaxScore, 10),
          },
        }
      );

      if (result.success) {
        setAssessmentTitle("");
        setAssessmentDescription("");
        setAssessmentMaxScore(100);
        setCreatingAssessment(false);
        // Refresh assessments
        const idx = classes.findIndex((c) => c.id === selectedClass);
        if (idx >= 0) {
          // Will be refreshed on next effect run
        }
      } else {
        setCreateAssessmentError(result.message || "Unable to create assessment.");
      }
    } catch (error) {
      setCreateAssessmentError(error.message || "Unable to create assessment.");
    } finally {
      setCreatingAssessment(false);
    }
  };

  if (!schoolId) return null;

  return (
    <main className="content">
      <PageHeading
        eyebrow="Assessments"
        title="Assessments & Results"
        description="Create assessments and enter learner results."
      />

      <Panel eyebrow="Create Assessment" title="New Assessment">
        {creatingAssessment ? (
          <p role="status" aria-live="polite">Creating assessment...</p>
        ) : createAssessmentError ? (
          <div role="alert">
            <p>{createAssessmentError}</p>
            <button onClick={() => setCreateAssessmentError("")}>Try again</button>
          </div>
        ) : (
          <form onSubmit={handleCreateAssessment} className="form-inline">
            <FormField
              label="Title"
              type="text"
              placeholder="e.g. Mathematics Quiz"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              required
            />
            <FormField
              label="Description"
              type="text"
              placeholder="Optional description"
              value={assessmentDescription}
              onChange={(e) => setAssessmentDescription(e.target.value)}
            />
            <FormField
              label="Max Score"
              type="number"
              value={assessmentMaxScore}
              onChange={(e) => setAssessmentMaxScore(parseInt(e.target.value, 10))}
              min={1}
              max={1000}
            />
            <FormField
              label="Class"
              type="hidden"
              value={selectedClass || ""}
            />
            <Button type="submit" disabled={creatingAssessment} color="primary">
              {creatingAssessment ? "Creating…" : "Create Assessment"}
            </Button>
          </form>
        )}

        {createAssessmentError && (
          <div role="alert">
            <p>{createAssessmentError}</p>
          </div>
        )}
      </Panel>

      <Panel eyebrow="Existing Assessments" title="Assessments for this class">
        {loadingClasses ? (
          <p role="status" aria-live="polite">Loading classes...</p>
        ) : !classes.length ? (
          <p role="status">No classes found.</p>
        ) : (
          <ul className="assessment-list">
            {classes.map((classroom) => (
              <li key={classroom.id} className="assessment-list-item">
                <span>
                  <strong>{classroom.name}</strong>
                  <span>{classroom.academicYear || ""}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel eyebrow="Assessments List" title="Assessments">
        {loadingAssessments ? (
          <p role="status" aria-live="polite">Loading assessments...</p>
        ) : assessmentsError ? (
          <div role="alert">
            <p>{assessmentsError}</p>
            <button onClick={() => setAssessmentsError("")}>Try again</button>
          </div>
        ) : assessments.length === 0 ? (
          <p role="status">No assessments found.</p>
        ) : (
          <ul className="assessment-list">
            {assessments.map((assessment) => (
              <li key={assessment.id} className="assessment-item">
                <strong>{assessment.title}</strong> · {assessment.className}
                <span>{assessment.results?.length || 0} results</span>
                <span>
                  {assessment.maxScore} max
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel eyebrow="Assessment Results" title="View Results">
        {loadingAssessments ? (
          <p role="status" aria-live="polite">Loading assessments...</p>
        ) : assessmentsError ? (
          <div role="alert">
            <p>{assessmentsError}</p>
            <button onClick={() => setAssessmentsError("")}>Try again</button>
          </div>
        ) : selectedClass ? (
          <div className="results-container">
            {Object.keys(assessmentResults).length === 0 ? (
              <p>No results found for this class.</p>
            ) : (
              <ul className="results-list">
                {Object.entries(assessmentResults).map(([assessmentId, results]) => {
                  const assessment = assessments.find((a) => a.id === parseInt(assessmentId));
                  if (!assessment) return null;

                  return (
                    <li key={assessment.id} className="results-item">
                      <strong>{assessment.title}</strong> · {assessment.className}
                      <ul className="results-details">
                        {results.map((result) => (
                          <li key={result.learnerId} className="result-detail">
                            <span>
                              {result.learner?.firstName} {result.learner?.lastName}
                            </span>
                            <span>
                              {result.score} / {assessment.maxScore}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <p>Select a class to view results.</p>
        )}
      </Panel>
    </main>
  );
}

export default AssessmentsPage;
