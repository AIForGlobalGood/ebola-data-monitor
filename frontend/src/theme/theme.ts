export type ThemeMode = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

export const THEME_STORAGE_KEY = "esv-theme";

const VALID_MODES: ThemeMode[] = ["system", "light", "dark"];

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value != null && VALID_MODES.includes(value as ThemeMode);
}

export function getSystemColorScheme(): ColorScheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveColorScheme(mode: ThemeMode): ColorScheme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return getSystemColorScheme();
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = resolveColorScheme(mode);
}

export function persistThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore quota / private browsing
  }
}
