import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TicketResponse, TicketStatus, TransitionBlockedError } from "../../types";
import { WORKFLOW_TRANSITIONS } from "../../types";
import { transitionTicket, submitProgress } from "../../api/tickets";
import { useAuthStore } from "../../store/auth";

function isTransitionBlockedError(v: unknown): v is TransitionBlockedError {
  return typeof v === "object" && v !== null && "missing_updates" in v;
}

interface StatusTransitionButtonProps {
  ticket: TicketResponse;
  onTransitioned: (updated: TicketResponse) => void;
}

export function StatusTransitionButton({ ticket, onTransitioned }: StatusTransitionButtonProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const nextStatuses = WORKFLOW_TRANSITIONS[ticket.status] ?? [];
  const [blocked, setBlocked] = useState<TransitionBlockedError | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState<TicketStatus | null>(null);
  const [pendingToStatus, setPendingToStatus] = useState<TicketStatus | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  if (nextStatuses.length === 0) {
    return <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>{t("tickets.detail.noTransitions")}</p>;
  }

  async function handleTransition(toStatus: TicketStatus) {
    setBlocked(null);
    setApiError(null);
    setLoading(toStatus);
    try {
      const result = await transitionTicket(ticket.id, toStatus);
      if (isTransitionBlockedError(result)) {
        const currentUserBlocking = currentUser
          ? result.missing_updates.some((u) => u.user_id === currentUser.id)
          : false;
        if (currentUserBlocking) {
          setPendingToStatus(toStatus);
        } else {
          setBlocked(result);
        }
      } else {
        onTransitioned(result);
      }
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const e = err as { response: { status: number; data?: { detail?: string } } };
        if (e.response.status === 409) {
          setApiError(t("tickets.detail.invalidTransition"));
          return;
        }
        if (e.response.status === 403) {
          setApiError(t("tickets.detail.notAssignedError"));
          return;
        }
        if (e.response.data?.detail) {
          setApiError(e.response.data.detail);
          return;
        }
      }
      setApiError(t("tickets.detail.transitionError"));
    } finally {
      setLoading(null);
    }
  }

  async function handleSubmitUpdate() {
    if (!updateText.trim()) {
      setUpdateError(t("tickets.progress.required"));
      return;
    }
    if (!pendingToStatus) return;
    setUpdateError(null);
    setUpdateLoading(true);
    try {
      await submitProgress(ticket.id, updateText.trim());
    } catch {
      setUpdateError(t("tickets.progress.failed"));
      setUpdateLoading(false);
      return;
    }
    try {
      const result = await transitionTicket(ticket.id, pendingToStatus);
      if (isTransitionBlockedError(result)) {
        setBlocked(result);
      } else {
        onTransitioned(result);
      }
      setPendingToStatus(null);
      setUpdateText("");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const e = err as { response: { status: number; data?: { detail?: string } } };
        if (e.response.data?.detail) {
          setApiError(e.response.data.detail);
        } else {
          setApiError(t("tickets.detail.transitionError"));
        }
      } else {
        setApiError(t("tickets.detail.transitionError"));
      }
      setPendingToStatus(null);
      setUpdateText("");
    } finally {
      setUpdateLoading(false);
    }
  }

  function handleCancelUpdate() {
    setPendingToStatus(null);
    setUpdateText("");
    setUpdateError(null);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {nextStatuses.map((s) => (
          <button
            key={s}
            onClick={() => handleTransition(s)}
            disabled={loading !== null}
            style={transitionBtn}
            aria-label={`Move to ${t(`tickets.status.${s}`)}`}
          >
            {loading === s ? t("tickets.detail.movingTo") : t("tickets.detail.moveTo", { status: t(`tickets.status.${s}`) })}
          </button>
        ))}
      </div>

      {apiError && (
        <p role="alert" style={errorStyle}>{apiError}</p>
      )}

      {blocked && (
        <div role="alert" style={blockedBox}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "var(--color-danger)" }}>
            {blocked.detail}
          </p>
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem" }}>
            {t("tickets.detail.transitionBlocked")}
          </p>
          <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
            {blocked.missing_updates.map((u) => (
              <li key={u.user_id}>{u.email}</li>
            ))}
          </ul>
        </div>
      )}

      {pendingToStatus && (
        <div style={modalOverlay} onClick={handleCancelUpdate}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>
              {t("tickets.progress.submitUpdate")}
            </h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              {t("tickets.detail.updateRequiredForTransition")}
            </p>
            <textarea
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              placeholder={t("tickets.progress.placeholder")}
              rows={4}
              style={textareaStyle}
              disabled={updateLoading}
            />
            {updateError && (
              <p role="alert" style={{ ...errorStyle, marginTop: "0.25rem" }}>{updateError}</p>
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button onClick={handleCancelUpdate} disabled={updateLoading} style={cancelBtn}>
                {t("common.cancel")}
              </button>
              <button onClick={handleSubmitUpdate} disabled={updateLoading} style={transitionBtn}>
                {updateLoading ? t("tickets.progress.submitting") : t("tickets.progress.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const transitionBtn: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  background: "var(--color-accent)",
  color: "var(--color-text-inverse)",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: "0.5rem",
  color: "var(--color-danger)",
  fontSize: "0.875rem",
};

const blockedBox: React.CSSProperties = {
  marginTop: "0.75rem",
  padding: "0.75rem",
  background: "#fef3f2",
  border: "1px solid #f5c6c5",
  borderRadius: 4,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalBox: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 8,
  padding: "1.5rem",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.5rem",
  borderRadius: 4,
  border: "1px solid var(--color-border)",
  background: "var(--color-input-bg, var(--color-surface))",
  color: "var(--color-text)",
  fontSize: "0.9rem",
  resize: "vertical",
};

const cancelBtn: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  background: "transparent",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
};
