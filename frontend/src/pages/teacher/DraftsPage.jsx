import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { apiRequest } from "../../lib/api";

import Panel from "../../components/common/Panel";
import PageHeading from "../../components/common/PageHeading";

function DraftsPage() {
  const { user } = useAuth();

  const schoolId = user?.memberships?.find(
    (membership) => membership.role === "TEACHER"
  )?.schoolId;

  const [drafts, setDrafts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [language, setLanguage] = useState("en");

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [saving, setSaving] = useState(false);
  const [approvingDraftId, setApprovingDraftId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = async () => {
    if (!schoolId) {
      setDrafts([]);
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError("");

    try {
      const [draftResult, alertResult] = await Promise.all([
        apiRequest(`/schools/${encodeURIComponent(schoolId)}/drafts`),
        apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/early-warning/alerts?status=ACTIVE`
        ),
      ]);

      setDrafts(Array.isArray(draftResult.data) ? draftResult.data : []);
      setAlerts(Array.isArray(alertResult.data) ? alertResult.data : []);
    } catch (error) {
      setPageError(error.message || "Unable to load communication data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const handleGenerateDraft = async (event) => {
    event.preventDefault();
    setActionError("");
    setSuccessMessage("");

    if (!selectedAlertId) {
      setActionError("Select an active alert first.");
      return;
    }

    setGenerating(true);

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/drafts/generate`,
        {
          method: "POST",
          body: {
            alertId: selectedAlertId,
            language,
          },
        }
      );

      setSelectedAlertId("");
      setSuccessMessage("Communication draft generated successfully.");
      await loadData();
    } catch (error) {
      setActionError(error.message || "Unable to generate the draft.");
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = (draft) => {
    setEditingDraftId(draft.id);
    setDraftText(draft.draftText || "");
    setActionError("");
    setSuccessMessage("");
  };

  const cancelEditing = () => {
    setEditingDraftId(null);
    setDraftText("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setActionError("");
    setSuccessMessage("");

    if (!draftText.trim()) {
      setActionError("The message cannot be empty.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/drafts/${encodeURIComponent(editingDraftId)}`,
        {
          method: "PATCH",
          body: { draftText: draftText.trim() },
        }
      );

      cancelEditing();
      setSuccessMessage("Draft updated successfully.");
      await loadData();
    } catch (error) {
      setActionError(error.message || "Unable to save the draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveDraft = async (draftId) => {
    const confirmed = window.confirm(
      "Approve this parent communication draft? Approval does not send or deliver the message."
    );

    if (!confirmed) return;

    setApprovingDraftId(draftId);
    setActionError("");
    setSuccessMessage("");

    try {
      await apiRequest(
        `/schools/${encodeURIComponent(schoolId)}/drafts/${encodeURIComponent(draftId)}/approve`,
        { method: "PATCH" }
      );

      setSuccessMessage("Draft approved. It has not been sent to the parent.");
      await loadData();
    } catch (error) {
      setActionError(error.message || "Unable to approve the draft.");
    } finally {
      setApprovingDraftId(null);
    }
  };

  if (!schoolId) return null;

  return (
    <main className="content">
      <PageHeading
        eyebrow="Communication"
        title="Parent Communication Drafts"
        description="Prepare, review and approve messages about learner progress and early-warning alerts."
      />

      <Panel eyebrow="New Communication" title="Generate a Draft">
        <form onSubmit={handleGenerateDraft} className="form-inline">
          <div className="form-field">
            <label htmlFor="draft-alert">Active alert</label>
            <select
              id="draft-alert"
              value={selectedAlertId}
              onChange={(event) => setSelectedAlertId(event.target.value)}
              disabled={generating || alerts.length === 0}
              required
            >
              <option value="">Select an alert</option>
              {alerts.map((alert) => (
                <option key={alert.id} value={alert.id}>
                  {alert.learner
                    ? `${alert.learner.firstName} ${alert.learner.lastName}`
                    : alert.class?.name || "Learner alert"}{" "}
                  — {alert.alertRule?.name || alert.alertRule?.alertType || "Early warning"}
                </option>
              ))}
            </select>
            {alerts.length === 0 && (
              <span className="field-hint">
                There are no active alerts available for your assigned classes.
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="draft-language">Message language</label>
            <select
              id="draft-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              disabled={generating}
            >
              <option value="en">English</option>
              <option value="sn">Shona</option>
            </select>
          </div>

          <button type="submit" disabled={generating || alerts.length === 0}>
            {generating ? "Generating…" : "Generate Draft"}
          </button>
        </form>
      </Panel>

      {actionError && <p role="alert">{actionError}</p>}
      {successMessage && <p role="status">{successMessage}</p>}

      <Panel eyebrow="Communication" title="Saved Drafts">
        {loading ? (
          <p role="status">Loading drafts…</p>
        ) : pageError ? (
          <div role="alert">
            <p>{pageError}</p>
            <button type="button" onClick={loadData}>Try again</button>
          </div>
        ) : drafts.length === 0 ? (
          <p role="status">No communication drafts have been created yet.</p>
        ) : (
          <div className="draft-list">
            {drafts.map((draft) => {
              const learner = draft.alert?.learner;
              const className = draft.alert?.class?.name || "Class not specified";
              const learnerName = learner
                ? `${learner.firstName} ${learner.lastName}`
                : "Learner not specified";

              return (
                <article key={draft.id} className="draft-item">
                  <div>
                    <h3>{learnerName}</h3>
                    <p>
                      {className} ·{" "}
                      {draft.language === "sn" ? "Shona" : "English"}
                    </p>
                    <p>
                      Status: <strong>{draft.status}</strong>
                    </p>
                  </div>

                  {editingDraftId === draft.id ? (
                    <form onSubmit={handleSaveEdit}>
                      <label htmlFor={`draft-text-${draft.id}`}>
                        Parent communication
                      </label>
                      <textarea
                        id={`draft-text-${draft.id}`}
                        value={draftText}
                        onChange={(event) => setDraftText(event.target.value)}
                        rows={7}
                        required
                      />
                      <div className="form-inline">
                        <button type="submit" disabled={saving}>
                          {saving ? "Saving…" : "Save changes"}
                        </button>
                        <button type="button" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="draft-content">{draft.draftText}</p>
                      {draft.status === "DRAFT" && (
                        <div className="form-inline">
                          <button
                            type="button"
                            onClick={() => startEditing(draft)}
                          >
                            Edit message
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveDraft(draft.id)}
                            disabled={approvingDraftId === draft.id}
                          >
                            {approvingDraftId === draft.id
                              ? "Approving…"
                              : "Approve"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </main>
  );
}

export default DraftsPage;
