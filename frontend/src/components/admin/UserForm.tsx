import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { AdminUserResponse, AdminUserCreate, AdminUserUpdate, UserRole } from "../../types";

interface UserFormProps {
  user?: AdminUserResponse;
  onSubmit: (data: AdminUserCreate | AdminUserUpdate) => Promise<void>;
  onCancel: () => void;
}

const ROLES: UserRole[] = ["user", "administrator"];

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const { t } = useTranslation();
  const isEdit = !!user;

  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user?.role ?? "user");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t("admin.users.form.emailRequired"));
      return;
    }
    if (!isEdit && password.length < 8) {
      setError(t("admin.users.form.passwordRequired"));
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload: AdminUserUpdate = {};
        if (email !== user!.email) payload.email = email.trim();
        if (role !== user!.role) payload.role = role;
        await onSubmit(payload);
      } else {
        await onSubmit({ email: email.trim(), password, role });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? t(isEdit ? "admin.users.errors.updateFailed" : "admin.users.errors.createFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlay} onClick={onCancel}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={title}>{isEdit ? t("admin.users.form.editTitle") : t("admin.users.form.createTitle")}</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldStyle}>
            <label htmlFor="user-email" style={labelStyle}>
              {t("admin.users.form.email")} <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {!isEdit && (
            <div style={fieldStyle}>
              <label htmlFor="user-password" style={labelStyle}>
                {t("admin.users.form.password")} <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                disabled={loading}
                autoComplete="new-password"
                minLength={8}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.2rem", display: "block" }}>
                {t("admin.users.form.passwordHint")}
              </span>
            </div>
          )}

          <div style={fieldStyle}>
            <label htmlFor="user-role" style={labelStyle}>{t("admin.users.form.role")}</label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              style={{ ...inputStyle, background: "var(--color-surface)" }}
              disabled={loading}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{t(`admin.users.role.${r}`)}</option>
              ))}
            </select>
          </div>

          {error && (
            <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem", margin: "0 0 0.75rem" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onCancel} style={cancelBtn} disabled={loading}>
              {t("admin.users.form.cancel")}
            </button>
            <button type="submit" style={submitBtn} disabled={loading}>
              {loading
                ? (isEdit ? t("admin.users.form.saving") : t("admin.users.form.creating"))
                : (isEdit ? t("admin.users.form.save") : t("admin.users.form.create"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
const modal: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 8,
  padding: "1.5rem",
  width: "100%",
  maxWidth: 440,
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
};
const title: React.CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "1.1rem",
  fontWeight: 600,
};
const fieldStyle: React.CSSProperties = { marginBottom: "1rem" };
const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.25rem",
  fontWeight: 500,
  fontSize: "0.875rem",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  fontSize: "0.875rem",
  boxSizing: "border-box",
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
};
const cancelBtn: React.CSSProperties = {
  padding: "0.45rem 1rem",
  background: "var(--color-bg)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "0.875rem",
};
const submitBtn: React.CSSProperties = {
  padding: "0.45rem 1.25rem",
  background: "var(--color-accent)",
  color: "var(--color-text-inverse)",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
