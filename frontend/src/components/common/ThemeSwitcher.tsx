import { useTranslation } from "react-i18next";
import { useTheme, type ThemeKey } from "../../hooks/useTheme";

const THEMES: { key: ThemeKey; swatch: string }[] = [
  { key: "light", swatch: "#ffffff" },
  { key: "dark", swatch: "#1a1a2e" },
  { key: "solarized", swatch: "#fdf6e3" },
  { key: "oceanic", swatch: "#1b2b34" },
  { key: "high-contrast", swatch: "#000000" },
  { key: "warm", swatch: "#faf0e6" },
];

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div style={container} role="group" aria-label={t("theme.label")}>
      {THEMES.map(({ key, swatch }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={t(`theme.themes.${key}`)}
          aria-pressed={theme === key}
          style={{
            ...swatchBtn,
            background: swatch,
            outline: theme === key ? "2px solid var(--color-accent)" : "2px solid transparent",
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  );
}

const container: React.CSSProperties = {
  display: "flex",
  gap: "0.25rem",
  alignItems: "center",
};

const swatchBtn: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  border: "1px solid var(--color-border)",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};
