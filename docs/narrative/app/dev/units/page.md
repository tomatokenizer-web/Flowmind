# Units Showcase Page (Dev)

> **Last Updated**: 2026-03-18
> **Code Location**: `src/app/dev/units/page.tsx`
> **Status**: Active

---

## Context & Purpose

This is a **developer showcase page** -- a living catalog that renders every visual variant and state of the UnitCard component family. It exists so that designers and developers can visually verify the appearance and behavior of ThoughtUnit cards without needing to create real data, navigate the main application, or set up specific database states.

**Business Need**: FlowMind's core interaction primitive is the "ThoughtUnit" -- a typed piece of knowledge (claim, question, evidence, etc.). These units appear everywhere in the application. Before shipping Story 2.3, the team needs a single place to confirm that all 9 unit types, all 5 lifecycle states, all 3 card variants (compact / standard / expanded), skeleton loading states, and the selected-state highlight all render correctly. This page is that single place.

**When Used**: During development and design review. Accessed at the `/dev/units` route. This page is not intended for end users; it belongs to the `/dev/*` family of internal showcase routes (alongside `/dev/tokens` for design tokens and `/dev/components` for general component demos).

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/components/unit/unit-card.tsx`: The primary `UnitCard` component and its `UnitCardUnit` type interface -- this is the main subject being showcased
- `src/components/unit/unit-card-skeleton.tsx`: `UnitCardSkeleton` -- loading placeholder that mimics card layout before real data arrives
- `src/components/unit/unit-type-badge.tsx`: `UnitTypeBadge` -- the colored label chip that identifies a unit's semantic type (claim, evidence, idea, etc.)
- `src/components/unit/lifecycle-indicator.tsx`: `LifecycleIndicator` and `LifecycleState` type -- the small dot-and-label widget showing a unit's maturity stage (draft, pending, confirmed, deferred, complete)
- `src/lib/unit-types.ts`: `BASE_UNIT_TYPE_IDS` -- the canonical list of all 9 base unit type identifiers, used to iterate and render one badge per type
- `@prisma/client`: `UnitType` enum -- the database-level type definition that ensures showcase mock data uses only valid unit type values

### Dependents (What Needs This)
- Nothing depends on this file at runtime. It is a **leaf page** -- a terminal route with no exports consumed by other modules. Its value is entirely in the developer experience it provides.

### Data Flow
This page is entirely self-contained in terms of data. It uses no API calls, no database queries, and no server-side data fetching.

```
makeMockUnit() helper generates fake UnitCardUnit objects
    --> SAMPLE_UNITS array (9 items, one per unit type)
    --> Rendered through UnitCard / UnitTypeBadge / LifecycleIndicator / UnitCardSkeleton
    --> selectedId state (React.useState) tracks which card the user has clicked
```

The mock data is carefully crafted with realistic cognitive-science content to simulate what real ThoughtUnits look like in practice, including varied `branchPotential` scores, `relationCount` values, `originType` sources, and lifecycle stages.

---

## Macroscale: System Integration

### Architectural Layer
This sits in the **Developer Tooling Layer** of the application, specifically within the Next.js App Router file-based routing system:

- **Layer 0**: Design tokens and CSS (`/dev/tokens` showcase)
- **Layer 1**: Reusable components (`/dev/components` showcase)
- **Layer 2**: Domain-specific components (`/dev/units` showcase) -- **You are here**
- **Layer 3**: Application pages (dashboard, workspace, etc.)

The `/dev/*` routes form an internal **component storybook** built directly into the application, avoiding the need for a separate Storybook deployment while still providing visual verification of the design system.

### Big Picture Impact
This page is not on any critical user-facing path, but it plays a significant role in **quality assurance for the unit type system**:

- **Story 2.2** defined the 9 base unit types with colors, icons, and relationships
- **Story 2.3** implemented the visual card components for those types
- This showcase page is the **visual acceptance test** for Story 2.3

Without it, verifying that all 9 types render correctly across 3 card variants and 5 lifecycle states would require manually creating 45+ database records and navigating to various application views. This page collapses that verification into a single scroll.

### Critical Path Analysis
**Importance Level**: Low (runtime) / High (development workflow)
- If this page is removed: No user-facing functionality breaks. Developers lose their visual reference for UnitCard states.
- If this page has bugs: The showcase becomes misleading, potentially causing real card styling issues to go unnoticed during development.
- The page also serves as **living documentation** -- a new team member can visit `/dev/units` and immediately understand the visual vocabulary of the unit type system.

---

## Technical Concepts (Plain English)

### Client Component ("use client" directive)
**Technical**: A Next.js App Router directive that opts this page into client-side rendering with full React interactivity, rather than server-side rendering.
**Plain English**: This page needs to respond to clicks (selecting cards), so it runs in the browser rather than being pre-built on the server. Like choosing between a printed poster (server) and a touchscreen kiosk (client).
**Why We Use It**: The `selectedId` state that tracks which card is highlighted requires browser-side React state management.

### Mock Data Factory (makeMockUnit)
**Technical**: A factory function that produces `UnitCardUnit` objects with sensible defaults, overridden by partial input, using `crypto.randomUUID()` for unique IDs.
**Plain English**: A template that stamps out fake "thought cards" with realistic-looking content. You only specify the parts you care about (like the unit type), and it fills in everything else automatically -- like a form with pre-filled defaults.
**Why We Use It**: Avoids repetitive boilerplate when defining 9 sample units, each needing 7-8 properties.

### Component Variants (compact / standard / expanded)
**Technical**: A prop-driven rendering strategy where a single `UnitCard` component accepts a `variant` prop and adjusts its layout, content density, and visual treatment accordingly.
**Plain English**: Three different "zoom levels" for the same card -- a one-liner summary (compact), a normal card (standard), and a detailed view (expanded). Like viewing an email in a list, in a preview pane, or fully opened.
**Why We Use It**: Different parts of the FlowMind interface need different information density. A graph overview needs compact cards; a focused reading view needs expanded ones.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 2.3)
- **What Changed**: Created the Units showcase page with mock data for all 9 unit types across all variants and lifecycle states
- **Why**: Visual acceptance testing for the UnitCard component family delivered in Story 2.3
- **Impact**: Developers and designers can now verify the entire unit visual system at `/dev/units`
