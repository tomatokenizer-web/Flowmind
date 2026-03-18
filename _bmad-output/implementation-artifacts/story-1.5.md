# Story 1.5: Radix UI Component Library with Flowmind Styling

Status: complete

## Story

As a developer,
I want pre-styled Radix UI primitive wrappers that match the Flowmind design system,
So that all UI components share consistent interaction patterns, accessibility, and visual treatment.

## Acceptance Criteria

1. A `Dialog` component wraps `@radix-ui/react-dialog` with Level 3 shadow, 12px radius, Framer Motion 300ms entrance, focus trap, and destructive confirmation variant per UX-DR18
2. A `DropdownMenu` wraps `@radix-ui/react-dropdown-menu` with type-colored indicators, keyboard shortcut hints, separator lines, Level 2 shadow per UX-DR19
3. A `Tooltip` wraps `@radix-ui/react-tooltip` with 300ms delay, Level 2 shadow, --text-sm size per UX-DR20
4. A `Popover` wraps `@radix-ui/react-popover` with Level 2 shadow, 12px radius per UX-DR21
5. A `Tabs` wraps `@radix-ui/react-tabs` with 2px accent underline active tab, 300ms cross-fade per UX-DR22
6. A `ScrollArea` wraps `@radix-ui/react-scroll-area` with 4px scrollbar visible on hover/scroll only per UX-DR23
7. A `ContextMenu` wraps `@radix-ui/react-context-menu` with matching dropdown visual treatment per UX-DR24
8. A `CommandPalette` component uses cmdk with Cmd+K global trigger, fuzzy search, keyboard navigation, recent actions, Level 3 shadow per UX-DR25
9. A `Toggle` wraps `@radix-ui/react-toggle` with accent-primary active fill, bg-surface inactive per UX-DR26
10. All components are keyboard-accessible and pass axe-core automated accessibility checks
11. A dev-only route `/dev/components` showcases all wrapped components

## Tasks / Subtasks

