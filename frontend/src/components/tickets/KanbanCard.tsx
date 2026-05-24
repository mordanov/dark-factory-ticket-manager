import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TicketResponse } from "../../types";

interface Props {
  ticket: TicketResponse;
}

export function KanbanCard({ ticket }: Props) {
  const { t } = useTranslation();
  const pendingAssignees = ticket.assignees.filter((a) => !a.has_progress_update);

  const activeFlags = [
    ticket.urgent && { label: "U", title: "Urgent", color: "#e74c3c" },
    ticket.blocker && { label: "B", title: "Blocker", color: "#c0392b" },
    ticket.bugfix && { label: "F", title: "Bugfix", color: "#8e44ad" },
  ].filter(Boolean) as { label: string; title: string; color: string }[];

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("ticketId", ticket.id);
    e.dataTransfer.setData("fromStatus", ticket.status);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div draggable onDragStart={handleDragStart} style={card}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        {ticket.display_id && (
          <span style={idLabel}>{ticket.display_id}</span>
        )}
        <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
          {activeFlags.map((f) => (
            <span key={f.label} title={f.title} style={{ ...flagDot, background: f.color }}>{f.label}</span>
          ))}
        </div>
      </div>

      <Link to={`/tickets/${ticket.id}`} style={titleLink}>
        {ticket.title}
      </Link>

      <div style={{ fontSize: "0.7rem", color: "#888", marginTop: 4 }}>
        {t(`tickets.type.${ticket.ticket_type}`)}
      </div>

      {ticket.assignees.length > 0 && (
        <div style={avatarRow}>
          {ticket.assignees.map((a) => (
            <span key={a.user_id} style={avatar} title={a.email}>
              {a.email[0].toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {ticket.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
          {ticket.tags.slice(0, 3).map((tg) => (
            <span key={tg.id} style={tagPill}>{tg.name}</span>
          ))}
          {ticket.tags.length > 3 && (
            <span style={{ ...tagPill, color: "#888", background: "#f0f0f0" }}>+{ticket.tags.length - 3}</span>
          )}
        </div>
      )}

      {pendingAssignees.length > 0 && (
        <div
          style={pendingBadge}
          title={`Awaiting progress from: ${pendingAssignees.map((a) => a.email).join(", ")}`}
        >
          ⚠ {pendingAssignees.length} pending
        </div>
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
const idLabel: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "0.68rem",
  color: "#3355cc",
  fontWeight: 700,
};
const flagDot: React.CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: "50%",
  color: "#fff",
  fontSize: "0.6rem",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as React.CSSProperties;
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
const tagPill: React.CSSProperties = {
  background: "#e8f0fe",
  color: "#1a5276",
  borderRadius: 8,
  padding: "1px 6px",
  fontSize: "0.68rem",
  fontWeight: 500,
};
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
