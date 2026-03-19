# ContextDashboard Component

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/dashboard/ContextDashboard.tsx`
> **Status**: Active

---

## Context & Purpose

The ContextDashboard provides a **statistical snapshot** of a context's health and activity at a glance. While the Graph View shows the spatial relationships between thoughts and the Thread View presents them linearly, the ContextDashboard answers a different question: "What's the overall state of this context?" It displays aggregate counts, surfaces the most connected units (the "hub" thoughts), and highlights areas needing attention like open questions or contradictions.

**Business Need**: Users working with dozens or hundreds of units in a context need situational awareness. Without aggregate statistics, they would need to manually count how many thoughts are still in draft, how many questions remain unanswered, or which thoughts have become central connection points. The dashboard acts as a **control panel** -- a quick summary that helps users decide what to focus on next. It's particularly valuable during "re-entry" sessions when returning to a project after time away.

**When Used**:
- When viewing a context in the main workspace (displayed alongside or above the graph/thread view)
- When assessing the "maturity" of a thinking context (how many units are confirmed vs. still drafts?)
- When identifying hub units that have accumulated many connections and might warrant expansion or review
- When scanning for work items (open questions that need answering, contradictions that need resolving)

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `~/trpc/react`: api -- **tRPC client hooks** (fetches context metadata via `api.context.getById` and unit list via `api.context.getUnitsForContext`; these provide the raw data for all statistics)
- `~/stores/selectionStore`: useSelectionStore -- **cross-view selection coordination** (when a user clicks a "most connected" unit chip, this store broadcasts the selection to Graph View, Thread View, and any other view listening for `selectedUnitId`)
- `~/lib/utils`: cn() -- **class name merger** (Tailwind utility class conflict resolution for conditional styling)
- `lucide-react`: Icon set -- Boxes (total units), CheckCircle2 (confirmed), FileEdit (draft), Clock (pending), Link2 (connections), HelpCircle (questions), AlertTriangle (contradictions)

### Dependents (What Needs This)

- Context workspace layout: The parent page or workspace component that renders the main context view will import ContextDashboard as an auxiliary panel, typically positioned in a sidebar or header area
- Future context comparison features: When comparing two contexts side-by-side, each would have its own ContextDashboard instance showing relative statistics

### Data Flow

```
ContextDashboard mounts with contextId and projectId props
    --> Fetches context metadata via api.context.getById
    --> Fetches all units in context via api.context.getUnitsForContext
    --> Units array arrives with lifecycle states and relation counts
    --> useMemo computes aggregate statistics:
        - Lifecycle counts (confirmed, draft, pending)
        - Open questions count (unitType="question" + lifecycle != "complete")
        - Contradiction count (TODO: future implementation)
        - Top 3 most-connected units by relation count
    --> Statistics render as StatBadge components (colored pills with icons)
    --> Top connected units render as ConnectedUnitChip buttons
    --> Click on chip --> setSelectedUnit(unitId) --> selection store updates
    --> Other views (Graph, Thread) react to selection change
