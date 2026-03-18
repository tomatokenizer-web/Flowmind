# Story 2.10: Drag-and-Drop Foundation & Undo/Redo System

Status: ready-for-dev

## Story

As a user,
I want to drag units to reorder them and undo/redo my actions,
So that I can freely experiment with my thought organization without fear of losing work.

## Acceptance Criteria

1. **Given** UnitCards are rendered in a list, **When** the user hovers over a card, **Then** a 6-dot grip handle appears per UX-DR40
2. Dragging a card shows it at 0.8 opacity with dashed accent drop zones indicating valid targets per UX-DR40
3. Dropping a card snaps it into position with a 200ms spring animation per UX-DR40
4. Keyboard-initiated drag-and-drop is supported (Space to grab, arrows to move, Space to drop) per UX-DR40
5. Cmd+Z undoes the last action (unit create, edit, delete, reorder, lifecycle change) per UX-DR41
6. Cmd+Shift+Z redoes the last undone action per UX-DR41
7. Undo triggers a toast showing the action name (e.g., "Unit creation undone") per UX-DR41
8. Destructive operations (delete) show a confirmation dialog before executing per UX-DR41

## Tasks / Subtasks

- [ ] Task 1: Set up dnd-kit for UnitCardList (AC: #1, #2, #3)
  - [ ] Import and configure `@dnd-kit/core` and `@dnd-kit/sortable`
  - [ ] Wrap UnitCardList with `DndContext` and `SortableContext`
  - [ ] Make each UnitCard a `useSortable` item
  - [ ] Wire up the 6-dot grip handle as the drag activator
  - [ ] Configure `restrictToVerticalAxis` modifier for list reordering
- [ ] Task 2: Implement drag visual feedback (AC: #2, #3)
  - [ ] Create `DragOverlay` component showing the dragged card at 0.8 opacity
  - [ ] Show dashed accent-colored drop zone indicators between cards
  - [ ] Implement 200ms spring animation on drop using `useSortable` transition config
  - [ ] Hide the original card's position during drag (placeholder with dashed border)
- [ ] Task 3: Implement keyboard drag-and-drop (AC: #4)
  - [ ] Configure `KeyboardSensor` with `sortableKeyboardCoordinates`
  - [ ] Space to pick up / drop a focused card
  - [ ] Arrow Up/Down to move within the list
  - [ ] Escape to cancel drag
  - [ ] Announce drag actions for screen readers (`announcements` prop)
- [ ] Task 4: Persist reorder changes (AC: #1)
  - [ ] Add `sort_order` field to Unit model (integer, nullable)
  - [ ] Create `unit.reorder` tRPC procedure accepting `{ unitId, newIndex }`
  - [ ] Use optimistic UI for reorder — update local state immediately, sync to server
  - [ ] Handle reorder conflicts (if another user reordered simultaneously)
- [ ] Task 5: Create undo/redo system (AC: #5, #6, #7)
  - [ ] Create `src/stores/undoStore.ts` with Zustand
  - [ ] Define action types: `unit.create`, `unit.update`, `unit.delete`, `unit.reorder`, `unit.lifecycleChange`
  - [ ] Implement undo stack (max 50 actions) and redo stack
  - [ ] Each action stores: `type`, `payload` (before/after state), `timestamp`, `description`
  - [ ] `undo()`: pop from undo stack, execute reverse action, push to redo stack
  - [ ] `redo()`: pop from redo stack, execute action, push to undo stack
- [ ] Task 6: Register undo/redo keyboard shortcuts (AC: #5, #6)
  - [ ] Cmd+Z / Ctrl+Z triggers `undo()`
  - [ ] Cmd+Shift+Z / Ctrl+Shift+Z triggers `redo()`
  - [ ] Disable when no actions in stack
- [ ] Task 7: Implement undo toast notifications (AC: #7)
  - [ ] On undo: show toast "Unit creation undone", "Edit undone", etc.
  - [ ] Toast includes "Redo" action button for quick redo
  - [ ] Use existing toast system from Story 1.7
- [ ] Task 8: Implement delete confirmation dialog (AC: #8)
  - [ ] Create `src/components/dialogs/ConfirmDeleteDialog.tsx`
  - [ ] Show unit title/preview in the dialog
  - [ ] "Delete" (destructive red) and "Cancel" buttons
  - [ ] Keyboard: Enter to confirm, Escape to cancel
  - [ ] On confirm: push to undo stack, then delete
- [ ] Task 9: Integrate undo system with existing mutations
  - [ ] Wire `unit.create` to push create action to undo stack
  - [ ] Wire `unit.update` to push edit action (with before/after content)
  - [ ] Wire `unit.delete` to push delete action (with full unit data for restoration)
  - [ ] Wire `unit.transitionLifecycle` to push lifecycle action
  - [ ] Wire reorder to push reorder action
- [ ] Task 10: Write tests
  - [ ] Test drag-and-drop reorders cards correctly
  - [ ] Test keyboard drag (Space → Arrow → Space)
  - [ ] Test drag visual feedback (opacity, drop zones)
  - [ ] Test undo reverts each action type
  - [ ] Test redo re-applies each action type
  - [ ] Test undo stack limit (50 actions)
  - [ ] Test toast appears on undo
  - [ ] Test delete confirmation dialog
  - [ ] Test undo of delete restores the unit

## Dev Notes

- dnd-kit is already installed (Story 1.1) — use `@dnd-kit/core` for the DnD context and `@dnd-kit/sortable` for list reordering
- The undo/redo system is a critical foundation used throughout the app — design it to be extensible for future action types (relation creation, context moves, etc.)
- The undo stack stores enough data to reverse any action — for deletes, this means storing the full unit data so it can be recreated
- Spring animation on drop: use `animateLayoutChanges` from dnd-kit or Framer Motion's `layout` prop
- The `sort_order` field enables manual ordering within lists; when not set, units default to `created_at` order
- Consider making the undo system a middleware/wrapper around tRPC mutations to automatically capture before/after state

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — dnd-kit for drag-and-drop
- [Source: _bmad-output/planning-artifacts/architecture.md] — Zustand for client state (undo stack)
- [Source: _bmad-output/planning-artifacts/architecture.md] — Event bus for mutation notifications
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.10] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR40: Drag-and-drop specifications (grip handle, opacity, drop zones, spring animation)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR41: Undo/redo specifications (shortcuts, toast, confirmation dialog)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR43: Keyboard shortcuts
