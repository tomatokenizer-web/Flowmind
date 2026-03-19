# Decomposition Review

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/ai/decomposition-review.tsx`
> **Status**: Active

---

## Context & Purpose

This component renders the interactive review interface for AI-proposed text decomposition. When a user submits a block of raw text (notes, draft paragraphs, stream-of-consciousness writing), the AI service analyzes it and proposes how to split it into discrete "thought units" -- each classified by type (claim, evidence, question, etc.). This component displays those proposals as highlighted segments overlaid on the original text, letting the user accept, reject, or adjust each boundary before committing units to the knowledge graph.

**Business Need**: Flowmind's core value is transforming unstructured thought into structured knowledge without breaking the user's creative flow. When someone dumps a paragraph of mixed ideas, the system should not just swallow it whole -- that defeats the purpose of a knowledge graph. But manually splitting and classifying is tedious friction. This component provides the "negotiation layer" between AI's automated analysis and human judgment: the AI proposes, the human disposes. Every accepted unit becomes a real node in the graph; rejected ones vanish without trace.

**When Used**:
- After a user triggers the "Decompose with AI" action on a chunk of text in Capture Mode or the text editor
- As the second step in the two-phase AI decomposition flow (first: AI analysis, second: this review UI)
- Whenever the application needs to present multiple unit proposals for batch approval with boundary adjustments

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `react` (useState, useRef, useCallback): Core React primitives for managing proposal states, tracking drag interactions, and memoizing handlers. The component maintains complex local state (each proposal's status, boundary positions, created unit IDs).

- `framer-motion` (motion, AnimatePresence): Powers the spring-physics animations that make proposal cards feel responsive. When a proposal is accepted, it animates out to the right; rejected proposals slide left. The `layout` prop enables smooth reflows as cards disappear.

- `lucide-react` (Check, X, Sparkles, GripVertical, ChevronRight): Icon set providing visual affordances. `GripVertical` is particularly important -- it signals "draggable handle" for boundary adjustment. `Sparkles` maintains the AI-origin visual language used throughout Flowmind.

- `~/lib/utils` (cn): Tailwind class merging utility, ensuring dynamic status-based styling does not conflict with base classes.

- `~/lib/unit-types` (UNIT_TYPE_COLORS): The canonical color mapping for each unit type (claim=blue, evidence=green, etc.). This ensures proposed segments use the same visual language users will see once units are created. Consistency here is critical -- if a "claim" shows as blue in review but appears as something else after creation, users lose trust in the preview.

- `~/components/ui/button` (Button): Standard UI button component for Accept, Reject, Accept All, Done, and Cancel actions. Maintains visual consistency with the Flowmind design system.

- `~/trpc/react` (api): The tRPC React client providing typed API access. This component is unusual among AI components because it performs writes, not just reads. It calls `unit.create` and `relation.create` mutations to materialize accepted proposals.

- `@prisma/client` (UnitType): TypeScript type for the unit type enum, used for type-safe casting when creating units.

- `~/server/ai` (UnitProposal, DecompositionRelationProposal, UserPurpose): Type imports from the AI service module. These define the shape of AI-generated proposals this component receives and renders.

### Dependents (What Needs This)

- **Context Canvas** (planned): The primary integration point. When a user selects text and invokes decomposition, the canvas opens this component in a modal or side panel.

- **Capture Mode** (planned): Extended version of rapid capture that optionally routes multi-sentence input through decomposition before saving.

- **AI Components Barrel** (`src/components/ai/index.ts`): Will re-export this component once integration is complete (Story 5.9+).

### Data Flow

**User Submission to Unit Creation**:
```
User selects text and triggers "Decompose"
    |
    v
AI router calls aiService.decomposeText()
    |
    v
AI returns DecompositionResult:
  { purpose, proposals[], relationProposals[] }
    |
    v
Parent component renders DecompositionReview
with proposals overlaid on originalText
    |
    v
User interacts (accept/reject/drag handles)
    |
    v
