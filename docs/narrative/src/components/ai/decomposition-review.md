# Decomposition Review

> **Last Updated**: 2026-03-22
> **Code Location**: `src/components/ai/decomposition-review.tsx`
> **Status**: Active

---

## Context & Purpose

This module is the key user-facing interface for AI text decomposition (Story 5.3). When a user submits a block of text in "Organize" (AI-assisted) capture mode, the AI service breaks it into discrete thought units and proposes a type for each one. `DecompositionReview` displays those proposals and lets the user accept, edit, or reject each one individually — or apply bulk actions — before any units are written to the database.

**Business Need**: Flowmind's human-in-the-loop principle prohibits auto-creating content from AI output. Users must explicitly confirm every unit. This component is the enforcement point: nothing reaches the database until the user presses Accept (or Accept All). It also gives users full agency to correct the AI — they can change a proposed type, rewrite the unit's content, or discard it entirely.

**When Used**:
- After `api.ai.decomposeText` returns successfully in Capture Mode (organize phase)
- When the capture store's `phase` transitions to `"reviewing"` and `decompositionData` is populated
- Rendered inside `capture-mode.tsx` inside the `AnimatePresence` reviewing branch

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `react`: Core hooks — `useState`, `useCallback`, `useRef` — manage per-proposal editing state, drag state, and the text-container DOM reference.

- `framer-motion` (`motion`, `AnimatePresence`): Animates proposal cards on mount, status change (accepted/rejected scale/opacity shifts), and exit (slide left/right depending on outcome). Also wraps the highlighted text spans with `layout` so boundaries reflow smoothly when drag-adjusted.

- `lucide-react` (`Check`, `X`, `Sparkles`, `GripVertical`, `ChevronRight`, `Pencil`, `ChevronDown`): Icon set for all interactive controls and status indicators. Sparkles = AI origin; GripVertical = draggable boundary handle; Pencil = enter edit mode; Check/X = accept/reject; ChevronDown = type selector dropdown affordance.

- `~/lib/utils` (`cn`): Class-name merging for conditional Tailwind application.

- `~/components/ui/button` (`Button`): Design-system button for Accept, Reject, Accept All, Reject All, Cancel, and Done actions.

- `~/lib/unit-types` (`UNIT_TYPE_COLORS`): Maps each `UnitType` to `{ bg, accent }` color tokens. Used for the highlighted text spans, the type badge, and the type selector.

- `~/trpc/react` (`api`): tRPC client. Calls `api.unit.create.useMutation` to persist accepted units and `api.relation.create.useMutation` to create any AI-proposed relations between accepted units and existing units in the context.

- `@prisma/client` (`UnitType`): Enum type used for type-casting when calling the create mutation.

- `~/server/ai` (`UnitProposal`, `DecompositionRelationProposal`, `UserPurpose`): Shape of AI decomposition output. `UnitProposal` carries the proposed content, type, confidence, and character span within the original text. `DecompositionRelationProposal` carries a `sourceIdx` (index into proposals array) pointing to an existing unit ID.

### Dependents (What Needs This)

- `src/components/unit/capture-mode.tsx`: The sole consumer. Mounts `DecompositionReview` when `phase === "reviewing" && decompositionData !== null`. Passes `onComplete` (which calls `handleDecompositionComplete` from the `useCaptureMode` hook and then closes the overlay) and `onCancel` (which calls `cancelDecomposition`, resetting the store to input phase).

### Data Flow

**Happy Path (Accept)**:
```
AI returns DecompositionResult (proposals + relationProposals)
    |
    v
capture-store sets phase="reviewing", decompositionData={...}
    |
    v
capture-mode.tsx renders <DecompositionReview />
    |
    v
Component initializes proposalStates[] from proposals
    (status="pending", editedContent=proposal.content, editedType=proposal.proposedType)
    |
    v
User optionally edits type (select dropdown) or content (Pencil -> textarea -> blur/Cmd+Enter)
    |
    v
User clicks Accept (or Accept All)
    |
    v
api.unit.create called with editedContent + editedType + lifecycle:"pending" + originType:"ai_generated"
    |
    v
For each relation where sourceIdx matches this unit: api.relation.create called
    |
    v
proposalState[idx].status = "accepted", createdUnitId stored
    |
    v
api.unit.list invalidated (UI refreshes)
    |
    v
When pendingCount === 0: "Done" button appears
    |
    v
onComplete(acceptedCount, rejectedCount) -> store resets, overlay closes
```

