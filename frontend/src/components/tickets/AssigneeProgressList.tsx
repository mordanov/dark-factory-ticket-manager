import type { AssigneeSummary, ProgressUpdateResponse } from "../../types";

interface AssigneeProgressListProps {
  assignees: AssigneeSummary[];
  progressItems: ProgressUpdateResponse[];
}

export function AssigneeProgressList({ assignees, progressItems }: AssigneeProgressListProps) {
  const progressByUser = new Map(progressItems.map((p) => [p.user_id, p]));

  if (assignees.length === 0) {
    return <p style={{ color: "#888", fontSize: "0.875rem" }}>No assignees.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {assignees.map((a) => {
        const progress = progressByUser.get(a.user_id);
        return (
          <li key={a.user_id} style={rowStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{a.email}</span>
              {progress ? (
                <span style={{ ...badge, background: "#27ae60" }}>Update submitted</span>
              ) : (
                <span style={{ ...badge, background: "#e67e22" }}>Pending</span>
              )}
            </div>
            {progress && (
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem", color: "#444" }}>
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
  background: "#f9f9f9",
  border: "1px solid #e8e8e8",
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
};
