import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProjectTicketList } from "../components/projects/ProjectTicketList";
import { TicketForm } from "../components/tickets/TicketForm";
import { createTicket } from "../api/tickets";
import { listProjects } from "../api/projects";

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const project = projects?.find((p) => p.id === projectId);

  async function handleCreate(values: { title: string; description: string | null }) {
    await createTicket(projectId!, values);
    await queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
    setShowCreate(false);
  }

  if (!projectId) return null;

  return (
    <div style={page}>
      <header style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link to="/projects" style={{ color: "#0066cc", fontSize: "0.875rem" }}>
            ← Projects
          </Link>
          <span style={{ color: "#ccc" }}>/</span>
          <h1 style={{ margin: 0, fontSize: "1.1rem" }}>
            {project?.name ?? "Project"}
          </h1>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} style={createBtn}>
          {showCreate ? "Cancel" : "+ New Ticket"}
        </button>
      </header>

      <main style={main}>
        {showCreate && (
          <div style={formCard}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Create Ticket</h2>
            <TicketForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              submitLabel="Create Ticket"
            />
          </div>
        )}
        <ProjectTicketList projectId={projectId} />
      </main>
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
const formCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 6,
  padding: "1.25rem",
  marginBottom: "1.25rem",
};
const createBtn: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  background: "#0066cc",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
};
