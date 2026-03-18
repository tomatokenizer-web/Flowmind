# Flowmind — Project Context
> This file is READ FIRST by Claude Code before implementing any story.
> Every decision must align with these principles. No exceptions.

---

## What Flowmind Is

Flowmind is a **cognitive interface** — not a note-taking app, not a task manager, not a wiki.
It captures the minimum meaningful unit of thought (a Thought Unit), connects units through typed semantic relations, and lets the same thoughts serve multiple purposes without ever being lost or duplicated.

**The four promises:**
- **Re-entry** — return to your exact cognitive state, no reconstruction needed
- **Non-loss** — no thought is ever discarded by structure
- **Multi-purpose Composition** — same thought, infinite reuse via reference
- **Amplification** — AI elevates thinking without replacing it

**Who uses this:** Writers, researchers, founders, philosophers. People whose work IS thinking.

---

## Design Philosophy (NON-NEGOTIABLE)

### 1. Apple-like — Content is the hero
- Background: `#FFFFFF` or `#FAFAFA`. Never gray soup.
- UI chrome is invisible. Toolbars, borders, labels recede.
- Every pixel of UI that isn't content is wasted.
- Reference: Apple Notes, Apple Reminders, Things 3, Craft.do

### 2. Progressive Disclosure — Simple surface, deep capability
- First view shows 3-5 actions max. Everything else behind `...` or Cmd+K.
- Never dump all metadata on a card. Show type + content. Details on click.
- New users see a clean, calm interface. Power users discover depth over time.
- Reference: Things 3 (simple task → tap for full detail)

### 3. Linear-like — Keyboard-first, fast, organized
- Every action has a keyboard shortcut. Cmd+K for everything else.
- Lists are clean. Spacing is generous. No visual clutter.
- Status changes feel instant (optimistic UI). Zero perceived latency.
- Reference: Linear.app (snappy, keyboard-driven, no waiting)

### 4. Spatial & Satisfying — Interactions feel physical
- Cards have subtle shadows (`0 1px 3px rgba(0,0,0,0.08)`)
- Hover: gentle lift (`transform: translateY(-1px)`, shadow increases)
- Drag: card scales to 1.02, shadow deepens
- Transitions: 300ms ease-out (views), 150ms (hover), 200ms (drag)
- Reference: Heptabase (spatial cards), Things 3 (satisfying animations)

### 5. Type-colored but muted — Signal without noise
- Unit types have color identity but NEVER saturated/loud
- Claim: `#E8F0FE` bg / `#1A56DB` accent (soft blue)
- Question: `#FEF3C7` bg / `#92400E` accent (soft amber)
- Evidence: `#ECFDF5` bg / `#065F46` accent (soft green)
- Counterargument: `#FEF2F2` bg / `#991B1B` accent (soft red)
- Observation: `#F5F3FF` bg / `#4C1D95` accent (soft purple)
- Idea: `#FFF7ED` bg / `#9A3412` accent (soft orange)
- Color is ALWAYS paired with a label/icon — never the only signal

---

## Design Tokens (Use These. Always.)

```css
/* Backgrounds */
--bg-primary: #FFFFFF;
--bg-secondary: #F5F5F7;
--bg-surface: #FAFAFA;
--bg-hover: #F0F0F2;

/* Text */
--text-primary: #1D1D1F;      /* Apple's near-black */
--text-secondary: #6E6E73;    /* Apple's secondary gray */
--text-tertiary: #AEAEB2;     /* Placeholder, disabled */

/* Borders */
--border-default: #D2D2D7;
--border-focus: #0071E3;      /* Apple blue */

/* Accent */
--accent-primary: #0071E3;    /* Apple blue */
--accent-success: #34C759;
--accent-warning: #FF9500;
--accent-error: #FF3B30;

/* Spacing (4px base unit) */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px; --space-12: 48px;

/* Typography */
--font-primary: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif;
--font-heading: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
--font-mono: 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;

/* Card */
--radius-card: 12px;
--shadow-resting: 0 1px 3px rgba(0,0,0,0.08);
--shadow-hover: 0 4px 12px rgba(0,0,0,0.12);
--shadow-active: 0 0 0 2px var(--accent-primary);
--shadow-modal: 0 20px 60px rgba(0,0,0,0.15);

/* Animation */
--duration-instant: 100ms;
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 300ms;
--duration-view: 300ms;
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
--easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## Tech Stack (Follow Architecture Doc)

- **Framework**: Next.js 14+ App Router
- **API**: tRPC v11 (end-to-end type safety — USE IT)
- **DB**: PostgreSQL + pgvector via Prisma 6.x
- **Auth**: Auth.js v5
- **Styling**: Tailwind CSS + CSS custom properties (tokens above)
- **Components**: Radix UI primitives (Dialog, DropdownMenu, Tooltip, etc.)
- **Animation**: Framer Motion
- **Graph**: React Flow (Canvas View) + D3.js (Graph View)
- **Editor**: Tiptap 3.x
- **Drag**: dnd-kit
- **State**: Zustand 5.x
- **Jobs**: Trigger.dev
- **Icons**: Lucide React (ONLY — no other icon sets)
- **Testing**: Vitest (unit) + Playwright (E2E)

**Never introduce a new library without explicit user approval.**

---

## Component Patterns (Always Follow)

### UnitCard
```tsx
// CORRECT — type-colored left border, subtle shadow, hover lift
<div className="
  rounded-xl bg-white border border-[--border-default]
  shadow-[--shadow-resting] hover:shadow-[--shadow-hover]
  hover:-translate-y-px transition-all duration-150
  border-l-4 border-l-[type-color]
  p-4 cursor-pointer
