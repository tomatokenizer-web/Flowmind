# Story 6.7: Graph View Navigation Purpose Integration

**Status: pending**

## Description
As a user,
I want the Graph View to adapt its visual emphasis based on my navigation purpose,
So that the graph highlights what matters most for my current exploration mode.

## Acceptance Criteria

**Given** the Graph Canvas from Epic 4 is rendered
**When** a navigation purpose is selected (argument, creative, chronological, explore)
**Then** relation line thickness, color intensity, and visibility update in real time per FR37, NFR2

**Given** a navigation purpose is active
**When** the graph re-renders
**Then** node positions optionally re-cluster based on the active purpose (argument mode clusters by support/contradict chains; creative mode clusters by inspiration chains)
**And** the navigation path supports simultaneous vertical (chronological/derivation) and horizontal (semantic jump) movement per FR36

**Given** any navigation purpose mode is active
**When** the layer indicator is visible
**Then** the layer indicator reflects the current purpose mode

**Given** any navigation purpose mode is active
**When** navigating through the graph
**Then** the Global Overview → Local Card Array → Unit Detail navigation path is preserved across all purpose modes per FR44, FR45

## Tasks
- [ ] Consume `navigationPurposeStore` (Story 6.2) in the Graph View canvas component — subscribe to `activePurpose`
- [ ] Update graph edge rendering to apply `purposeWeights` (Story 6.2): strokeWidth, opacity, color per edge based on `activePurpose` and relation type
- [ ] Update graph node rendering to scale node size by `thought_rank` (Story 6.5) — `nodeRadius = baseRadius + thoughtRank * scaleFactor`
- [ ] Implement purpose-based clustering in `src/features/graph/graphLayoutService.ts`:
  - Argument mode: use a force-directed layout that increases attractive force between units connected by `supports`/`contradicts` relations
  - Creative mode: increase attractive force between units connected by `inspires`/`echoes`/`foreshadows` relations
  - Chronological mode: layout nodes in vertical bands by `created_at` decade/month
  - Explore mode: default force-directed layout (existing behavior)
- [ ] Add smooth animated layout transition (300ms) when purpose changes — interpolate node positions using `d3-transition` or react-spring
- [ ] Implement simultaneous navigation axes per FR36:
  - Vertical axis (chronological/derivation): keyboard Up/Down navigates to next/previous unit by time or derivation
  - Horizontal axis (semantic jump): keyboard Left/Right navigates to semantically closest unit (by embedding similarity)
- [ ] Add `useGraphNavigation` hook at `src/features/graph/useGraphNavigation.ts` — handles keyboard navigation within graph
- [ ] Update the graph layer indicator (from Epic 4) to display current purpose mode label and icon
- [ ] Preserve Global Overview → Local Card Array → Unit Detail zoom levels across purpose switches — zoom state must not reset when purpose changes
- [ ] Add purpose-specific graph legend overlay: shows which relation types are highlighted vs. dimmed for the active purpose
- [ ] Create `GraphPurposeLegend` component at `src/features/graph/GraphPurposeLegend.tsx` — positioned in bottom-left of graph canvas
- [ ] Ensure clustering computation runs off the main thread (web worker or requestIdleCallback) to avoid blocking UI per NFR2
- [ ] Write unit tests for `graphLayoutService.ts` — verify correct cluster groupings per purpose
- [ ] Write unit tests for `useGraphNavigation` keyboard navigation logic

## Dev Notes
- Key files to create: `src/features/graph/useGraphNavigation.ts`, `src/features/graph/GraphPurposeLegend.tsx`
- Key files to modify: `src/features/graph/GraphCanvas.tsx` (edge + node rendering updates, purpose subscription), `src/features/graph/graphLayoutService.ts` (purpose-based clustering), Epic 4 layer indicator component
- Dependencies: Story 6.2 (navigationPurposeStore and purposeWeights), Story 6.5 (thought_rank for node sizing), Epic 4 (Graph Canvas, layout service, layer indicator)
- Technical approach: The Graph Canvas already uses a force simulation (from Epic 4). Purpose-based clustering is implemented by modifying force strengths rather than changing the algorithm — this allows smooth animated transitions. Semantic jump navigation requires precomputed nearest-neighbor lists per unit (using pgvector k-NN query); cache top-5 nearest neighbors per unit in the unit data payload. Layout transitions use `d3-transition` if D3 is used, or animate node positions via react-spring if the graph uses React-rendered nodes.
- NFR2 (real-time, no page reload) is met by Zustand store subscription — the graph component re-renders when `activePurpose` changes without any route navigation.

## References
- Epic 6: Navigation, Search & Discovery
- FR36: Simultaneous vertical and horizontal navigation
- FR37: Purpose-based relation weight rendering in Graph View
- FR44: Global Overview → Local Card Array navigation
- FR45: Unit Detail navigation path
- NFR2: Real-time updates without page reload
- Related: Story 6.2 (PurposeModeSelector and purposeWeights), Story 6.5 (ThoughtRank for node sizing), Story 6.8 (cross-view sync), Epic 4 (Graph Canvas base implementation)
