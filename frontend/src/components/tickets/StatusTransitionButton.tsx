import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TicketResponse, TicketStatus, TransitionBlockedError } from "../../types";
import { WORKFLOW_TRANSITIONS } from "../../types";
import { transitionTicket } from "../../api/tickets";

function isTransitionBlockedError(v: unknown): v is TransitionBlockedError {
  return typeof v === "object" && v !== null && "missing_updates" in v;
}

interface StatusTransitionButtonProps {
  ticket: TicketResponse;
  onTransitioned: (updated: TicketResponse) => void;
}

export function StatusTransitionButton({ ticket, onTransitioned }: StatusTransitionButtonProps) {
  const { t } = useTranslation();
  const nextStatuses = WORKFLOW_TRANSITIONS[ticket.status] ?? [];
  const [blocked, setBlocked] = useState<TransitionBlockedError | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState<TicketStatus | null>(null);

  if (nextStatuses.length === 0) {
    return <p style={{ color: "#888", fontSize: "0.875rem" }}>{t("tickets.detail.noTransitions")}</p>;
  }

  async function handleTransition(toStatus: TicketStatus) {
    setBlocked(null);
    setApiError(null);
    setLoading(toStatus);
    try {
      const result = await transitionTicket(ticket.id, toStatus);
      if (isTransitionBlockedError(result)) {
        setBlocked(result);
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
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "#c0392b" }}>
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
    </div>
  );
}

const transitionBtn: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  background: "#0066cc",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: "0.5rem",
  color: "#c0392b",
  fontSize: "0.875rem",
};

const blockedBox: React.CSSProperties = {
  marginTop: "0.75rem",
  padding: "0.75rem",
  background: "#fef3f2",
  border: "1px solid #f5c6c5",
  borderRadius: 4,
};
