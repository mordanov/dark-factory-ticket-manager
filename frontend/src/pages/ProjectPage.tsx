import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProjectTicketList } from "../components/projects/ProjectTicketList";
import { KanbanBoard } from "../components/projects/KanbanBoard";
import { TicketForm, type TicketFormValues } from "../components/tickets/TicketForm";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { ThemeSwitcher } from "../components/common/ThemeSwitcher";
import { createTicket } from "../api/tickets";
import { listProjects } from "../api/projects";

type View = "list" | "board";

export function ProjectPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get("view") as View) ?? "list";

  function setView(newView: View) {
    setSearchParams({ view: newView }, { replace: true });
  }

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const project = projects?.find((p) => p.id === projectId);

  async function handleCreate(values: TicketFormValues) {
    await createTicket(projectId!, {
      title: values.title,
      description: values.description,
      ticket_type: values.ticket_type,
      ticket_spec: values.ticket_spec!,
      urgent: values.urgent,
      blocker: values.blocker,
      bugfix: values.bugfix,
      tags: values.tags,
    });
    await queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
    setShowCreate(false);
  }

  if (!projectId) return null;

  return (
    <div style={page}>
      <header style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link to="/projects" style={{ color: "var(--color-accent)", fontSize: "0.875rem" }}>
            {t("nav.backToProjects")}
          </Link>
          <span style={{ color: "var(--color-border)" }}>/</span>
          <h1 style={{ margin: 0, fontSize: "1.1rem" }}>
            {project?.name ?? "Project"}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <LanguageSwitcher />
          <ThemeSwitcher />
          <div style={viewToggle}>
            <button
              onClick={() => setView("list")}
              style={{ ...viewBtn, ...(view === "list" ? viewBtnActive : {}) }}
            >
              {t("tickets.view.list")}
            </button>
            <button
              onClick={() => setView("board")}
              style={{ ...viewBtn, ...(view === "board" ? viewBtnActive : {}) }}
            >
              {t("tickets.view.board")}
            </button>
          </div>
          <button onClick={() => setShowCreate((v) => !v)} style={createBtn}>
            {showCreate ? t("tickets.form.cancel") : t("tickets.newTicket")}
          </button>
        </div>
      </header>

      <main style={view === "board" ? mainBoard : main}>
        {showCreate && (
          <div style={formCard}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>{t("tickets.createTicket")}</h2>
            <TicketForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              submitLabel={t("tickets.form.createTicket")}
            />
          </div>
        )}
        {view === "list" ? (
          <ProjectTicketList projectId={projectId} />
        ) : (
          <KanbanBoard projectId={projectId} />
        )}
      </main>
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
const mainBoard: React.CSSProperties = { padding: "1.5rem" };
const formCard: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  padding: "1.25rem",
  marginBottom: "1.25rem",
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
const viewToggle: React.CSSProperties = {
  display: "flex",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  overflow: "hidden",
};
const viewBtn: React.CSSProperties = {
  padding: "0.3rem 0.75rem",
  background: "var(--color-surface)",
  border: "none",
  borderRight: "1px solid var(--color-border)",
  cursor: "pointer",
  fontSize: "0.8rem",
  color: "var(--color-text-secondary)",
};
const viewBtnActive: React.CSSProperties = {
  background: "var(--color-accent-subtle)",
  color: "var(--color-accent)",
  fontWeight: 600,
};
