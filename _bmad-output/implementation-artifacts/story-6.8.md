# Story 6.8: Cross-View Coordination Enhancement

**Status: pending**

## Description
As a user,
I want all views (Graph, Thread, Context, Search, Dashboard) to stay synchronized when I select or navigate to a Unit,
So that switching between views feels seamless and I never lose my place.

## Acceptance Criteria

**Given** multiple views exist (Graph View, Thread View, Context View, Search View)
**When** the user selects a Unit in any view
**Then** all other open views highlight the same Unit simultaneously per FR50
**And** the Detail Panel updates to show the selected Unit

**Given** a Unit is selected
**When** synchronization propagates
**Then** synchronization is instantaneous from the user's perspective per NFR3

**Given** the user has multiple tabs open
**When** they select a Unit in one tab
**Then** tRPC Subscriptions via WebSocket enable multi-tab sync — selecting a Unit in one tab highlights it in another per architecture requirement

**Given** a view change occurs
**When** ARIA live regions are present
**Then** ARIA live regions announce view changes politely per UX-DR55

**Given** the selection store from Epic 4 (Story 4.9) exists
**When** it is extended for Epic 6
**Then** the selection store is extended to support all view types including Thread View, Search View, and Context Dashboard

## Tasks
- [ ] Extend `selectionStore.ts` at `src/store/selectionStore.ts` (from Story 4.9):
  - Add `selectedUnitId: string | null`
  - Add `selectedView: 'graph' | 'thread' | 'context' | 'search' | 'dashboard' | null`
  - Add `setSelectedUnit(unitId: string | null, sourceView: ViewType): void`
  - Add `hoveredUnitId: string | null` and `setHoveredUnit(unitId: string | null): void`
- [ ] Update Graph View to read `selectedUnitId` from store and apply highlight class to selected node
- [ ] Update Thread View (Story 6.1) to read `selectedUnitId` from store and apply highlight styling to selected ThreadUnitCard
- [ ] Update Context View (Epic 3) to read `selectedUnitId` and scroll-into-view when selection changes from another view
- [ ] Update Search Results (Story 6.4) to read `selectedUnitId` and highlight the matching SearchResultCard
- [ ] Update Context Dashboard (Story 6.6) to read `selectedUnitId` and highlight hub unit cards in the HubUnitsList
- [ ] Ensure Detail Panel (from Epic 4 or sidebar) subscribes to `selectedUnitId` and updates its content whenever it changes
- [ ] Implement multi-tab sync via tRPC subscription:
  - Add `unit.onSelectionChange` tRPC subscription procedure in `src/server/routers/unit.ts`
  - When `setSelectedUnit` is called, emit event to the subscription channel via tRPC's WebSocket transport
  - All connected clients subscribed to the channel update their `selectionStore`
- [ ] Create `useSelectionSync` hook at `src/hooks/useSelectionSync.ts` — subscribes to `unit.onSelectionChange` tRPC subscription and updates local store
- [ ] Mount `useSelectionSync` in the root layout component so all tabs/views stay connected
- [ ] Add ARIA live region component at `src/components/a11y/LiveRegion.tsx` — `aria-live="polite"` div that announces messages
- [ ] Wire LiveRegion announcements to: unit selection changes ("Now viewing [unit title]"), view switches ("Switched to Thread View"), search results ("N results found for query")
- [ ] Add `aria-selected="true"` to selected unit cards in all views per UX-DR55
- [ ] Add smooth scroll-into-view behavior when selection changes programmatically — use `element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` in each view
- [ ] Write unit tests for `selectionStore` — verify `setSelectedUnit` updates all subscribed values
- [ ] Write integration tests for cross-view sync: select unit in Graph, verify Thread View highlights same unit
- [ ] Write test for multi-tab sync via mocked tRPC subscription

## Dev Notes
- Key files to create: `src/hooks/useSelectionSync.ts`, `src/components/a11y/LiveRegion.tsx`
- Key files to modify: `src/store/selectionStore.ts` (extend with new fields), `src/server/routers/unit.ts` (add onSelectionChange subscription), all view components (Graph, Thread, Context, Search, Dashboard) to consume `selectedUnitId`
- Dependencies: Story 4.9 (existing selectionStore), Story 6.1 (Thread View), Story 6.4 (Search View), Story 6.6 (Context Dashboard), Epic 4 (Graph View + Detail Panel), tRPC WebSocket transport (must be configured in the app)
- Technical approach: The Zustand store handles same-tab synchronization — all view components subscribe to `selectedUnitId` reactively. Multi-tab sync requires WebSocket: use tRPC's `createWSClient` and the subscription procedure. The `onSelectionChange` subscription uses a simple pub/sub model scoped to `user_id` so users only see their own selections across tabs. For instantaneous perception (NFR3), the local store update happens immediately on click (optimistic), then the WebSocket event propagates to other tabs. No server round-trip is needed for same-tab sync.
- ARIA live regions should use `aria-live="polite"` (not "assertive") to avoid interrupting screen reader users mid-speech. Announcements should be brief: "Unit selected: [title]" rather than the full unit content.

## References
- Epic 6: Navigation, Search & Discovery
- FR50: Cross-view Unit selection synchronization
- NFR3: Instantaneous synchronization from user perspective
- UX-DR55: ARIA live regions for view changes
- Related: Story 4.9 (original selectionStore), Story 6.1 (Thread View), Story 6.4 (Search View), Story 6.6 (Context Dashboard), Story 6.7 (Graph View)
