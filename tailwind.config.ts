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
        semantic: {
          success: "var(--success)",
          warning: "var(--warning)",
          error: "var(--error)",
          info: "var(--info)",
        },
        unit: {
          claim: {
            bg: "var(--unit-claim-bg)",
            accent: "var(--unit-claim-accent)",
          },
          question: {
            bg: "var(--unit-question-bg)",
            accent: "var(--unit-question-accent)",
          },
          evidence: {
            bg: "var(--unit-evidence-bg)",
            accent: "var(--unit-evidence-accent)",
          },
          counterargument: {
            bg: "var(--unit-counterargument-bg)",
            accent: "var(--unit-counterargument-accent)",
          },
          observation: {
            bg: "var(--unit-observation-bg)",
            accent: "var(--unit-observation-accent)",
          },
          idea: {
            bg: "var(--unit-idea-bg)",
            accent: "var(--unit-idea-accent)",
          },
          definition: {
            bg: "var(--unit-definition-bg)",
            accent: "var(--unit-definition-accent)",
          },
          assumption: {
            bg: "var(--unit-assumption-bg)",
            accent: "var(--unit-assumption-accent)",
          },
          action: {
            bg: "var(--unit-action-bg)",
            accent: "var(--unit-action-accent)",
          },
        },
        lifecycle: {
          draft: {
            border: "var(--lifecycle-draft-border)",
            bg: "var(--lifecycle-draft-bg)",
          },
          pending: {
            border: "var(--lifecycle-pending-border)",
            bg: "var(--lifecycle-pending-bg)",
          },
          confirmed: {
            border: "var(--lifecycle-confirmed-border)",
          },
        },
      },
      fontFamily: {
        primary: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        heading: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: ["SF Mono", "JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "1.4", fontWeight: "400" }],
        sm: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        base: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        lg: ["20px", { lineHeight: "1.5", fontWeight: "500" }],
        xl: ["25px", { lineHeight: "1.3", fontWeight: "600" }],
        "2xl": ["31px", { lineHeight: "1.2", fontWeight: "600" }],
        "3xl": ["39px", { lineHeight: "1.1", fontWeight: "700" }],
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
        "space-16": "64px",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        flat: "none",
        resting: "0 1px 3px rgba(0,0,0,0.08)",
        hover: "0 4px 12px rgba(0,0,0,0.12)",
        elevated: "0 8px 24px rgba(0,0,0,0.14)",
        high: "0 20px 60px rgba(0,0,0,0.18)",
        active: "0 0 0 2px var(--accent-primary)",
        modal: "0 20px 60px rgba(0,0,0,0.15)",
      },
      transitionDuration: {
        instant: "100ms",
        fast: "150ms",
        normal: "250ms",
        slow: "300ms",
        view: "300ms",
        sidebar: "250ms",
        focus: "150ms",
        drag: "200ms",
      },
      transitionTimingFunction: {
        default: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      letterSpacing: {
        "heading-tight": "-0.02em",
      },
      maxWidth: {
        content: "1200px",
        reading: "720px",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};

export default config;