**Edit Flow**:
```
User clicks Pencil icon on a pending proposal
    |
    v
isEditing=true -> textarea replaces read-only paragraph
    |
    v
User types edits; editedContent updated on every keystroke
    |
    v
User blurs textarea OR presses Cmd+Enter -> isEditing=false (content kept)
User presses Esc -> editedContent reverted to proposal.content, isEditing=false
    |
    v
Accept now uses editedContent instead of proposal.content
```

**Drag Boundary Adjustment**:
```
User mousedown on GripVertical handle between proposal N and N+1
    |
    v
draggingIdx=N stored in state
    |
    v
User mouseup anywhere on the text container div
    |
    v
X position mapped to character offset in originalText
    |
    v
proposal[N].endChar and proposal[N].editedContent updated
proposal[N+1].startChar and proposal[N+1].editedContent updated (adjacent boundary shifts)
    |
    v
Text highlight spans rerender with new content ranges
```

---

## Macroscale: System Integration

### Architectural Layer

`DecompositionReview` is the **Presentation + Coordination Layer** for the decomposition flow. It is more than a pure presentational component because it directly calls tRPC mutations — but it contains no server-side logic and all decisions remain with the user.

```
User types multi-sentence text in Capture Mode (organize mode)
    |
    v
useCaptureMode hook -> api.ai.decomposeText mutation
    |
    v
AI Service (server) -> Anthropic Claude -> structured JSON proposals
    |
    v
capture-store.decompositionData populated; phase -> "reviewing"
    |
    v
[THIS COMPONENT] DecompositionReview renders proposals, handles user review
    |
    v
api.unit.create (per accepted proposal) -> Unit persisted in Prisma DB
    |
    v
api.relation.create (per accepted relation proposal) -> Relations persisted
    |
    v
onComplete -> store reset -> capture overlay closed
```

### Big Picture Impact

This component is the **execution gate** for the decompose-and-review workflow. Every unit created through AI decomposition passes through this component. It enforces:

1. **Human confirmation**: No AI output reaches the DB without an explicit Accept
2. **Editability**: Content and type can be corrected before persistence
3. **Selective acceptance**: Users can cherry-pick which proposals to keep
4. **Relation chaining**: Accepted units are linked to existing context units when AI proposed relations

Without this component, the organize mode pipeline would have no UI and AI decomposition results would be discarded.

### Critical Path Analysis

**Importance Level**: High — required for Story 5.3 (AI text decomposition user flow)

**Failure modes**:
- `api.unit.create` fails for one proposal: Error is caught; if it's a duplicate conflict the proposal is auto-rejected, otherwise the error is logged and the proposal remains "pending" so the user can retry
- `api.relation.create` fails: Silently swallowed — relation is skipped but the unit is still created
- Drag boundary math produces out-of-range chars: `Math.max/Math.min` clamps prevent invalid slices
- All proposals rejected before clicking Done: `isComplete` is still true (pendingCount === 0), Done button appears, `onComplete(0, N)` is called

**Blast radius**: Contained to the reviewing phase of organize-mode capture. Capture mode in standard "capture" mode is completely unaffected.

---

## Technical Concepts (Plain English)

### Per-Proposal Edit State (`ProposalState`)
**Technical**: Each entry in `proposalStates[]` shadows the original `UnitProposal` with mutable fields: `editedContent`, `editedType`, `isEditing`, `status`, and `createdUnitId`.

**Plain English**: The component keeps a working copy of every proposal. The AI's original suggestion is preserved in `proposal.content` and `proposal.proposedType` while the user's edits live in `editedContent` and `editedType`. If the user presses Esc while editing, the working copy is reset to the original.

**Why We Use It**: Lets users freely edit without permanently destroying the AI suggestion, and allows Esc-to-revert without needing extra undo logic.

### Type Selector as `<select>` with Style Injection
**Technical**: The type dropdown is a native `<select>` element styled with inline `backgroundColor` and `color` from `UNIT_TYPE_COLORS`, with Tailwind `appearance-none` and a layered `ChevronDown` icon for visual consistency.

