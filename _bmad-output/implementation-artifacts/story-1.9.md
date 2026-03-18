# Story 1.9: Keyboard Shortcuts & Accessibility Foundations

Status: ready-for-dev

## Story

As a user,
I want keyboard shortcuts for common actions and full WCAG 2.1 AA accessibility,
So that I can use Flowmind efficiently regardless of my input method or ability.

## Acceptance Criteria

1. Cmd+K opens the Command Palette, Cmd+N triggers capture mode (placeholder), Cmd+1–4 switch views (placeholder targets), Escape closes any overlay, and Cmd+/ shows a keyboard shortcut help overlay per UX-DR43
2. Color contrast meets WCAG 2.1 AA (4.5:1 body text, 3:1 large text/interactive) with a high-contrast mode toggle per UX-DR51
3. All interactive elements have a visible 2px focus indicator per UX-DR52
4. ARIA landmarks, semantic HTML, and skip-to-content link are in place per UX-DR54
5. The application targets modern evergreen browsers (Chrome, Safari, Firefox, Edge latest 2 versions) per UX-DR57

## Tasks / Subtasks

- [ ] Task 1: Implement keyboard shortcut system (AC: #1)
  - [ ] Create a centralized keyboard shortcut registry/manager
  - [ ] Register Cmd+K → open Command Palette
  - [ ] Register Cmd+N → trigger capture mode (placeholder action)
  - [ ] Register Cmd+1 through Cmd+4 → switch views (placeholder targets)
  - [ ] Register Escape → close any open overlay (dialog, popover, panel)
  - [ ] Register Cmd+/ → show keyboard shortcut help overlay
  - [ ] Build keyboard shortcut help overlay listing all shortcuts
  - [ ] Handle platform detection (Cmd on Mac, Ctrl on Windows/Linux)
- [ ] Task 2: Implement high-contrast mode (AC: #2)
  - [ ] Audit all design tokens for WCAG 2.1 AA contrast compliance
  - [ ] Define high-contrast token overrides where needed
  - [ ] Add high-contrast mode toggle to app settings/toolbar
  - [ ] Store preference in local storage
  - [ ] Verify 4.5:1 ratio for body text, 3:1 for large text and interactive elements
- [ ] Task 3: Verify focus indicators (AC: #3)
  - [ ] Ensure global CSS applies 2px solid accent-primary focus indicator with 2px offset
  - [ ] Verify all interactive elements (buttons, links, inputs, menu items) show focus ring
  - [ ] Test keyboard tab navigation through app shell
- [ ] Task 4: Verify ARIA and semantic HTML (AC: #4)
  - [ ] Confirm ARIA landmarks from Story 1.6 are in place
  - [ ] Verify skip-to-content link works
  - [ ] Run axe-core accessibility audit on all current pages
  - [ ] Fix any issues found
- [ ] Task 5: Browser compatibility verification (AC: #5)
  - [ ] Test in Chrome (latest 2 versions)
  - [ ] Test in Safari (latest 2 versions)
  - [ ] Test in Firefox (latest 2 versions)
  - [ ] Test in Edge (latest 2 versions)
  - [ ] Add browserslist config to `package.json`
  - [ ] Document any browser-specific workarounds

## Dev Notes

- The keyboard shortcut system should be composable — components can register/unregister shortcuts as they mount/unmount
- Use `useEffect` with `keydown` event listeners, being careful about event propagation when modals are open
- High-contrast mode should swap CSS custom properties, not duplicate component styles
- Platform detection for Cmd/Ctrl is important for cross-platform UX — use `navigator.platform` or `navigator.userAgentData`
- The shortcut help overlay should be auto-generated from the registry, not hardcoded

### Project Structure Notes

- `src/hooks/use-keyboard-shortcuts.ts` — Keyboard shortcut hook
- `src/lib/keyboard-registry.ts` — Centralized shortcut registry
- `src/components/keyboard-shortcut-help.tsx` — Help overlay component
- `src/lib/accessibility.ts` — Accessibility utilities (contrast checking, etc.)
- `src/stores/preferences-store.ts` — User preferences (high-contrast mode, etc.)

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR43] — Keyboard shortcut definitions
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR51] — Color contrast and high-contrast mode
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR52] — Focus indicator specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR54] — ARIA landmarks and semantic HTML
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR57] — Browser support targets
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.9] — Story definition and acceptance criteria

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
