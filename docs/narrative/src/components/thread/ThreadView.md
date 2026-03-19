# ThreadView Component

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/thread/ThreadView.tsx`
> **Status**: Active

---

## Context & Purpose

The ThreadView provides a **linear reading mode** as an alternative to the spatial Graph View. While the Graph View excels at revealing connection patterns and clusters, some users need to read through their thoughts sequentially -- like turning pages in a notebook rather than surveying a corkboard. This component exists because not all cognitive work benefits from spatial visualization; sometimes, focused linear progression through a chain of ideas is exactly what the thinking process requires.

**Business Need**: Writers, researchers, and philosophers often need to trace a single line of reasoning from premise to conclusion. The ThreadView provides this "argument unrolling" experience -- presenting units vertically like a document, while still preserving the relation metadata that makes FlowMind more than a plain text editor. It bridges the gap between FlowMind's graph-native architecture and traditional sequential reading habits.

**When Used**:
- When a user toggles from Graph View to Thread View via the toolbar
- When exploring a derivation chain (following "derives_from" relations from root to leaves)
- When reviewing captured thoughts chronologically to understand their temporal evolution
- When a user prefers a less visually complex interface for focused reading

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `~/trpc/react`: api -- **tRPC client hooks** (the interface for fetching units and relations from the server; ThreadView uses `api.unit.list` and `api.relation.listByUnit` to hydrate its display)
- `~/stores/sidebar-store`: useSidebarStore -- provides `activeContextId` (determines which Context's units to display; "null" means show all units without filtering)
- `~/stores/selectionStore`: useSelectionStore -- **cross-view selection synchronization** (when a user selects a unit in Graph View, ThreadView highlights the same unit, and vice versa -- this shared store is how selection state travels between views)
- `~/components/unit/unit-card`: UnitCard and UnitCardUnit type -- **the actual card rendering** (ThreadView doesn't render units directly; it delegates to UnitCard, the domain's standard unit visual component)
- `~/components/ui/scroll-area`: ScrollArea -- **custom scroll container** (provides consistent cross-browser scrolling behavior with styled scrollbars that match the design system)
- `~/components/ui/toggle`: Toggle -- **binary button** (used for the chronological/derivation sort mode switcher)
- `~/components/ui/button`: Button -- the standard button primitive for the "Switch to Graph" action
- `~/components/ui/tooltip`: Tooltip components -- provide hover explanations for the toolbar icons
- `framer-motion`: motion and AnimatePresence -- **animation orchestration** (handles the smooth entrance/exit transitions as units appear, reorder, or filter out of view)
- `lucide-react`: Icon set -- Clock (chronological sort), GitFork (branch indicator), ArrowDownNarrowWide (derivation sort), Network (graph view toggle), List (thread view icon)
- `~/lib/utils`: cn() -- **class name merger** (Tailwind utility class conflict resolution)

### Dependents (What Needs This)

- Parent view containers: The main canvas/workspace component that offers view switching will import ThreadView as one of the view mode options alongside GraphView
- Future keyboard navigation system: ThreadView already implements j/k and arrow key navigation, which will integrate with any global keyboard shortcut manager

### Data Flow

```
User selects Thread View or arrives at project
    --> ThreadView queries api.unit.list for current project/context
    --> ThreadView queries api.relation.listByUnit for first 10 units
    --> Relations are aggregated into relationsMap (target unit ID -> relations)
    --> Fork counts computed (source unit ID -> outgoing relation count)
    --> Units sorted by chosen order (chronological by createdAt, or derivation tree DFS)
    --> Units mapped to UnitCardUnit shape
    --> Rendered as vertical list with RelationConnector separators
    --> Selection clicks update selectionStore (syncs to Graph View)
    --> Keyboard j/k/arrows navigate through the linear list
