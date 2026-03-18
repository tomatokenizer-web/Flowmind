# Lifecycle Indicator

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/unit/lifecycle-indicator.tsx`
> **Status**: Active

---

## Context & Purpose

Every ThoughtUnit in FlowMind moves through a lifecycle: it starts as a rough draft, awaits review, gets confirmed as valuable, might be deferred for later, or reaches completion. Users need an immediate, glanceable way to know where any given unit sits in that progression without reading metadata or opening a detail view.

This component exists to render that lifecycle state as a small colored dot paired with a label. It is the visual shorthand for "how mature is this thought?" -- the equivalent of a traffic light telling you whether something needs attention, is settled, or is still forming.

**Business Need**: In a knowledge management tool, users accumulate hundreds of thought units. Without a quick visual signal of each unit's maturity, the list becomes an undifferentiated wall of text. The lifecycle indicator lets users scan, triage, and prioritize at a glance.

**When Used**: Rendered inside `UnitCard` on every thought unit displayed in list and grid views. Appears wherever a compact summary of a unit's status is needed.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/lib/utils.ts`: `cn()` -- the Tailwind class-merge utility that safely combines conditional CSS classes without conflicts

### Dependents (What Needs This)
- `src/components/unit/unit-card.tsx`: Imports both the `LifecycleIndicator` component and the `LifecycleState` type. Places the indicator in the card's metadata row alongside the unit type badge and branch potential dots.

### Exports
- `LifecycleState` type: A union of five string literals (`"draft" | "pending" | "confirmed" | "deferred" | "complete"`) reused by consuming components to type-check lifecycle values before passing them in.
- `LifecycleIndicator` component: The rendered visual element.

### Data Flow
```
Database (Lifecycle enum on ThoughtUnit row)
  --> tRPC router serves lifecycle field as string
    --> UnitCard receives unit object with lifecycle property
      --> LifecycleIndicator maps the string to a color config
        --> Renders colored dot + label text
```

### Schema Alignment Note
The Prisma `Lifecycle` enum defines seven states (draft, pending, confirmed, deferred, complete, archived, discarded), but this component's `LifecycleState` type only covers five. The "archived" and "discarded" states are not represented here, which suggests those terminal states are either filtered out before display or will need indicator support in a future iteration.

---

## Macroscale: System Integration

### Architectural Layer
This is a **presentational leaf component** -- it receives a single prop, looks up a styling configuration, and renders markup. It contains zero business logic, no side effects, and no state. It sits at the very bottom of the component hierarchy:

- **Layer 1**: Page / Layout (lists of units)
- **Layer 2**: UnitCard (composite card component)
- **Layer 3 (this component)**: LifecycleIndicator (pure visual output)

### Big Picture Impact
The lifecycle system is one of FlowMind's core organizational dimensions. The database indexes the `lifecycle` column for filtered queries, the API accepts lifecycle as a filter parameter, and the UI surfaces it through this indicator. Removing this component would not break functionality, but it would eliminate the primary visual cue users rely on to understand unit maturity at a glance.

This indicator is part of a trio of status signals on each UnitCard:
1. **UnitTypeBadge** -- what kind of thought (question, insight, reference, etc.)
2. **LifecycleIndicator** -- how mature/settled the thought is (this component)
3. **BranchPotentialDots** -- how much further exploration the thought warrants

Together, these three micro-components form the "metadata bar" that gives users a complete snapshot of any thought unit without opening it.

### Design System Integration
The component uses **semantic color tokens** (e.g., `bg-lifecycle-pending-border`, `text-accent-success`, `text-accent-primary`) rather than raw color values. This means it automatically adapts to theme changes and maintains visual consistency with the rest of FlowMind's design system. The draft state is deliberately rendered with a dashed border and no fill -- visually communicating incompleteness through the shape itself.

---

## Technical Concepts (Plain English)

### Configuration Map Pattern
**Technical**: A `Record<LifecycleState, Config>` lookup object that maps each possible lifecycle value to its corresponding visual properties, avoiding conditional branching.

**Plain English**: Instead of writing a chain of "if draft then gray, if pending then yellow, if confirmed then green..." statements, all the styling rules are stored in a dictionary. The component simply looks up the current state and gets back the right colors instantly -- like looking up a word in a dictionary rather than reading the whole book.

**Why We Use It**: Keeps the rendering logic trivially simple. Adding a new lifecycle state means adding one entry to the dictionary rather than threading new conditions through JSX.

### Aria Labels for Accessibility
**Technical**: The outer `<span>` carries an `aria-label` attribute describing the lifecycle state, and the decorative dot is marked `aria-hidden="true"`.

**Plain English**: Screen readers (tools that read web pages aloud for visually impaired users) will announce "Lifecycle: Confirmed" instead of trying to describe a colored circle. The dot itself is hidden from screen readers because it conveys no information that the text label does not already provide.

**Why We Use It**: FlowMind targets WCAG 2.1 AA compliance (as established in Story 1.9). Every visual indicator must have an accessible text equivalent.

---

## Change History

### 2026-03-18 - Initial Implementation
- **What Changed**: Created lifecycle indicator with five-state support (draft, pending, confirmed, deferred, complete)
- **Why**: UnitCard needed a compact visual signal for thought maturity as part of the unit type system (Story 2.2)
- **Impact**: Enables at-a-glance lifecycle scanning across all unit list views