- [x] Task 1: Install Radix UI primitives (AC: #1–#9)
  - [x] Install `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `@radix-ui/react-tabs`, `@radix-ui/react-scroll-area`, `@radix-ui/react-context-menu`, `@radix-ui/react-toggle`
  - [x] Install `framer-motion` for Dialog entrance animation
- [x] Task 2: Build Dialog component (AC: #1)
  - [x] Wrap `@radix-ui/react-dialog` with Flowmind styling
  - [x] Apply Level 3 shadow, 12px border-radius
  - [x] Add Framer Motion 300ms entrance/exit animation
  - [x] Implement focus trap
  - [x] Create destructive confirmation variant (red accent, confirm/cancel buttons)
- [x] Task 3: Build DropdownMenu component (AC: #2)
  - [x] Wrap `@radix-ui/react-dropdown-menu`
  - [x] Add type-colored indicators, keyboard shortcut hints, separators
  - [x] Apply Level 2 shadow
- [x] Task 4: Build Tooltip component (AC: #3)
  - [x] Wrap `@radix-ui/react-tooltip`
  - [x] Set 300ms delay, Level 2 shadow, --text-sm font size
- [x] Task 5: Build Popover component (AC: #4)
  - [x] Wrap `@radix-ui/react-popover`
  - [x] Apply Level 2 shadow, 12px border-radius
- [x] Task 6: Build Tabs component (AC: #5)
  - [x] Wrap `@radix-ui/react-tabs`
  - [x] Style active tab with 2px accent underline
  - [x] Add 300ms cross-fade transition between panels
- [x] Task 7: Build ScrollArea component (AC: #6)
  - [x] Wrap `@radix-ui/react-scroll-area`
  - [x] Style 4px scrollbar, visible only on hover/scroll
- [x] Task 8: Build ContextMenu component (AC: #7)
  - [x] Wrap `@radix-ui/react-context-menu`
  - [x] Apply same visual treatment as DropdownMenu
- [x] Task 9: Build CommandPalette component (AC: #8)
  - [x] Use cmdk as the base
  - [x] Implement Cmd+K global trigger via event listener
  - [x] Add fuzzy search across actions/units/contexts/projects
  - [x] Display recent actions by default
  - [x] Apply Level 3 shadow, keyboard navigation
- [x] Task 10: Build Toggle component (AC: #9)
  - [x] Wrap `@radix-ui/react-toggle`
  - [x] Style accent-primary active fill, bg-surface inactive
- [x] Task 11: Accessibility verification (AC: #10)
  - [x] Run axe-core checks on all components
  - [x] Verify keyboard navigation for each component
  - [x] Ensure proper ARIA attributes
- [x] Task 12: Create component showcase page (AC: #11)
  - [x] Build dev-only route `/dev/components`
  - [x] Display interactive examples of each component
  - [x] Guard route to development environment only

## Dev Notes

- shadcn/ui (installed in Story 1.1) provides some Radix wrappers already — check for overlap and extend rather than duplicate
- Components should use design tokens from Story 1.4 (CSS custom properties) rather than hardcoded values
- Framer Motion is used only for Dialog entrance — keep the dependency lightweight
- The CommandPalette should use cmdk (already installed in Story 1.1) which provides built-in fuzzy search and keyboard navigation

### Project Structure Notes

- `src/components/ui/` — All wrapped Radix components (following shadcn/ui convention)
- `src/app/dev/components/page.tsx` — Component showcase page
- Each component should be in its own file: `dialog.tsx`, `dropdown-menu.tsx`, etc.

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR18] — Dialog specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR19] — DropdownMenu specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR20] — Tooltip specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR21] — Popover specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR22] — Tabs specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR23] — ScrollArea specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR24] — ContextMenu specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR25] — CommandPalette specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR26] — Toggle specification
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5] — Story definition and acceptance criteria

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- tsconfig.json: added `~/*` path alias (was only `@/*`)
- tailwind.config.ts: added `tailwindcss-animate` plugin for Radix animation classes

### Completion Notes List

- All 10 Radix UI components wrapped with Flowmind design tokens
- All use CSS custom properties via Tailwind theme extensions (no hardcoded colors)
- Dialog uses Framer Motion for 300ms entrance/exit with AnimatePresence
- DestructiveDialog variant provides confirm/cancel pattern with red accent
- DropdownMenu supports type-colored indicators and keyboard shortcut hints
- CommandPalette uses cmdk with global Cmd+K/Ctrl+K listener
- All components use focus-visible rings with accent-primary
- All include motion-reduce media query support where applicable
- Showcase page at /dev/components demonstrates all components interactively

### File List

- `src/components/ui/button.tsx` — Button with primary/secondary/ghost/destructive/outline variants
- `src/components/ui/dialog.tsx` — Dialog with Framer Motion, focus trap, DestructiveDialog variant
- `src/components/ui/dropdown-menu.tsx` — DropdownMenu with type-colored indicators, shortcut hints
- `src/components/ui/tooltip.tsx` — Tooltip with 300ms delay, SimpleTooltip convenience wrapper
- `src/components/ui/popover.tsx` — Popover with Level 2 shadow, 12px radius
- `src/components/ui/tabs.tsx` — Tabs with 2px accent underline, 300ms cross-fade
- `src/components/ui/scroll-area.tsx` — ScrollArea with 4px scrollbar on hover
- `src/components/ui/context-menu.tsx` — ContextMenu matching dropdown visual treatment
- `src/components/ui/toggle.tsx` — Toggle with accent-primary active fill
- `src/components/ui/command.tsx` — CommandPalette with Cmd+K trigger, fuzzy search
- `src/app/dev/components/page.tsx` — Interactive component showcase page
- `tailwind.config.ts` — Added tailwindcss-animate plugin
- `tsconfig.json` — Added ~/* path alias
