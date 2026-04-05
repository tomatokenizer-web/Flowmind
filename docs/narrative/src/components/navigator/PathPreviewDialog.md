# PathPreviewDialog

> **Last Updated**: 2026-04-04
> **Code Location**: `src/components/navigator/PathPreviewDialog.tsx`
> **Status**: Active

---

## Context & Purpose

This component is a full-screen modal dialog that presents AI-proposed navigation paths to the user for review before any navigators are actually created in the database. It exists because the original auto-generation flow (`analyzeAndGenerate`) would immediately create navigators without giving users any say in the matter. PathPreviewDialog introduces a deliberate approval step: the AI proposes, the human disposes.

**Business/User Need**: Users working with knowledge graphs need curated reading or exploration paths through their units of content. However, blindly accepting every AI-suggested path leads to clutter and irrelevant navigators. This dialog lets users inspect what the AI is proposing -- its reasoning, the specific steps, the purpose of each path -- and cherry-pick only the paths that are genuinely useful.

**When Used**: Triggered when the user clicks the "propose paths" action in NavigatorPanel. The parent component calls the `navigator.proposeAndGenerate` tRPC mutation, which builds **greedy paths** (algorithmic traversal through the relation graph starting from high-connectivity nodes) and then asks the AI to name and describe each path. The resulting proposals are passed into this dialog for review.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `~/lib/utils` -> `cn()` - Utility for conditionally joining CSS class names
- `~/components/ui/button` -> `Button` - Shared button component used for Cancel and Create actions
- `~/components/unit/unit-type-badge` -> `UnitTypeBadge` - Renders a colored badge indicating the type of each unit in a path (e.g., CLAIM, EVIDENCE, QUESTION), giving users a quick visual sense of what kind of content each step contains
- `framer-motion` -> `motion`, `AnimatePresence` - Handles the dialog entry/exit animation (scale + fade) and the collapsible step list animation (height + opacity)
- `lucide-react` -> icons (`X`, `Check`, `ChevronDown`, `ChevronUp`, `Sparkles`, `Info`) - UI iconography for close button, checkboxes, expand/collapse toggles, the header sparkle indicator, and the reasoning info callout
- `@prisma/client` -> `UnitType` - Type import used to cast unit type strings back into the Prisma enum for the badge component

### Dependents (What Needs This)
- `src/components/navigator/NavigatorPanel.tsx` - The sole consumer. Imports both the component (`PathPreviewDialog`) and the type (`PathProposal`). NavigatorPanel manages the state for when proposals exist and renders this dialog conditionally.

### Data Flow
```
User triggers "Propose Paths" in NavigatorPanel
    -> NavigatorPanel calls navigator.proposeAndGenerate tRPC mutation
    -> Server builds greedy paths from relation graph + asks AI for names/descriptions
    -> Server returns PathProposal[] to NavigatorPanel
    -> NavigatorPanel renders PathPreviewDialog with proposals
    -> User reviews cards, toggles selections, expands step lists
    -> User clicks "Create N paths"
    -> PathPreviewDialog calls onAccept(selectedProposals)
    -> NavigatorPanel calls navigator.acceptProposals tRPC mutation
    -> Server creates actual Navigator records in database
```

---

## Macroscale: System Integration

### Architectural Layer
This component sits in the **presentation layer** of the Navigator subsystem, specifically as a **human-in-the-loop gateway** between AI proposal generation and persistent data creation:

- **Layer 1 (Server/AI)**: `navigator.proposeAndGenerate` -- builds paths algorithmically, enriches with AI descriptions
- **Layer 2 (Review UI)**: **This component** -- presents proposals for human judgment
- **Layer 3 (Server/Persistence)**: `navigator.acceptProposals` -- creates approved navigators in the database

### Big Picture Impact
PathPreviewDialog is the embodiment of FlowMind's "AI-assisted, human-directed" philosophy for the Navigator feature. Without it, the system would either require users to manually construct every path (tedious) or auto-create all AI suggestions (noisy). This dialog occupies the middle ground that makes AI-generated navigation paths practical.

It enables:
- **Curated knowledge paths** -- users only keep paths that make sense for their learning or exploration goals
- **Transparency into AI reasoning** -- the reasoning callout box lets users understand why a particular path was suggested, building trust in the AI
- **Batch approval workflow** -- instead of accepting or rejecting paths one at a time, users can select multiple proposals and create them in a single action

### Critical Path Analysis
**Importance Level**: Medium-High

If this component fails or is removed, the propose-and-review workflow breaks entirely. The fallback would be reverting to `analyzeAndGenerate`, which creates navigators immediately without user review. The system would still function, but users would lose the ability to curate AI suggestions before they clutter their navigator list.

---

## Technical Concepts (Plain English)

### Greedy Path Building
**Technical**: The server-side algorithm traverses the unit relation graph starting from high-degree nodes, greedily extending each path by following the strongest or most connected relations until no more unvisited units can be reached.
**Plain English**: Imagine you are in a library and you start at the most popular book, then follow its strongest reference to the next book, then the next, building a reading trail. The algorithm does exactly this through the knowledge graph, creating logical sequences of content.
**Why We Use It**: It produces coherent paths that follow natural chains of related content, rather than random orderings.

### AnimatePresence with Collapsible Sections
**Technical**: Framer Motion's `AnimatePresence` tracks component mount/unmount lifecycle to apply exit animations. Combined with `motion.div` animating height from 0 to `auto`, it creates smooth expand/collapse transitions for the step list.
**Plain English**: When you click the expand arrow on a proposal card, the list of steps slides open smoothly instead of just appearing. When you collapse it, it slides shut. This is the same kind of smooth accordion effect you see in FAQ sections on websites.
**Why We Use It**: Without animation, the expand/collapse would be visually jarring -- content would jump in and out. The animation gives users a sense of spatial continuity, making the interface feel polished and predictable.

### Selection State via Set of Indices
**Technical**: The component maintains a `Set<number>` of selected indices, initialized to include all proposals. Toggle operations create a new Set (immutable pattern) to trigger React re-renders.
**Plain English**: Think of it like a checklist where every item starts checked. When you uncheck one, we make a fresh copy of the list with that item removed, which tells React "something changed, please update the screen." This is more efficient than storing a boolean for each proposal.
**Why We Use It**: Sets provide O(1) lookup for checking if a proposal is selected, and the immutable update pattern ensures React correctly detects state changes.

### Backdrop Blur Modal Pattern
**Technical**: The dialog uses `fixed inset-0 z-50` positioning with `bg-black/50 backdrop-blur-sm` to create a semi-transparent, blurred overlay that blocks interaction with underlying content.
**Plain English**: When this dialog opens, it covers the entire screen with a dark, slightly blurry overlay (like frosted glass), forcing you to deal with the proposals before doing anything else. This is the same pattern used by most "Are you sure?" popups.
**Why We Use It**: It prevents accidental interaction with the navigator panel while reviewing proposals, and visually communicates that this is an important decision point requiring attention.

---

## Change History

### 2026-04-04 - Initial Documentation
- **What Changed**: Created narrative documentation for PathPreviewDialog
- **Why**: Part of Shadow Map documentation initiative for the Navigator subsystem
- **Impact**: Provides context for understanding the propose-review-accept flow in the Navigator feature
