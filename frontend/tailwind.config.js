/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: "#060a10",
          surface: "#0c1219",
          elevated: "#111a24",
          card: "#141f2b",
          border: "rgba(148, 163, 184, 0.12)",
          "border-strong": "rgba(148, 163, 184, 0.22)",
          text: "#f0f4f8",
          muted: "#8fa3b8",
          subtle: "#5c708a",
          crisis: "#ef5a5a",
          "crisis-soft": "rgba(239, 90, 90, 0.12)",
          verified: "#3ecf8e",
          "verified-soft": "rgba(62, 207, 142, 0.12)",
          caution: "#f5b942",
          "caution-soft": "rgba(245, 185, 66, 0.12)",
          info: "#4db5ff",
          "info-soft": "rgba(77, 181, 255, 0.12)",
        },
      },
      fontFamily: {
        sans: ["\"Plus Jakarta Sans\"", "system-ui", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "ui-monospace", "monospace"],
        display: ["\"Plus Jakarta Sans\"", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(148,163,184,0.08), 0 8px 32px rgba(0,0,0,0.35)",
        glow: "0 0 24px rgba(62, 207, 142, 0.15)",
        "glow-crisis": "0 0 24px rgba(239, 90, 90, 0.12)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)",
        "gradient-radial-top": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(239,90,90,0.15), transparent)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      animation: {
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
    },
  },
  plugins: [],
};
