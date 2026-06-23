import { ColorScheme } from "../theme/theme";
import { useTheme } from "../theme/ThemeProvider";

export type { ColorScheme };

/** Resolved light/dark scheme (respects system/light/dark user preference). */
export function usePrefersColorScheme(): ColorScheme {
  return useTheme().resolvedScheme;
}
