import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TicketResponse, TicketStatus, TransitionBlockedError } from "../../types";
import { WORKFLOW_TRANSITIONS } from "../../types";
import { transitionTicket } from "../../api/tickets";
import { KanbanCard } from "./KanbanCard";

interface Props {
  status: TicketStatus;
  label: string;
  color: string;
  tickets: TicketResponse[];
  projectId: string;
}

export function KanbanColumn({ status, label, color, tickets, projectId }: Props) {
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<TransitionBlockedError | string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // only clear when leaving the column area, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);

    const ticketId = e.dataTransfer.getData("ticketId");
    const fromStatus = e.dataTransfer.getData("fromStatus") as TicketStatus;

    if (!ticketId || fromStatus === status) return;

    const allowed = WORKFLOW_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(status)) {
      setError(`Tickets cannot move directly from ${fromStatus.replace("_", " ")} to ${label}.`);
      return;
    }

    setLoading(true);
    try {
      const result = await transitionTicket(ticketId, status);
      if ("missing_updates" in result) {
        setError(result as TransitionBlockedError);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
      }
    } catch {
      setError("Transition failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={column}>
      <div style={columnHeader}>
        <span style={{ ...dot, background: color }} />
        <span style={columnLabel}>{label}</span>
        <span style={countBadge}>{tickets.length}</span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          ...dropZone,
          background: isDragOver ? "#eef4ff" : "#f0f2f5",
          border: isDragOver ? "2px dashed #3498db" : "2px solid transparent",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {tickets.map((ticket) => (
          <KanbanCard key={ticket.id} ticket={ticket} />
        ))}
        {tickets.length === 0 && (
          <p style={emptyMsg}>Drop here</p>
        )}
      </div>

      {error !== null && (
        <div style={errorBox}>
          {typeof error === "string" ? (
            error
          ) : (
            <>
              <strong>Progress updates required before this transition:</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                {error.missing_updates.map((u) => (
                  <li key={u.user_id}>{u.email}</li>
                ))}
              </ul>
            </>
          )}
          <button onClick={() => setError(null)} style={dismissBtn}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

const column: React.CSSProperties = {
  flex: "1 1 200px",
  minWidth: 200,
  maxWidth: 280,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const columnHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
};

const dot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
};

const columnLabel: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#555",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const countBadge: React.CSSProperties = {
  marginLeft: "auto",
  background: "#e0e0e0",
  color: "#555",
  borderRadius: 10,
  padding: "1px 8px",
  fontSize: "0.75rem",
  fontWeight: 600,
};

const dropZone: React.CSSProperties = {
  flex: 1,
  minHeight: 240,
  borderRadius: 8,
  padding: "8px 6px",
  transition: "background 0.12s ease, border-color 0.12s ease",
};

const emptyMsg: React.CSSProperties = {
  textAlign: "center",
  color: "#bbb",
  fontSize: "0.78rem",
  marginTop: 24,
  pointerEvents: "none",
};

const errorBox: React.CSSProperties = {
  padding: "8px 10px",
  background: "#ffeaea",
  border: "1px solid #f5c6c6",
  borderRadius: 6,
  fontSize: "0.78rem",
  color: "#c0392b",
};

const dismissBtn: React.CSSProperties = {
  marginTop: 6,
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#c0392b",
  padding: 0,
  fontSize: "0.75rem",
  textDecoration: "underline",
};
