import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { apiRequest } from "../../lib/api";

import Panel from "../../components/common/Panel";
import PageHeading from "../../components/common/PageHeading";
import AlertItem from "../../components/dashboard/AlertItem";

function EarlyWarningsPage() {
  const { user } = useAuth();

  // Check if teacher has assigned classes
  const schoolId = user?.memberships?.find((m) => m.role === "TEACHER")?.schoolId;
  // State for early warnings/alerts
  const [earlyWarnings, setEarlyWarnings] = useState([]);
  const [loadingEarlyWarnings, setLoadingEarlyWarnings] = useState(true);
  const [earlyWarningsError, setEarlyWarningsError] = useState("");

  // State for acknowledgement/resolution
  const [acknowledging, setAcknowledging] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [ackSuccess, setAckSuccess] = useState(false);
  const [ackError, setAckError] = useState("");
  const [resolvSuccess, setResolvSuccess] = useState(false);
  const [resolvError, setResolvError] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  // 1. Load early warnings for assigned classes
  useEffect(() => {
    const loadEarlyWarnings = async () => {
      if (!schoolId) {
        setEarlyWarnings([]);
        setLoadingEarlyWarnings(false);
        return;
      }

      setLoadingEarlyWarnings(true);
      setEarlyWarningsError("");

      try {
        const result = await apiRequest(
          `/schools/${encodeURIComponent(schoolId)}/early-warning/alerts?status=ACTIVE`,
          { method: "GET", auth: true }
        );

        if (Array.isArray(result.data)) {
          // Filter to only show alerts for teacher's assigned classes
          const classIds = (await (
            await apiRequest(`/schools/${encodeURIComponent(schoolId)}/classes`, { method: "GET", auth: true })
          )).data || [];
          const classIdSet = new Set(classIds.map((c) => c.id));

          setEarlyWarnings(
            result.data.filter((alert) =>
              classIdSet.has(alert.classId) || !alert.classId
            )
          );
        }
      } catch (error) {
        setEarlyWarningsError(
          error.message || "Unable to load early warnings."
        );
      } finally {
        setLoadingEarlyWarnings(false);
      }
    };

    loadEarlyWarnings();
  }, [schoolId]);

  // 2. Acknowledge alert
  const handleAcknowledge = async (alertId) => {
    setAcknowledging(true);
    setAckError("");

    try {
      const result = await apiRequest(
        `/api/schools/${encodeURIComponent(schoolId)}/early-warning/alerts/${acknowledging ? acknowledging : alertId}/acknowledge`,
        {
          method: "PATCH",
          auth: true,
        }
      );

      if (result.success) {
        setAckSuccess(true);
        setAckError("");
        // Refresh warnings
        const idx = earlyWarnings.findIndex((a) => a.id === alertId);
        if (idx >= 0) {
          earlyWarnings[idx].status = "ACKNOWLEDGED";
        }
      } else {
        setAckError(result.message || "Unable to acknowledge alert.");
      }
    } catch (error) {
      setAckError(error.message || "Unable to acknowledge alert.");
    } finally {
      setAcknowledging(false);
    }
  };

  // 3. Resolve alert
  const handleResolve = async (alertId) => {
    setResolving(true);
    setResolvError("");

    try {
      const result = await apiRequest(
        `/api/schools/${encodeURIComponent(schoolId)}/early-warning/alerts/${resolving ? resolving : alertId}/resolve`,
        {
          method: "PATCH",
          auth: true,
        }
      );

      if (result.success) {
        setResolvSuccess(true);
        setResolvError("");
        // Refresh warnings
        const idx = earlyWarnings.findIndex((a) => a.id === alertId);
        if (idx >= 0) {
          earlyWarnings[idx].status = "RESOLVED";
        }
      } else {
        setResolvError(result.message || "Unable to resolve alert.");
      }
    } catch (error) {
      setResolvError(error.message || "Unable to resolve alert.");
    } finally {
      setResolving(false);
    }
  };

  if (!schoolId) return null;

  return (
    <main className="content">
      <PageHeading
        eyebrow="Early Warnings"
        title="Active Alerts"
        description="View and manage alerts for assigned classes."
      />

      <Panel eyebrow="Active Alerts" title="Active Early Warnings">
        {loadingEarlyWarnings ? (
          <p role="status" aria-live="polite">Loading early warnings...</p>
        ) : earlyWarningsError ? (
          <div role="alert">
            <p>{earlyWarningsError}</p>
            <button onClick={() => setEarlyWarningsError("")}>Try again</button>
          </div>
        ) : earlyWarnings.length === 0 ? (
          <p role="status">No active early warnings.</p>
        ) : (
          <ul className="alert-list">
            {earlyWarnings.map((alert) => (
              <AlertItem
                key={alert.id}
                title={alert.alertRule?.alertType || alert.alertType}
                detail={`Class: ${alert.className || 'Unknown'} · ${alert.evidence || ''}`}
                level={alert.severity === 'high' ? 'urgent' : alert.severity === 'medium' ? 'warning' : 'info'}
                onAcknowledge={() => handleAcknowledge(alert.id)}
                onResolve={() => handleResolve(alert.id)}
              />
            ))}
          </ul>
        )}
      </Panel>

      {selectedAlertId && (
        <Panel
          eyebrow="Alert Actions"
          title="Alert Management"
        >
          {acknowledging ? (
            <p role="status" aria-live="polite">Acknowledging alert...</p>
          ) : ackError ? (
            <div role="alert">
              <p>{ackError}</p>
              <button onClick={() => setAckError("")}>Try again</button>
            </div>
          ) : ackSuccess ? (
            <div role="alert" className="success">
              <p>Acknowledged successfully.</p>
            </div>
          ) : null}

          {resolving ? (
          <p role="status" aria-live="polite">Resolving alert...</p>
        ) : resolvError ? (
          <div role="alert">
            <p>{resolvError}</p>
            <button onClick={() => setResolvError("")}>Try again</button>
          </div>
        ) : resolvSuccess ? (
          <div role="alert" className="success">
            <p>Resolved successfully.</p>
          </div>
          ) : null}
        </Panel>
      )}
    </main>
  );
}

export default EarlyWarningsPage;
