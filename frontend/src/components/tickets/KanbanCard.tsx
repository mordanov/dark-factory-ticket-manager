import { Link } from "react-router-dom";
import type { TicketResponse } from "../../types";

interface Props {
  ticket: TicketResponse;
}

export function KanbanCard({ ticket }: Props) {
  const pendingAssignees = ticket.assignees.filter((a) => !a.has_progress_update);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("ticketId", ticket.id);
    e.dataTransfer.setData("fromStatus", ticket.status);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={card}
    >
      <Link to={`/tickets/${ticket.id}`} style={titleLink}>
        {ticket.title}
      </Link>

      {ticket.assignees.length > 0 && (
        <div style={avatarRow}>
          {ticket.assignees.map((a) => (
            <span key={a.user_id} style={avatar} title={a.email}>
              {a.email[0].toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {pendingAssignees.length > 0 && (
        <div style={pendingBadge} title={`Awaiting progress from: ${pendingAssignees.map((a) => a.email).join(", ")}`}>
          ⚠ {pendingAssignees.length} pending update{pendingAssignees.length > 1 ? "s" : ""}
        </div>
      )}

      {(ticket.follow_up_count ?? 0) > 0 && (
        <div style={followUpBadge}>↳ {ticket.follow_up_count} follow-up{ticket.follow_up_count !== 1 ? "s" : ""}</div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 6,
  padding: "10px 12px",
  marginBottom: 8,
  cursor: "grab",
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  userSelect: "none",
};

const titleLink: React.CSSProperties = {
  fontWeight: 600,
  color: "#2c3e50",
  textDecoration: "none",
  fontSize: "0.875rem",
  display: "block",
  lineHeight: 1.4,
};

const avatarRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  marginTop: 8,
};

const avatar: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "#dce8f5",
  color: "#1a5276",
  fontSize: "0.7rem",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "default",
} as React.CSSProperties;

const pendingBadge: React.CSSProperties = {
  marginTop: 6,
  fontSize: "0.72rem",
  color: "#b7770d",
  background: "#fff8e1",
  border: "1px solid #ffe082",
  borderRadius: 4,
  padding: "2px 6px",
  display: "inline-block",
};

const followUpBadge: React.CSSProperties = {
  marginTop: 4,
  fontSize: "0.72rem",
  color: "#666",
};