Each "accept" triggers unit.create mutation
    |
    v
Created unit IDs stored in local state
    |
    v
Relevant relations created via relation.create
    |
    v
User clicks "Done" when all pending resolved
    |
    v
onComplete callback fires with counts
    |
    v
Parent dismisses component, units now in graph
```

**Boundary Adjustment Flow**:
```
User drags GripVertical handle between segments
    |
    v
handleDragStart captures index of dragged boundary
    |
    v
Mouse/touch position tracked via event coordinates
    |
    v
handleDragEnd calculates new character position
(pixel position / text width * total chars)
    |
    v
Proposal states updated:
  - Current segment: endChar adjusted
  - Next segment: startChar adjusted
  - Both segments: content slices recalculated
    |
    v
UI re-renders with new segment widths
```

---

## Macroscale: System Integration

### Architectural Layer

This component operates at **Layer 4 (Feature Components)** with direct data-mutation capabilities, placing it at the critical intersection of presentation and persistence:

- **Layer 5: Pages** (route containers -- e.g., `/app/[projectId]/context/[contextId]`)
- **Layer 4: Feature Components** -- **You are here** (DecompositionReview)
- **Layer 3: Domain Components** (UnitCard, UnitTypeBadge, RelationEdge)
- **Layer 2: Composite UI** (Button, Dialog, AnimatePresence wrappers)
- **Layer 1: Primitive UI** (icons, basic DOM elements)

Unlike most Layer 4 components that delegate mutations to parent handlers, DecompositionReview owns its mutation lifecycle. This is intentional: the accept/reject workflow is self-contained, and lifting that logic to the parent would fragment the interaction model.

### Big Picture Impact

This component enables **the entire AI-assisted decomposition feature** in Flowmind:

- **Without this component**: Users would have to manually split text and classify each piece, the highest-friction action in knowledge management. The AI's decomposition analysis would be useless without a way to review and commit it.

- **Enables downstream features**:
  - **Relation discovery**: Accepted units immediately get relations to existing units (via relationProposals), building the knowledge graph automatically
  - **Type consistency**: AI-suggested types flow directly into unit.create, seeding the graph with semantically meaningful classifications
  - **Origin tracking**: Created units are marked `originType: "ai_generated"`, enabling the ContributionTransparency metrics

**System Dependencies**:
This is a **write-path component** in the AI feature set. It transforms AI suggestions into persistent database records. If it fails:
- Accepted proposals do not become units (data loss of user intent)
- Graph connections are not established (orphaned thinking)
- User has no recourse except manual re-creation

**Critical Path Status**: High importance for AI-assisted workflows. The component handles errors gracefully (relation failures are silent), but unit creation failures surface to console and should be monitored.

### Integration Points

| System | Interaction Type | Purpose |
|--------|------------------|---------|
| tRPC `unit.create` | Mutation | Materialize accepted proposals into persistent units |
| tRPC `relation.create` | Mutation | Establish AI-suggested connections to existing units |
| tRPC `utils.unit.list.invalidate()` | Cache invalidation | Ensure unit lists refresh after creation |
| `UNIT_TYPE_COLORS` | Styling | Consistent type-based color coding across preview and final units |
| `UserPurpose` labels | Display | Show detected purpose (arguing, brainstorming, etc.) in header |

---

## Technical Concepts (Plain English)

### Proposal State Machine

**Technical**: Each proposal in `proposalStates` array follows a state machine: `pending -> accepted | rejected`. Once transitioned, proposals cannot return to pending. Accepted proposals store their `createdUnitId` for relation creation.

**Plain English**: Think of it like sorting mail into "keep" and "trash" piles. Once you put a letter in a pile, it stays there. Except when you put it in "keep," you also immediately file it (create the unit) -- you cannot just tag it for later.

**Why We Use It**: Prevents duplicate unit creation (accepting twice), simplifies UI logic (three mutually exclusive states), and enables the "Done" button to only appear when all decisions are made.

### Draggable Boundary Handles

**Technical**: The GripVertical icons between segments are draggable. On drag end, the component calculates the new character position by dividing mouse X position by text container width, multiplying by total character count, and clamping to valid bounds.

**Plain English**: Imagine sliding a divider between words on a piece of paper. Wherever you drop the divider, that is where one segment ends and the next begins. The component figures out which character you are pointing at by measuring how far across the text you dragged.

**Why We Use It**: AI proposals are educated guesses. Users often want to adjust exactly where one thought ends and another begins. Manual boundary adjustment gives users control without requiring them to retype or re-analyze.

### Spring Animations via Framer Motion

**Technical**: Proposal cards use `type: "spring"` transitions with `stiffness: 500` and `damping: 30`. This creates snappy but not jarring animations when cards enter, exit, or reflow.

**Plain English**: Instead of things moving in a straight line at constant speed (which feels robotic), they accelerate and decelerate like a spring bouncing. High stiffness means quick movements; high damping means they settle quickly without oscillating.

**Why We Use It**: The UX specification calls for an Apple-like polish. Spring animations feel more natural and responsive than linear transitions. When a proposal slides out on accept, the physics make it feel satisfying.

### Silent Relation Failure

**Technical**: When creating relations for an accepted unit, failures are caught and silently ignored (`catch { /* skip */ }`). No error toast, no retry.

**Plain English**: If the system cannot link your new unit to an existing one (maybe that target unit was deleted, or it is in a weird state), it just skips the link and moves on. You still get your unit; you just do not get that particular connection.

**Why We Use It**: Relation creation is a "nice to have" enhancement. Failing to create a unit is a real problem; failing to create a suggested relation is not. Users would be annoyed by error messages for links they did not even request directly.

### Purpose-Aware Header

**Technical**: The component receives a `purpose` prop (arguing, brainstorming, researching, defining, other) and displays a corresponding colored label from `PURPOSE_LABELS`.

**Plain English**: The AI guesses what you are trying to do with the text ("Are you building an argument? Brainstorming? Researching?"). That guess is shown at the top so you understand the AI's interpretation context. Purple for brainstorming, green for researching, etc.

**Why We Use It**: Transparency. If the AI misunderstood your purpose, the type suggestions might seem off. Showing the detected purpose lets users calibrate their expectations and understand why the AI classified things the way it did.

---

## UI Anatomy

### Visual Structure

```
+----------------------------------------------------------+
| [Sparkles] AI Decomposition   [Brainstorming]            |
|                          2 accepted . 1 rejected . 3 pending
+----------------------------------------------------------+
| "Your original text with [segment overlays]..."          |
|    [Claim segment]  [=]  [Evidence segment]  [=]  [...]  |
|                      ^-- Draggable handle                |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | [claim]  85% confident                       [v][x]  | |
| | "First segmented content preview..."                 | |
| | -> 2 relations proposed                              | |
| +------------------------------------------------------+ |
| +------------------------------------------------------+ |
| | [evidence]  72% confident           [Created]        | |
| | "Second segment already accepted..."                 | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
|  [Cancel]                    [Accept All (3)]   [Done]   |
+----------------------------------------------------------+
```

### Status Visual Indicators

| Status | Text Overlay | Card Appearance | Actions Available |
|--------|--------------|-----------------|-------------------|
| Pending | Normal opacity, type-colored background | White card with type badge | Accept (check), Reject (X) |
| Accepted | 50% opacity | Green-tinted card, "Created" badge | None (decided) |
| Rejected | 30% opacity + strikethrough | Red-tinted card, "Rejected" badge | None (decided) |

---

## Change History

### 2026-03-19 - Initial Implementation (Epic 5, Story 5.9)
- **What Changed**: Created DecompositionReview component with full proposal review workflow, boundary adjustment, unit/relation creation
- **Why**: Story 5.9 requires an interactive UI for reviewing AI-proposed text decomposition before committing to the knowledge graph
- **Impact**: Enables the complete AI decomposition feature flow from text input to graph population
