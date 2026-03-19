# IncubationQueue

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/incubation/IncubationQueue.tsx`
> **Status**: Active
> **Epic**: Epic 8 - Feedback Loop & Thought Evolution
> **Story**: 8.1 - Incubation Queue

---

## Context & Purpose

This component renders the **incubation queue** - a sidebar panel that displays thought units the user has marked for "incubation" rather than immediate organization. It solves the friction problem of forced categorization: when users capture fleeting ideas, they often do not know where those ideas belong yet, and requiring immediate placement creates cognitive overhead that discourages capture in the first place.

**Business Need**: Knowledge workers frequently have half-formed thoughts that are not ready to connect to existing contexts. Without a holding area, users either abandon the capture entirely (losing the idea) or force it into an ill-fitting context (creating organizational debt). The incubation queue provides a "staging area" where ideas can rest until the user has clarity about where they belong.

**Plain English**: Think of this as a digital inbox for unfinished thoughts. When you jot down an idea but have no clue where to file it, it lands here. Later, you can look through your incubating thoughts and either:
- **Promote** them (move to a proper context, like filing a sticky note into the right folder)
- **Snooze** them (push to the bottom of the pile for later review)
- **Discard** them (archive - not delete - because the thought turned out to be noise)

**When Used**:
- Displayed in the left sidebar of the application, below the context tree
- Visible whenever the user has the sidebar open (expanded or collapsed variants)
- Users interact with it during "inbox zero" style review sessions for their captured thoughts
- Badge count draws attention when new thoughts enter incubation

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

**React & Hooks**
- `react`: Core library for component structure and state management via `useState`, `useCallback`, `useMemo`

**External Libraries**
- `date-fns`: `formatDistanceToNow()` - Converts raw timestamps into human-friendly relative time strings like "2 hours ago" or "3 days ago"
- `framer-motion`: `motion`, `AnimatePresence` - Enables smooth enter/exit animations when items are promoted or discarded from the queue
- `lucide-react`: Icon components - `Sparkles` (incubation header), `ArrowUpCircle` (promote), `Clock` (snooze), `Trash2` (discard), `ChevronDown` (dropdown indicator), `Layers` (context icon)

**Application Infrastructure**
- `~/trpc/react`: `api` - tRPC React Query hooks for type-safe data fetching and mutations
- `~/lib/utils`: `cn()` - Tailwind class merging utility for conditional styling
- `~/contexts/project-context`: `useProjectId()` - Retrieves the currently selected project from React context

**UI Components**
- `~/components/ui/button`: `Button` - Standardized button component with variants (ghost, sm size)
- `~/components/ui/scroll-area`: `ScrollArea` - Virtualized scrolling container for long lists
- `~/components/ui/popover`: `Popover`, `PopoverContent`, `PopoverTrigger` - Context selector dropdown for the Promote action
- `~/components/unit/unit-type-badge`: `UnitTypeBadge` - Visual type indicator (claim, question, evidence, etc.)
- `~/components/shared/empty-state`: `EmptyState` - Standardized empty state messaging

**tRPC Procedures (Backend APIs)**
- `api.incubation.list` - Query: Fetches all incubating units for the current user
- `api.incubation.promote` - Mutation: Moves a unit out of incubation into a specified context
- `api.incubation.snooze` - Mutation: Updates lastAccessed timestamp to push unit down the queue
- `api.incubation.discard` - Mutation: Archives the unit (sets lifecycle='archived', incubating=false)
- `api.context.list` - Query: Fetches available contexts for the promote dropdown

### Dependents (What Needs This)

- `src/components/layout/sidebar.tsx`: The primary consumer. The Sidebar renders `<IncubationQueue collapsed={isCollapsed} />` in a dedicated section below the context tree. The `collapsed` prop controls whether the queue shows the full list or just a badge count.

### Data Flow

```
Sidebar renders IncubationQueue
    |
    v
Component mounts, useQuery triggers
    |
    +---> api.incubation.list fetches all incubating units
    +---> api.context.list fetches available contexts (for promote dropdown)
    |
    v
Data arrives, useMemo filters by current projectId
    |
    v
Render decision:
    |
    +---> isLoading? Show skeleton placeholders
    +---> filteredUnits.length === 0? Show EmptyState (or icon if collapsed)
    +---> collapsed? Show badge with count
    +---> Otherwise: Render full list with IncubationItem cards
    |
    v
