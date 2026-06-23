import { Monitor, Moon, Sun } from "lucide-react";
import { ThemeMode } from "../theme/theme";
import { useTheme } from "../theme/ThemeProvider";

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

type ThemeSwitcherProps = {
  fullWidth?: boolean;
  className?: string;
};

export function ThemeSwitcher({ fullWidth = false, className = "" }: ThemeSwitcherProps) {
  const { mode, setMode } = useTheme();

  return (
    <div
      className={`${fullWidth ? "flex w-full" : "inline-flex"} rounded-xl border border-hub-border bg-hub-surface/80 p-0.5 shadow-panel backdrop-blur-sm ${className}`}
      role="radiogroup"
      aria-label="Color theme"
    >
      {MODES.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setMode(id)}
            className={`relative inline-flex flex-1 items-center justify-center rounded-[10px] p-2 transition ${
              active
                ? "bg-hub-card text-hub-text shadow-sm ring-1 ring-hub-border/60"
                : "text-hub-muted hover:bg-hub-card/50 hover:text-hub-text"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
