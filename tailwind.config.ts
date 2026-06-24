import type { Config } from "tailwindcss";

/**
 * Tailwind provides layout/spacing utilities only. The visual design system
 * (the "Eco-Tech Dashboard" language) lives in `src/app/globals.css` as CSS
 * custom properties + component classes. The bridges below let us reference a
 * few core tokens from utilities when convenient.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--text)",
        "ink-soft": "var(--text-soft)",
        sage: "var(--primary)",
        olive: "var(--accent)",
        surface: "var(--surface)",
        card: "var(--card)",
        "on-track": "var(--on-track)",
        "at-risk": "var(--at-risk)",
        behind: "var(--behind)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-gloock)", "Georgia", "serif"],
        mono: ["var(--font-mono-jb)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "32px",
        control: "30px",
      },
    },
  },
  plugins: [],
};

export default config;
