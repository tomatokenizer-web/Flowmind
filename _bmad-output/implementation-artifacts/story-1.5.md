# Story 1.5: Radix UI Component Library with Flowmind Styling

Status: ready-for-dev

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

- [ ] Task 1: Install Radix UI primitives (AC: #1–#9)
  - [ ] Install `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `@radix-ui/react-tabs`, `@radix-ui/react-scroll-area`, `@radix-ui/react-context-menu`, `@radix-ui/react-toggle`
  - [ ] Install `framer-motion` for Dialog entrance animation
- [ ] Task 2: Build Dialog component (AC: #1)
  - [ ] Wrap `@radix-ui/react-dialog` with Flowmind styling
  - [ ] Apply Level 3 shadow, 12px border-radius
  - [ ] Add Framer Motion 300ms entrance/exit animation
  - [ ] Implement focus trap
  - [ ] Create destructive confirmation variant (red accent, confirm/cancel buttons)
- [ ] Task 3: Build DropdownMenu component (AC: #2)
  - [ ] Wrap `@radix-ui/react-dropdown-menu`
  - [ ] Add type-colored indicators, keyboard shortcut hints, separators
  - [ ] Apply Level 2 shadow
- [ ] Task 4: Build Tooltip component (AC: #3)
  - [ ] Wrap `@radix-ui/react-tooltip`
  - [ ] Set 300ms delay, Level 2 shadow, --text-sm font size
- [ ] Task 5: Build Popover component (AC: #4)
  - [ ] Wrap `@radix-ui/react-popover`
  - [ ] Apply Level 2 shadow, 12px border-radius
- [ ] Task 6: Build Tabs component (AC: #5)
  - [ ] Wrap `@radix-ui/react-tabs`
  - [ ] Style active tab with 2px accent underline
  - [ ] Add 300ms cross-fade transition between panels
- [ ] Task 7: Build ScrollArea component (AC: #6)
  - [ ] Wrap `@radix-ui/react-scroll-area`
  - [ ] Style 4px scrollbar, visible only on hover/scroll
- [ ] Task 8: Build ContextMenu component (AC: #7)
  - [ ] Wrap `@radix-ui/react-context-menu`
  - [ ] Apply same visual treatment as DropdownMenu
- [ ] Task 9: Build CommandPalette component (AC: #8)
  - [ ] Use cmdk as the base
  - [ ] Implement Cmd+K global trigger via event listener
  - [ ] Add fuzzy search across actions/units/contexts/projects
  - [ ] Display recent actions by default
  - [ ] Apply Level 3 shadow, keyboard navigation
- [ ] Task 10: Build Toggle component (AC: #9)
  - [ ] Wrap `@radix-ui/react-toggle`
  - [ ] Style accent-primary active fill, bg-surface inactive
- [ ] Task 11: Accessibility verification (AC: #10)
  - [ ] Run axe-core checks on all components
  - [ ] Verify keyboard navigation for each component
  - [ ] Ensure proper ARIA attributes
- [ ] Task 12: Create component showcase page (AC: #11)
  - [ ] Build dev-only route `/dev/components`
  - [ ] Display interactive examples of each component
  - [ ] Guard route to development environment only

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



### Debug Log References

### Completion Notes List

### File List
