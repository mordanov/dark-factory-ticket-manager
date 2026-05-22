import { Link } from "react-router-dom";
import type { TicketResponse } from "../../types";
import { TICKET_STATUS_LABELS } from "../../types";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#2980b9",
  IN_PROGRESS: "#e67e22",
  IN_REVIEW: "#8e44ad",
  DONE: "#27ae60",
  CLOSED: "#7f8c8d",
};

interface TicketCardProps {
  ticket: TicketResponse;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const statusColor = STATUS_COLORS[ticket.status] ?? "#7f8c8d";

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <Link to={`/tickets/${ticket.id}`} style={titleLink}>
          {ticket.title}
        </Link>
        <span
          style={{ ...statusBadge, background: statusColor }}
          aria-label={`Status: ${TICKET_STATUS_LABELS[ticket.status]}`}
        >
          {TICKET_STATUS_LABELS[ticket.status]}
        </span>
      </div>

      {ticket.assignees.length > 0 && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#555" }}>
          <span>Assigned to: </span>
          {ticket.assignees.map((a) => a.email).join(", ")}
        </div>
      )}

      {(ticket.follow_up_count ?? 0) > 0 && (
        <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#888" }}>
          {ticket.follow_up_count} follow-up{(ticket.follow_up_count ?? 0) !== 1 ? "s" : ""}
        </div>
      )}

      {ticket.parent_ticket_id && (
        <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#888" }}>
          Follow-up of{" "}
          <Link to={`/tickets/${ticket.parent_ticket_id}`} style={{ color: "#0066cc" }}>
            parent ticket
          </Link>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 6,
  padding: "0.875rem 1rem",
  marginBottom: "0.5rem",
};

const titleLink: React.CSSProperties = {
  fontWeight: 500,
  color: "#0066cc",
  fontSize: "0.95rem",
  flex: 1,
};

const statusBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.6rem",
  borderRadius: 12,
  color: "#fff",
  fontSize: "0.75rem",
  fontWeight: 600,
  whiteSpace: "nowrap",
  flexShrink: 0,
};
