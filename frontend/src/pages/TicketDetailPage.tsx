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
  assignUser,
  unassignUser,
  addTag,
  removeTag,
} from "../api/tickets";
import { listUsers } from "../api/users";
import { AssigneeProgressList } from "../components/tickets/AssigneeProgressList";
import { StatusTransitionButton } from "../components/tickets/StatusTransitionButton";
import { TicketEventHistory } from "../components/tickets/TicketEventHistory";
import { TicketForm, type TicketFormValues } from "../components/tickets/TicketForm";
import { TagInput } from "../components/tickets/TagInput";
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, TICKET_SPEC_LABELS } from "../types";
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
  const [assignError, setAssignError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [pendingTags, setPendingTags] = useState<string[] | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

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

  async function handleEdit(values: TicketFormValues) {
    const updated = await updateTicket(ticketId!, {
      title: values.title,
      description: values.description,
      ticket_type: values.ticket_type,
      ticket_spec: values.ticket_spec ?? undefined,
      urgent: values.urgent,
      blocker: values.blocker,
      bugfix: values.bugfix,
    });
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
    if (!progressInput.trim()) { setProgressError("Progress content is required."); return; }
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

  async function handleCreateFollowUp(values: TicketFormValues) {
    const created = await createFollowUp(ticketId!, {
      title: values.title,
      description: values.description,
      ticket_type: values.ticket_type,
      ticket_spec: values.ticket_spec!,
      urgent: values.urgent,
      blocker: values.blocker,
      bugfix: values.bugfix,
      tags: values.tags,
    });
    setShowFollowUpForm(false);
    navigate(`/tickets/${created.id}`);
  }

  async function handleAssignMe() {
    setAssignError(null);
    try {
      await assignUser(ticketId!, currentUser!.id);
      await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setAssignError(e.response?.data?.detail ?? "Failed to assign.");
    }
  }

  async function handleUnassign(userId: string) {
    setAssignError(null);
    try {
      await unassignUser(ticketId!, userId);
      await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    } catch {
      setAssignError("Failed to remove assignee.");
    }
  }

  async function handleAssignUser() {
    if (!selectedUserId) return;
    setAssignError(null);
    try {
      await assignUser(ticketId!, selectedUserId);
      await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setShowAssignModal(false);
      setSelectedUserId("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setAssignError(e.response?.data?.detail ?? "Failed to assign user.");
    }
  }

  async function handleTagChange(newTags: string[]) {
    if (!ticket) return;
    setTagError(null);
    const currentNames = ticket.tags.map((t) => t.name);
    const added = newTags.filter((n) => !currentNames.includes(n));
    const removed = currentNames.filter((n) => !newTags.includes(n));

    try {
      let updated = ticket;
      for (const name of added) {
        updated = await addTag(ticketId!, name);
      }
      for (const name of removed) {
        updated = await removeTag(ticketId!, name);
      }
      queryClient.setQueryData(["ticket", ticketId], updated);
      setPendingTags(null);
    } catch {
      setTagError("Failed to update tags.");
    }
  }

  if (!ticketId) return null;
  if (isLoading) return <div style={page}><p>Loading…</p></div>;
  if (isError || !ticket) return <div style={page}><p style={{ color: "#c0392b" }}>Ticket not found.</p></div>;

  const isCreator = currentUser?.id === ticket.created_by.id;
  const isAssignee = ticket.assignees.some((a) => a.user_id === currentUser?.id);
  const isAdmin = currentUser?.role === "administrator";
  const alreadyAssigned = ticket.assignees.some((a) => a.user_id === currentUser?.id);
  const currentTagNames = (pendingTags ?? ticket.tags.map((t) => t.name));

  const activeFlags = [
    ticket.urgent && { label: "URGENT", color: "#e74c3c", bg: "#fdecea" },
    ticket.blocker && { label: "BLOCKER", color: "#c0392b", bg: "#fce8e8" },
    ticket.bugfix && { label: "BUGFIX", color: "#8e44ad", bg: "#f3e8fd" },
  ].filter(Boolean) as { label: string; color: string; bg: string }[];

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
                initialValues={{
                  title: ticket.title,
                  description: ticket.description,
                  ticket_type: ticket.ticket_type,
                  ticket_spec: ticket.ticket_spec ?? undefined,
                  urgent: ticket.urgent,
                  blocker: ticket.blocker,
                  bugfix: ticket.bugfix,
                }}
                showTags={false}
                onSubmit={handleEdit}
                onCancel={() => setIsEditing(false)}
                submitLabel="Save Changes"
              />
            </>
          ) : (
            <>
              {/* Title row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  {ticket.display_id && (
                    <div style={{ fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 700, color: "#3355cc", marginBottom: "0.3rem" }}>
                      {ticket.display_id}
                    </div>
                  )}
                  <h1 style={{ margin: 0, fontSize: "1.25rem" }}>{ticket.title}</h1>
                </div>
                <span style={{ ...statusBadge, background: statusColor(ticket.status) }}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </div>

              {/* Type + Spec */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <span style={metaChip}>{TICKET_TYPE_LABELS[ticket.ticket_type]}</span>
                {ticket.ticket_spec && (
                  <span style={{ ...metaChip, color: "#2c7a4b", background: "#eafaf1", border: "1px solid #b7e4c7" }}>
                    {TICKET_SPEC_LABELS[ticket.ticket_spec]}
                  </span>
                )}
                {activeFlags.map((f) => (
                  <span key={f.label} style={{ ...metaChip, color: f.color, background: f.bg, fontWeight: 700, border: `1px solid ${f.color}` }}>
                    {f.label}
                  </span>
                ))}
              </div>

              {ticket.description && (
                <p style={{ marginTop: "0.75rem", color: "#444", lineHeight: 1.5 }}>
                  {ticket.description}
                </p>
              )}
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#888" }}>
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

        {/* Tags */}
        <div style={section}>
          <h2 style={sectionTitle}>Tags</h2>
          <TagInput
            value={currentTagNames}
            onChange={(newTags) => {
              setPendingTags(newTags);
              handleTagChange(newTags);
            }}
          />
          {tagError && <p role="alert" style={{ color: "#c0392b", fontSize: "0.875rem", marginTop: "0.5rem" }}>{tagError}</p>}
        </div>

        {/* Assignees and progress */}
        <div style={section}>
          <h2 style={sectionTitle}>Assignees & Progress</h2>
          <AssigneeProgressList
            assignees={ticket.assignees}
            progressItems={progressData?.items ?? []}
            currentUserId={currentUser?.id}
            isAdmin={isAdmin}
            onUnassign={handleUnassign}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {!alreadyAssigned && (
              <button onClick={handleAssignMe} style={secondaryBtn}>+ Assign me</button>
            )}
            {isAdmin && (
              <button onClick={() => setShowAssignModal(true)} style={secondaryBtn}>+ Assign user</button>
            )}
          </div>
          {assignError && <p role="alert" style={{ color: "#c0392b", fontSize: "0.875rem", marginTop: "0.5rem" }}>{assignError}</p>}

          {showAssignModal && (
            <AdminAssignModal
              ticketId={ticketId}
              existingAssigneeIds={ticket.assignees.map((a) => a.user_id)}
              onAssign={handleAssignUser}
              onClose={() => { setShowAssignModal(false); setSelectedUserId(""); setAssignError(null); }}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
            />
          )}

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

// ── Admin assign-user modal ──────────────────────────────────────────────────
interface AdminAssignModalProps {
  ticketId: string;
  existingAssigneeIds: string[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  onAssign: () => void;
  onClose: () => void;
}

function AdminAssignModal({ existingAssigneeIds, selectedUserId, onSelectUser, onAssign, onClose }: AdminAssignModalProps) {
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const available = (users ?? []).filter((u) => !existingAssigneeIds.includes(u.id));

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Assign user</h3>
        {isLoading ? (
          <p style={{ color: "#888", fontSize: "0.875rem" }}>Loading users…</p>
        ) : available.length === 0 ? (
          <p style={{ color: "#888", fontSize: "0.875rem" }}>All users are already assigned.</p>
        ) : (
          <>
            <select
              value={selectedUserId}
              onChange={(e) => onSelectUser(e.target.value)}
              style={{ width: "100%", padding: "0.4rem 0.5rem", border: "1px solid #ccc", borderRadius: 4, fontSize: "0.875rem", marginBottom: "0.75rem" }}
            >
              <option value="">— select a user —</option>
              {available.map((u) => (
                <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={onClose} style={secondaryBtn}>Cancel</button>
              <button onClick={onAssign} disabled={!selectedUserId} style={submitBtn}>Assign</button>
            </div>
          </>
        )}
      </div>
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
const metaChip: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#555",
  background: "#f4f4f4",
  borderRadius: 4,
  padding: "0.15rem 0.5rem",
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
const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
const modalBox: React.CSSProperties = {
  background: "#fff",
  borderRadius: 8,
  padding: "1.5rem",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
};