">
```

### Lifecycle States
- **Draft**: `border-dashed opacity-80 bg-gray-50`
- **Pending**: `border-l-4 border-l-yellow-400 bg-yellow-50/30`
- **Confirmed**: `border-solid` (default)

### Empty States
```tsx
// ALWAYS include: illustration + headline + CTA
<div className="flex flex-col items-center gap-4 py-16 text-center">
  <Icon className="w-12 h-12 text-[--text-tertiary]" />
  <h3 className="text-[--text-secondary] font-medium">No thoughts yet</h3>
  <Button variant="ghost">Capture your first thought</Button>
</div>
```

### Loading States
```tsx
// ALWAYS use skeleton, NEVER spinners
<div className="animate-pulse bg-[--bg-secondary] rounded-xl h-20 w-full" />
```

### Buttons
```tsx
// Primary — Apple blue
<Button className="bg-[--accent-primary] text-white hover:bg-blue-600 rounded-lg px-4 py-2">

// Ghost — for secondary actions
<Button variant="ghost" className="text-[--text-secondary] hover:bg-[--bg-hover]">

// Destructive — only for irreversible actions
<Button variant="destructive" className="bg-[--accent-error]">
```

---

## Anti-Patterns (NEVER DO THESE)

❌ **No modal for routine actions** — use inline editing, popovers, or slide-in panels
❌ **No heavy toolbars** — max 3-5 visible actions, rest in Cmd+K
❌ **No spinners** — use skeleton loading
❌ **No blue-on-white text at low contrast** — always check WCAG 2.1 AA
❌ **No `<div onClick>` without keyboard support** — all interactive elements get `role` + `onKeyDown`
❌ **No inline styles** — use Tailwind classes or CSS tokens
❌ **No hardcoded colors** — always use CSS custom properties
❌ **No new dependencies** without approval
❌ **No page-level loading states** — load incrementally with Suspense
❌ **No truncating relation/attribute display without "See more"**
❌ **No AI-generated content shown without Draft visual treatment**

---

## Accessibility (Required on Every Component)

- All interactive elements: `role`, `aria-label`, keyboard handler
- Focus ring: `outline: 2px solid var(--accent-primary); outline-offset: 2px`
- Color never the only signal (always paired with text/icon)
- `prefers-reduced-motion`: disable all transforms/animations
- Minimum tap target: 44×44px (mobile)
- All images: `alt` text
- Dynamic content: `aria-live` regions

---

## File Structure
```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── ui/                 # Radix primitives wrapped with Flowmind styling
│   ├── unit/               # UnitCard, UnitEditor, UnitDetail
│   ├── graph/              # GraphView (D3), CanvasView (React Flow)
│   ├── thread/             # ThreadView
│   ├── assembly/           # AssemblyBoard, AssemblySlot
│   ├── navigator/          # NavigatorBar, NavigatorItem
│   ├── context/            # ContextSidebar, ContextBriefing
│   ├── search/             # SearchBar, SearchResults
│   ├── ai/                 # DecompositionReview, SuggestionQueue
│   └── shared/             # EmptyState, Skeleton, Toast
├── server/
│   ├── api/routers/        # tRPC routers
│   └── services/           # Business logic
├── lib/
│   ├── ai/                 # AI provider abstraction
│   └── utils/
├── stores/                 # Zustand stores
└── styles/
    └── tokens.css          # All CSS custom properties
```

---

## Story Implementation Rules

1. **Read this file first** — before every story
2. **Read the story AC** — implement EXACTLY what's specified, nothing more
3. **TDD** — write failing tests before implementation
4. **Mobile-first** — components work at 768px before 1440px
5. **Optimistic UI** — mutations feel instant, sync in background
6. **Error boundaries** — every major section has one
7. **Type safety** — no `any`, no `@ts-ignore` without comment
8. **Commit per story** — one clean git commit when story is complete

---

## Key Reference Docs
- PRD: `docs/flowmind-prd.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- UX Spec: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Epics: `_bmad-output/planning-artifacts/epics.md`
