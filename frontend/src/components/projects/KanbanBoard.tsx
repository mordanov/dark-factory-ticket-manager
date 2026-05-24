import { useQuery } from "@tanstack/react-query";
import { listAllTickets } from "../../api/projects";
import type { TicketStatus } from "../../types";
import { TICKET_STATUS_LABELS } from "../../types";
import { KanbanColumn } from "../tickets/KanbanColumn";

interface Props {
  projectId: string;
}

const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "CLOSED"];

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "#2980b9",
  IN_PROGRESS: "#e67e22",
  IN_REVIEW: "#8e44ad",
  DONE: "#27ae60",
  CLOSED: "#7f8c8d",
};

export function KanbanBoard({ projectId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", projectId],
    queryFn: () => listAllTickets(projectId),
  });

  if (isLoading) return <p style={{ padding: "2rem", color: "#888" }}>Loading board…</p>;
  if (isError) return <p style={{ padding: "2rem", color: "#c0392b" }}>Failed to load tickets.</p>;

  const tickets = data?.items ?? [];

  return (
    <div style={board}>
      {STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          label={TICKET_STATUS_LABELS[status]}
          color={STATUS_COLORS[status]}
          tickets={tickets.filter((t) => t.status === status)}
          projectId={projectId}
        />
      ))}
    </div>
  );
}

const board: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  overflowX: "auto",
  paddingBottom: 16,
};
