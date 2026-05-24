import { useTranslation } from "react-i18next";
import type { AdminUserResponse } from "../../types";

interface UserTableProps {
  users: AdminUserResponse[];
  currentUserId?: string;
  onEdit: (user: AdminUserResponse) => void;
  onBlock: (user: AdminUserResponse) => void;
  onUnblock: (user: AdminUserResponse) => void;
}

export function UserTable({ users, currentUserId, onEdit, onBlock, onUnblock }: UserTableProps) {
  const { t } = useTranslation();

  if (users.length === 0) {
    return <p style={{ color: "#888", fontSize: "0.875rem" }}>{t("admin.users.empty")}</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>{t("admin.users.table.email")}</th>
            <th style={th}>{t("admin.users.table.role")}</th>
            <th style={th}>{t("admin.users.table.status")}</th>
            <th style={th}>{t("admin.users.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isBlocked = user.blocked_at !== null;
            const isSelf = user.id === currentUserId;
            return (
              <tr key={user.id} style={isSelf ? { ...tr, background: "#fafafa" } : tr}>
                <td style={td}>{user.email}</td>
                <td style={td}>
                  <span style={roleBadge}>
                    {t(`admin.users.role.${user.role}`)}
                  </span>
                </td>
                <td style={td}>
                  <span style={{ ...statusBadge, background: isBlocked ? "#e74c3c" : "#27ae60" }}>
                    {isBlocked ? t("admin.users.status.blocked") : t("admin.users.status.active")}
                  </span>
                </td>
                <td style={td}>
                  <div style={actionGroup}>
                    <button onClick={() => onEdit(user)} style={actionBtn} disabled={isSelf}>
                      {t("admin.users.actions.edit")}
                    </button>
                    {!isSelf && (
                      isBlocked ? (
                        <button onClick={() => onUnblock(user)} style={{ ...actionBtn, color: "#27ae60", borderColor: "#27ae60" }}>
                          {t("admin.users.actions.unblock")}
                        </button>
                      ) : (
                        <button onClick={() => onBlock(user)} style={{ ...actionBtn, color: "#e74c3c", borderColor: "#e74c3c" }}>
                          {t("admin.users.actions.block")}
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.875rem",
};
const th: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  background: "#f5f5f5",
  borderBottom: "2px solid #e0e0e0",
  textAlign: "left",
  fontWeight: 600,
  color: "#555",
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
};
const tr: React.CSSProperties = {
  borderBottom: "1px solid #f0f0f0",
};
const td: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  verticalAlign: "middle",
};
const roleBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "0.1rem 0.5rem",
  borderRadius: 4,
  background: "#f0f4ff",
  color: "#3355cc",
  fontSize: "0.78rem",
  fontWeight: 600,
};
const statusBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "0.1rem 0.5rem",
  borderRadius: 10,
  color: "#fff",
  fontSize: "0.75rem",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const actionGroup: React.CSSProperties = {
  display: "flex",
  gap: "0.4rem",
  flexWrap: "wrap",
};
const actionBtn: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: "0.8rem",
  cursor: "pointer",
  color: "#555",
};
