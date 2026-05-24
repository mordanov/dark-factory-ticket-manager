import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { searchTags } from "../../api/tickets";
import type { TagResponse } from "../../types";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagInput({ value, onChange, disabled }: TagInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<TagResponse[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (input.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchTags(input);
        setSuggestions(results.filter((tg) => !value.includes(tg.name)));
        setShowDropdown(true);
      } catch {
        // ignore search errors
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [input, value]);

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= 10) return;
    onChange([...value, trimmed]);
    setInput("");
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function removeTag(name: string) {
    onChange(value.filter((tg) => tg !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem" }}>
          {value.map((tag) => (
            <span key={tag} style={pill}>
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  style={pillRemove}
                  title={t("tickets.tagInput.remove", { tag })}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && value.length < 10 && (
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={t("tickets.tagInput.placeholder")}
            style={tagInputStyle}
          />
          {showDropdown && suggestions.length > 0 && (
            <ul style={dropdown}>
              {suggestions.map((tg) => (
                <li key={tg.id} onMouseDown={() => addTag(tg.name)} style={dropdownItem}>
                  {tg.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {value.length >= 10 && (
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{t("tickets.tagInput.maxReached")}</span>
      )}
    </div>
  );
}

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.2rem",
  background: "var(--color-accent-subtle)",
  color: "var(--color-accent)",
  borderRadius: 12,
  padding: "0.15rem 0.5rem 0.15rem 0.6rem",
  fontSize: "0.78rem",
  fontWeight: 500,
};
const pillRemove: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--color-accent)",
  fontSize: "1rem",
  padding: 0,
  lineHeight: 1,
  marginLeft: "0.1rem",
};
const tagInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  fontSize: "0.875rem",
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
};
const dropdown: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  listStyle: "none",
  margin: 0,
  padding: 0,
  zIndex: 200,
  maxHeight: 200,
  overflowY: "auto",
};
const dropdownItem: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  cursor: "pointer",
  fontSize: "0.875rem",
};
