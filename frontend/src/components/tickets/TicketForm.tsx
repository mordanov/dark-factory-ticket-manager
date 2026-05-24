import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { TagInput } from "./TagInput";
import type { TicketType, TicketSpec } from "../../types";

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
  submitLabel,
  showTags = true,
}: TicketFormProps) {
  const { t } = useTranslation();
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

  const resolvedSubmitLabel = submitLabel ?? t("tickets.form.save");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError(t("tickets.form.titleRequired")); return; }
    if (!ticketSpec) { setError(t("tickets.form.specRequired")); return; }
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
      setError(extractErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  }

  const flagDefs: [string, boolean, (v: boolean) => void, string][] = [
    [t("tickets.flags.urgent"), urgent, setUrgent, "#e74c3c"],
    [t("tickets.flags.blocker"), blocker, setBlocker, "#c0392b"],
    [t("tickets.flags.bugfix"), bugfix, setBugfix, "#8e44ad"],
  ];

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Title */}
      <div style={field}>
        <label htmlFor="ticket-title" style={label}>
          {t("tickets.form.title")} <span style={{ color: "var(--color-danger)" }}>*</span>
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
        <label htmlFor="ticket-description" style={label}>{t("tickets.form.description")}</label>
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
          <label htmlFor="ticket-type" style={label}>{t("tickets.form.type")}</label>
          <select
            id="ticket-type"
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value as TicketType)}
            style={select}
            disabled={loading}
          >
            {TICKET_TYPES.map((tp) => (
              <option key={tp} value={tp}>{t(`tickets.type.${tp}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ticket-spec" style={label}>
            {t("tickets.form.spec")} <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <select
            id="ticket-spec"
            value={ticketSpec}
            onChange={(e) => setTicketSpec(e.target.value as TicketSpec | "")}
            style={{ ...select, ...(ticketSpec === "" ? { color: "var(--color-text-secondary)" } : {}) }}
            disabled={loading}
          >
            <option value="">{t("tickets.form.specPlaceholder")}</option>
            {TICKET_SPECS.map((s) => (
              <option key={s} value={s}>{t(`tickets.spec.${s}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Flags */}
      <div style={{ marginBottom: "1rem" }}>
        <span style={label}>{t("tickets.form.flags")}</span>
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.3rem" }}>
          {flagDefs.map(([name, val, setter, color]) => (
            <label key={name} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.875rem" }}>
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => setter(e.target.checked)}
                disabled={loading}
                style={{ accentColor: color, width: 15, height: 15 }}
              />
              <span style={{ fontWeight: val ? 600 : 400, color: val ? color : "var(--color-text-secondary)", textTransform: "capitalize" }}>
                {name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      {showTags && (
        <div style={field}>
          <label style={label}>
            {t("tickets.form.tags")} <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>{t("tickets.form.tagsHint")}</span>
          </label>
          <TagInput value={tags} onChange={setTags} disabled={loading} />
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem", margin: "0 0 0.75rem" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={submitBtn} disabled={loading}>
          {loading ? t("tickets.form.saving") : resolvedSubmitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={cancelBtn} disabled={loading}>
            {t("tickets.form.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

function extractErrorMessage(err: unknown, t: (key: string) => string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const e = err as { response: { data?: { detail?: string } } };
    if (e.response.data?.detail) return e.response.data.detail;
  }
  return t("tickets.form.error");
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
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  fontSize: "0.875rem",
  boxSizing: "border-box",
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
};
const select: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.6rem",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  fontSize: "0.875rem",
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
  boxSizing: "border-box",
};
const submitBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: "var(--color-accent)",
  color: "var(--color-text-inverse)",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.875rem",
};
const cancelBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: "var(--color-bg)",
  color: "var(--color-text-primary)",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "0.875rem",
};
