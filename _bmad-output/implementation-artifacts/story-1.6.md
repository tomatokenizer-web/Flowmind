# Story 1.6: App Shell Layout with Responsive Breakpoints

Status: ready-for-dev

## Story

As a user,
I want a polished app shell with a sidebar, toolbar, main content area, and detail panel that adapts to my screen size,
So that I can navigate Flowmind comfortably on any device from desktop to tablet.

## Acceptance Criteria

1. App shell includes a title bar (40px), sidebar (260px collapsible), toolbar (48px with breadcrumb placeholder + view switcher placeholder), main content area (fluid 600–1200px), and detail panel (360px slide-in) per UX-DR27
2. Three layout modes are supported: Canvas, Focus, Graph (switchable via toolbar)
3. At desktop-wide (1280px+), the layout shows full three-column with non-pushing detail panel per UX-DR47
4. At desktop-compact (1024px–1279px), the sidebar is collapsed and the detail panel overlays per UX-DR48
5. At tablet (768px–1023px), the sidebar is hidden behind a hamburger menu, the detail panel opens as full-screen overlay, and touch targets are 48px per UX-DR49
6. Text zoom to 200% causes no horizontal scrolling per UX-DR50
7. View transitions use 300ms cross-fade, sidebar uses 250ms slide, detail panel uses 300ms slide per UX-DR42
8. ARIA landmarks are applied (nav, main, aside, article, section) with a skip-to-content link per UX-DR54
9. Focus indicator system uses 2px solid accent-primary with 2px offset on all interactive elements per UX-DR52
10. Focus management for overlays includes focus trap, focus return on close, and Escape to close per UX-DR53

## Tasks / Subtasks

- [ ] Task 1: Build app shell structure (AC: #1)
  - [ ] Create `AppShell` layout component with title bar, sidebar, toolbar, main content, detail panel
  - [ ] Set title bar height to 40px
  - [ ] Set sidebar width to 260px with collapse support
  - [ ] Set toolbar height to 48px with breadcrumb and view switcher placeholders
  - [ ] Set main content area to fluid 600–1200px
  - [ ] Set detail panel width to 360px with slide-in behavior
- [ ] Task 2: Implement layout mode switching (AC: #2)
  - [ ] Create Zustand store for layout state (active mode, sidebar state, detail panel state)
  - [ ] Add view switcher toolbar buttons for Canvas, Focus, Graph modes
  - [ ] Render placeholder content per mode
- [ ] Task 3: Implement desktop-wide responsive layout (AC: #3)
  - [ ] At 1280px+: full three-column layout
  - [ ] Detail panel does not push main content
- [ ] Task 4: Implement desktop-compact responsive layout (AC: #4)
  - [ ] At 1024px–1279px: auto-collapse sidebar to 60px icon-only
  - [ ] Detail panel overlays main content
- [ ] Task 5: Implement tablet responsive layout (AC: #5)
  - [ ] At 768px–1023px: hide sidebar behind hamburger menu
  - [ ] Detail panel opens as full-screen overlay
  - [ ] Ensure all touch targets are minimum 48px
- [ ] Task 6: Ensure zoom compatibility (AC: #6)
  - [ ] Test at 200% text zoom — no horizontal scrolling
  - [ ] Use relative units where appropriate
- [ ] Task 7: Implement view transitions (AC: #7)
  - [ ] Add 300ms cross-fade for view transitions
  - [ ] Add 250ms slide for sidebar expand/collapse
  - [ ] Add 300ms slide for detail panel open/close
- [ ] Task 8: Apply ARIA landmarks and accessibility (AC: #8, #9, #10)
  - [ ] Add semantic landmarks: `<nav>` for sidebar, `<main>` for content, `<aside>` for detail panel
  - [ ] Add skip-to-content link as first focusable element
  - [ ] Apply 2px solid accent-primary focus indicator with 2px offset globally
  - [ ] Implement focus trap for overlays (sidebar on mobile, detail panel on tablet)
  - [ ] Return focus on overlay close
  - [ ] Escape key closes overlays

## Dev Notes

- Use Zustand for layout state management (sidebar open/closed, active view mode, detail panel visibility)
- The app shell is the root layout for all authenticated pages — build it as a layout component in `src/app/(app)/layout.tsx`
- The three layout modes (Canvas, Focus, Graph) will be fully implemented in later epics — for now, just the switching UI and placeholder content
- Use CSS Grid or Flexbox for the multi-column layout, not absolute positioning

### Project Structure Notes

- `src/app/(app)/layout.tsx` — Root layout for authenticated app
- `src/components/layout/app-shell.tsx` — Main shell component
- `src/components/layout/sidebar.tsx` — Sidebar component
- `src/components/layout/toolbar.tsx` — Toolbar component
- `src/components/layout/detail-panel.tsx` — Detail panel component
- `src/stores/layout-store.ts` — Zustand store for layout state

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR27] — App shell layout specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR42] — Animation timing
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR47–49] — Responsive behavior
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR50] — Zoom compatibility
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR52–54] — Accessibility (focus, landmarks)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6] — Story definition and acceptance criteria

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
