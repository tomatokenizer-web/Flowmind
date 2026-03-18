# Story 1.4: Design System Tokens & Theme Configuration

Status: ready-for-dev

## Story

As a developer,
I want all design tokens (colors, typography, spacing, elevation, animation, breakpoints) defined as CSS custom properties and Tailwind config,
So that every component uses consistent visual language from a single source of truth.

## Acceptance Criteria

1. Base color CSS custom properties are set (--bg-primary: #FFFFFF, --bg-secondary: #F5F5F7, --bg-surface: #FAFAFA, --bg-hover: #F0F0F2, --text-primary: #1D1D1F, --text-secondary: #6E6E73, --text-tertiary: #AEAEB2, --border-default: #D2D2D7, --border-focus: #0071E3, --accent-primary: #0071E3) per UX-DR1
2. Unit-type color tokens are defined for all 9 types (Claim, Question, Evidence, Counterargument, Observation, Idea, Definition, Assumption, Action) with background tint and dark accent pairs per UX-DR2
3. Lifecycle state visual tokens are defined — Draft (dashed border, 80% opacity), Pending (yellow left border, yellow tint), Confirmed (solid border, full opacity) per UX-DR3
4. Semantic color tokens are set (--success: #34C759, --warning: #FF9500, --error: #FF3B30, --info: #5AC8FA) per UX-DR4
5. Typography tokens define 3 font stacks (primary, heading, mono), 7-step type scale (11px to 39px) with weights, line heights, and letter-spacing per UX-DR5
6. Spacing scale tokens use a 4px base unit (10 steps from 4px to 64px) per UX-DR6
7. Card elevation tokens define 4 levels (flat, resting, elevated, high) with specific shadow values, 12px border-radius, and hover/selected states per UX-DR7
8. Animation duration tokens are set (300ms view transitions, 250ms sidebar, 150ms focus, 200ms drag snap) with `prefers-reduced-motion` override to 0ms per UX-DR8
9. Responsive breakpoints are configured (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px) per UX-DR9
10. A visual token reference page (dev-only route `/dev/tokens`) renders all tokens for verification

## Tasks / Subtasks

- [ ] Task 1: Define base color tokens (AC: #1)
  - [ ] Add CSS custom properties to global stylesheet
  - [ ] Map to Tailwind `theme.extend.colors` in `tailwind.config.ts`
- [ ] Task 2: Define unit-type color tokens (AC: #2)
  - [ ] Define background tint + dark accent pairs for all 9 unit types
  - [ ] Add as CSS custom properties and Tailwind extensions
- [ ] Task 3: Define lifecycle state tokens (AC: #3)
  - [ ] Create utility classes for Draft, Pending, Confirmed visual states
  - [ ] Define as CSS custom properties
- [ ] Task 4: Define semantic color tokens (AC: #4)
  - [ ] Add success, warning, error, info color variables
- [ ] Task 5: Define typography tokens (AC: #5)
  - [ ] Configure 3 font stacks (primary, heading, mono) in Tailwind
  - [ ] Define 7-step type scale with weights, line heights, letter-spacing
- [ ] Task 6: Define spacing scale tokens (AC: #6)
  - [ ] Configure 4px-based spacing scale (10 steps: 4px to 64px) in Tailwind
- [ ] Task 7: Define card elevation tokens (AC: #7)
  - [ ] Define 4 shadow levels (flat, resting, elevated, high)
  - [ ] Set border-radius to 12px for cards
  - [ ] Define hover/selected state styles
- [ ] Task 8: Define animation duration tokens (AC: #8)
  - [ ] Add CSS custom properties for transition durations
  - [ ] Implement `prefers-reduced-motion` media query override to 0ms
- [ ] Task 9: Configure responsive breakpoints (AC: #9)
  - [ ] Verify Tailwind breakpoints match specification
- [ ] Task 10: Create token reference page (AC: #10)
  - [ ] Build dev-only route `/dev/tokens`
  - [ ] Display color swatches, typography samples, spacing visualization, elevation demos
  - [ ] Guard route to only show in development environment

## Dev Notes

- All tokens should be defined as CSS custom properties first, then referenced in `tailwind.config.ts` — this enables runtime theming and future dark mode
- The UX design spec provides exact hex values for all colors — use them precisely
- The `/dev/tokens` page is a developer tool, not user-facing — guard with `NODE_ENV === 'development'`

### Project Structure Notes

- `src/app/globals.css` — CSS custom property definitions
- `tailwind.config.ts` — Tailwind theme extensions referencing CSS vars
- `src/app/dev/tokens/page.tsx` — Dev-only token reference page

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR1] — Base color definitions
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR2] — Unit-type color tokens
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR3] — Lifecycle state tokens
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR4] — Semantic colors
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR5] — Typography system
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR6] — Spacing scale
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR7] — Card elevation system
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR8] — Animation durations
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR9] — Responsive breakpoints
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — Story definition and acceptance criteria

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
