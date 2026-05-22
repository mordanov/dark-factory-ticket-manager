import type { TicketEventResponse } from "../../types";

const EVENT_LABELS: Record<string, string> = {
  "ticket.created": "Ticket created",
  "ticket.updated": "Ticket updated",
  "ticket.deleted": "Ticket deleted",
  "ticket.assigned": "User assigned",
  "ticket.unassigned": "User unassigned",
  "ticket.status_changed": "Status changed",
  "ticket.progress_updated": "Progress updated",
  "ticket.transition_blocked": "Transition blocked",
};

interface TicketEventHistoryProps {
  events: TicketEventResponse[];
}

export function TicketEventHistory({ events }: TicketEventHistoryProps) {
  if (events.length === 0) {
    return <p style={{ color: "#888", fontSize: "0.875rem" }}>No activity yet.</p>;
  }

  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {events.map((event) => (
        <li key={event.id} style={eventRow}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>
              {EVENT_LABELS[event.event_type] ?? event.event_type}
            </span>
            <span
              style={{ fontSize: "0.8rem", color: "#888" }}
              title={new Date(event.occurred_at).toLocaleString()}
            >
              {formatRelativeTime(event.occurred_at)}
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.15rem" }}>
            by {event.actor.email}
          </div>
          {event.new_state && (
            <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#555" }}>
              {renderStateChange(event)}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function renderStateChange(event: TicketEventResponse): string | null {
  if (event.event_type === "ticket.status_changed") {
    const prev = (event.prev_state as { status?: string } | null)?.status;
    const next = (event.new_state as { status?: string } | null)?.status;
    if (prev && next) return `${prev} → ${next}`;
  }
  if (event.event_type === "ticket.progress_updated") {
    const content = (event.new_state as { content?: string } | null)?.content;
    if (content) return content.length > 120 ? content.slice(0, 120) + "…" : content;
  }
  return null;
}

const eventRow: React.CSSProperties = {
  paddingBottom: "0.75rem",
  marginBottom: "0.75rem",
  borderBottom: "1px solid #eee",
};
