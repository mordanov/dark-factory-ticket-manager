import { useTranslation } from "react-i18next";
import type { TicketStatus, AssigneeSummary } from "../../types";

export interface FilterState {
  status: TicketStatus | "";
  assigneeId: string;
}

interface FilterBarProps {
  filters: FilterState;
  assignees: AssigneeSummary[];
  onChange: (filters: FilterState) => void;
}

const ALL_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "CLOSED"];

export function FilterBar({ filters, assignees, onChange }: FilterBarProps) {
  const { t } = useTranslation();

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange({ ...filters, status: e.target.value as TicketStatus | "" });
  }

  function handleAssigneeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange({ ...filters, assigneeId: e.target.value });
  }

  return (
    <div style={barStyle} role="search" aria-label="Filter tickets">
      <div style={filterGroup}>
        <label htmlFor="filter-status" style={labelStyle}>{t("filter.status")}</label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={handleStatusChange}
          style={selectStyle}
        >
          <option value="">{t("filter.allStatuses")}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`tickets.status.${s}`)}</option>
          ))}
        </select>
      </div>

      {assignees.length > 0 && (
        <div style={filterGroup}>
          <label htmlFor="filter-assignee" style={labelStyle}>{t("filter.assignee")}</label>
          <select
            id="filter-assignee"
            value={filters.assigneeId}
            onChange={handleAssigneeChange}
            style={selectStyle}
          >
            <option value="">{t("filter.allAssignees")}</option>
            {assignees.map((a) => (
              <option key={a.user_id} value={a.user_id}>{a.email}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

const barStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  flexWrap: "wrap",
  marginBottom: "1rem",
  padding: "0.75rem",
  background: "var(--color-surface)",
  borderRadius: 6,
  border: "1px solid var(--color-border)",
};

const filterGroup: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const selectStyle: React.CSSProperties = {
  padding: "0.35rem 0.6rem",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  fontSize: "0.875rem",
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
};