User interaction on IncubationItem:
    |
    +---> "Promote" button clicked
    |         |
    |         v
    |     Popover opens with context list
    |         |
    |         v
    |     User selects context
    |         |
    |         v
    |     promoteMutation.mutate({ unitId, contextId })
    |         |
    |         v
    |     onSuccess: invalidate list queries (unit disappears from queue)
    |
    +---> "Snooze" button clicked
    |         |
    |         v
    |     snoozeMutation.mutate({ unitId })
    |         |
    |         v
    |     onSuccess: invalidate list (unit moves down in sort order)
    |
    +---> "Discard" button clicked
              |
              v
          discardMutation.mutate({ unitId })
              |
              v
          onSuccess: invalidate list (unit archived, removed from queue)
```

---

## Macroscale: System Integration

### Architectural Layer

This component sits in the **Presentation Layer** of Flowmind's frontend architecture:

- **Layer 1 (Data)**: PostgreSQL database stores Unit records with `incubating` boolean flag
- **Layer 2 (API)**: tRPC incubation router exposes list/promote/snooze/discard procedures
- **Layer 3 (State)**: React Query manages cache, loading states, and optimistic updates
- **Layer 4 (Presentation)**: **This component** - renders the queue UI and handles user interactions
- **Layer 5 (Layout)**: Sidebar component composes this into the overall application shell

### Epic 8: Feedback Loop & Thought Evolution

This component is the **user-facing implementation** of Epic 8, Story 8.1. While the incubation router provides the backend logic, this component is where users actually interact with their incubating thoughts. The two work as a pair:

| Concern | Backend (incubation.ts router) | Frontend (IncubationQueue.tsx) |
|---------|-------------------------------|-------------------------------|
| Data access | Prisma queries with auth | tRPC useQuery hooks |
| Business logic | Transaction handling, validation | None - pure presentation |
| User interaction | None | Buttons, popovers, animations |
| State management | Database persistence | React Query cache |

### Big Picture Impact

The incubation queue enables **capture without commitment** in Flowmind. This has cascading effects throughout the application:

1. **Capture Bar** (future): Quick-capture input can default to incubation, removing the "where does this go?" friction
2. **Context Dashboard**: Incubating thoughts do not clutter context views until they are promoted
3. **Search**: Incubating units are still searchable, so ideas are not lost while they marinate
4. **AI Suggestions**: Future compression/clustering features can analyze incubating thoughts for potential connections

**Without this component**, users would need to immediately assign every captured thought to a context, which:
- Slows down the capture moment (context switching to think about organization)
- Creates pressure to make premature categorization decisions
- Leads to either abandoned captures or poorly organized knowledge bases

### Critical Path Analysis

**Importance Level**: Medium-High

- **If this fails**: Users can still capture thoughts directly to contexts via other UI paths, but the quick-capture workflow breaks down. The "inbox zero" review pattern becomes impossible.
- **Failure mode**: Query fails silently (empty list shown), mutations fail (buttons appear to do nothing). Neither causes data loss since state is server-side.
- **Recovery**: Refresh the page or component remount triggers fresh queries. All state is persisted in the database.
- **Graceful degradation**: Loading skeletons shown during network delays, disabled buttons during mutation processing, collapsed mode shows just a badge count.

### Responsive Behavior

The component adapts to sidebar state via the `collapsed` prop:

| State | Behavior |
|-------|----------|
| `collapsed=false` | Full list with header, scrollable item cards, action buttons |
| `collapsed=true`, has items | Just a Sparkles icon with a count badge (e.g., "3" or "9+") |
| `collapsed=true`, empty | Just a gray Sparkles icon (no badge) |
| Loading | Skeleton pulse animations (3 placeholder cards) |

---

## Technical Concepts (Plain English)

### AnimatePresence (Framer Motion)

**Technical**: A Framer Motion wrapper component that enables exit animations for child components. When a child is removed from the React tree, AnimatePresence delays the removal until the exit animation completes.

**Plain English**: Normally when you remove something from a list, it just vanishes. AnimatePresence says "wait, let me animate that thing sliding away before you actually remove it from memory." This creates the smooth slide-left animation when you promote or discard a thought.

**Why We Use It**: Sudden disappearance feels jarring. The exit animation provides visual feedback that the action succeeded and makes the interface feel more polished and responsive.

### useMemo for Filtering

**Technical**: React hook that memoizes the result of a computation (filtering units by projectId) and only recalculates when its dependencies change.

**Plain English**: Instead of filtering the entire list every single time the component re-renders (which happens frequently in React), we remember the filtered result. We only re-filter when the original list or the project ID actually changes.

**Why We Use It**: Performance optimization. If the user has 50 incubating thoughts, filtering them on every keystroke or mouse movement would waste CPU cycles. useMemo caches the result until the underlying data changes.

### Query Invalidation Pattern

**Technical**: After each mutation succeeds, the component calls `utils.incubation.list.invalidate()` to mark the cached query data as stale, triggering an automatic refetch.

**Plain English**: When you promote a thought, the component tells React Query "hey, the list you cached is now outdated - go fetch a fresh copy from the server." This ensures the UI stays in sync with the database without manually updating local state.

**Why We Use It**: Single source of truth. Instead of trying to manually remove the promoted item from local state (which can get out of sync), we simply refetch the authoritative list from the server. Network is fast enough that users do not notice the round-trip.

### Popover Context Selector

**Technical**: A controlled Radix UI popover component that opens when the user clicks "Promote", displays available contexts, and closes after selection.

**Plain English**: The promote button is actually a dropdown menu disguised as a button. When you click it, a little floating panel appears with a list of contexts you can promote the thought into. Pick one, and the thought moves there.

**Why We Use It**: Promoting requires choosing a destination context. Rather than navigating to a separate screen or showing a modal, the inline popover keeps the user in flow while still providing the required input.

### Optimistic Disabled State

**Technical**: When any mutation is pending (`isPromoting || isSnoozing || isDiscarding`), the component sets `pointer-events-none` and reduces opacity on the affected item.

**Plain English**: When you click an action button, that thought card immediately becomes "grayed out" and unclickable. This prevents double-clicking and provides immediate visual feedback that something is happening.

**Why We Use It**: Network operations take time (100-500ms typically). Without visual feedback, users might click multiple times thinking their first click did not register. The disabled state prevents duplicate operations and communicates "I am working on it."

---

## Component Structure

### IncubationQueue (Main Component)

Handles data fetching, state management, and rendering decision (loading/empty/collapsed/expanded).

**Props**:
- `collapsed?: boolean` - Whether the sidebar is collapsed (show badge only)
- `className?: string` - Additional CSS classes for the container

**Key State**:
- `units` - Query result from `api.incubation.list`
- `contexts` - Query result from `api.context.list` (for promote dropdown)
- `filteredUnits` - Memoized list filtered to current projectId

### IncubationItem (Sub-component)

Renders a single incubating thought with its metadata and action buttons.

**Props**:
- `unit` - The incubating unit data (id, content, unitType, createdAt)
- `contexts` - Available contexts for the promote dropdown
- `onPromote`, `onSnooze`, `onDiscard` - Callback handlers for actions
- `isPromoting`, `isSnoozing`, `isDiscarding` - Loading states for button disabling

**Key Features**:
- Truncates content to 100 characters with ellipsis
- Shows relative time ("3 hours ago") via date-fns
- Promote button opens context selector popover
- Framer Motion layout animation for smooth reordering

---

## Accessibility

The component includes several accessibility considerations:

- **Loading state**: `role="status"` and `aria-label="Loading incubation queue"` for screen readers
- **Empty state**: Descriptive text via EmptyState component
- **Collapsed state**: `aria-label="No incubating ideas"` on the icon-only view
- **Action buttons**: `title` attributes provide tooltips explaining Snooze and Discard actions
- **Keyboard navigation**: Popover focus management handled by Radix UI primitives
- **Focus indicators**: `focus-visible:ring-2` on interactive elements

---

## Change History

### 2026-03-19 - Initial Implementation (Epic 8, Story 8.1)

- **What Changed**: Created IncubationQueue component with list view, promote/snooze/discard actions, and collapsed/expanded variants
- **Why**: Users needed a UI to review and act on their incubating thoughts as part of the feedback loop system
- **Impact**: Completes the frontend side of Story 8.1; users can now see and manage incubating thoughts via the sidebar
