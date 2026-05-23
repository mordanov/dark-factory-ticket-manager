import { useState, type FormEvent } from "react";
import { TagInput } from "./TagInput";
import type { TicketType, TicketSpec } from "../../types";
import { TICKET_TYPE_LABELS, TICKET_SPEC_LABELS } from "../../types";

export interface TicketFormValues {
  title: string;
  description: string | null;
  ticket_type: TicketType;
  ticket_spec: TicketSpec | null;
  urgent: boolean;
  blocker: boolean;
  bugfix: boolean;
  tags: string[];
}

interface TicketFormProps {
  initialValues?: Partial<TicketFormValues>;
  onSubmit: (values: TicketFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  showTags?: boolean;
}

const TICKET_TYPES: TicketType[] = [
  "feature", "bug", "improvement", "investigation",
  "discovery", "reporting", "testing", "analysis", "other",
];

const TICKET_SPECS: TicketSpec[] = [
  "backend", "frontend", "architecture", "testing",
  "business_analysis", "product_management", "other",
];

export function TicketForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  showTags = true,
}: TicketFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [ticketType, setTicketType] = useState<TicketType>(initialValues?.ticket_type ?? "feature");
  const [ticketSpec, setTicketSpec] = useState<TicketSpec | "">(initialValues?.ticket_spec ?? "");
  const [urgent, setUrgent] = useState(initialValues?.urgent ?? false);
  const [blocker, setBlocker] = useState(initialValues?.blocker ?? false);
  const [bugfix, setBugfix] = useState(initialValues?.bugfix ?? false);
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (!ticketSpec) { setError("Specification is required."); return; }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        ticket_type: ticketType,
        ticket_spec: ticketSpec as TicketSpec,
        urgent,
        blocker,
        bugfix,
        tags,
      });
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Title */}
      <div style={field}>
        <label htmlFor="ticket-title" style={label}>
          Title <span style={{ color: "#c0392b" }}>*</span>
        </label>
        <input
          id="ticket-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={input}
          disabled={loading}
          maxLength={500}
        />
      </div>

      {/* Description */}
      <div style={field}>
        <label htmlFor="ticket-description" style={label}>Description</label>
        <textarea
          id="ticket-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ ...input, resize: "vertical" }}
          disabled={loading}
        />
      </div>

      {/* Type + Spec side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <label htmlFor="ticket-type" style={label}>Type</label>
          <select
            id="ticket-type"
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value as TicketType)}
            style={select}
            disabled={loading}
          >
            {TICKET_TYPES.map((t) => (
              <option key={t} value={t}>{TICKET_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ticket-spec" style={label}>
            Specification <span style={{ color: "#c0392b" }}>*</span>
          </label>
          <select
            id="ticket-spec"
            value={ticketSpec}
            onChange={(e) => setTicketSpec(e.target.value as TicketSpec | "")}
            style={{ ...select, ...(ticketSpec === "" ? { color: "#999" } : {}) }}
            disabled={loading}
          >
            <option value="">— select —</option>
            {TICKET_SPECS.map((s) => (
              <option key={s} value={s}>{TICKET_SPEC_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Flags */}
      <div style={{ marginBottom: "1rem" }}>
        <span style={label}>Flags</span>
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.3rem" }}>
          {([
            ["urgent", urgent, setUrgent, "#e74c3c"],
            ["blocker", blocker, setBlocker, "#c0392b"],
            ["bugfix", bugfix, setBugfix, "#8e44ad"],
          ] as [string, boolean, (v: boolean) => void, string][]).map(([name, val, setter, color]) => (
            <label key={name} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.875rem" }}>
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => setter(e.target.checked)}
                disabled={loading}
                style={{ accentColor: color, width: 15, height: 15 }}
              />
              <span style={{ fontWeight: val ? 600 : 400, color: val ? color : "#555", textTransform: "capitalize" }}>
                {name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      {showTags && (
        <div style={field}>
          <label style={label}>Tags <span style={{ fontWeight: 400, color: "#888" }}>(optional, up to 10)</span></label>
          <TagInput value={tags} onChange={setTags} disabled={loading} />
        </div>
      )}

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
  fontSize: "0.875rem",
  boxSizing: "border-box",
};
const select: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: "0.875rem",
  background: "#fff",
  boxSizing: "border-box",
};
const submitBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: "#0066cc",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
const cancelBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: "#eee",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "0.875rem",
};
