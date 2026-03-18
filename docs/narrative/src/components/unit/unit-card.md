# UnitCard Component

> **Last Updated**: 2026-03-18
> **Code Location**: `src/components/unit/unit-card.tsx`
> **Status**: Active

---

## Context & Purpose

The UnitCard is the primary visual representation of a "ThoughtUnit" -- the atomic building block of FlowMind's knowledge system. Every piece of thinking a user captures (a claim, a question, a piece of evidence, an idea) eventually renders through this component. It exists because FlowMind's core value proposition is making abstract thought tangible and manipulable, and this card is the surface where that abstraction becomes a concrete, interactive object on screen.

**Business Need**: Users need to scan, identify, and interact with their captured thoughts quickly. The card must communicate the *type* of thought (claim vs. question vs. evidence), its *maturity* (draft vs. confirmed), and its *connectedness* (how many relations it has) -- all at a glance, without requiring the user to open or read each unit in full.

**When Used**: This component renders wherever thought units appear in the application -- list views, search results, canvas layouts, and relation explorers. It is the single most frequently rendered domain component in the entire UI.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/components/unit/unit-type-badge.tsx`: UnitTypeBadge -- renders the colored pill that identifies the cognitive type (Claim, Question, Evidence, etc.) with an icon and label
- `src/components/unit/lifecycle-indicator.tsx`: LifecycleIndicator and LifecycleState type -- shows maturity status (draft, pending, confirmed, deferred, complete) as a colored dot and label
- `@prisma/client`: UnitType enum -- the database-level definition of the 9 cognitive unit types, used here as the type-safety backbone for color mapping and badge rendering
- `~/lib/utils`: cn() -- **class name merger** (a utility that intelligently combines Tailwind CSS classes, resolving conflicts like competing colors)
- `framer-motion`: motion -- **animation library** (provides the subtle hover lift and tap feedback that makes cards feel physically interactive, like picking up a sticky note)
- `lucide-react`: Icon set -- GripVertical (drag handle), Link2 (relation count), Clock (timestamp), History (version history), ExternalLink (provenance origin)
- `date-fns`: formatDistanceToNow -- converts raw timestamps into human-readable relative time ("3 hours ago")

### Dependents (What Needs This)

- `src/components/unit/unit-card-skeleton.tsx`: The loading placeholder that mirrors UnitCard's exact layout structure, ensuring smooth skeleton-to-content transitions. It matches the same three variant modes (compact, standard, expanded).
- Future consumers (Story 2.7+): Canvas view, search results panel, and relation graph detail panels will all import UnitCard as their unit rendering primitive.

### Data Flow

```
ThoughtUnit record from database/API
    --> Transformed into UnitCardUnit shape (id, content, unitType, lifecycle, metadata)
    --> Passed as props to UnitCard
    --> UnitCard delegates type display to UnitTypeBadge
    --> UnitCard delegates lifecycle display to LifecycleIndicator
    --> User click bubbles up via onClick callback to parent (list/canvas)
```

---

## Macroscale: System Integration

### Architectural Layer

This component sits in the **Domain UI Layer** -- it is not a generic UI primitive (like Button or Dialog) but a domain-specific component that directly represents the application's core data model.

- **Layer 1**: Database (ThoughtUnit table in Prisma schema with UnitType enum)
- **Layer 2**: API (tRPC CRUD endpoints from Story 2.1 that fetch/mutate thought units)
- **Layer 3**: **This component (visual representation of a thought unit)** -- You are here
- **Layer 4**: Page/View layouts that compose cards into lists, grids, or canvas arrangements

### Big Picture Impact

The UnitCard is the **visual identity** of FlowMind's entire concept. The application's thesis is that thinking becomes clearer when you can see your thoughts as discrete, typed, connected objects. This card is where that thesis becomes real for the user. Without it, FlowMind has no way to display thought units, and the entire front-end experience collapses to raw text.

The card also carries the **unit type color system** (Story 2.2) -- 9 distinct colors mapped to 9 cognitive types. This color-coding is a core UX decision: users learn to recognize claim-blue vs. question-orange at a glance, the way a chess player recognizes piece shapes. The left border stripe, the badge coloring, and the lifecycle visual states all reinforce this instant-recognition design.

### Critical Path Analysis

**Importance Level**: Critical

- If this component breaks, users cannot see or interact with any of their thought units
- The three variant modes (compact, standard, expanded) serve different spatial contexts -- compact for dense lists, standard for browsing, expanded for detail inspection -- and all three must function for the application to feel complete
- The accessibility story (WCAG 2.1 AA from Story 1.9) flows through here: keyboard navigation via tabIndex and onKeyDown, ARIA labels, focus-visible rings, and motion-reduce support are all embedded in this component

---

## Technical Concepts (Plain English)

### Three Display Variants (compact / standard / expanded)

**Technical**: A discriminated layout mode controlled by a `variant` prop that conditionally renders metadata rows, content truncation depths, and provenance sections.

**Plain English**: Like a business card vs. a resume vs. a full CV -- the same person's information presented at three different levels of detail depending on how much space is available and how much the viewer needs to know.

**Why We Use It**: Different views in the application have different spatial budgets. A search results sidebar needs compact cards; a main content area needs standard; a focused detail panel needs expanded.

### Branch Potential Dots

**Technical**: A normalized 0-to-1 score mapped to a 4-dot visual indicator, representing an AI-computed measure of how much further a thought unit could be developed or connected.

**Plain English**: Like a plant growth indicator -- one dot means "this thought is a seed," four dots means "this thought is ready to branch into a full tree of related ideas." It hints to the user where their thinking has room to grow.

**Why We Use It**: Guides users toward underdeveloped areas of their thinking, which is one of FlowMind's core value propositions as a thinking tool.

### Framer Motion Micro-Interactions (whileHover / whileTap)

**Technical**: **Declarative animation states** (animation rules defined as data rather than imperative code) that apply a -1px vertical translate and enhanced box-shadow on hover, and a 0.5% scale reduction on tap.

**Plain English**: When you hover over the card, it lifts slightly like a physical card being picked up from a table. When you click, it presses down like a real button. These tiny movements make the interface feel responsive and tactile, even though nothing functional changes.

**Why We Use It**: Micro-interactions provide immediate feedback that the interface is alive and responding. The `motion-reduce` CSS respect ensures users who are sensitive to motion can disable these effects.

### Type-Colored Left Border

**Technical**: A 4px `border-left` using **design token** classes (named color variables like `border-l-unit-claim-accent`) mapped from the Prisma UnitType enum to Tailwind utility classes via a static lookup object.

**Plain English**: Each of the 9 thought types has its own signature color, and the left edge of every card is painted with that color -- like colored tabs on file folders that let you find the right category without reading the label.

**Why We Use It**: Enables instant visual scanning. When a user looks at a list of 20 cards, the colored stripes form a pattern that communicates the composition of their thinking at a glance.

---

## Change History

### 2026-03-18 - Initial Implementation (Story 2.2)

- **What Changed**: Created UnitCard component with three variant modes, type color mapping, lifecycle integration, branch potential dots, drag grip handle, and expanded provenance section
- **Why**: Story 2.2 (Unit Type System) required a visual card component that renders the 9 base cognitive types with their colors, icons, and relations
- **Impact**: Establishes the foundational UI primitive for all thought unit display across the application. Version history button is a placeholder wired for Story 2.7.
