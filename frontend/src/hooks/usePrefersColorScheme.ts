import { useEffect, useState } from "react";

export type ColorScheme = "light" | "dark";

function getSystemScheme(): ColorScheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function usePrefersColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(getSystemScheme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setScheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return scheme;
}
