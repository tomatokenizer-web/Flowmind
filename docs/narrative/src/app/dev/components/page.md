# Component Showcase Page

> **Last Updated**: 2026-03-18
> **Code Location**: `src/app/dev/components/page.tsx`
> **Status**: Active

---

## Context & Purpose

This file exists because of a fundamental challenge in design system work: developers need to see, touch, and interact with UI components before they can confidently use them in production features. Without a living showcase, every component becomes a guessing game -- developers would have to read source code or prop types to understand what a Button looks like with `variant="destructive"` or how a DropdownMenu behaves with keyboard navigation.

This page is the direct fulfillment of **Story 1.5, Acceptance Criterion #11**: _"A dev-only route `/dev/components` showcases all wrapped components."_ It is deliberately a dev-only route, meaning it will never be visible to end users in production. It serves as an internal quality gate and reference catalog.

**Business Need**: Flowmind's design system wraps 10 Radix UI primitives with custom styling (design tokens, shadows, radii, animations). Without a visual reference, developers would either reinvent styling on each page or introduce inconsistencies. This page eliminates that risk by providing a single source of truth for "how every component should look and behave."

**When Used**: During active development. A developer building a new feature -- say, a thread editor -- opens `/dev/components` in a browser tab to see all available building blocks, test their interactions, and copy usage patterns into their own code. It is also the page used to verify Story 1.5 acceptance criteria during code review.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

This page imports and renders every UI primitive in the Flowmind component library. It is the single largest consumer of the `~/components/ui/` directory:

