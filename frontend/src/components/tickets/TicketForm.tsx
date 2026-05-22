import { useState, type FormEvent } from "react";
import type { TicketResponse } from "../../types";

interface TicketFormProps {
  initialValues?: { title: string; description?: string | null };
  onSubmit: (values: { title: string; description: string | null }) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function TicketForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: TicketFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (title.trim().length > 500) {
      setError("Title must be 500 characters or fewer.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
      });
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={field}>
        <label htmlFor="ticket-title" style={label}>
          Title <span aria-hidden="true" style={{ color: "#c0392b" }}>*</span>
        </label>
        <input
          id="ticket-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={input}
          disabled={loading}
          maxLength={500}
          aria-required="true"
        />
      </div>
      <div style={field}>
        <label htmlFor="ticket-description" style={label}>Description</label>
        <textarea
          id="ticket-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{ ...input, resize: "vertical" }}
          disabled={loading}
        />
      </div>
      {error && (
        <p role="alert" style={{ color: "#c0392b", fontSize: "0.875rem", margin: "0 0 0.75rem" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={submitBtn} disabled={loading}>
          {loading ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={cancelBtn} disabled={loading}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const e = err as { response: { data?: { detail?: string } } };
    if (e.response.data?.detail) return e.response.data.detail;
  }
  return "An unexpected error occurred.";
}

const field: React.CSSProperties = { marginBottom: "1rem" };
const label: React.CSSProperties = {
  display: "block",
  marginBottom: "0.25rem",
  fontWeight: 500,
  fontSize: "0.875rem",
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: "1rem",
};
const submitBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: "#0066cc",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  cursor: "pointer",
};
const cancelBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: "#eee",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: 4,
  cursor: "pointer",
};

// Suppress unused import warning — TicketResponse used by consumers
export type { TicketResponse };
