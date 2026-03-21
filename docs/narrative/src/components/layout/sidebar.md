# Sidebar

> **Last Updated**: 2026-03-21
> **Code Location**: `src/components/layout/sidebar.tsx`
> **Status**: Active

---

## Context & Purpose

The Sidebar is the primary navigation surface of the FlowMind application. It gives users a persistent, always-visible way to browse their project structure, switch between visualization modes, and access utility features like importing external content.

**Business Need**: Users working with knowledge units need a stable anchor point. The sidebar answers the question "where am I, and where can I go?" at every moment during a session. Without it, users would have no way to navigate between contexts, switch how they view their units, or discover orphaned drafts that need attention.

**When Used**: The sidebar renders on every authenticated page within the app shell. It is visible from the moment a user enters the dashboard and persists across all view modes (Thread, Graph, Assembly).

**Design Rationale for the Overhaul**: The previous sidebar accumulated features that diluted its purpose. An "All Thoughts" button duplicated what Thread View already provides. A "Starred" button pointed to a feature with no clear workflow. A "High Contrast" toggle belonged in Settings, not primary navigation. The full Incubation Queue panel consumed space disproportionate to its importance in everyday use. The overhaul stripped the sidebar back to its essential job: project navigation, view switching, and surfacing just enough metadata (orphan count) to keep users aware of loose ends.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/stores/layout-store.ts`: Reads `sidebarOpen` state and calls `toggleSidebar()` and `setViewMode()` to control whether the sidebar is expanded or collapsed and to switch the main content area between Thread, Graph, and Assembly views.
- `src/stores/sidebar-store.ts`: Reads `sidebarWidth` and `activeContextId` to determine rendering mode (expanded, collapsed icon-only, or fully hidden) and whether to show the Navigator panel.
- `src/contexts/project-context.ts`: `useProjectId()` provides the currently selected project ID, used to filter orphan unit counts to the active project.
- `src/components/context/context-tree.tsx`: The hierarchical tree of contexts (folders/categories) within a project. This is the sidebar's main navigational content.
- `src/components/navigator/NavigatorPanel.tsx`: A detail panel that appears beneath the context tree when a specific context is selected, showing navigational aids for that context.
- `src/components/project/ProjectSelector.tsx`: A dropdown at the top of the sidebar that lets users switch between projects.
- `src/components/import/ExternalImportDialog.tsx`: A modal dialog triggered by the Import button, allowing users to pull in content from external sources.
- `src/trpc/react.ts`: The tRPC client, used here specifically to call `api.incubation.list` for fetching orphan unit counts.
- `src/lib/utils.ts`: The `cn()` utility for composing **conditional CSS class names** (a helper that merges Tailwind classes together, handling conflicts automatically).

### Dependents (What Needs This)

- `src/components/layout/app-shell.tsx`: The top-level layout shell that renders the Sidebar alongside the main content area. This is the only direct consumer of the `<Sidebar>` component.

### Data Flow

```
Project context (useProjectId) --> Sidebar
                                     |
                                     +--> ContextTree (renders project hierarchy)
                                     |
                                     +--> NavigatorPanel (if a context is selected)
                                     |
                                     +--> incubation.list tRPC query --> filter by projectId --> orphan count badge
                                     |
                                     +--> View mode buttons --> setViewMode() --> layout-store --> main content area reacts
                                     |
                                     +--> toggleSidebar() --> layout-store --> sidebar width animates
