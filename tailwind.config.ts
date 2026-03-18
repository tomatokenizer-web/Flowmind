import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          surface: "var(--bg-surface)",
          hover: "var(--bg-hover)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          focus: "var(--border-focus)",
        },
        accent: {
          primary: "var(--accent-primary)",
          success: "var(--accent-success)",
          warning: "var(--accent-warning)",
          error: "var(--accent-error)",
        },
        // Unit type colors
        unit: {
          claim: {
            bg: "#E8F0FE",
            accent: "#1A56DB",
          },
          question: {
            bg: "#FEF3C7",
            accent: "#92400E",
          },
          evidence: {
            bg: "#ECFDF5",
            accent: "#065F46",
          },
          counterargument: {
            bg: "#FEF2F2",
            accent: "#991B1B",
          },
          observation: {
            bg: "#F5F3FF",
            accent: "#4C1D95",
          },
          idea: {
            bg: "#FFF7ED",
            accent: "#9A3412",
          },
        },
      },
      fontFamily: {
        primary: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "sans-serif",
        ],
        heading: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Inter",
          "sans-serif",
        ],
        mono: ["SF Mono", "JetBrains Mono", "Fira Code", "monospace"],
      },
      spacing: {
        "space-1": "4px",
        "space-2": "8px",
        "space-3": "12px",
        "space-4": "16px",
        "space-5": "20px",
        "space-6": "24px",
        "space-8": "32px",
        "space-10": "40px",
        "space-12": "48px",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        resting: "0 1px 3px rgba(0,0,0,0.08)",
        hover: "0 4px 12px rgba(0,0,0,0.12)",
        active: "0 0 0 2px var(--accent-primary)",
        modal: "0 20px 60px rgba(0,0,0,0.15)",
      },
      transitionDuration: {
        instant: "100ms",
        fast: "150ms",
        normal: "250ms",
        slow: "300ms",
        view: "300ms",
      },
      transitionTimingFunction: {
        default: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
