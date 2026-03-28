# Card Boundary Algorithm

> **Last Updated**: 2026-03-27
> **Code Location**: `src/lib/card-boundary-algorithm.ts`
> **Status**: Active

---

## Context & Purpose

This module solves a core readability problem: when a user navigates a knowledge graph as a linear reading path, how do you decide where one "page" (card) ends and the next begins?

A knowledge graph contains units of meaning (claims, evidence, concepts) connected by typed relations (supports, contradicts, elaborates). The Flow Reading View presents these units sequentially, but dumping everything onto a single scrolling page would overwhelm the reader. This algorithm segments the ordered sequence of units into digestible card groups, much like a book editor deciding where to place page breaks -- except here the breaks are semantically aware rather than arbitrary.

**Business/User Need**: Users consuming complex argumentation or creative content need cognitive rest points. A novice reader should see smaller, simpler cards (3 units max). An expert can handle denser cards (up to 8 units). The algorithm adapts to the reader's declared expertise level, making the same content accessible to different audiences without requiring separate authoring.

**When Used**: Every time a user opens the Flow Reading View for a path through the knowledge graph. The hook `use-flow-reading` calls `computeCardBoundaries` on mount and whenever the path, relations, or expertise level change. The companion function `computePathCoherence` can be called independently to assess path quality before the user commits to reading it.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/stores/theme-store.ts`: Imports the `ExpertiseLevel` type ("novice" | "intermediate" | "expert") which controls the maximum units per card. The theme store is where users set their reading comfort level.

### Dependents (What Needs This)
- `src/hooks/use-flow-reading.ts`: The primary consumer. This React hook calls `computeCardBoundaries` to produce the card array that drives the entire reading experience. It also manages navigation state (current card index, bookmarks, read progress) on top of the card boundaries this algorithm computes.
- `src/components/domain/navigator/flow-card.tsx`: Imports `CardGroup` and `PathRelation` types to render individual cards. Each card displays its internal units and shows external relation links that let users jump to other cards.
- `src/components/domain/navigator/flow-navigation.tsx`: Imports `CardGroup` type to render the table-of-contents sidebar and progress indicators. The card count and theme labels from this algorithm feed directly into the navigation UI.
- `src/components/domain/navigator/flow-reading-view.tsx`: The top-level reading view component that orchestrates the card display, consuming the card array produced by this algorithm via the hook.

### Data Flow
```
User opens Flow Reading View
    -> use-flow-reading hook receives ordered PathUnits + PathRelations + ExpertiseLevel
    -> computeCardBoundaries() segments units into CardGroup[]
    -> Each CardGroup feeds into a FlowCard component
    -> FlowNavigation renders card-level navigation (prev/next, TOC, progress bar)
    -> External relation links on cards allow non-linear jumps between cards