```

---

## Macroscale: System Integration

### Architectural Layer

The Sidebar sits in the **Layout Shell Layer** of FlowMind's frontend architecture:

- **Layer 0**: Global providers (auth, tRPC, theme)
- **Layer 1**: App Shell (layout frame) -- **Sidebar lives here**, alongside toolbar and main content area
- **Layer 2**: View containers (ThreadView, GraphView, AssemblyBoard)
- **Layer 3**: Unit-level components (UnitCard, editors)

It is a **cross-cutting navigation component** -- it does not own any data or business logic itself, but orchestrates which data the rest of the application displays by controlling two pieces of global state: the active context and the active view mode.

### Big Picture Impact

The sidebar is the command center for the entire FlowMind workspace. It enables:

- **Project switching** via ProjectSelector -- without it, users are locked into a single project per session.
- **Context navigation** via ContextTree -- the primary organizational structure of the knowledge base. Selecting a context filters what appears in every view mode.
- **View mode switching** (Thread, Graph, Assembly) -- these three modes are the core value proposition of FlowMind. The sidebar is the easiest way to switch between them.
- **Orphan awareness** via the incubating units badge -- a subtle nudge that reminds users they have uncontextualized drafts that might need organizing.
- **Content import** -- the entry point for bringing external knowledge into the system.
- **Settings access** -- the pathway to configuration, including accessibility options like high contrast that were previously (and incorrectly) embedded directly in the sidebar.

### Critical Path Analysis

**Importance Level**: Critical

- If this component fails to render: Users lose all navigation capability. They cannot switch projects, contexts, or view modes. The application becomes a dead-end showing whatever view happened to load first.
- If the orphan count query fails: Graceful degradation -- the badge simply does not appear. No other functionality is affected.
- If the sidebar store loses state: The sidebar defaults to expanded at 260px width with no active context. Functional but disorienting if the user was mid-session.

**Failure mode**: The sidebar uses **optimistic rendering** (it reads from Zustand stores which are synchronous in-memory state). There is no loading state for the sidebar structure itself. The only asynchronous dependency is the incubation count query, which is non-blocking.

---

## Technical Concepts (Plain English)

### Animated Layout with Framer Motion

**Technical**: The sidebar uses `motion.nav` with an `animate` prop that transitions the `width` CSS property between 260px, 60px, and 0px using a cubic bezier easing curve `[0.4, 0, 0.2, 1]`.

**Plain English**: When you click the collapse button, the sidebar smoothly slides narrower instead of snapping instantly. The animation follows a curve that starts fast and decelerates, which feels natural -- like a drawer sliding shut and slowing down as it reaches the end.

**Why We Use It**: Abrupt layout shifts are disorienting. The animation gives users a visual cue about where the space went and how to get it back.

### Three-State Width Model (Expanded, Collapsed, Hidden)

**Technical**: The sidebar has three discrete width states managed by `SidebarWidth` type (a **discriminated union** of literal values `260 | 60 | 0`). Toggling cycles through all three: expanded shows labels, collapsed shows icons only, hidden removes the sidebar entirely.

**Plain English**: Think of it like a car window -- fully open, cracked open (just icons peeking through), or fully closed. Each click of the toggle button moves to the next position in the cycle.

**Why We Use It**: Different tasks need different amounts of screen space. Writing benefits from a hidden sidebar; browsing benefits from the full tree; routine navigation only needs the icon strip.

### Orphan Unit Count Badge

**Technical**: A **derived computed value** (via `useMemo`) that filters the full incubation list by the current project ID and counts the results. Displayed as a notification-style badge capped at "9+".

**Plain English**: The app quietly counts how many knowledge units are floating around without a home (no context assigned). It shows this number as a small badge, like the unread count on an email icon. If there are more than 9, it just says "9+" to keep things tidy.

**Why We Use It**: This replaced the full Incubation Queue panel that previously lived in the sidebar. Users need to know orphans exist, but they do not need a scrollable list taking up sidebar space. The badge is a gentle reminder; the full queue can be accessed elsewhere.

### Zustand Store Separation (layout-store vs sidebar-store)

**Technical**: Two separate **Zustand stores** (lightweight global state containers) manage different concerns: `layout-store` handles application-wide layout state (view mode, sidebar open/closed), while `sidebar-store` handles sidebar-internal state (width, active context, expanded tree nodes).

**Plain English**: Imagine two separate control panels. One controls the big-picture layout of the whole screen (which view is active, is the sidebar open). The other controls just the sidebar's internal details (which folders are expanded, which context is highlighted). Keeping them separate means changing a folder expansion does not trigger a re-render of the entire application layout.

**Why We Use It**: **Separation of concerns** (organizing code so each piece handles one responsibility) prevents unnecessary re-renders and keeps the mental model clean for developers.

---

## Change History

### 2026-03-21 - Sidebar Overhaul (Scope Reduction)

- **What Changed**: Removed "All Thoughts" button, "Starred" button, "High Contrast" toggle, and full Incubation Queue panel. Added compact orphan unit count badge. Preserved ContextTree, NavigatorPanel, view mode shortcuts, Import, and Settings.
- **Why**: The sidebar had accumulated features beyond its navigational purpose. "All Thoughts" was redundant with Thread View. "Starred" had no defined workflow. "High Contrast" is a settings-level preference, not a per-session toggle. The full Incubation Queue consumed disproportionate space for a secondary concern.
- **Impact**: Cleaner navigation surface with fewer distractions. Users who relied on the incubation queue in the sidebar will now use the orphan badge as an indicator and access the full queue through a dedicated route or panel. High contrast is now managed through the Settings page.
