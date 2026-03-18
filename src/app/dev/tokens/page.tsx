import { redirect } from "next/navigation";

/** Dev-only visual token reference page. Guarded to development environment. */
export default function TokensPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  const bgColors = [
    { name: "--bg-primary", var: "var(--bg-primary)", hex: "#FFFFFF" },
    { name: "--bg-secondary", var: "var(--bg-secondary)", hex: "#F5F5F7" },
    { name: "--bg-surface", var: "var(--bg-surface)", hex: "#FAFAFA" },
    { name: "--bg-hover", var: "var(--bg-hover)", hex: "#F0F0F2" },
  ];

  const textColors = [
    { name: "--text-primary", var: "var(--text-primary)", hex: "#1D1D1F" },
    { name: "--text-secondary", var: "var(--text-secondary)", hex: "#6E6E73" },
    { name: "--text-tertiary", var: "var(--text-tertiary)", hex: "#AEAEB2" },
  ];

  const accentColors = [
    { name: "--accent-primary", var: "var(--accent-primary)", hex: "#0071E3" },
    { name: "--accent-success", var: "var(--accent-success)", hex: "#34C759" },
    { name: "--accent-warning", var: "var(--accent-warning)", hex: "#FF9500" },
    { name: "--accent-error", var: "var(--accent-error)", hex: "#FF3B30" },
  ];

  const semanticColors = [
    { name: "--success", var: "var(--success)", hex: "#34C759" },
    { name: "--warning", var: "var(--warning)", hex: "#FF9500" },
    { name: "--error", var: "var(--error)", hex: "#FF3B30" },
    { name: "--info", var: "var(--info)", hex: "#5AC8FA" },
  ];

  const unitTypes = [
    { name: "Claim", bg: "var(--unit-claim-bg)", accent: "var(--unit-claim-accent)" },
    { name: "Question", bg: "var(--unit-question-bg)", accent: "var(--unit-question-accent)" },
    { name: "Evidence", bg: "var(--unit-evidence-bg)", accent: "var(--unit-evidence-accent)" },
    { name: "Counterargument", bg: "var(--unit-counterargument-bg)", accent: "var(--unit-counterargument-accent)" },
    { name: "Observation", bg: "var(--unit-observation-bg)", accent: "var(--unit-observation-accent)" },
    { name: "Idea", bg: "var(--unit-idea-bg)", accent: "var(--unit-idea-accent)" },
    { name: "Definition", bg: "var(--unit-definition-bg)", accent: "var(--unit-definition-accent)" },
    { name: "Assumption", bg: "var(--unit-assumption-bg)", accent: "var(--unit-assumption-accent)" },
    { name: "Action", bg: "var(--unit-action-bg)", accent: "var(--unit-action-accent)" },
  ];

  const spacingScale = [
    { name: "--space-1", value: "4px" },
    { name: "--space-2", value: "8px" },
    { name: "--space-3", value: "12px" },
    { name: "--space-4", value: "16px" },
    { name: "--space-5", value: "20px" },
    { name: "--space-6", value: "24px" },
    { name: "--space-8", value: "32px" },
    { name: "--space-10", value: "40px" },
    { name: "--space-12", value: "48px" },
    { name: "--space-16", value: "64px" },
  ];

  const typeScale = [
    { name: "--text-xs", size: "11px", weight: "400", lh: "1.4", usage: "Metadata labels, timestamps" },
    { name: "--text-sm", size: "13px", weight: "400", lh: "1.5", usage: "Secondary text, badges" },
    { name: "--text-base", size: "16px", weight: "400", lh: "1.6", usage: "Body text, unit content" },
    { name: "--text-lg", size: "20px", weight: "500", lh: "1.5", usage: "Section headers, card titles" },
    { name: "--text-xl", size: "25px", weight: "600", lh: "1.3", usage: "Page titles, context names" },
    { name: "--text-2xl", size: "31px", weight: "600", lh: "1.2", usage: "Project titles, hero text" },
    { name: "--text-3xl", size: "39px", weight: "700", lh: "1.1", usage: "Landing page headings" },
  ];

  const shadows = [
    { name: "Flat (Level 0)", class: "shadow-flat", desc: "Sidebar, main background" },
    { name: "Resting (Level 1)", class: "shadow-resting", desc: "Cards, floating elements" },
    { name: "Hover", class: "shadow-hover", desc: "Card hover state" },
    { name: "Elevated (Level 2)", class: "shadow-elevated", desc: "Popovers, dropdowns" },
    { name: "High (Level 3)", class: "shadow-high", desc: "Modals, command palette" },
    { name: "Active", class: "shadow-active", desc: "Selected/focused card" },
  ];

  const animations = [
    { name: "--duration-instant", value: "100ms", usage: "Micro-interactions" },
    { name: "--duration-fast", value: "150ms", usage: "Hover, focus states" },
    { name: "--duration-normal", value: "250ms", usage: "Sidebar transitions" },
    { name: "--duration-slow", value: "300ms", usage: "View transitions" },
    { name: "--duration-view", value: "300ms", usage: "Page/view changes" },
    { name: "--duration-sidebar", value: "250ms", usage: "Sidebar open/close" },
    { name: "--duration-focus", value: "150ms", usage: "Focus ring appearance" },
    { name: "--duration-drag", value: "200ms", usage: "Drag snap" },
  ];

  return (
    <div className="min-h-screen p-space-8" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="mx-auto" style={{ maxWidth: "1200px" }}>
        <h1 className="font-heading text-3xl mb-space-2">Flowmind Design Tokens</h1>
        <p className="text-sm mb-space-8" style={{ color: "var(--text-secondary)" }}>
          Dev-only reference. All tokens defined in <code className="font-mono">src/styles/tokens.css</code>.
        </p>

        {/* Background Colors */}
        <Section title="Background Colors">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-4">
            {bgColors.map((c) => (
              <ColorSwatch key={c.name} name={c.name} hex={c.hex} style={{ backgroundColor: c.var }} border />
            ))}
          </div>
        </Section>

        {/* Text Colors */}
        <Section title="Text Colors">
          <div className="grid grid-cols-3 gap-space-4">
            {textColors.map((c) => (
              <div key={c.name} className="p-space-4 rounded-card" style={{ backgroundColor: "var(--bg-secondary)" }}>
                <p style={{ color: c.var, fontSize: "20px", fontWeight: 600 }}>Aa</p>
                <p className="text-xs mt-space-2 font-mono" style={{ color: "var(--text-secondary)" }}>
                  {c.name}<br />{c.hex}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Accent Colors */}
        <Section title="Accent Colors">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-4">
            {accentColors.map((c) => (
              <ColorSwatch key={c.name} name={c.name} hex={c.hex} style={{ backgroundColor: c.var }} />
            ))}
          </div>
        </Section>

        {/* Semantic Colors */}
        <Section title="Semantic Colors">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-4">
            {semanticColors.map((c) => (
              <ColorSwatch key={c.name} name={c.name} hex={c.hex} style={{ backgroundColor: c.var }} />
            ))}
          </div>
        </Section>

        {/* Unit Type Colors */}
        <Section title="Unit Type Colors (9 types)">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-4">
            {unitTypes.map((u) => (
              <div
                key={u.name}
                className="rounded-card p-space-4 border-l-4"
                style={{
                  backgroundColor: u.bg,
                  borderLeftColor: u.accent,
                  boxShadow: "var(--shadow-resting)",
                }}
              >
                <p style={{ color: u.accent, fontWeight: 600 }}>{u.name}</p>
                <p className="text-xs font-mono mt-space-1" style={{ color: "var(--text-secondary)" }}>
                  bg: {u.bg}<br />accent: {u.accent}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Lifecycle States */}
        <Section title="Lifecycle States">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-4">
            <div
              className="rounded-card p-space-4 border-2 border-dashed"
              style={{
                backgroundColor: "var(--lifecycle-draft-bg)",
                borderColor: "var(--lifecycle-draft-border)",
                opacity: 0.8,
              }}
            >
              <p className="font-heading text-lg">Draft</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Dashed border, muted bg, 80% opacity
              </p>
            </div>
            <div
              className="rounded-card p-space-4 border-l-4 border"
              style={{
                backgroundColor: "var(--lifecycle-pending-bg)",
                borderLeftColor: "var(--lifecycle-pending-border)",
                borderColor: "var(--border-default)",
              }}
            >
              <p className="font-heading text-lg">Pending</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Yellow left border, yellow tint
              </p>
            </div>
            <div
              className="rounded-card p-space-4 border"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--lifecycle-confirmed-border)",
                boxShadow: "var(--shadow-resting)",
              }}
            >
              <p className="font-heading text-lg">Confirmed</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Solid border, full opacity, standard card
              </p>
            </div>
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography Scale">
          <div className="space-y-space-4">
            {typeScale.map((t) => (
              <div key={t.name} className="flex items-baseline gap-space-4 border-b pb-space-3" style={{ borderColor: "var(--border-default)" }}>
                <p
                  className="font-heading shrink-0"
                  style={{ fontSize: t.size, fontWeight: Number(t.weight), lineHeight: t.lh }}
                >
                  Flowmind
                </p>
                <div className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                  <span>{t.name}</span> &middot; <span>{t.size}</span> &middot; <span>w{t.weight}</span> &middot; <span>lh {t.lh}</span>
                  <br />
                  <span style={{ color: "var(--text-tertiary)" }}>{t.usage}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-space-6 space-y-space-2">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Font stacks:</p>
            <div className="text-sm font-primary">Primary: -apple-system, SF Pro Text, Inter</div>
            <div className="text-sm font-heading">Heading: -apple-system, SF Pro Display, Inter</div>
            <div className="text-sm font-mono">Mono: SF Mono, JetBrains Mono, Fira Code</div>
          </div>
        </Section>

        {/* Spacing */}
        <Section title="Spacing Scale (4px base)">
          <div className="space-y-space-3">
            {spacingScale.map((s) => (
              <div key={s.name} className="flex items-center gap-space-4">
                <span className="text-xs font-mono w-28 shrink-0" style={{ color: "var(--text-secondary)" }}>
                  {s.name} ({s.value})
                </span>
                <div
                  className="h-space-3 rounded"
                  style={{
                    width: s.value,
                    backgroundColor: "var(--accent-primary)",
                    opacity: 0.6,
                  }}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Elevation / Shadows */}
        <Section title="Elevation (Shadows)">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-space-6">
            {shadows.map((s) => (
              <div
                key={s.name}
                className={`rounded-card p-space-5 ${s.class}`}
                style={{ backgroundColor: "var(--bg-primary)" }}
              >
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs mt-space-1" style={{ color: "var(--text-secondary)" }}>
                  .{s.class}
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-space-4 font-mono" style={{ color: "var(--text-secondary)" }}>
            Border radius: --radius-card = 12px
          </p>
        </Section>

        {/* Animation */}
        <Section title="Animation Durations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-4">
            {animations.map((a) => (
              <div key={a.name} className="flex items-center gap-space-4 p-space-3 rounded-card" style={{ backgroundColor: "var(--bg-secondary)" }}>
                <span className="text-xs font-mono w-44 shrink-0">{a.name}</span>
                <span className="text-sm font-medium w-14 shrink-0">{a.value}</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{a.usage}</span>
              </div>
            ))}
          </div>
          <div className="mt-space-4 p-space-4 rounded-card" style={{ backgroundColor: "var(--bg-secondary)" }}>
            <p className="text-sm font-medium">Easing Functions</p>
            <p className="text-xs font-mono mt-space-2" style={{ color: "var(--text-secondary)" }}>
              --easing-default: cubic-bezier(0.4, 0, 0.2, 1)<br />
              --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
            </p>
          </div>
          <div className="mt-space-4 p-space-4 rounded-card border" style={{ borderColor: "var(--accent-warning)", backgroundColor: "#FFF8E1" }}>
            <p className="text-sm font-medium">prefers-reduced-motion</p>
            <p className="text-xs mt-space-1" style={{ color: "var(--text-secondary)" }}>
              All animations and transitions are set to near-0ms when the user prefers reduced motion. Handled in globals.css.
            </p>
          </div>
        </Section>

        {/* Breakpoints */}
        <Section title="Responsive Breakpoints">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border-default)" }}>
                  <th className="text-left py-space-2 font-medium">Token</th>
                  <th className="text-left py-space-2 font-medium">Width</th>
                  <th className="text-left py-space-2 font-medium">Layout Change</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr className="border-b" style={{ borderColor: "var(--bg-secondary)" }}>
                  <td className="py-space-2">sm</td><td>640px</td><td className="font-primary">Single column, stacked</td>
                </tr>
                <tr className="border-b" style={{ borderColor: "var(--bg-secondary)" }}>
                  <td className="py-space-2">md</td><td>768px</td><td className="font-primary">Sidebar hidden, overlay panels</td>
                </tr>
                <tr className="border-b" style={{ borderColor: "var(--bg-secondary)" }}>
                  <td className="py-space-2">lg</td><td>1024px</td><td className="font-primary">Sidebar collapsed, inline panels</td>
                </tr>
                <tr className="border-b" style={{ borderColor: "var(--bg-secondary)" }}>
                  <td className="py-space-2">xl</td><td>1280px</td><td className="font-primary">Full three-column layout</td>
                </tr>
                <tr>
                  <td className="py-space-2">2xl</td><td>1536px</td><td className="font-primary">Extra whitespace, centered max-width</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <footer className="mt-space-12 pb-space-8 text-xs" style={{ color: "var(--text-tertiary)" }}>
          Flowmind Token Reference — development only
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-space-10">
      <h2 className="font-heading text-xl mb-space-4 pb-space-2 border-b" style={{ borderColor: "var(--border-default)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorSwatch({
  name,
  hex,
  style,
  border,
}: {
  name: string;
  hex: string;
  style: React.CSSProperties;
  border?: boolean;
}) {
  return (
    <div>
      <div
        className="h-16 rounded-card"
        style={{
          ...style,
          border: border ? "1px solid var(--border-default)" : undefined,
        }}
      />
      <p className="text-xs font-mono mt-space-2" style={{ color: "var(--text-secondary)" }}>
        {name}
      </p>
      <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>{hex}</p>
    </div>
  );
}
