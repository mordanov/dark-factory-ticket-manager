import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTicket,
  listProgress,
  listTicketEvents,
  submitProgress,
  deleteTicket,
  updateTicket,
  createFollowUp,
} from "../api/tickets";
import { AssigneeProgressList } from "../components/tickets/AssigneeProgressList";
import { StatusTransitionButton } from "../components/tickets/StatusTransitionButton";
import { TicketEventHistory } from "../components/tickets/TicketEventHistory";
import { TicketForm } from "../components/tickets/TicketForm";
import { TICKET_STATUS_LABELS } from "../types";
import type { TicketResponse } from "../types";
import { useAuthStore } from "../store/auth";

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [isEditing, setIsEditing] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [progressInput, setProgressInput] = useState("");
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicket(ticketId!),
    enabled: !!ticketId,
  });

  const { data: progressData } = useQuery({
    queryKey: ["ticket-progress", ticketId],
    queryFn: () => listProgress(ticketId!),
    enabled: !!ticketId,
  });

  const { data: eventsData } = useQuery({
    queryKey: ["ticket-events", ticketId],
    queryFn: () => listTicketEvents(ticketId!),
    enabled: !!ticketId,
  });

  function handleTransitioned(updated: TicketResponse) {
    queryClient.setQueryData(["ticket", ticketId], updated);
    queryClient.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
  }

  async function handleEdit(values: { title: string; description: string | null }) {
    const updated = await updateTicket(ticketId!, values);
    queryClient.setQueryData(["ticket", ticketId], updated);
    queryClient.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this ticket? This cannot be undone.")) return;
    setDeleteError(null);
    try {
      await deleteTicket(ticketId!);
      navigate(ticket ? `/projects/${ticket.project_id}` : "/projects", { replace: true });
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const e = err as { response: { status: number; data?: { detail?: string } } };
        if (e.response.status === 409) {
          setDeleteError("Cannot delete: this ticket has active follow-up tickets.");
          return;
        }
      }
      setDeleteError("Failed to delete ticket.");
    }
  }

  async function handleSubmitProgress() {
    if (!progressInput.trim()) {
      setProgressError("Progress content is required.");
      return;
    }
    setProgressError(null);
    setProgressLoading(true);
    try {
      await submitProgress(ticketId!, progressInput.trim());
      await queryClient.invalidateQueries({ queryKey: ["ticket-progress", ticketId] });
      await queryClient.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
      setProgressInput("");
    } catch {
      setProgressError("Failed to submit progress update.");
    } finally {
      setProgressLoading(false);
    }
  }

  async function handleCreateFollowUp(values: { title: string; description: string | null }) {
    const created = await createFollowUp(ticketId!, values);
    setShowFollowUpForm(false);
    navigate(`/tickets/${created.id}`);
  }

  if (!ticketId) return null;
  if (isLoading) return <div style={page}><p>Loading…</p></div>;
  if (isError || !ticket) return <div style={page}><p style={{ color: "#c0392b" }}>Ticket not found.</p></div>;

  const isCreator = currentUser?.id === ticket.created_by.id;
  const isAssignee = ticket.assignees.some((a) => a.user_id === currentUser?.id);

  return (
    <div style={page}>
      <header style={header}>
        <Link to={`/projects/${ticket.project_id}`} style={{ color: "#0066cc", fontSize: "0.875rem" }}>
          ← Back to project
        </Link>
      </header>

      <main style={main}>
        {/* Ticket header */}
        <div style={section}>
          {isEditing ? (
            <>
              <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Edit Ticket</h2>
              <TicketForm
                initialValues={{ title: ticket.title, description: ticket.description }}
                onSubmit={handleEdit}
                onCancel={() => setIsEditing(false)}
                submitLabel="Save Changes"
              />
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <h1 style={{ margin: 0, fontSize: "1.25rem", flex: 1 }}>{ticket.title}</h1>
                <span style={{ ...statusBadge, background: statusColor(ticket.status) }}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </div>
              {ticket.description && (
                <p style={{ marginTop: "0.75rem", color: "#444", lineHeight: 1.5 }}>
                  {ticket.description}
                </p>
              )}
              <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#888" }}>
                Created by {ticket.created_by.email}
              </div>
              {ticket.parent_ticket_id && (
                <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.25rem" }}>
                  Follow-up of{" "}
                  <Link to={`/tickets/${ticket.parent_ticket_id}`} style={{ color: "#0066cc" }}>
                    parent ticket
                  </Link>
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                {isCreator && (
                  <>
                    <button onClick={() => setIsEditing(true)} style={secondaryBtn}>Edit</button>
                    <button onClick={handleDelete} style={dangerBtn}>Delete</button>
                  </>
                )}
                <button onClick={() => setShowFollowUpForm((v) => !v)} style={secondaryBtn}>
                  {showFollowUpForm ? "Cancel Follow-up" : "+ Follow-up"}
                </button>
              </div>
              {deleteError && <p role="alert" style={{ color: "#c0392b", fontSize: "0.875rem", marginTop: "0.5rem" }}>{deleteError}</p>}
            </>
          )}
        </div>

        {/* Follow-up form */}
        {showFollowUpForm && (
          <div style={section}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Create Follow-up Ticket</h2>
            <TicketForm
              onSubmit={handleCreateFollowUp}
              onCancel={() => setShowFollowUpForm(false)}
              submitLabel="Create Follow-up"
            />
          </div>
        )}

        {/* Assignees and progress */}
        <div style={section}>
          <h2 style={sectionTitle}>Assignees & Progress</h2>
          <AssigneeProgressList
            assignees={ticket.assignees}
            progressItems={progressData?.items ?? []}
          />
          {isAssignee && (
            <div style={{ marginTop: "1rem" }}>
              <label htmlFor="progress-input" style={{ display: "block", fontWeight: 500, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                Submit your progress update
              </label>
              <textarea
                id="progress-input"
                value={progressInput}
                onChange={(e) => setProgressInput(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4, fontSize: "0.875rem", resize: "vertical" }}
                disabled={progressLoading}
                placeholder="Describe your progress…"
              />
              {progressError && <p role="alert" style={{ color: "#c0392b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{progressError}</p>}
              <button onClick={handleSubmitProgress} disabled={progressLoading} style={{ ...submitBtn, marginTop: "0.5rem" }}>
                {progressLoading ? "Submitting…" : "Submit Progress"}
              </button>
            </div>
          )}
        </div>

        {/* Status transitions */}
        <div style={section}>
          <h2 style={sectionTitle}>Status Transition</h2>
          <StatusTransitionButton ticket={ticket} onTransitioned={handleTransitioned} />
        </div>

        {/* Activity history */}
        <div style={section}>
          <h2 style={sectionTitle}>Activity History</h2>
          <TicketEventHistory events={eventsData?.items ?? []} />
        </div>
      </main>
    </div>
  );
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    OPEN: "#2980b9", IN_PROGRESS: "#e67e22", IN_REVIEW: "#8e44ad", DONE: "#27ae60", CLOSED: "#7f8c8d",
  };
  return map[status] ?? "#7f8c8d";
}

const page: React.CSSProperties = { minHeight: "100vh", background: "#f5f5f5" };
const header: React.CSSProperties = {
  background: "#fff",
  borderBottom: "1px solid #e0e0e0",
  padding: "0.75rem 1.5rem",
};
const main: React.CSSProperties = { maxWidth: 800, margin: "0 auto", padding: "1.5rem" };
const section: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 6,
  padding: "1.25rem",
  marginBottom: "1rem",
};
const sectionTitle: React.CSSProperties = { margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 };
const statusBadge: React.CSSProperties = {
  padding: "0.2rem 0.75rem",
  borderRadius: 12,
  color: "#fff",
  fontSize: "0.8rem",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const secondaryBtn: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: "0.875rem",
  cursor: "pointer",
};
const dangerBtn: React.CSSProperties = {
  ...secondaryBtn,
  color: "#c0392b",
  borderColor: "#c0392b",
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
