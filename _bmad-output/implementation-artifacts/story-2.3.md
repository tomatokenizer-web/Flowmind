# Story 2.3: UnitCard Component with Three Variants

Status: ready-for-dev

## Story

As a user,
I want to see my thoughts as visually rich cards with different detail levels,
So that I can scan quickly or dive deep depending on my current task.

## Acceptance Criteria

1. **Given** Thought Units exist in the database, **When** they are rendered as UnitCard components, **Then** the Compact variant shows type-colored left border, first line of content (truncated), and unit type badge
2. The Standard variant adds metadata row (created date, lifecycle badge, branch potential placeholder), relation count indicator, and context membership tags
3. The Expanded variant adds full content, version history link, provenance info, and relation list preview
4. Cards support 6 visual states: Default, Hover (elevation change), Selected (accent border), Draft (dashed border, 80% opacity), Pending (yellow left border, yellow tint), Confirmed (solid border, full opacity) per UX-DR3, UX-DR10
5. Each card has `role="article"` and sr-only labels for accessibility per UX-DR10
6. Hover state shows a 6-dot drag grip handle (placeholder for dnd-kit integration) per UX-DR40

## Tasks / Subtasks

- [ ] Task 1: Create base UnitCard component (AC: #1, #4, #5)
  - [ ] Create `src/components/units/UnitCard.tsx`
  - [ ] Accept props: `unit`, `variant` ("compact" | "standard" | "expanded"), `selected`, `onClick`
  - [ ] Implement type-colored left border using `UNIT_TYPE_COLORS` from Story 2.2
  - [ ] Add `role="article"` and `aria-label` with unit type and truncated content
  - [ ] Implement all 6 visual states with CSS classes/Tailwind variants
- [ ] Task 2: Implement Compact variant (AC: #1)
  - [ ] Show type-colored left border (4px)
  - [ ] Truncate content to first line with ellipsis
  - [ ] Show unit type badge (small pill with type color)
- [ ] Task 3: Implement Standard variant (AC: #2)
  - [ ] Include all Compact elements
  - [ ] Add metadata row: created date (relative, via date-fns), lifecycle badge component
  - [ ] Add branch potential placeholder (●●●○ dots, non-functional)
  - [ ] Add relation count indicator (number badge, zero for now)
  - [ ] Add context membership tags (placeholder chips)
- [ ] Task 4: Implement Expanded variant (AC: #3)
  - [ ] Include all Standard elements
  - [ ] Show full content (no truncation)
  - [ ] Add version history link (non-functional placeholder → Story 2.7)
  - [ ] Add provenance info row (origin_type, source_span preview)
  - [ ] Add relation list preview section (placeholder → Epic 4)
- [ ] Task 5: Implement visual states (AC: #4)
  - [ ] Default: base styling
  - [ ] Hover: shadow elevation increase (`shadow-md` → `shadow-lg`)
  - [ ] Selected: accent-colored border (2px)
  - [ ] Draft: dashed border, 80% opacity
  - [ ] Pending: yellow left border, subtle yellow background tint
  - [ ] Confirmed: solid border, full opacity
- [ ] Task 6: Add drag grip handle (AC: #6)
  - [ ] Show 6-dot grip icon on hover (top-left or left edge)
  - [ ] Use `cursor: grab` on the grip handle
  - [ ] Placeholder only — dnd-kit wiring comes in Story 2.10
- [ ] Task 7: Create UnitCardList component
  - [ ] Create `src/components/units/UnitCardList.tsx`
  - [ ] Render list of UnitCards with virtualization via TanStack Virtual for performance
  - [ ] Support switching variant mode for the entire list
- [ ] Task 8: Write tests
  - [ ] Test each variant renders correct elements
  - [ ] Test visual state class application
  - [ ] Test accessibility attributes
  - [ ] Test content truncation in Compact variant

## Dev Notes

- Use Tailwind utility classes for all styling — avoid CSS modules or styled-components
- The 6 visual states can be composed via conditional class merging with `cn()` utility
- TanStack Virtual is already installed (Story 1.1) — use it for the card list to handle large numbers of Units
- Branch potential score (●●●○) is purely visual placeholder here; the actual score computation comes in Epic 5
- Relation count and context tags are placeholders — they show "0" or empty until Epic 3/4 wire them up
- Keep the component composable: variant prop controls detail level, visual state is derived from unit.lifecycle + selected prop

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Component composition patterns
- [Source: _bmad-output/planning-artifacts/architecture.md] — TanStack Virtual for list virtualization
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR3: Card variant specifications
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR10: Card visual states and accessibility
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR40: Drag grip handle specification
