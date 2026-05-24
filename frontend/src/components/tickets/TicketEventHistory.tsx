import { useTranslation } from "react-i18next";
import type { TicketEventResponse } from "../../types";

interface TicketEventHistoryProps {
  events: TicketEventResponse[];
}

export function TicketEventHistory({ events }: TicketEventHistoryProps) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>{t("tickets.events.noActivity")}</p>;
  }

  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {events.map((event) => {
        const labelKey = `tickets.events.label.${event.event_type.replace(".", "_")}`;
        return (
          <li key={event.id} style={eventRow}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                {t(labelKey, { defaultValue: event.event_type })}
              </span>
              <span
                style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}
                title={new Date(event.occurred_at).toLocaleString()}
              >
                {formatRelativeTime(event.occurred_at, t)}
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.15rem" }}>
              {t("tickets.events.by", { email: event.actor.email })}
            </div>
            {event.new_state && (
              <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                {renderStateChange(event)}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function formatRelativeTime(isoString: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return t("tickets.events.time.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("tickets.events.time.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("tickets.events.time.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("tickets.events.time.daysAgo", { count: days });
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
  borderBottom: "1px solid var(--color-border)",
};
