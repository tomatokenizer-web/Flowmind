# Graph Store

> **Last Updated**: 2026-03-19
> **Code Location**: `src/stores/graphStore.ts`
> **Status**: In Development

---

## Context & Purpose

This module is the central state manager for the graph visualization view in FlowMind. The graph view presents knowledge units and their relationships as an interactive node-and-edge diagram, and this store holds every piece of UI state that controls what the user sees and how they interact with it.

**Business/User Need**: Users need to visually explore how their knowledge units connect to one another. They need to zoom, pan, filter by type, and switch between seeing the entire graph versus a focused neighborhood around a single node. This store keeps all of that navigational and filter state coordinated in one place so every component in the graph view stays in sync.

**When Used**: Whenever the application is in "graph" view mode (one of the three view modes alongside "canvas" and "focus", as defined in the layout store). Any component that renders, controls, or reacts to the graph visualization reads from or writes to this store.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `zustand` (external library): The **client-side state management library** (a lightweight alternative to Redux that lets components subscribe to only the slices of state they care about, avoiding unnecessary re-renders).

### Dependents (What Needs This)
- **Not yet consumed by any component.** The store has been built ahead of the graph view UI components. It is designed to be consumed by upcoming graph canvas components, toolbar controls, and filter panels when the graph visualization feature is fully wired up.
- `src/components/layout/toolbar.tsx`: Already lists "Graph" as a view mode option, which will eventually trigger the graph layer to render and consume this store.

### Data Flow
```
User interaction (zoom/pan/filter/node click)
  --> Component calls store action (e.g., setZoom, toggleUnitTypeFilter)
    --> Zustand updates state immutably
      --> All subscribed components re-render with new values
```

### Sibling Stores
This store lives alongside several other Zustand stores that manage different UI concerns:
- `layout-store.ts`: Controls which view mode is active (canvas, focus, **graph**)
- `focusModeStore.ts`: Manages state for the focus view
- `viewStateStore.ts`: Tracks general view state
- `panel-store.ts`, `sidebar-store.ts`: Control panel and sidebar visibility

---

## Macroscale: System Integration

### Architectural Layer
This sits in the **Client-Side State Layer** of the application:
- **Layer 1: UI Components** (graph canvas, toolbar, filter panel) -- consume this store
- **Layer 2: This store** (graph navigation and filter state) -- you are here
- **Layer 3: tRPC API / Server** (provides the actual unit and relation data to render)

The store deliberately holds only **UI-driven state** (what layer to show, zoom level, which filters are active). It does not hold the actual graph data (nodes, edges) -- that comes from server queries. This separation means the graph data can be re-fetched or cached independently of the user's viewport state.

### Big Picture Impact
The graph view is a core differentiator for FlowMind -- it turns a flat collection of knowledge units into a navigable web of meaning. This store is the control center for that experience. Without it:
- Users could not zoom or pan the graph
- Switching between the global overview and a local neighborhood view would be impossible
- Filtering nodes by type or relation category would not work
- Selecting a node for detail inspection would have no coordinated state

### Critical Path Analysis
**Importance Level**: Medium-High (feature-critical but not app-critical)
- If this store fails or is removed, the graph visualization becomes a static, uncontrollable render. Users lose all interactivity.
- The rest of the application (canvas view, focus view, data management) continues to function normally since those features use their own independent stores.
- **No server-side dependency**: This is purely client state, so failures here have zero impact on data integrity.

---

## Technical Concepts (Plain English)

### Zustand Store
**Technical**: A lightweight, hook-based state management library that uses a single `create()` call to define state and actions, exposing them via a React hook.
**Plain English**: A shared notebook that any component can read from or write to. When one component changes a value, every other component watching that value automatically updates -- like a shared Google Sheet where edits appear in real time for everyone.
**Why We Use It**: Zustand is simpler than Redux (no boilerplate, no providers wrapping the tree), and its selective subscription model means only components that care about a specific piece of state will re-render when it changes.

### Graph Layers (Global vs. Local)
**Technical**: The `layer` field toggles between `"global"` (all nodes visible) and `"local"` (a subgraph centered on `localHubId` within `localDepth` hops).
**Plain English**: Think of it as Google Maps. "Global" is the zoomed-out satellite view showing the whole country. "Local" is street view centered on a specific address, showing only the immediate neighborhood. The `localDepth` setting controls how many blocks out from that address you can see (1 to 3 hops).
**Why We Use It**: Large knowledge graphs become overwhelming. Letting users focus on a single node's neighborhood makes exploration manageable.

### Clamped Values (setLocalDepth, setZoom)
**Technical**: `Math.max(min, Math.min(max, value))` constrains the input to a valid range -- depth is clamped to 1-3, zoom to 0.3-5.
**Plain English**: Like volume knobs with a minimum and maximum stop. You cannot turn the zoom past 5x or below 0.3x, preventing the graph from becoming invisibly small or absurdly large.
**Why We Use It**: Prevents UI states that would be unusable or cause performance issues (e.g., rendering thousands of nodes at extreme zoom-out).

### Toggle Filters
**Technical**: `toggleUnitTypeFilter` and `toggleRelationCategoryFilter` use **set-symmetric-difference logic** -- if the value is already in the array it is removed, otherwise it is added.
**Plain English**: Like checking and unchecking boxes in a filter sidebar. Click "Note" to show only notes; click it again to remove that filter. Multiple filters can be active simultaneously.
**Why We Use It**: Gives users fine-grained control over which types of knowledge units and relationships appear in the graph, reducing visual clutter.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created the graph store with layer switching, node selection, zoom/pan, local hub navigation, and type/relation filters.
- **Why**: The graph visualization feature requires coordinated client-side state for all interactive controls.
- **Impact**: Provides the state foundation for all upcoming graph view UI components.
