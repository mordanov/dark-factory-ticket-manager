import { useTranslation } from "react-i18next";
import type { AssigneeSummary, ProgressUpdateResponse } from "../../types";

interface Props {
  assignees: AssigneeSummary[];
  progressItems: ProgressUpdateResponse[];
  currentUserId?: string;
  isAdmin?: boolean;
  onUnassign?: (userId: string) => void;
}

export function AssigneeProgressList({ assignees, progressItems, currentUserId, isAdmin, onUnassign }: Props) {
  const { t } = useTranslation();
  const progressByUser = new Map(progressItems.map((p) => [p.user_id, p]));

  if (assignees.length === 0) {
    return <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>No assignees.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {assignees.map((a) => {
        const progress = progressByUser.get(a.user_id);
        const canRemove = onUnassign && (isAdmin || a.user_id === currentUserId);
        return (
          <li key={a.user_id} style={rowStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 500, fontSize: "0.875rem", flex: 1 }}>{a.email}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {progress ? (
                  <span style={{ ...badge, background: "#27ae60" }}>Update submitted</span>
                ) : (
                  <span style={{ ...badge, background: "#e67e22" }}>Pending</span>
                )}
                {canRemove && (
                  <button
                    onClick={() => onUnassign(a.user_id)}
                    style={removeBtn}
                    title={t("tickets.assign.removeFailed")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {progress && (
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem", color: "var(--color-text-primary)" }}>
                {progress.content}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const rowStyle: React.CSSProperties = {
  background: "var(--color-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  padding: "0.6rem 0.75rem",
  marginBottom: "0.5rem",
};

const badge: React.CSSProperties = {
  padding: "0.1rem 0.5rem",
  borderRadius: 10,
  color: "#fff",
  fontSize: "0.75rem",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const removeBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  cursor: "pointer",
  color: "var(--color-text-secondary)",
  fontSize: "0.7rem",
  padding: "2px 6px",
  lineHeight: 1,
};