```

---

## Macroscale: System Integration

### Architectural Layer
This module sits in the **domain logic layer** (`src/lib/`), deliberately separated from both UI components and data fetching. It is a pure function with no side effects, no API calls, and no React dependencies -- it takes data in and returns structured data out.

Within the broader Flowmind architecture:
- **Layer 1 (Data)**: Database stores units, relations, paths
- **Layer 2 (Domain Logic)**: **This module** -- transforms raw path data into reader-friendly card boundaries
- **Layer 3 (State Management)**: `use-flow-reading` hook holds reading session state
- **Layer 4 (Presentation)**: Flow card and navigation components render the cards

### Big Picture Impact
The card boundary algorithm is what makes Flowmind's reading experience distinct from a raw graph viewer or a flat document. It enables:

- **Adaptive reading complexity**: The same knowledge path renders differently for novice vs. expert readers, without any content duplication or manual curation
- **Semantic coherence within cards**: By respecting nucleus-satellite pairs and primary relation grouping, each card presents a self-contained chunk of meaning rather than an arbitrary slice
- **Navigation purpose awareness**: The algorithm understands that "argument" reading prioritizes support/contradiction relations while "creative" reading prioritizes inspiration/transformation relations, producing different card boundaries from the same underlying data
- **Path quality assessment**: The `computePathCoherence` function lets the system warn users or auto-suggest better paths before they start reading

### Critical Path Analysis
**Importance Level**: High

If this module fails or produces poor boundaries:
- Cards become too large (cognitively overwhelming) or too small (fragmented reading)
- Nucleus-satellite pairs get split across cards, breaking semantic coherence -- like reading a claim on one page and its supporting evidence on another with no connection
- The reading progress bar, table of contents, and bookmark system all depend on stable card indexing
- Navigation purpose differentiation disappears, making all reading modes feel identical

There is no fallback -- without this algorithm, the Flow Reading View would need to either show all units in a single scroll (defeating the card-based UX) or use naive fixed-size chunking (losing semantic awareness).

---

## Technical Concepts (Plain English)

### Nucleus-Satellite Pairs
**Technical**: A rhetorical structure where one unit (the nucleus) carries the core meaning and one or more satellites provide supporting, elaborating, or qualifying content. The algorithm enforces that these are never split across card boundaries as a hard constraint.
**Plain English**: Think of a thesis sentence and its supporting examples. Splitting them onto separate cards would be like tearing a paragraph in half mid-thought. This algorithm guarantees that never happens, even if it means slightly exceeding the card size limit.
**Why We Use It**: Maintains reading comprehension by keeping semantically bonded units together.

### Navigation Purpose
**Technical**: A classification of the reader's intent that determines which relation types are treated as "primary" (keeping units together) vs. "secondary" (triggering card breaks). Six purposes are defined: argument, creative, causal, temporal, structural, and general.
**Plain English**: Like choosing to read a textbook for its logical arguments vs. for its timeline of events. The same content gets different "page breaks" depending on what the reader is looking for, because different connection types matter for different reading goals.
**Why We Use It**: The same knowledge graph can serve multiple reading purposes without restructuring the underlying data.

### Expertise-Level Soft Cap
**Technical**: A configurable maximum number of units per card (novice=3, intermediate=5, expert=8) that acts as a soft constraint -- the nucleus-satellite hard constraint can override it.
**Plain English**: Like adjusting font size for readability. Novice readers get smaller "pages" with fewer ideas per card, while experts can handle denser cards. The word "soft" means this limit bends when splitting a nucleus-satellite group would break coherence.
**Why We Use It**: Makes the same content accessible to readers at different skill levels without requiring separate content versions.

### Path Coherence Score
**Technical**: A composite metric (0.0 to 1.0) computed from relation density (40%), type consistency (20%), and orphan ratio (40%) that measures how well-connected and uniform a reading path is before the user begins reading.
**Plain English**: A "readability grade" for a path through the knowledge graph. A score near 1.0 means the units are well-connected and thematically consistent. A low score means the path has many disconnected units or jumps between unrelated topics -- like a playlist where every other song is from a completely different genre.
**Why We Use It**: Allows the UI to warn users about low-quality paths or to rank competing paths by coherence.

### Break Triggers
**Technical**: Three conditions that force a card boundary: (a) relation type change from primary to secondary, (b) temporal gap exceeding a threshold (default 24 hours), (c) fork points where a unit has 2+ outgoing relations.
**Plain English**: The algorithm looks for natural "chapter break" moments -- when the type of connection between ideas changes, when there is a large time gap between when ideas were created, or when the path branches into multiple directions. These are signals that the reader's mental context is about to shift, making it a good place to start a new card.
**Why We Use It**: Produces card boundaries that align with natural cognitive breakpoints rather than arbitrary size limits.

---

## Change History

### 2026-03-27 - Initial Documentation
- **What Changed**: Created narrative documentation for the card boundary algorithm
- **Why**: Shadow Map documentation coverage for core domain logic
- **Impact**: Improves onboarding and cross-team understanding of the reading view's segmentation logic
