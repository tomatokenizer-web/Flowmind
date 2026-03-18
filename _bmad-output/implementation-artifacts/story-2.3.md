# Story 2.3: UnitCard Component with Three Variants

Status: complete

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

- [x] Task 1: Create base UnitCard component (AC: #1, #4, #5)
  - [x] Create `src/components/unit/unit-card.tsx`
  - [x] Accept props: `unit`, `variant` ("compact" | "standard" | "expanded"), `selected`, `onClick`
  - [x] Implement type-colored left border using `UNIT_TYPE_COLORS` from Story 2.2
  - [x] Add `role="article"` and `aria-label` with unit type and truncated content
  - [x] Implement all 6 visual states with CSS classes/Tailwind variants
- [x] Task 2: Implement Compact variant (AC: #1)
  - [x] Show type-colored left border (4px)
  - [x] Truncate content to first line with ellipsis (`line-clamp-1`)
  - [x] Show unit type badge (small pill with type color)
- [x] Task 3: Implement Standard variant (AC: #2)
  - [x] Include all Compact elements
  - [x] Add metadata row: created date (relative, via date-fns), lifecycle badge component
  - [x] Add branch potential placeholder (●●●○ dots, non-functional)
  - [x] Add relation count indicator (number badge, zero for now)
  - [x] Add context membership tags (placeholder chips)
- [x] Task 4: Implement Expanded variant (AC: #3)
  - [x] Include all Standard elements
  - [x] Show full content (no truncation)
  - [x] Add version history link (non-functional placeholder → Story 2.7)
  - [x] Add provenance info row (origin_type, source_span preview)
  - [x] Add relation list preview section (placeholder → Epic 4)
- [x] Task 5: Implement visual states (AC: #4)
  - [x] Default: base styling
  - [x] Hover: shadow elevation increase (Framer Motion whileHover)
  - [x] Selected: accent-colored ring (2px)
  - [x] Draft: dashed border, 80% opacity
  - [x] Pending: yellow left border, subtle yellow background tint
  - [x] Confirmed: solid border, full opacity
- [x] Task 6: Add drag grip handle (AC: #6)
  - [x] Show GripVertical icon on hover (left edge)
  - [x] Use `cursor: grab` on the grip handle
  - [x] Placeholder only — dnd-kit wiring comes in Story 2.10
- [ ] Task 7: Create UnitCardList component (deferred — needs real data from Epic 3)
  - [ ] Create `src/components/unit/unit-card-list.tsx`
  - [ ] Render list of UnitCards with virtualization via TanStack Virtual for performance
  - [ ] Support switching variant mode for the entire list
- [ ] Task 8: Write tests (deferred — tracked separately)
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
