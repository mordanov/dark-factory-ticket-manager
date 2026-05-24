import { useState, useEffect } from "react";

export type ThemeKey = "light" | "dark" | "solarized" | "oceanic" | "high-contrast" | "warm";

const STORAGE_KEY = "theme";
const DEFAULT_THEME: ThemeKey = "light";

function applyTheme(theme: ThemeKey) {
  document.documentElement.dataset.theme = theme;
}

const VALID_THEMES: ThemeKey[] = ["light", "dark", "solarized", "oceanic", "high-contrast", "warm"];

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.includes(stored as ThemeKey) ? (stored as ThemeKey) : DEFAULT_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(key: ThemeKey) {
    localStorage.setItem(STORAGE_KEY, key);
    setThemeState(key);
  }

  return { theme, setTheme };
}
