# Story 2.2: Unit Type System with AI-Proposed Types

Status: complete

## Story

As a user,
I want each Thought Unit to carry a logical type (Claim, Question, Evidence, etc.) that AI proposes and I confirm,
So that my thoughts are categorized by their cognitive role automatically while I retain full control.

## Acceptance Criteria

1. **Given** a Thought Unit exists, **When** a new Unit is created from user input, **Then** the system assigns a default type based on content heuristics (e.g., ends with "?" → Question, starts with "I think" → Claim) per FR2
2. The assigned type is set with `lifecycle: "draft"` so the user must confirm it
3. The user can change the type via a dropdown showing all 9 base types with their type-colored indicators
4. Changing the type updates the Unit immediately with optimistic UI per UX-DR58
5. Each Unit type has a distinct color token (background tint and dark accent) as defined in UX-DR2
6. The type assignment is per-Unit at the global level (perspective-based type override comes in Epic 3)

## Tasks / Subtasks

- [ ] Task 1: Implement content heuristic type assignment (AC: #1, #2)
  - [ ] Create `server/services/typeHeuristicService.ts`
  - [ ] Implement heuristic rules: question mark → Question, "I think"/"I believe" → Claim, "For example"/"e.g." → Evidence, "But"/"However" → Counterargument, "What if"/"Maybe" → Idea, default → Observation
  - [ ] Integrate into `unitService.create()` — auto-assign type when not explicitly provided
  - [ ] Set `lifecycle: "draft"` on auto-assigned types
- [ ] Task 2: Define unit type color tokens (AC: #5)
  - [ ] Verify/add CSS custom properties for all 9 unit type colors in `src/styles/tokens.css`
  - [ ] Create a `UNIT_TYPE_COLORS` constant map: `{ claim: { bg: '...', accent: '...' }, ... }`
  - [ ] Ensure colors are accessible (WCAG AA contrast ratio)
- [ ] Task 3: Create UnitTypeSelector component (AC: #3, #4)
  - [ ] Create `src/components/units/UnitTypeSelector.tsx`
  - [ ] Render dropdown with all 9 base types, each showing color indicator dot + type name
  - [ ] On selection, call `unit.update` mutation with optimistic UI
  - [ ] Show current type as selected with checkmark
- [ ] Task 4: Integrate type system into Unit creation flow (AC: #1, #6)
  - [ ] Wire heuristic service into `unit.create` tRPC procedure
  - [ ] Return assigned type in creation response
  - [ ] Add unit tests for heuristic rules
- [ ] Task 5: Write tests (AC: #1–#6)
  - [ ] Test each heuristic rule with sample inputs
  - [ ] Test fallback to Observation for unmatched content
  - [ ] Test optimistic type change via tRPC mutation
  - [ ] Test that type assignment is global (not perspective-based)

## Dev Notes

- The heuristic type assignment is a simple rule-based system — NOT an AI call. AI-powered type suggestion comes in Epic 5
- Content heuristics should be case-insensitive and handle common patterns
- Type colors are defined in the UX design spec (UX-DR2) and should already exist in `tokens.css` from Story 1.1
- Optimistic UI means updating the local state immediately, then syncing with the server — use tRPC's `useMutation` with `onMutate` for optimistic updates
- The 9 base types are fixed system types; custom types come in a later epic

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Service layer for business logic
- [Source: _bmad-output/planning-artifacts/architecture.md] — tRPC optimistic mutations
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR2: Unit type color system
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR58: Optimistic UI updates