**Plain English**: A normal HTML dropdown that looks like a color-coded badge. Changing it instantly updates both the badge color in the card and the highlight color in the original text preview above.

**Why We Use It**: Native `<select>` provides keyboard navigation, accessibility, and mobile support without adding a custom dropdown component.

### Drag-to-Adjust Boundaries
**Technical**: `onMouseDown` on a `GripVertical` handle sets `draggingIdx`. `onMouseUp` on the text container div calculates a new character position by dividing the container width by `originalText.length` and uses that ratio to map the cursor X position to a character offset.

**Plain English**: Users can drag the divider between two highlighted segments to resize which text belongs to each proposed unit. The character-offset math is an approximation (assumes monospace-like distribution) but works well enough for short-to-medium texts.

**Why We Use It**: The AI's sentence-boundary detection is good but not perfect. Giving users a direct manipulation affordance to correct boundaries is much faster than manually editing both text boxes.

### Bulk Reject All
**Technical**: `handleRejectAllRemaining` sets `status: "rejected"` and `isEditing: false` for every proposal currently in `"pending"` state. No API calls are made — rejection is purely local state.

**Plain English**: One-click escape hatch to discard everything the AI proposed. Since rejection is just a UI state (nothing is in the DB yet), this is instant and free. The user can then press Done with 0 accepted units.

**Why We Use It**: If the AI completely misunderstood the text, the user should not have to reject proposals one by one.

### Auto-reject on Duplicate Conflict
**Technical**: If `api.unit.create` throws a `CONFLICT` tRPC error (indicating identical content already exists in the project), the `catch` block sets that proposal's status to `"rejected"` instead of leaving it in a broken state.

**Plain English**: If the AI proposes a unit whose text is identical to something the user already has, the system silently skips it rather than showing an error. The user sees it marked as rejected without having to manually dismiss an error.

**Why We Use It**: Duplicate conflicts are expected when re-decomposing previously processed text. Silent rejection is a better UX than a visible error for a situation the user did not cause.

### `lifecycle: "pending"` for Accepted Units
**Technical**: All accepted units are created with `lifecycle: "pending"` (not `"draft"`). The relation router enforces that only non-draft units can participate in relations.

**Plain English**: Units created through decomposition review are immediately actionable — they show up in the context view and can be linked to other units. "Draft" units are invisible to most queries; "pending" units are visible but flagged for further review.

**Why We Use It**: Keeps the relation creation from silently failing while also signaling to the user that AI-generated units may still need human curation.

---

## Design Decisions

### Why `contextId` Is Accepted as a Prop but Not Passed to `unit.create`
The `createUnitSchema` does not include a `contextId` field — units are associated with contexts through the `UnitContext` join table, not directly on the unit record. The `contextId` prop exists to support future relation creation targeting existing context units (via `relationProposals[].targetUnitId`, which is already a real unit ID resolved server-side during decomposition).

### Why Edit Mode Uses `onBlur` Rather Than an Explicit Save Button
Pressing blur (clicking away) commits the edit silently. This mimics spreadsheet-style editing: changes take effect when you move away. An explicit Save button would add a third action alongside Accept and Reject, making the card unnecessarily complex. The Cmd+Enter shortcut is provided for keyboard users who want explicit confirmation.

### Why "Accept All" and "Reject All" Only Operate on Pending Proposals
Already-accepted or already-rejected proposals should not be re-processed by bulk actions. The count shown in the button label (`Accept All (N)`) reflects only pending proposals, so users always know exactly what the bulk action will affect.

### Why Relation Creation Failures Are Silently Swallowed
Relation failures (e.g., target unit in draft state, foreign key constraint) are non-fatal: the unit is already created and useful on its own. Surfacing these errors to the user would create confusion about something they have no way to fix from this UI. Relations can always be added manually later via the graph view.

---

## Change History

### 2026-03-22 - Story 5.3 Implementation
- **What Changed**: Created `DecompositionReview` component with inline editing per proposal, type selector dropdown, per-proposal Accept/Edit/Reject buttons, Accept All / Reject All bulk actions, original-text boundary visualization with drag handles, and relation creation on acceptance.
- **Why**: Story 5.3 requires a polished user-facing review UI for AI decomposition results before units are persisted.
- **Impact**: Completes the organize-mode capture flow. Users can now review and selectively accept AI-proposed units with full editing control.
