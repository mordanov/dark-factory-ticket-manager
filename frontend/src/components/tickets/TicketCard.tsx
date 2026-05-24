import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TicketResponse } from "../../types";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#2980b9",
  IN_PROGRESS: "#e67e22",
  IN_REVIEW: "#8e44ad",
  DONE: "#27ae60",
  CLOSED: "#7f8c8d",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface TicketCardProps {
  ticket: TicketResponse;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const { t } = useTranslation();
  const statusColor = STATUS_COLORS[ticket.status] ?? "#7f8c8d";
  const activeFlags = [
    ticket.urgent && { label: "URGENT", color: "#e74c3c", bg: "#fdecea" },
    ticket.blocker && { label: "BLOCKER", color: "#c0392b", bg: "#fce8e8" },
    ticket.bugfix && { label: "BUGFIX", color: "#8e44ad", bg: "#f3e8fd" },
  ].filter(Boolean) as { label: string; color: string; bg: string }[];

  return (
    <div style={card}>
      {/* Top row: display_id + type/spec + status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {ticket.display_id && (
            <span style={idBadge}>{ticket.display_id}</span>
          )}
          <span style={typeBadge}>{t(`tickets.type.${ticket.ticket_type}`)}</span>
          {ticket.ticket_spec && (
            <span style={specBadge}>{t(`tickets.spec.${ticket.ticket_spec}`)}</span>
          )}
        </div>
        <span style={{ ...statusBadge, background: statusColor, flexShrink: 0 }}>
          {t(`tickets.status.${ticket.status}`)}
        </span>
      </div>

      {/* Title */}
      <Link to={`/tickets/${ticket.id}`} style={titleLink}>
        {ticket.title}
      </Link>

      {/* Timestamps */}
      <div style={metaRow}>
        <span>Created {formatDate(ticket.created_at)}</span>
        <span style={{ color: "#bbb" }}>·</span>
        <span>Updated {formatDate(ticket.updated_at)}</span>
      </div>

      {/* Assignees */}
      {ticket.assignees.length > 0 && (
        <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.3rem", alignItems: "center" }}>
          {ticket.assignees.map((a) => (
            <span key={a.user_id} style={assigneeChip} title={a.email}>
              {a.email.split("@")[0]}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      {ticket.tags.length > 0 && (
        <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {ticket.tags.map((tg) => (
            <span key={tg.id} style={tagPill}>{tg.name}</span>
          ))}
        </div>
      )}

      {/* Active flags */}
      {activeFlags.length > 0 && (
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.3rem" }}>
          {activeFlags.map((f) => (
            <span key={f.label} style={{ ...flagBadge, color: f.color, background: f.bg, borderColor: f.color }}>
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: "0.875rem 1rem",
  marginBottom: "0.5rem",
};
const idBadge: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#3355cc",
  background: "#f0f4ff",
  border: "1px solid #c5d3f5",
  borderRadius: 4,
  padding: "0.1rem 0.4rem",
  whiteSpace: "nowrap",
};
const typeBadge: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "#555",
  background: "#f4f4f4",
  borderRadius: 4,
  padding: "0.1rem 0.4rem",
  textTransform: "capitalize",
};
const specBadge: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "#2c7a4b",
  background: "#eafaf1",
  border: "1px solid #b7e4c7",
  borderRadius: 4,
  padding: "0.1rem 0.4rem",
};
const statusBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.6rem",
  borderRadius: 12,
  color: "#fff",
  fontSize: "0.72rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
};
const titleLink: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  color: "#1a1a2e",
  fontSize: "0.95rem",
  textDecoration: "none",
  marginBottom: "0.25rem",
  lineHeight: 1.4,
};
const metaRow: React.CSSProperties = {
  display: "flex",
  gap: "0.4rem",
  fontSize: "0.75rem",
  color: "#999",
  marginTop: "0.15rem",
};
const assigneeChip: React.CSSProperties = {
  display: "inline-block",
  background: "#dce8f5",
  color: "#1a5276",
  borderRadius: 10,
  padding: "0.1rem 0.5rem",
  fontSize: "0.75rem",
  fontWeight: 500,
};
const tagPill: React.CSSProperties = {
  display: "inline-block",
  background: "#e8f0fe",
  color: "#1a5276",
  borderRadius: 12,
  padding: "0.1rem 0.5rem",
  fontSize: "0.75rem",
  fontWeight: 500,
};
const flagBadge: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  borderRadius: 4,
  padding: "0.1rem 0.45rem",
  border: "1px solid",
  letterSpacing: "0.03em",
};
