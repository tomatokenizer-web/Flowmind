# Story 3.8: Breadcrumb Navigation, Focus Mode & Context Preservation

Status: ready-for-dev

## Story

As a user,
I want breadcrumb navigation showing where I am, a Focus mode for deep work, and my view state preserved when I navigate away and back,
So that I never lose my place or context while exploring.

## Acceptance Criteria

1. **Given** the toolbar and app shell from Epic 1, **When** the user navigates into a Context and then into a Unit, **Then** the breadcrumb shows "Project / Context / Unit" with each segment clickable and truncated segments showing full name on hover via Tooltip per UX-DR44
2. **When** the user toggles Focus Mode, **Then** the sidebar and detail panel hide, the toolbar becomes minimal, and the main content area expands to fill the screen per UX-DR60
3. Focus Mode persists in the current session (survives view switches) per UX-DR60
4. **When** the user navigates away from a view and returns, **Then** scroll position, selection state, open panels, filter state, and zoom level are restored per UX-DR46
5. Context preservation state is stored in Zustand per the architecture's feature module isolation requirement

## Tasks / Subtasks

- [ ] Task 1: Create Breadcrumb component → `src/components/navigation/Breadcrumb.tsx` (AC: #1)
  - [ ] Build a `Breadcrumb` component that renders path segments as clickable links: "Project / Context / Unit"
  - [ ] Each segment is a `<Link>` or clickable span that navigates to its corresponding route
  - [ ] Long segment names are truncated with CSS `text-overflow: ellipsis` and show full name on hover via Tooltip (Radix UI Tooltip) per UX-DR44
  - [ ] Support dynamic depth: segments are derived from the current route and Zustand navigation state
  - [ ] Add separator icons (e.g., `ChevronRight` from Lucide) between segments
  - [ ] Breadcrumb is responsive: on narrow screens, collapse intermediate segments into a "..." dropdown

- [ ] Task 2: Integrate Breadcrumb into app shell toolbar (AC: #1)
  - [ ] Mount `Breadcrumb` in the existing toolbar/header from Epic 1
  - [ ] Connect to React Router (or Next.js router) to derive current path segments
  - [ ] Subscribe to Zustand store for current context name and unit title to display in breadcrumb
  - [ ] Ensure breadcrumb updates reactively when navigation state changes

- [ ] Task 3: Create Focus Mode Zustand slice → `src/stores/focusModeStore.ts` (AC: #2, #3)
  - [ ] Add `focusMode: boolean` state with `toggleFocusMode()` and `setFocusMode(value)` actions
  - [ ] Focus mode state persists within the session (Zustand default — no persistence to localStorage needed, survives view switches) per UX-DR60
  - [ ] Export `useFocusMode()` selector hook

- [ ] Task 4: Implement Focus Mode UI behavior (AC: #2, #3)
  - [ ] Add a Focus Mode toggle button to the toolbar (e.g., `Maximize2` / `Minimize2` icon from Lucide)
  - [ ] When `focusMode` is true: hide the sidebar (Context sidebar from Story 3.5), hide the detail panel (Unit Detail Panel from Story 2.8), reduce the toolbar to minimal (only breadcrumb + focus toggle + essential actions)
  - [ ] Main content area expands to fill available screen space via CSS (e.g., `flex-grow` or grid area adjustment)
  - [ ] Add smooth transition animation (Framer Motion or CSS transition) for panel hide/show
  - [ ] Keyboard shortcut for Focus Mode toggle (e.g., `Ctrl+Shift+F` / `Cmd+Shift+F`)
  - [ ] Focus mode state survives switching between views (e.g., List View → Graph View and back)

- [ ] Task 5: Create Context Preservation Zustand slice → `src/stores/viewStateStore.ts` (AC: #4, #5)
  - [ ] Define `ViewState` type: `{ scrollPosition: { x: number, y: number }, selectedUnitIds: string[], openPanels: string[], filterState: Record<string, unknown>, zoomLevel: number }`
  - [ ] Store view states keyed by route/view identifier: `viewStates: Record<string, ViewState>`
  - [ ] Actions: `saveViewState(viewId, state)`, `restoreViewState(viewId): ViewState | null`, `clearViewState(viewId)`
  - [ ] State stored in Zustand (in-memory, session-scoped) per architecture requirement

- [ ] Task 6: Implement view state save/restore hooks (AC: #4, #5)
  - [ ] Create `useViewStatePreservation(viewId)` hook that:
    - On mount: restores saved scroll position, selection, panel state, filters, zoom
    - On unmount (or route change): saves current scroll position, selection, panel state, filters, zoom
  - [ ] Integrate with scroll containers via `ref` to capture/restore `scrollTop` / `scrollLeft`
  - [ ] Integrate with existing filter and selection Zustand stores to capture their state
  - [ ] Integrate with panel open/close state from sidebar and detail panel stores

- [ ] Task 7: Write tests
  - [ ] Test Breadcrumb renders correct segments for various navigation depths
  - [ ] Test Breadcrumb truncation and tooltip behavior
  - [ ] Test Breadcrumb click navigation to parent routes
  - [ ] Test Focus Mode toggle shows/hides sidebar, detail panel, and minimal toolbar
  - [ ] Test Focus Mode persists across view switches
  - [ ] Test view state is saved on navigate away and restored on return
  - [ ] Test view state includes scroll position, selection, filters, and zoom level

## Dev Notes

- The Breadcrumb component should be generic enough to work across all views (Context list, Unit list, Graph view, etc.). Derive segments from the route structure plus Zustand state for display names.
- Focus Mode is session-scoped only — no need to persist to localStorage or database. Zustand's default in-memory store is sufficient.
- Context preservation (view state) is also session-scoped. For MVP, preserve the most impactful states: scroll position and filter state. Selection and zoom can be added incrementally.
- The `useViewStatePreservation` hook should use `useEffect` cleanup for saving state on unmount, but be careful with stale closures — use refs for mutable values.
- Keyboard shortcut for Focus Mode should not conflict with browser defaults or existing app shortcuts from Epic 2.

### Architecture References

- [Source: architecture.md] — Zustand feature module isolation: each feature owns its own store slice
- [Source: architecture.md] — Component structure: `src/components/` for shared UI, feature-specific in `src/features/`
- [Source: epics.md#Story 3.8] — Story definition and acceptance criteria

### UX References

- [Source: ux-design-specification.md] — UX-DR44: Breadcrumb navigation with truncation and tooltip on hover
- [Source: ux-design-specification.md] — UX-DR46: Context preservation — scroll, selection, panels, filters, zoom restored on return
- [Source: ux-design-specification.md] — UX-DR60: Focus Mode — sidebar/panel hidden, minimal toolbar, session-persistent