```

---

## Macroscale: System Integration

### Architectural Layer

ContextDashboard sits in the **Presentation Layer** -- a view-level component that aggregates data for display purposes but doesn't modify state directly (other than the selection store for navigation).

- **Layer 1**: Database (Unit table with lifecycle, unitType, relation counts via Prisma includes)
- **Layer 2**: API (tRPC `context.getById` and `context.getUnitsForContext` endpoints in the context router)
- **Layer 3**: Stores (selectionStore for selection sync across views)
- **Layer 4**: **This component (aggregation and display)** -- You are here
- **Layer 5**: Page layout (context workspace that composes ContextDashboard with Graph/Thread views)

### Big Picture Impact

ContextDashboard represents FlowMind's commitment to **meta-cognition** -- thinking about thinking. The PRD emphasizes that FlowMind helps users "improve their ability to think" and "re-enter thinking flow". The dashboard serves this meta-cognitive layer by providing:

1. **Lifecycle visibility**: Users can see at a glance how much of their thinking is still tentative (draft/pending) versus settled (confirmed). This supports intentional knowledge refinement.

2. **Hub identification**: The "most connected" chips highlight units that have become central to the thought network. These hub units often represent core concepts, key insights, or potential bottlenecks. Surfacing them helps users identify where to invest attention.

3. **Work queue awareness**: Open questions and contradictions are natural work items. By counting them, the dashboard creates an implicit task list for thinking work.

The cross-view selection sync is crucial: clicking a hub unit in the dashboard immediately highlights it in Graph View, letting users seamlessly transition from "where should I look?" to "now I'm looking at it."

### Critical Path Analysis

**Importance Level**: Medium-High

- ContextDashboard provides situational awareness but isn't the primary content viewing mode (that's Graph/Thread View)
- Without it, users could still browse their thoughts, but would lose the aggregate overview and hub discovery features
- The "most connected" feature is particularly valuable as contexts grow large -- it provides a starting point for exploration
- Future contradiction detection will make this component more critical as a "thinking health monitor"

**Failure Mode**: If ContextDashboard fails, users lose the statistics panel but can still work with their units via Graph/Thread View. The selection sync would be unavailable from this entry point, but selection still works within Graph/Thread views directly.

---

## Technical Concepts (Plain English)

### Lifecycle States and StatBadges

**Technical**: The dashboard iterates through all units in the context, counting occurrences of three lifecycle enum values (`confirmed`, `draft`, `pending`). Each count is displayed via a `StatBadge` component -- a small pill-shaped indicator with an icon, count, and semantic color (green for confirmed, amber for pending, default gray for draft).

**Plain English**: Like a project tracker showing "5 complete / 3 in progress / 2 not started." The colors give instant visual feedback: green means "this is settled knowledge," amber means "this needs review," and gray means "this is still being worked on."

**Why We Use It**: FlowMind's lifecycle model tracks the epistemic status of thoughts. The dashboard makes this status visible in aggregate, helping users understand the overall maturity of their thinking in a context.

### Most Connected Units (Hub Detection)

**Technical**: For each unit, the component sums `outgoingRelations` and `incomingRelations` counts (provided via Prisma `_count` includes). Units are sorted by total relation count descending, and the top 3 with `relationCount > 0` are displayed as clickable `ConnectedUnitChip` components.

**Plain English**: Imagine a social network where some people know everyone. These "most connected" units are the thoughts that link to the most other thoughts. They're the central nodes in your knowledge graph -- often key concepts, main arguments, or foundational premises that everything else connects to.

**Why We Use It**: In a large context, finding where to start can be overwhelming. Hub units are natural entry points because they connect to many other ideas. They're like the table of contents for your thinking.

### ConnectedUnitChip Click-to-Select

**Technical**: Each `ConnectedUnitChip` button invokes `handleUnitClick(unitId)`, which calls `setSelectedUnit(unitId)` from the Zustand selection store. This selection state is observed by Graph View and Thread View, which highlight and scroll to the selected unit.

**Plain English**: Click a hub unit's name, and every view in FlowMind instantly knows "the user wants to focus on this thought." It's like clicking a bookmark that jumps you to that location in all your open documents at once.

**Why We Use It**: This implements the "click anywhere to go everywhere" principle. The dashboard isn't just a passive display -- it's a navigation tool that bridges the statistical overview to the spatial/linear content views.

### Open Questions Count

**Technical**: Units with `unitType === "question"` and `lifecycle !== "complete"` are counted as open questions. This count appears as an info-colored badge (blue) when greater than zero.

**Plain English**: FlowMind distinguishes "question" units from regular thoughts. Open questions are questions you've captured but haven't yet answered or marked complete. The dashboard shows how many thinking threads are still dangling.

**Why We Use It**: Questions are natural thinking prompts. Seeing "3 open questions" tells the user "you have unfinished thinking to address" -- a gentle nudge toward completing their reasoning.

### Contradictions Count (Future)

**Technical**: Currently hardcoded to 0 with a TODO comment. Will eventually detect units that contradict each other (via `contradicts` relations or AI-detected conflicts) and display the count with a danger-colored badge (red).

**Plain English**: Sometimes you write two thoughts that disagree with each other. A contradiction count would surface these conflicts so you can resolve them -- either by revising one thought, choosing between them, or noting that the contradiction is intentional.

**Why We Use It**: Contradictions indicate areas where thinking needs refinement. Surfacing them supports FlowMind's goal of helping users develop coherent, well-reasoned knowledge structures.

### Semantic Color System

**Technical**: The `StatBadge` component maps `color` prop values to Tailwind utility classes: `success` maps to lifecycle-confirmed colors (green tones), `warning` maps to lifecycle-pending colors (amber tones), `danger` maps to accent-danger (red tones), `info` maps to accent-primary (blue tones), and `default` uses neutral secondary colors.

**Plain English**: Each badge color carries meaning. Green = good/done, amber = needs attention, red = problem, blue = informational. This lets users scan the dashboard without reading labels -- the colors communicate status instantly.

**Why We Use It**: Color-coding reduces cognitive load. Instead of reading "3 confirmed, 2 pending," users see "green pill, amber pill" and understand the situation at a glance. This matches the design system's semantic color tokens used throughout FlowMind.

---

## Change History

### 2026-03-19 - Initial Implementation (Epic 6)

- **What Changed**: Created ContextDashboard component with lifecycle statistics (total/confirmed/draft/pending), open questions count, contradictions count placeholder, top 3 most-connected unit chips, and cross-view selection integration via selectionStore
- **Why**: Users need aggregate awareness of context health and natural entry points for exploration. The dashboard provides meta-level visibility that the Graph and Thread views don't offer.
- **Impact**: Establishes the statistics panel pattern. Hub detection via relation counts surfaces important units. Selection sync enables dashboard-to-view navigation. Semantic color coding aligns with the lifecycle visual language used in UnitCard and other components.
