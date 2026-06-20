/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: "#0b1220",
          panel: "#111827",
          card: "#1a2332",
          border: "#2a3548",
          accent: "#ef4444",
          accentSoft: "#7f1d1d",
          teal: "#14b8a6",
          amber: "#f59e0b",
          text: "#e5e7eb",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
