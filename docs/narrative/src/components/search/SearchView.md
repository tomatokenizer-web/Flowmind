# SearchView Component

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/search/SearchView.tsx`
> **Status**: Active

---

## Context & Purpose

The SearchView provides a **full-screen search panel** that lets users find specific thoughts across their FlowMind knowledge base. Unlike the persistent search bar pattern common in web apps, SearchView takes over the entire viewport -- a deliberate design choice that signals "you are now in discovery mode" and eliminates distractions while hunting for specific content.

**Business Need**: As users accumulate hundreds or thousands of thinking units, scrolling through contexts or manually browsing the graph becomes impractical. Users need instant access to any thought they've captured, whether they remember the exact words, the structure (a question vs. a claim), or approximately when they wrote it. SearchView addresses this by exposing FlowMind's multi-layer search capability through an intuitive, focused interface.

**When Used**:
- When a user invokes search via a keyboard shortcut (likely Cmd/Ctrl+K) or toolbar button
- When looking for a specific unit by content keywords
- When filtering by structural characteristics (unit type, relation patterns)
- When exploring recently created or temporally relevant content
- Whenever the user needs to jump directly to a specific thought rather than browse

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `~/trpc/react`: api -- **tRPC client hooks** (provides `api.search.query.useQuery()` to execute searches against the backend search service)
- `~/stores/selectionStore`: useSelectionStore -- **cross-view selection synchronization** (when a user clicks a search result, `setSelectedUnit(unitId)` is called, which highlights that unit in Graph View, Thread View, or any other view that consumes the selection store)
- `~/components/unit/unit-type-badge`: UnitTypeBadge -- **unit type visual indicator** (displays the colored badge identifying whether a result is a CLAIM, QUESTION, EVIDENCE, etc.)
- `~/lib/utils`: cn() -- **class name merger** (Tailwind utility class conflict resolution for conditional styling)
- `lucide-react`: Icons -- Search (input decoration), X (close button), Layers (structural layer toggle), Clock (temporal layer toggle), FileText (text layer toggle)

### Dependents (What Needs This)

- Parent workspace/shell component: The main application shell renders SearchView conditionally based on a "search open" state, passing `projectId`, `contextId`, and `onClose` props
- Keyboard shortcut system: Global keyboard listeners will likely trigger SearchView's appearance via a parent component's state toggle

### Data Flow

```
User presses search shortcut or clicks search icon
    --> Parent component sets isSearchOpen = true
    --> SearchView mounts with focus on input

User types search query
    --> 300ms debounce timer starts
    --> After 300ms, debouncedQuery updates
    --> api.search.query fires with debouncedQuery + activeLayers

User toggles layer pills (Text / Structural / Temporal)
    --> activeLayers state updates
    --> Query re-fires if debouncedQuery exists

Backend returns SearchResult[]
    --> Results rendered as SearchResultItem cards
    --> Each card shows unit type badge, highlighted content, match layer

User clicks a result
    --> setSelectedUnit(unitId) called
    --> onClose() called (panel closes)
    --> Selection syncs to Graph View / Thread View

User presses Escape
    --> onClose() called (panel closes without selection)
