# UnitCardSkeleton

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/unit/unit-card-skeleton.tsx`
> **Status**: Active

---

## Context & Purpose

This component exists to prevent layout shift and communicate loading state when ThoughtUnit cards are being fetched from the server. Without it, users would see either a blank void or a jarring pop-in when unit data arrives, both of which erode trust in the application's responsiveness.

**Business Need**: FlowMind displays lists of ThoughtUnits as cards. Network requests, especially paginated queries, introduce latency. Users need immediate visual feedback that content is on its way -- a "content is loading" promise rendered as grey placeholder shapes that mirror the real card's anatomy.

**When Used**: Rendered in place of `UnitCard` components while tRPC queries for ThoughtUnit data are in flight. Typically shown as a repeating list (e.g., 5-10 skeletons) inside any view that displays unit cards: the main feed, search results, or filtered views.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/lib/utils.ts`: `cn()` -- the **class-name merge utility** (a helper that combines Tailwind CSS classes safely, resolving conflicts so that a custom className passed from a parent always wins over defaults)

### Dependents (What Needs This)
- Not yet imported by any consumer in the codebase. This is a ready-to-use loading placeholder designed to be adopted by list/feed components in upcoming stories (likely the ThoughtUnit feed view and search results page).

### Data Flow
No data flows through this component in the traditional sense. It receives only display configuration:

```
Parent passes variant ("compact" | "standard" | "expanded") + optional className
  --> Skeleton renders the appropriate number of placeholder rows
  --> CSS `animate-pulse` handles the shimmer animation autonomously
```

There is no server interaction, no state, and no side effects. This is a pure presentational component.

---

## Macroscale: System Integration

### Architectural Layer
This sits in the **Presentational UI Layer** as a sibling to `UnitCard`. Together they form a loading-state pair -- a common React pattern where every data-driven component has a matching skeleton so that **Suspense boundaries** (React's mechanism for showing fallback UI while async content loads) or manual `isLoading` checks can swap between them seamlessly.

### Big Picture Impact
The skeleton is part of FlowMind's **perceived performance strategy**. It contributes to:
- **Cumulative Layout Shift (CLS) prevention**: By occupying the same dimensions as a real card, it stops the page from jumping when data arrives.
- **Accessibility compliance**: The `aria-busy="true"` and `aria-label="Loading thought unit"` attributes tell screen readers that content is loading, satisfying WCAG 2.1 AA requirements established in Story 1.9.
- **Design system consistency**: Uses the same `rounded-card`, `border`, `bg-bg-primary` tokens as the real `UnitCard`, ensuring the skeleton visually belongs to the same family.

### Critical Path Analysis
**Importance Level**: Moderate. If this component were missing, the application would still function -- users would simply see nothing (or a spinner) while cards load. However, removing it degrades the user experience noticeably, especially on slower connections. It is not a blocking dependency for any business logic.

---

## Microscale: Structural Correspondence with UnitCard

The skeleton intentionally mirrors the real `UnitCard` layout zone by zone. This is a deliberate design decision, not coincidence:

| Skeleton Zone | Corresponding UnitCard Zone | Variants Shown |
|---|---|---|
| Top row: pill-shaped block + small block | `UnitTypeBadge` + relation count | standard, expanded |
| Content lines (1-3 grey bars) | Content paragraph (`line-clamp-1` / `line-clamp-3`) | all (1 line for compact, 3 for others) |
| Metadata row: three small blocks | Clock timestamp + lifecycle indicator + branch dots | standard, expanded |
| Border-separated section + extra row | Provenance info + version history link | expanded only |

The **variant prop** controls how much skeleton anatomy to render, exactly matching how `UnitCard` conditionally shows more detail in "standard" and "expanded" modes. This ensures the skeleton-to-card transition feels like content "filling in" rather than a layout restructure.

---

## Technical Concepts (Plain English)

### Skeleton Loading Pattern
**Technical**: A UI pattern where placeholder shapes mimicking the final layout are displayed during data fetching, using CSS animation to indicate activity.
**Plain English**: Like seeing the outline of a newspaper article with grey boxes where the text and images will appear -- you know content is coming and roughly how much space it will take.
**Why We Use It**: It is measurably better for perceived performance than spinners. Users perceive skeleton screens as ~30% faster than blank screens with loading indicators.

### animate-pulse (Tailwind CSS)
**Technical**: A Tailwind utility class that applies a CSS keyframe animation cycling the element's opacity between 100% and 50% on a 2-second loop.
**Plain English**: A gentle breathing/shimmer effect on the grey blocks that signals "alive and loading" without being distracting.
**Why We Use It**: A static grey box looks broken; a pulsing one communicates activity. It is the standard Tailwind approach and requires zero JavaScript.

### aria-busy Attribute
**Technical**: An ARIA attribute that tells assistive technologies the element's content is still being updated and should not be read yet.
**Plain English**: A "please wait" sign for screen readers -- it prevents them from announcing incomplete placeholder content to visually impaired users.
**Why We Use It**: Part of FlowMind's WCAG 2.1 AA accessibility commitment (Story 1.9). Without it, a screen reader might try to describe the empty grey rectangles.

---

## Change History

### 2026-03-18 - Initial Implementation
- **What Changed**: Created skeleton component with three variant modes matching UnitCard
- **Why**: Story 2.2 introduced the unit type system and card components; skeletons are needed for loading states in upcoming feed views
- **Impact**: Provides a drop-in loading placeholder for any view displaying ThoughtUnit cards
