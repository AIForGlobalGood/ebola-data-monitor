import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  applyThemeMode,
  ColorScheme,
  persistThemeMode,
  readStoredThemeMode,
  resolveColorScheme,
  ThemeMode,
} from "./theme";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedScheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredThemeMode());
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  const resolvedScheme = useMemo(() => resolveColorScheme(mode), [mode, systemScheme]);

  useEffect(() => {
    applyThemeMode(mode);
    persistThemeMode(mode);
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setSystemScheme(mq.matches ? "dark" : "light");
      if (mode === "system") applyThemeMode("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = (next: ThemeMode) => setModeState(next);

  const value = useMemo(
    () => ({
      mode,
      resolvedScheme,
      setMode,
    }),
    [mode, resolvedScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
