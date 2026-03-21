# Story 7.2: Assembly View with Drag-and-Drop Ordering

**Status: pending**

## Description
As a user,
I want to arrange Units in an Assembly by dragging and dropping them into the order I want,
So that I can compose my document structure intuitively.

## Acceptance Criteria

**Given** an Assembly exists with Units
**When** the user opens Assembly View
**Then** the AssemblyBoard component renders Units as draggable cards in their ordered positions per UX-DR13, FR47
**And** a left search/browse rail allows finding and adding Units to the Assembly per UX-DR30

**Given** the user drags a Unit card
**When** they release it over a new position
**Then** drag-and-drop uses dnd-kit with 6-dot grip handles, 0.8 opacity during drag, dashed drop zones, and 200ms spring snap per UX-DR40
**And** the new order is persisted via `assembly.reorderUnits` tRPC call

**Given** the Assembly View is open
**When** the user views the header
**Then** assembly metadata (name, description, unit count, last modified) is displayed per UX-DR30

**Given** the user is in the Assembly View
**When** they click the preview/edit toggle
**Then** editing mode (drag-and-drop) and preview mode (read-only rendered) alternate per UX-DR13

**Given** a Unit card is selected
**When** the user presses arrow keys
**Then** the card moves up or down in position (keyboard-based reordering)

**Given** the user removes a Unit from the Assembly
**When** the removal is confirmed
**Then** the Unit is only removed from the Assembly — the Unit itself is not deleted globally

## Tasks
- [ ] Install `@dnd-kit/core` and `@dnd-kit/sortable` if not already present: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [ ] Create page route `src/app/(app)/assembly/[id]/page.tsx` that loads assembly data via `trpc.assembly.getById`
- [ ] Create `src/components/assembly/AssemblyBoard.tsx` — main board component accepting `assemblyId` prop; wraps children in dnd-kit `DndContext` and `SortableContext`
- [ ] Create `src/components/assembly/AssemblyUnitCard.tsx` — draggable card using `useSortable` hook; shows Unit content preview, type badge, context label, and 6-dot grip handle (CSS `cursor: grab`); apply `opacity-80` during active drag
- [ ] Implement dashed drop zone visualization: when a card is dragged over a position, render a dashed-border placeholder div at the insertion point
- [ ] Implement 200ms spring snap animation using dnd-kit's `CSS.Translate.toString` transition or Framer Motion layout animation
- [ ] On `DragEndEvent`: optimistically reorder the local list and call `trpc.assembly.reorderUnits.mutate` with the new positions array; rollback on error
- [ ] Create `src/components/assembly/AssemblySearchRail.tsx` — left sidebar/panel with search input and Unit list; supports searching by content, type, and Context; clicking a Unit calls `trpc.assembly.addUnit`
- [ ] Create `src/components/assembly/AssemblyHeader.tsx` — displays assembly name (editable inline), description, unit count badge, and last modified timestamp; edit triggers `trpc.assembly.update`
- [ ] Create `src/components/assembly/AssemblyViewToggle.tsx` — toggle button switching between "Edit" and "Preview" mode; stored in local component state (not persisted)
- [ ] Create `src/components/assembly/AssemblyPreview.tsx` — read-only rendered view of all Units in order; renders Unit content with markdown/prose formatting; includes bridge text zones (placeholder for Story 7.4)
- [ ] Implement keyboard reordering: on card focus, listen for `ArrowUp`/`ArrowDown` and call reorder mutation; show visual focus ring per a11y standards
- [ ] Create `src/store/assemblyStore.ts` (Zustand) with state: `assemblyId`, `units: AssemblyUnit[]`, `mode: 'edit' | 'preview'`, `selectedUnitId`; actions: `setUnits`, `reorderLocally`, `setMode`
- [ ] Add remove Unit button on each AssemblyUnitCard; clicking shows confirmation popover then calls `trpc.assembly.removeUnit`
- [ ] Write tests: drag reorder calls reorderUnits mutation, keyboard reorder works, remove does not delete unit globally, preview mode hides drag handles, search rail adds unit

## Dev Notes
- Key files: `src/app/(app)/assembly/[id]/page.tsx`, `src/components/assembly/AssemblyBoard.tsx`, `src/components/assembly/AssemblyUnitCard.tsx`, `src/components/assembly/AssemblySearchRail.tsx`, `src/store/assemblyStore.ts`
- Dependencies: Story 7.1 (assembly tRPC router), `@dnd-kit/sortable` package
- Technical approach: Use `verticalListSortingStrategy` from dnd-kit for single-column ordering. Optimistic updates in Zustand store: apply reorder locally before API call, revert on error with toast notification. The search rail queries `trpc.unit.search` (from Epic 2) filtered by the user's units. Bridge text zones between cards are empty divs in this story — Story 7.4 populates them.
- UX-DR40 specifies exact drag animation specs: 6-dot handle, 0.8 opacity, dashed drop zone, 200ms spring.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.1 (data model), Story 7.3 (template slots in cards), Story 7.4 (bridge text zones), Story 7.5 (diff view)
- FR47: drag-and-drop reordering; UX-DR13: AssemblyBoard; UX-DR30: Assembly View screen; UX-DR40: drag animation spec
