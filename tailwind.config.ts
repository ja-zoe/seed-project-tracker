import type { Config } from "tailwindcss";

/**
 * Tailwind is used for layout/spacing utilities only. The visual design system
 * (forest + glassmorphism) lives in `src/app/globals.css` as CSS custom
 * properties and component classes, per the design-system guidance that tokens
 * are agnostic and must be mapped by us — not assumed to be Tailwind classes.
 *
 * The color tokens below are bridged to the CSS variables so we can use
 * utilities like `text-heading` or `bg-surface` where convenient.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media", // design system: dark mode is automatic via prefers-color-scheme
  theme: {
    extend: {
      colors: {
        // Surfaces / text — bridged to CSS custom properties (see globals.css)
        heading: "var(--text-heading)",
        body: "var(--text-body)",
        "body-subtle": "var(--text-body-subtle)",
        brand: "var(--brand)",
        "brand-strong": "var(--brand-strong)",
        surface: "var(--surface)",
        // Project-health status colors (earthy, not traffic-light)
        "on-track": "var(--status-on-track)",
        "at-risk": "var(--status-at-risk)",
        behind: "var(--status-behind)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        glass: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
