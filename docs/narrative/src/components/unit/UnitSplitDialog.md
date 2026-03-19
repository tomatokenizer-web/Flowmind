# UnitSplitDialog Component

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/unit/UnitSplitDialog.tsx`
> **Status**: Active

---

## Context & Purpose

The UnitSplitDialog enables users to divide a single thought unit into two separate units, with AI assistance for intelligently reassigning existing relations. This component exists because thoughts captured in FlowMind often evolve -- what started as a single claim might actually contain two distinct claims that deserve separate tracking, or a piece of evidence might need to be split so each part can support different arguments.

**Business Need**: Users frequently realize, mid-analysis, that a thought unit contains multiple ideas conflated together. Without a split operation, they would have to delete the original unit, create two new units manually, and re-establish all the relations from scratch -- a tedious process that discourages clean knowledge organization. The split dialog makes atomic restructuring effortless.

**When Used**: Triggered when a user right-clicks a thought unit and selects "Split Unit" (or uses a keyboard shortcut from a future command palette). The dialog appears as a modal overlay, allowing the user to visually slice their content and preview the result before committing.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/components/ui/dialog.tsx`: Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose -- the **modal foundation** (a layered overlay system built on Radix UI that handles focus trapping, keyboard escape, and backdrop clicks)
- `src/components/ui/button.tsx`: Button -- the standard interactive button primitive with variant styling (outline, ghost, primary)
- `src/trpc/react.ts`: api -- the **tRPC client hook** (a type-safe way to call backend endpoints from React components, with automatic caching and mutation state tracking)
- `src/server/ai/aiService.ts`: SplitReattributionProposal type -- the shape of AI suggestions for how to reassign relations when a unit splits (relationId, which part to assign it to, and the rationale)
- `lucide-react`: Loader2, Scissors, ArrowRight -- icons for visual communication (Scissors conveys the split action, Loader2 shows pending AI analysis, ArrowRight indicates relation reassignment direction)

### Dependents (What Needs This)

- Future consumers (Story 5.4+): The UnitDetailPanel or context menu system will import this dialog and control its open state when users initiate a split action on a selected unit. Currently not wired into the main UI -- this is a standalone implementation awaiting integration.

### Data Flow

```
User selects "Split Unit" on a thought unit
    --> Parent component opens UnitSplitDialog, passing unit data
    --> User drags slider to choose split position
    --> UI instantly previews Part A and Part B content
    --> (Optional) User clicks "Analyze Relations"
        --> tRPC mutation calls ai.proposeSplitReattribution
        --> AI analyzes existing relations and returns proposals
        --> Proposals render as a list showing which relations go where
    --> User clicks "Split"
    --> onConfirm callback fires with contentA, contentB, and proposals
    --> Parent component handles the actual unit creation/relation rewiring
```

---

## Macroscale: System Integration

### Architectural Layer

This component sits in the **Domain Interaction Layer** -- it is a specialized dialog that orchestrates a complex domain operation (unit splitting) by combining UI primitives with AI-powered analysis.

- **Layer 1**: Database (ThoughtUnit and Relation tables in Prisma schema)
- **Layer 2**: AI Service (proposeSplitReattribution method that analyzes relations)
- **Layer 3**: API (tRPC ai.proposeSplitReattribution endpoint that exposes the AI method)
- **Layer 4**: **This component (split interaction orchestrator)** -- You are here
- **Layer 5**: Parent views that trigger the dialog and consume its output

### Big Picture Impact

The UnitSplitDialog is part of FlowMind's **structural refactoring toolkit** -- a family of operations (split, merge, retype, archive) that let users reshape their knowledge base without losing relational integrity. This is critical because thinking evolves: an early brainstorm might dump three ideas into one unit, and later refinement needs to tease them apart.

The AI relation reattribution feature is particularly significant. When a unit splits, its existing relations (supports, contradicts, elaborates, etc.) need to be reassigned to one of the two resulting parts. Without AI assistance, users would have to manually review and reassign each relation -- a cognitive burden that discourages proper knowledge hygiene. The AI analyzes the semantic content of Part A and Part B against each relation's target, proposing which part the relation should follow.

### Critical Path Analysis

**Importance Level**: Medium-High

- If this component breaks: Users cannot split units, forcing manual delete-and-recreate workflows that are error-prone and lose relation history
- The slider-based split position is intentionally character-level rather than sentence-level, giving users precise control (some thoughts split mid-sentence)
- The "Analyze Relations" step is optional -- users can split without AI suggestions if they prefer manual control or if AI is unavailable
- The component does not perform the actual split mutation; it only prepares the data and lets the parent handle persistence, following the **presentational component pattern** (UI components that compute and display but delegate side effects to their callers)

---

## Technical Concepts (Plain English)

### Split Position Slider

**Technical**: An HTML range input bound to React state, with min=1 and max=content.length-1, driving two derived strings (contentA = content.slice(0, position), contentB = content.slice(position)).

**Plain English**: Like dragging a vertical line across a piece of text to mark where to cut it. As you drag, both preview panels update instantly to show what Part A and Part B would look like, so you can find the natural breakpoint before committing.

**Why We Use It**: Gives users tactile, visual control over the exact split point. Unlike asking users to type a number or select text, the slider makes the split location immediately comprehensible.

### AI Relation Reattribution Proposals

**Technical**: A **backend mutation** (a server-side operation that can change data, as opposed to a query which only reads) that calls the AI service with the unit ID and both content fragments. The AI returns an array of SplitReattributionProposal objects, each containing a relationId, an assignTo field ("A" or "B"), and a rationale explaining why.

**Plain English**: When you split a thought that has connections to other thoughts, the AI figures out which connections should follow Part A and which should follow Part B. For example, if your original unit said "The sky is blue AND water is wet" and had a relation "supports: claim about nature," the AI would analyze whether that support applies to the sky claim, the water claim, or both.

**Why We Use It**: Relation management is cognitively expensive. Users often have 5-10 relations on a well-developed unit. Asking them to manually reassign each one would make splitting feel punishing rather than empowering.

### Controlled Dialog State

**Technical**: The dialog's open/closed state is controlled externally via props (`open` and `onOpenChange`), following the **controlled component pattern** (a React pattern where the parent component owns the state and the child merely reflects it).

**Plain English**: The dialog doesn't decide when to open or close itself -- the parent component tells it. This is like a conference room door that doesn't lock from inside; the receptionist (parent) controls access.

**Why We Use It**: Allows the parent to coordinate the dialog with other UI state, like closing it when navigation changes or opening it from a keyboard shortcut.

### Validation Guard (isValidSplit)

**Technical**: A derived boolean (`contentA.length > 0 && contentB.length > 0`) that disables the Submit and Analyze buttons when the split would produce an empty part.

**Plain English**: You can't split a thought into "something and nothing." The buttons gray out if you drag the slider all the way to either end, preventing nonsensical operations.

**Why We Use It**: Prevents user frustration and backend errors by making invalid states unrepresentable in the UI.

---

## Change History

### 2026-03-19 - Initial Implementation (Story 5.4)

- **What Changed**: Created UnitSplitDialog component with slider-based position selection, live preview panels, AI relation reattribution analysis, and confirmation workflow
- **Why**: Story 5.4 (Unit Split Operation) required a way for users to divide thought units while preserving relational integrity
- **Impact**: Enables atomic knowledge restructuring without manual relation management. Awaits integration with UnitCard context menu or command palette for user access.
