# Story 2.5: AI Lifecycle System (Draft → Pending → Confirmed)

Status: complete

## Story

As a user,
I want AI-generated content to go through a clear visual lifecycle before it becomes part of my knowledge,
So that I always know what's AI-proposed versus what I've approved.

## Acceptance Criteria

1. **Given** a Unit exists with any lifecycle state, **When** the Unit is in `draft` state, **Then** it renders with a dashed border and gray background, cannot be added to Assemblies, cannot create relations, and cannot be used in Navigators per FR27, NFR8
2. An AILifecycleBadge component shows "Draft" with dashed gray styling in Small (inline) and Medium (card) sizes per UX-DR17
3. **When** the user clicks "Review" on a draft Unit, **Then** it transitions to `pending` state with yellow border styling and is queued for user review
4. **When** the user clicks "Confirm" on a pending Unit, **Then** it transitions to `confirmed` state with solid border and full opacity, and gains full functionality (relations, assemblies, navigators)
5. Keyboard shortcuts D, P, C cycle lifecycle states for the selected Unit per UX-DR43
6. Lifecycle transitions use optimistic UI with event bus notification per UX-DR58
7. Undo is available via Cmd+Z for the most recent lifecycle change per UX-DR41

## Tasks / Subtasks

- [x] Task 1: Create AILifecycleBadge component (AC: #2)
  - [x] Create `src/components/units/AILifecycleBadge.tsx`
  - [x] Implement Small variant (inline pill): icon + label, 20px height
  - [x] Implement Medium variant (card badge): icon + label + description, 32px height
  - [x] Draft styling: dashed gray border, gray-100 bg, gray-500 text
  - [x] Pending styling: solid yellow border, yellow-50 bg, yellow-700 text
  - [x] Confirmed styling: solid green border, green-50 bg, green-700 text
- [x] Task 2: Implement lifecycle state restrictions (AC: #1)
  - [x] Add service-layer validation: draft Units cannot be added to Assemblies
  - [x] Add service-layer validation: draft Units cannot create relations
  - [x] Add service-layer validation: draft Units cannot be used in Navigators
  - [x] Return clear error messages when restricted operations are attempted
- [x] Task 3: Create lifecycle transition actions (AC: #3, #4, #6)
  - [x] Add `unit.transitionLifecycle` tRPC procedure accepting `{ id, targetState }`
  - [x] Validate transitions: draft → pending, pending → confirmed, confirmed → draft (for reset)
  - [x] Implement optimistic UI for transitions
  - [x] Publish `unit.lifecycleChanged` event via event bus
- [x] Task 4: Add lifecycle control buttons to UnitCard (AC: #3, #4)
  - [x] Show "Review" button on draft Units
  - [x] Show "Confirm" button on pending Units
  - [x] Show "Reset to Draft" option on confirmed Units (in overflow menu)
  - [x] Buttons use appropriate colors matching the target state
- [x] Task 5: Implement keyboard shortcuts (AC: #5)
  - [x] Register D key: set selected Unit to Draft
  - [x] Register P key: set selected Unit to Pending
  - [x] Register C key: set selected Unit to Confirmed
  - [x] Only active when a Unit is selected (not when input is focused)
- [x] Task 6: Implement undo for lifecycle changes (AC: #7)
  - [x] Track last lifecycle change in undo stack (Zustand store)
  - [x] Cmd+Z reverts the most recent lifecycle transition
  - [x] Show toast: "Lifecycle change undone: [Unit title] → [previous state]"
- [x] Task 7: Write tests
  - [x] Test badge renders correctly for each lifecycle state and size
  - [x] Test draft restrictions (cannot add to assembly, create relations)
  - [x] Test transition flow: draft → pending → confirmed
  - [x] Test keyboard shortcuts D, P, C
  - [x] Test undo reverts lifecycle change
  - [x] Test optimistic UI updates

## Dev Notes

- The lifecycle system is one of Flowmind's key differentiators — it creates a trust boundary between AI-generated and user-approved content
- Draft restrictions are enforced at the service layer, NOT just the UI. Even API calls should be blocked.
- The undo stack for lifecycle changes is a precursor to the full undo/redo system in Story 2.10 — design it to be extensible
- Keyboard shortcuts should respect focus context: D/P/C only work when a Unit is selected in the card list, not when the user is typing in an input
- Consider adding a bulk lifecycle transition for multiple selected Units (future enhancement)

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Service layer validation for business rules
- [Source: _bmad-output/planning-artifacts/architecture.md] — Event bus for cross-component notification
- [Source: _bmad-output/planning-artifacts/architecture.md] — Zustand for undo stack state
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR17: AI lifecycle badge specifications
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR43: Keyboard shortcuts (D, P, C)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR41: Undo/redo system
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR58: Optimistic UI updates
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — FR27: 3-stage AI content lifecycle
