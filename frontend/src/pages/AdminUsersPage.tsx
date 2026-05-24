import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { listAdminUsers, createAdminUser, updateAdminUser, blockAdminUser, unblockAdminUser } from "../api/admin";
import { UserTable } from "../components/admin/UserTable";
import { UserForm } from "../components/admin/UserForm";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { ThemeSwitcher } from "../components/common/ThemeSwitcher";
import type { AdminUserResponse, AdminUserCreate, AdminUserUpdate } from "../types";

const QUERY_KEY = ["admin", "users"] as const;

export function AdminUsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listAdminUsers,
  });

  const createMutation = useMutation({
    mutationFn: (payload: AdminUserCreate) => createAdminUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUserUpdate }) => updateAdminUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setEditingUser(null);
    },
  });

  const blockMutation = useMutation({
    mutationFn: (userId: string) => blockAdminUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: () => setActionError(t("admin.users.errors.blockFailed")),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => unblockAdminUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: () => setActionError(t("admin.users.errors.unblockFailed")),
  });

  async function handleFormSubmit(data: AdminUserCreate | AdminUserUpdate) {
    if (editingUser) {
      await updateMutation.mutateAsync({ id: editingUser.id, payload: data as AdminUserUpdate });
    } else {
      await createMutation.mutateAsync(data as AdminUserCreate);
    }
  }

  return (
    <div style={page}>
      <header style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link to="/projects" style={{ color: "var(--color-accent)", fontSize: "0.875rem" }}>
            {t("nav.backToProjects")}
          </Link>
          <span style={{ color: "var(--color-border)" }}>/</span>
          <h1 style={{ margin: 0, fontSize: "1.1rem" }}>{t("admin.users.title")}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <LanguageSwitcher />
          <ThemeSwitcher />
          <button
            onClick={() => { setShowForm(true); setEditingUser(null); setActionError(null); }}
            style={createBtn}
          >
            {t("admin.users.newUser")}
          </button>
        </div>
      </header>

      <main style={main}>
        {actionError && (
          <p role="alert" style={{ color: "var(--color-danger)", marginBottom: "1rem", fontSize: "0.875rem" }}>
            {actionError}
          </p>
        )}

        {isLoading && <p>{t("admin.users.loading")}</p>}
        {isError && <p style={{ color: "var(--color-danger)" }}>{t("admin.users.failed")}</p>}

        {data && (
          <div style={tableCard}>
            <UserTable
              users={data.items}
              currentUserId={currentUser?.id}
              onEdit={(user) => { setEditingUser(user); setShowForm(false); setActionError(null); }}
              onBlock={(user) => { setActionError(null); blockMutation.mutate(user.id); }}
              onUnblock={(user) => { setActionError(null); unblockMutation.mutate(user.id); }}
            />
          </div>
        )}
      </main>

      {(showForm || editingUser) && (
        <UserForm
          user={editingUser ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingUser(null); }}
        />
      )}
    </div>
  );
}

const page: React.CSSProperties = { minHeight: "100vh", background: "var(--color-bg)" };
const header: React.CSSProperties = {
  background: "var(--color-surface)",
  borderBottom: "1px solid var(--color-border)",
  padding: "0.75rem 1.5rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const main: React.CSSProperties = { maxWidth: 900, margin: "0 auto", padding: "1.5rem" };
const tableCard: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  overflow: "hidden",
};
const createBtn: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  background: "var(--color-accent)",
  color: "var(--color-text-inverse)",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
};
