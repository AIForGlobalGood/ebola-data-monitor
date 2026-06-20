/** @type {import('tailwindcss').Config} */

const hub = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: hub("hub-bg"),
          surface: hub("hub-surface"),
          elevated: hub("hub-elevated"),
          card: hub("hub-card"),
          border: "rgb(var(--hub-border) / 0.12)",
          "border-strong": "rgb(var(--hub-border) / 0.22)",
          text: hub("hub-text"),
          muted: hub("hub-muted"),
          subtle: hub("hub-subtle"),
          crisis: hub("hub-crisis"),
          "crisis-soft": "var(--hub-crisis-soft)",
          verified: hub("hub-verified"),
          "verified-soft": "var(--hub-verified-soft)",
          caution: hub("hub-caution"),
          "caution-soft": "var(--hub-caution-soft)",
          info: hub("hub-info"),
          "info-soft": "var(--hub-info-soft)",
          high: hub("hub-high"),
          "high-soft": "var(--hub-high-soft)",
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
        panel: "var(--shadow-panel)",
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
