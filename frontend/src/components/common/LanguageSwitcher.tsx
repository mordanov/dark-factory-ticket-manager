import { useTranslation } from "react-i18next";

const LANGS = ["en", "ru", "es"] as const;
type Lang = (typeof LANGS)[number];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.language as Lang;

  function handleChange(lang: Lang) {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  }

  return (
    <div style={container} role="group" aria-label={t("language.label")}>
      {LANGS.map((lang) => (
        <button
          key={lang}
          onClick={() => handleChange(lang)}
          style={{ ...btn, ...(current === lang ? btnActive : {}) }}
          aria-pressed={current === lang}
        >
          {t(`language.${lang}`)}
        </button>
      ))}
    </div>
  );
}

const container: React.CSSProperties = {
  display: "flex",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  overflow: "hidden",
};

const btn: React.CSSProperties = {
  padding: "0.3rem 0.6rem",
  background: "var(--color-surface)",
  border: "none",
  borderRight: "1px solid var(--color-border)",
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "var(--color-text-secondary)",
};

const btnActive: React.CSSProperties = {
  background: "var(--color-bg)",
  color: "var(--color-accent)",
  fontWeight: 700,
};