```

---

## Macroscale: System Integration

### Architectural Layer

ThreadView sits in the **View Layer** -- the presentation tier that composes domain components (UnitCard) into a specific reading experience.

- **Layer 1**: Database (Unit and Relation tables in PostgreSQL via Prisma)
- **Layer 2**: API (tRPC `unit.list` and `relation.listByUnit` endpoints)
- **Layer 3**: Stores (selectionStore for cross-view sync, sidebarStore for context filtering)
- **Layer 4**: **This component (linear reading view)** -- You are here
- **Layer 5**: Page layout (the workspace container that hosts Graph/Thread/Assembly views)

### Big Picture Impact

ThreadView represents one half of FlowMind's **dual-mode navigation philosophy**. The PRD specifies "Graph View (2-layer: global overview + local card array)" and "Thread View" as two of the core display modes. This isn't just an alternative -- it's a cognitive accessibility feature. Some users think spatially (Graph View), others think sequentially (Thread View). By providing both modes with synchronized selection state, FlowMind accommodates different cognitive styles without forcing users to abandon their work when switching views.

The derivation ordering feature is particularly significant: it transforms a flat list of units into a **logical dependency tree**, letting users read through an argument as if it were a structured proof -- each thought derived from its predecessors. This directly supports FlowMind's "Re-entry" promise: users can return to their thinking and follow the exact chain of reasoning that led to a conclusion.

### Critical Path Analysis

**Importance Level**: High

- ThreadView is one of only two primary content viewing modes (the other being GraphView)
- Without ThreadView, users who prefer sequential reading have no comfortable way to consume their knowledge base
- The chronological sort order preserves temporal context (when was this thought captured?), while derivation order reveals logical structure (how does this thought depend on others?)
- The branch point indicator (`BranchPointIndicator`) hints at divergent thinking paths, guiding users to explore forks they might otherwise miss

**Failure Mode**: If ThreadView fails, users can still use Graph View, but lose the linear reading experience. The selection sync ensures that any unit selected in a broken ThreadView would still be visually highlighted if the user switches to Graph View.

---

## Technical Concepts (Plain English)

### Chronological vs. Derivation Ordering

**Technical**: Two sorting strategies controlled by the `sortOrder` state. Chronological sorts by `createdAt` timestamp ascending. Derivation builds a DAG (directed acyclic graph) from `derives_from` relations and performs a DFS (depth-first search) traversal from root nodes.

**Plain English**: Chronological order is like reading a diary -- you see thoughts in the order you wrote them. Derivation order is like reading a proof -- you see foundational premises first, then conclusions that build on them, then conclusions that build on *those*, like branches growing from a tree trunk.

**Why We Use It**: Different tasks need different perspectives. Reviewing a brainstorming session benefits from chronological order (what did I think first?). Understanding an argument benefits from derivation order (what depends on what?).

### Branch Point Indicator

**Technical**: A small circular button with a fork icon that appears when a unit has `forkCount > 1`, indicating multiple outgoing relations from that unit.

**Plain English**: Like a road sign showing "3 paths diverge here." It tells the user "this thought branches into multiple directions" without cluttering the linear view with all the branches at once.

**Why We Use It**: ThreadView is intentionally linear, but FlowMind's data is inherently a graph. Branch indicators preserve awareness of the graph structure without breaking the sequential reading flow.

### Relation Connector

**Technical**: A visual element rendered between adjacent UnitCards that displays a vertical line and colored dot. The dot color is determined by the relation's category (argument relations are blue, creative/research relations are violet, structural relations are gray).

**Plain English**: Like the thread connecting beads on a necklace -- it shows that two adjacent cards aren't just next to each other by accident; they're semantically connected. The color hints at *how* they're connected (logical support vs. creative inspiration vs. structural containment).

**Why We Use It**: Without connectors, ThreadView would look like a plain list. The connectors make the relations visible in linear form, preserving the "connection-aware" nature of FlowMind even in sequential mode.

### Relation Category Color System

**Technical**: A lookup table (`CATEGORY_COLORS`) mapping three relation categories to hex colors: argument (#3B82F6 blue), creative_research (#8B5CF6 violet), structure (#6B7280 gray). Individual relation types are classified into categories via the `getRelationCategory` function.

**Plain English**: FlowMind has 20+ relation types, but for quick visual scanning, they're grouped into three "families": logical/argumentative (blue), imaginative/exploratory (violet), and organizational (gray). This reduces cognitive load -- you don't need to memorize 20 colors, just three.

**Why We Use It**: The legend at the bottom of ThreadView explains the three colors, making the visual language learnable. It balances information density (showing relation metadata) against cognitive simplicity (only three colors to track).

### Keyboard Navigation (j/k and Arrow Keys)

**Technical**: A `useEffect` hook registers a global `keydown` listener that intercepts ArrowDown/ArrowUp and j/k keys, calculates the next/previous index in the `cardUnits` array, and calls `setSelectedUnit` from the selection store.

**Plain English**: Like vim-style navigation for a document. Press "j" to move down to the next thought, "k" to move up. Users who are keyboard-first can fly through their thoughts without touching the mouse.

**Why We Use It**: FlowMind's design philosophy emphasizes "keyboard-first, fast, organized" (referencing Linear.app). Power users expect to navigate without context-switching to a mouse.

### Scroll-to-Selected Behavior

**Technical**: A `useEffect` watches `selectedUnitId` and, when it changes, queries the DOM for `[data-unit-id="..."]` and calls `scrollIntoView({ behavior: "smooth", block: "center" })`.

**Plain English**: If you select a unit in Graph View and switch to Thread View, the list automatically scrolls to show that unit in the center of your screen. It's like a "go to page" feature that keeps your place synchronized across views.

**Why We Use It**: Without this, switching views would lose your place. This maintains the "Re-entry" promise -- you can switch contexts (Graph to Thread) without losing your cognitive position.

---

## Change History

### 2026-03-19 - Initial Implementation (Epic 6)

- **What Changed**: Created ThreadView component with chronological and derivation sorting, relation connectors with category colors, branch point indicators, toolbar controls, keyboard navigation (j/k/arrows), scroll-to-selected sync, and responsive empty/loading states
- **Why**: The Graph View provides spatial exploration, but users also need sequential reading for focused argument review. ThreadView completes the dual-mode navigation story.
- **Impact**: Establishes the linear reading alternative to Graph View. Selection state syncs between views via selectionStore. Branch indicators preserve graph awareness in a linear context. The relation legend introduces the three-category color system used across the application.
