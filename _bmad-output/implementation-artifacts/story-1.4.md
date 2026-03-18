# Story 1.4: Design System Tokens & Theme Configuration

Status: complete

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

- [x] Task 1: Define base color tokens (AC: #1)
  - [x] Add CSS custom properties to global stylesheet
  - [x] Map to Tailwind `theme.extend.colors` in `tailwind.config.ts`
- [x] Task 2: Define unit-type color tokens (AC: #2)
  - [x] Define background tint + dark accent pairs for all 9 unit types
  - [x] Add as CSS custom properties and Tailwind extensions
- [x] Task 3: Define lifecycle state tokens (AC: #3)
  - [x] Create utility classes for Draft, Pending, Confirmed visual states
  - [x] Define as CSS custom properties
- [x] Task 4: Define semantic color tokens (AC: #4)
  - [x] Add success, warning, error, info color variables
- [x] Task 5: Define typography tokens (AC: #5)
  - [x] Configure 3 font stacks (primary, heading, mono) in Tailwind
  - [x] Define 7-step type scale with weights, line heights, letter-spacing
- [x] Task 6: Define spacing scale tokens (AC: #6)
  - [x] Configure 4px-based spacing scale (10 steps: 4px to 64px) in Tailwind
- [x] Task 7: Define card elevation tokens (AC: #7)
  - [x] Define 4 shadow levels (flat, resting, elevated, high)
  - [x] Set border-radius to 12px for cards
  - [x] Define hover/selected state styles
- [x] Task 8: Define animation duration tokens (AC: #8)
  - [x] Add CSS custom properties for transition durations
  - [x] Implement `prefers-reduced-motion` media query override to 0ms
- [x] Task 9: Configure responsive breakpoints (AC: #9)
  - [x] Verify Tailwind breakpoints match specification
- [x] Task 10: Create token reference page (AC: #10)
  - [x] Build dev-only route `/dev/tokens`
  - [x] Display color swatches, typography samples, spacing visualization, elevation demos
  - [x] Guard route to only show in development environment

## Dev Notes

- All tokens should be defined as CSS custom properties first, then referenced in `tailwind.config.ts` — this enables runtime theming and future dark mode
- The UX design spec provides exact hex values for all colors — use them precisely
- The `/dev/tokens` page is a developer tool, not user-facing — guard with `NODE_ENV === 'development'`

### Project Structure Notes

- `src/styles/tokens.css` — CSS custom property definitions (single source of truth)
- `tailwind.config.ts` — Tailwind theme extensions referencing CSS vars
- `src/app/globals.css` — prefers-reduced-motion override
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

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 9 unit type colors implemented (Claim, Question, Evidence, Counterargument, Observation, Idea + new Definition, Assumption, Action from UX spec)
- Lifecycle state tokens (Draft/Pending/Confirmed) added as CSS vars and Tailwind colors
- Semantic colors (success/warning/error/info) added separately from accent colors
- Typography scale: 7 steps (11px–39px) with weight, line-height, letter-spacing in Tailwind fontSize config
- Spacing: 10 steps (4px–64px) including --space-16: 64px
- Elevation: 4 levels (flat/resting/elevated/high) + hover/active/modal shadows
- Animation: 8 duration tokens including sidebar (250ms), focus (150ms), drag (200ms)
- prefers-reduced-motion already handled in globals.css (sets all durations to 0.01ms)
- Breakpoints: sm/md/lg/xl/2xl explicitly set in Tailwind screens config
- Token reference page at /dev/tokens with all sections, guarded by NODE_ENV check
- All Tailwind unit colors now reference CSS vars (not hardcoded hex) for future dark mode support
- Type-check passes (only pre-existing Prisma seed errors unrelated to this story)

### File List

- `src/styles/tokens.css` — Updated with all CSS custom properties
- `tailwind.config.ts` — Updated with complete Flowmind token mappings
- `src/app/dev/tokens/page.tsx` — New dev-only token reference page
- `src/app/globals.css` — Unchanged (prefers-reduced-motion already present)
