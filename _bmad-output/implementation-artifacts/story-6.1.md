# Story 6.1: Thread View — Linear Reading Mode

**Status: pending**

## Description
As a user,
I want to read my Units in a linear vertical list ordered chronologically or by derivation,
So that I can follow a train of thought from beginning to end like reading a document.

## Acceptance Criteria

**Given** Units exist within a Context with relations
**When** the user switches to Thread View
**Then** Units are displayed as a vertical list of UnitCards stacked in chronological or derivation order per FR46, UX-DR29
**And** relation connectors (thin lines with type-colored dots) link related cards between the stacked list per UX-DR29
**And** branch points display a fork indicator showing the number of branches per FR46
**And** clicking a fork indicator reveals branch options and the user can choose which branch to follow

**Given** the Thread View is rendering
**When** the list is long enough to scroll
**Then** ScrollArea integration provides smooth scrolling with the 4px hover-visible scrollbar per UX-DR23

**Given** Thread View is open
**When** the user interacts with the toolbar
**Then** the user can toggle between chronological order and derivation order via a toolbar toggle
**And** Thread View is accessible as an alternative to Graph View for users who prefer text-based navigation per UX-DR56

## Tasks
- [ ] Add `thread_view` feature flag or view mode enum to the existing view store in `src/store/viewStore.ts`
- [ ] Create `ThreadView` component at `src/features/thread/ThreadView.tsx` that reads `activeContextId` and fetches units
- [ ] Add `unit.listForThread` tRPC procedure in `src/server/routers/unit.ts` — returns units with relations, sorted by `created_at` or derivation depth (BFS from root units)
- [ ] Implement derivation-order sort in `src/server/services/unitService.ts` using relation graph traversal (DERIVES_FROM edges)
- [ ] Create `ThreadUnitCard` component at `src/features/thread/ThreadUnitCard.tsx` wrapping the existing UnitCard with connector rails
- [ ] Create `RelationConnector` component at `src/features/thread/RelationConnector.tsx` rendering thin vertical lines with type-colored dots between cards
- [ ] Create `ForkIndicator` component at `src/features/thread/ForkIndicator.tsx` — shows branch count badge, expands to list of branch options on click
- [ ] Add `ThreadViewToolbar` at `src/features/thread/ThreadViewToolbar.tsx` with chronological/derivation toggle and view switcher (Thread ↔ Graph)
- [ ] Integrate Radix UI ScrollArea (4px hover-visible scrollbar) into ThreadView container
- [ ] Add view mode toggle button to the main graph toolbar so users can switch to Thread View
- [ ] Wire branch selection: clicking a branch option sets the active branch path in local state and reorders the displayed list
- [ ] Add ARIA roles: `role="feed"` on the list, `aria-label` on each card, `aria-expanded` on fork indicators per UX-DR56
- [ ] Write unit tests for derivation-order sort algorithm
- [ ] Write component tests for ThreadView rendering, fork indicator expand/collapse, order toggle

## Dev Notes
- Key files to create: `src/features/thread/ThreadView.tsx`, `src/features/thread/ThreadUnitCard.tsx`, `src/features/thread/RelationConnector.tsx`, `src/features/thread/ForkIndicator.tsx`, `src/features/thread/ThreadViewToolbar.tsx`
- Key files to modify: `src/store/viewStore.ts` (add view mode), `src/server/routers/unit.ts` (add listForThread), `src/server/services/unitService.ts` (derivation sort)
- Dependencies: Epic 1 (Unit model), Epic 2 (UnitCard component), Epic 3 (Context + activeContextId), Epic 4 (Relation model + types)
- Technical approach: Derivation order = BFS/DFS starting from units with no incoming DERIVES_FROM edges. Branch detection = units with more than one outgoing DERIVES_FROM edge. The connector SVG lines can be absolutely positioned relative to the card container using a ResizeObserver to track card heights. Relation type colors should reuse the same color map defined in Epic 4's graph renderer.
- Chronological order is simple `ORDER BY created_at ASC`. Derivation order requires building a DAG in the service layer from relations where `relation_type = 'DERIVES_FROM'`.

## References
- Epic 6: Navigation, Search & Discovery
- FR46: Thread View with linear reading
- UX-DR29: Thread View layout with connector lines
- UX-DR23: ScrollArea with 4px hover-visible scrollbar
- UX-DR56: Accessibility — text-based navigation alternative
- Related: Story 4.1 (Relation API), Story 4.2 (Relation types/colors), Story 3.4 (Context View filtered display)
