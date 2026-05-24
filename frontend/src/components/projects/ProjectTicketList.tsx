import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { FilterState } from "../common/FilterBar";
import { FilterBar } from "../common/FilterBar";
import { TicketCard } from "../tickets/TicketCard";
import { listTickets } from "../../api/projects";
import type { AssigneeSummary } from "../../types";

interface ProjectTicketListProps {
  projectId: string;
}

export function ProjectTicketList({ projectId }: ProjectTicketListProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>({ status: "", assigneeId: "" });

  const queryParams = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.assigneeId ? { assignee_id: filters.assigneeId } : {}),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", projectId, queryParams],
    queryFn: () => listTickets(projectId, queryParams),
  });

  const allAssignees = useMemo<AssigneeSummary[]>(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const result: AssigneeSummary[] = [];
    for (const ticket of data.items) {
      for (const a of ticket.assignees) {
        if (!seen.has(a.user_id)) {
          seen.add(a.user_id);
          result.push(a);
        }
      }
    }
    return result;
  }, [data]);

  if (isLoading) return <p>{t("tickets.loading")}</p>;
  if (isError) return <p style={{ color: "#c0392b" }}>{t("tickets.failedToLoad")}</p>;

  const tickets = data?.items ?? [];

  return (
    <div>
      <FilterBar filters={filters} assignees={allAssignees} onChange={setFilters} />
      {tickets.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center", padding: "2rem 0" }}>
          No tickets match the current filters.
        </p>
      ) : (
        <div>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          <p style={{ fontSize: "0.8rem", color: "#888", textAlign: "right" }}>
            {data?.total ?? tickets.length} total
          </p>
        </div>
      )}
    </div>
  );
}