```

---

## Macroscale: System Integration

### Architectural Layer

SearchView sits in the **View Layer** -- the presentation tier that provides a specialized UI mode for discovery tasks.

- **Layer 1**: Database (Unit table with content, type, timestamps, relation counts)
- **Layer 2**: API (`search.query` tRPC procedure in `src/server/api/routers/search.ts`)
- **Layer 3**: Service (`searchService` orchestrates multi-layer search logic)
- **Layer 4**: Store (`selectionStore` propagates selection to all views)
- **Layer 5**: **This component (search UI overlay)** -- You are here
- **Layer 6**: Shell (main workspace that toggles SearchView visibility)

### Big Picture Impact

SearchView is the **primary discovery interface** in FlowMind. While Graph View and Thread View let users browse what they can see, SearchView lets users find what they remember but cannot see. It's the difference between walking through a library's shelves and asking a librarian for a specific book.

The multi-layer toggle system exposes FlowMind's three search dimensions directly to users:
- **Text layer**: Traditional keyword matching -- "find units containing these words"
- **Structural layer**: Graph-aware filtering -- "find questions with many connections"
- **Temporal layer**: Time-based discovery -- "find what I wrote last week"

This directly supports the Re-entry promise: even months after capturing a thought, users can locate it through any dimension they remember.

### Critical Path Analysis

**Importance Level**: High (for discoverability), Medium (for core functionality)

- **If this fails**: Users lose the ability to search, but can still browse via Graph View and Thread View. The system degrades to manual navigation rather than breaking entirely.
- **Performance sensitivity**: The 300ms debounce prevents overwhelming the backend with keystroke-by-keystroke queries. If search latency exceeds 500ms, users may perceive the interface as sluggish.
- **UX criticality**: The Escape key handler ensures users never feel trapped in the search overlay. Full-screen modals without clear exit paths frustrate users.
- **Selection sync**: By calling `setSelectedUnit` before `onClose`, SearchView guarantees that clicking a result navigates the user to that unit in whatever view they return to.

---

## Technical Concepts (Plain English)

### Debouncing (300ms)

**Technical**: A `useEffect` hook sets a 300ms `setTimeout` before updating `debouncedQuery`. Each keystroke clears the previous timeout and starts a new one. The actual search API call only fires when `debouncedQuery` changes.

**Plain English**: Like a patient assistant who waits until you stop typing before starting to search. If you type "cognitive" quickly, the system doesn't search for "c", then "co", then "cog" -- it waits for you to finish and searches once for "cognitive".

**Why We Use It**: Prevents flooding the backend with unnecessary queries and avoids jarring result flicker as the user types. 300ms balances responsiveness (not waiting too long) against efficiency (not searching too often).

### Layer Toggles (Pill Buttons)

**Technical**: Three stateful toggle buttons that modify the `activeLayers` array. The array is passed to the search query, which activates corresponding search logic on the backend. At least one layer must remain active (the last active layer cannot be deselected).

**Plain English**: Like search filters you can combine. "Text" searches by keywords, "Structural" searches by shape (unit type, connections), "Temporal" searches by time. You can enable any combination, but you must have at least one active.

**Why We Use It**: Different search needs benefit from different dimensions. A user might search for "hypothesis" (text) that was created last week (temporal) and is a CLAIM type (structural). Combining layers narrows the search space.

### Skeleton Loading (No Spinner)

**Technical**: Instead of a spinner, the loading state renders five `SearchResultSkeleton` components -- gray placeholder boxes with CSS `animate-pulse` that mimic the layout of real results.

**Plain English**: Like seeing empty seat outlines in a theater before people arrive. The skeleton shows "results will appear in this shape" rather than a generic "loading" message, which feels faster even if the actual wait time is the same.

**Why We Use It**: Skeleton loading is a modern UX pattern that reduces perceived wait time. Users see structure immediately, so the transition from loading to loaded feels seamless rather than jarring.

### Escape Key Handler

**Technical**: A `useEffect` registers a global `keydown` listener that calls `onClose()` when the Escape key is pressed. The listener is cleaned up on unmount.

**Plain English**: Like being able to press Escape to close a dialog in any desktop application. It's a universal expectation that full-screen overlays can be dismissed with Escape.

**Why We Use It**: Full-screen modals can feel trapping without an obvious exit. The X button is visible, but keyboard-first users expect Escape to work. This is especially important because SearchView auto-focuses the input, and Escape is the fastest way to cancel without reaching for the mouse.

### Result Click Navigation

**Technical**: `handleResultClick` is a `useCallback` that calls `setSelectedUnit(unitId)` then `onClose()`. The order matters: selection is set before the panel closes, ensuring the selection store is updated before any view re-renders.

**Plain English**: When you click a search result, two things happen: (1) that thought becomes "selected" across the entire app, and (2) the search panel closes. When you return to Graph View or Thread View, the thought you clicked is already highlighted and scrolled into view.

**Why We Use It**: Search is a discovery flow, not a destination. The goal is to find something and then work with it in context. By combining selection + close into one action, SearchView provides a smooth "find and jump" experience.

### Empty States

**Technical**: Two distinct empty states: (1) when no query has been entered and only one layer is active, showing "Start typing to search" with a hint about layer toggles; (2) when a query returns zero results, showing "No results found" with a hint to adjust keywords or filters.

**Plain English**: Like a helpful sign in an empty room. Before you search, it tells you "this is where results will appear -- start typing." After a failed search, it tells you "nothing matched, but try different words or filters."

**Why We Use It**: Empty states are a critical UX moment. Without guidance, users might think the feature is broken. Clear empty state messaging sets expectations and suggests next actions.

---

## Change History

### 2026-03-19 - Initial Implementation (Epic 6)

- **What Changed**: Created SearchView component with debounced input, layer toggle pills (Text/Structural/Temporal), result list with highlighted matches, skeleton loading, empty states, Escape key handler, and selection-on-click navigation
- **Why**: Epic 6 search functionality requires a dedicated UI for the multi-layer search capability. The full-screen overlay design ensures focused discovery without distractions.
- **Impact**: Enables content discovery across the knowledge graph. Selection sync via `selectionStore` ensures results integrate with Graph View, Thread View, and any future views. Completes the search loop from API (search router) through Service (searchService) to UI (SearchView).