- `src/components/ui/button.tsx`: Button component -- all 5 variants (primary, secondary, ghost, destructive, outline) and 3 sizes (sm, default, lg) are demonstrated
- `src/components/ui/dialog.tsx`: Dialog and DestructiveDialog -- showcases the standard edit dialog and the red-accented destructive confirmation pattern (AC #1)
- `src/components/ui/dropdown-menu.tsx`: DropdownMenu with type-colored indicators (Claim/Evidence/Question colors), keyboard shortcut hints, separators, and labels (AC #2)
- `src/components/ui/tooltip.tsx`: TooltipProvider and SimpleTooltip -- wraps the entire page in a provider so all tooltips share a 300ms delay (AC #3)
- `src/components/ui/popover.tsx`: Popover displaying unit metadata (type, status, relations, created date) (AC #4)
- `src/components/ui/tabs.tsx`: Tabs with Claims/Evidence/Questions panels, each using the corresponding unit-type accent color (AC #5)
- `src/components/ui/scroll-area.tsx`: ScrollArea rendering 20 mock thought units to demonstrate the custom 4px scrollbar (AC #6)
- `src/components/ui/context-menu.tsx`: ContextMenu triggered by right-clicking a dashed-border zone, with icons, shortcuts, and a destructive delete option (AC #7)
- `src/components/ui/command.tsx`: CommandPalette bound to Cmd+K globally, with fuzzy search, grouped commands (Recent/Actions), and shortcut display (AC #8)
- `src/components/ui/toggle.tsx`: Toggle for text formatting (Bold/Italic/Underline) and a larger "AI Assist" toggle (AC #9)
- `lucide-react`: Provides all iconography (Bold, Italic, Underline, Copy, Trash2, Settings, Search, FileText, Plus, ChevronDown, MessageSquare, Lightbulb, HelpCircle, Shield, Eye, Zap)

### Dependents (What Needs This)

Nothing depends on this file at runtime. It is a **leaf node** in the dependency graph -- a pure consumer with no exports. Its only "dependents" are human developers who navigate to it in a browser.

### Data Flow

This page has no data flow in the traditional sense. It is entirely **static and self-contained** -- no API calls, no database queries, no server state. The only state management is two React `useState` hooks controlling Dialog open/close. All content (thought unit names, metadata values, command palette items) is hardcoded mock data designed to feel realistic within the Flowmind domain.

```
Browser navigates to /dev/components
  --> Next.js renders page as client component ("use client")
  --> TooltipProvider wraps entire page (shared delay config)
  --> 10 Section blocks render, one per component
  --> CommandPalette attaches global Cmd+K listener
  --> Developer interacts: clicks, right-clicks, hovers, types shortcuts
```

---

## Macroscale: System Integration

### Architectural Layer

This page sits in the **Developer Tooling Layer** of the Flowmind architecture, alongside its sibling dev route:

- `/dev/tokens` -- visual reference for design tokens (Story 1.4)
- **`/dev/components`** -- interactive reference for UI components (Story 1.5) <-- You are here

Both are Next.js **App Router pages** under `src/app/dev/`, which means they are automatically routed but are intended to be excluded from production builds or hidden behind environment checks in later stories.

### Big Picture Impact

This page does not enable any user-facing feature directly. Its value is entirely **indirect but critical**:

1. **Consistency enforcement**: By showing all 10 components side by side with their intended styling, it prevents developers from drifting away from the design system. Every future feature page (canvas, thread view, settings) should use components exactly as they appear here.

2. **Acceptance criteria verification**: Each of the 10 sections maps directly to a Story 1.5 acceptance criterion. During code review or QA, a reviewer can open this page and verify every AC in under a minute.

3. **Onboarding accelerator**: A new developer joining the project can understand the entire component vocabulary by spending five minutes on this page rather than reading 10 separate component source files.

4. **Domain-specific demonstration**: The showcase does not use generic "Lorem ipsum" content. It uses Flowmind-specific language -- "Thought Unit," "Claim," "Evidence," "Question," "Thread" -- so developers see components in context, not in a vacuum.

### Critical Path Analysis

**Importance Level**: Low (runtime), High (development process)

- If this page were deleted, no user-facing feature would break. Zero runtime impact.
- However, the development process would degrade: developers would lose their visual reference, increasing the likelihood of inconsistent component usage across the application.
- This is a **dev-time dependency**, not a runtime dependency. Think of it as the workshop where tools are displayed on the wall -- removing the wall does not break the tools, but finding the right one becomes harder.

---

## Technical Concepts (Plain English)

### Client Component ("use client")

**Technical**: A Next.js App Router directive that opts this page out of **React Server Components (RSC)** and into client-side rendering with full access to browser APIs, React hooks, and event handlers.

**Plain English**: By default, Next.js tries to render pages on the server (like printing a newspaper before delivering it). But this page needs interactive behavior -- clicking buttons, opening menus, listening for keyboard shortcuts. The `"use client"` directive tells Next.js: "This page needs to run in the browser, not just be printed on the server."

**Why We Use It**: Every component on this page is interactive. Dialogs open and close, tooltips appear on hover, the command palette listens for Cmd+K. None of that works without client-side JavaScript.

### Radix UI Primitives

**Technical**: Unstyled, accessible UI component primitives from the Radix library that handle complex interaction patterns (focus trapping, keyboard navigation, ARIA attributes) while leaving visual styling to the consumer.

**Plain English**: Radix components are like unpainted furniture from a workshop -- structurally sound, with all the joints and hinges working perfectly, but no color or finish applied. Flowmind takes these bare components and paints them with its own design tokens (colors, shadows, border radii) to match the application's visual identity.

**Why We Use It**: Building accessible dropdown menus, dialogs, and context menus from scratch is extraordinarily difficult and error-prone. Radix handles the hard accessibility and interaction engineering; Flowmind only needs to handle the visual layer.

### Design Tokens (CSS Custom Properties)

**Technical**: Semantic CSS custom properties like `--unit-claim-accent`, `--bg-surface`, and `--text-primary` that abstract visual values behind meaningful names, enabling theme-wide changes from a single source.

**Plain English**: Instead of writing `color: #3B82F6` (a specific shade of blue) throughout the codebase, we write `color: var(--accent-primary)` (meaning "the main accent color"). If we later decide the accent should be purple, we change it in one place and every component updates automatically. This page demonstrates those tokens in action across all 10 components.

**Why We Use It**: The showcase uses token-based classes like `text-unit-claim-accent` and `bg-bg-surface` to prove that every component correctly consumes the design system. If a token is misconfigured, it will be visually obvious here.

### Command Palette (cmdk)

**Technical**: A composable command menu component built on the `cmdk` library, providing **fuzzy search** (matching partial/misspelled input against a list of commands), keyboard-first navigation, and grouped command organization.

**Plain English**: Like Spotlight on macOS or the Command Palette in VS Code -- press a keyboard shortcut (Cmd+K), start typing what you want to do, and the system finds the matching action instantly. It is the fastest way to navigate a complex application without reaching for the mouse.

**Why We Use It**: Flowmind is a thinking tool. Power users will have hundreds of thought units and threads. A command palette lets them navigate, search, and act without breaking their flow of thought.

---

## Change History

### 2026-03-18 - Initial Implementation
- **What Changed**: Created the component showcase page with all 10 Radix UI component demonstrations
- **Why**: Fulfills Story 1.5 AC #11, providing developers with a living reference for the Flowmind component library
- **Impact**: Developers now have a single URL (`/dev/components`) to visually verify and interact with every UI primitive available in the design system
