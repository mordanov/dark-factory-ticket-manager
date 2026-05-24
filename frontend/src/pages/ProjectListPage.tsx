import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listProjects, createProject } from "../api/projects";
import { useAuthStore } from "../store/auth";
import { logout } from "../api/auth";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { ThemeSwitcher } from "../components/common/ThemeSwitcher";
import type { ProjectSummary } from "../types";

function randomCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const l = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * 26)]).join("");
  const n = Array.from({ length: 3 }, () => digits[Math.floor(Math.random() * 10)]).join("");
  return `${l}-${n}`;
}

export function ProjectListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshToken, logout: storeLogout, currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "administrator";

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState(() => randomCode());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  async function handleLogout() {
    if (refreshToken) {
      try { await logout(refreshToken); } catch { /* best effort */ }
    }
    storeLogout();
    navigate("/login", { replace: true });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateError(null);
    setCreating(true);
    try {
      await createProject({ name: name.trim(), code });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setName("");
      setCode(randomCode());
      setShowForm(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setCreateError(e.response?.data?.detail ?? t("projects.failedToCreate"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={page}>
      <header style={header}>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>{t("projects.title")}</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {isAdmin && (
            <Link to="/admin/users" style={{ ...secondaryBtn, textDecoration: "none" }}>
              Admin
            </Link>
          )}
          <LanguageSwitcher />
          <ThemeSwitcher />
          <button onClick={() => { setShowForm((v) => !v); setCreateError(null); }} style={secondaryBtn}>
            {showForm ? t("projects.cancel") : t("projects.newProject")}
          </button>
          <button onClick={handleLogout} style={logoutBtn}>{t("auth.signOut")}</button>
        </div>
      </header>

      <main style={main}>
        {showForm && (
          <form onSubmit={handleCreate} style={formCard}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>{t("projects.createProject")}</h2>
            <label style={labelStyle}>
              {t("projects.projectName")}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                required
                style={inputStyle}
                disabled={creating}
              />
            </label>
            <label style={labelStyle}>
              {t("projects.code")}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="AAAA-000"
                  required
                  pattern="[A-Z]{4}-[0-9]{3}"
                  title={t("projects.codeTitle")}
                  style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.05em" }}
                  disabled={creating}
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={() => setCode(randomCode())}
                  style={secondaryBtn}
                  title="Generate a new random code"
                  disabled={creating}
                >
                  ↺
                </button>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.2rem", display: "block" }}>
                {t("projects.codeFormat")}
              </span>
            </label>
            {createError && (
              <p role="alert" style={{ color: "#c0392b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
                {createError}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="submit" disabled={creating} style={submitBtn}>
                {creating ? t("projects.creating") : t("projects.create")}
              </button>
            </div>
          </form>
        )}

        {isLoading && <p>{t("projects.loadingProjects")}</p>}
        {isError && <p style={{ color: "#c0392b" }}>{t("projects.failedToLoad")}</p>}
        {data && data.length === 0 && !showForm && (
          <p style={{ color: "#888" }}>{t("projects.noProjects")}</p>
        )}
        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {data.map((p) => (
              <ProjectPlate key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectPlate({ project: p }: { project: ProjectSummary }) {
  const { t } = useTranslation();
  const date = new Date(p.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <Link to={`/projects/${p.id}`} style={plateLink}>
      <div style={plate}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1a1a2e", flex: 1, lineHeight: 1.3 }}>
            {p.name}
          </span>
          {p.code && (
            <span style={codeBadge}>{p.code}</span>
          )}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "0.75rem" }}>
          {t("projects.createdOn", { date })}
        </div>
        <div style={countsRow}>
          <TicketBucket label={t("projects.tickets.open")} count={p.ticket_counts.open} color="#2980b9" />
          <TicketBucket label={t("projects.tickets.active")} count={p.ticket_counts.active} color="#e67e22" />
          <TicketBucket label={t("projects.tickets.done")} count={p.ticket_counts.done} color="#27ae60" />
        </div>
      </div>
    </Link>
  );
}

function TicketBucket({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={bucketBox}>
      <span style={{ fontSize: "1.25rem", fontWeight: 700, color }}>{count}</span>
      <span style={{ fontSize: "0.7rem", color: "#888", marginTop: "0.1rem" }}>{label}</span>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: "100vh", background: "#f5f5f5" };
const header: React.CSSProperties = {
  background: "#fff",
  borderBottom: "1px solid #e0e0e0",
  padding: "0.75rem 1.5rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const main: React.CSSProperties = { maxWidth: 900, margin: "0 auto", padding: "1.5rem" };
const logoutBtn: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.875rem",
};
const secondaryBtn: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: "0.875rem",
  cursor: "pointer",
};
const submitBtn: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  background: "#0066cc",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
};
const formCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: "1.25rem",
  marginBottom: "1.5rem",
};
const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  marginBottom: "0.75rem",
};
const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: "0.875rem",
};
const plateLink: React.CSSProperties = {
  textDecoration: "none",
  display: "block",
};
const plate: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: "1rem 1.1rem",
  transition: "box-shadow 0.15s",
  cursor: "pointer",
};
const codeBadge: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "0.75rem",
  fontWeight: 700,
  background: "#f0f4ff",
  color: "#3355cc",
  border: "1px solid #c5d3f5",
  borderRadius: 4,
  padding: "0.1rem 0.45rem",
  whiteSpace: "nowrap",
  marginLeft: "0.5rem",
};
const countsRow: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
};
const bucketBox: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "#f9f9f9",
  borderRadius: 6,
  padding: "0.4rem 0",
  border: "1px solid #efefef",
};
