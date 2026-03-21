# Story 5.6: AI Refinement — Transform Raw Text to Coherent Expression

**Status: pending**

## Description
As a user,
I want to refine a rough Unit into a coherent, well-expressed version while preserving the original,
So that I can improve my expression without losing the raw authenticity of my initial thought.

## Acceptance Criteria

**Given** a Unit with raw, unpolished content
**When** the user clicks "Refine" in the Unit Detail Panel
**Then** the AI generates a refined version of the content that improves clarity, grammar, and logical structure
**And** the original content is preserved as version 1 in unit_versions

**Given** the AI has generated a refined version
**When** the result is presented
**Then** a side-by-side diff view shows the original (left) and refined version (right)
**And** changes are highlighted with green (additions) and red (removals)
**And** the refined version has `origin_type: "ai_refined"` and `quality: "refined"`

**Given** the user views the refinement proposal
**When** the user clicks "Accept"
**Then** the Unit content is updated to the refined version
**And** the version history records: version 1 = original, version 2 = refined with change_reason = "AI refinement"

**Given** the user views the refinement proposal
**When** the user clicks "Keep Original"
**Then** the refined version is discarded and the Unit content remains unchanged

**Given** the user views the refinement proposal
**When** the user clicks "Edit"
**Then** the refined version opens in an editable state so the user can further modify it before accepting

**Given** the refinement is accepted
**When** any Assembly or Navigator references this Unit
**Then** the updated content is automatically reflected (NFR12 — Units are references, not copies)

## Tasks
- [ ] Add "Refine" button to the Unit Detail Panel action bar
- [ ] Create tRPC mutation `ai.refineUnit` accepting `{ unitId: string }` that calls the refinement service
- [ ] Implement `server/ai/refinementService.ts` with a prompt instructing the AI to improve clarity, grammar, and logical structure while preserving meaning
- [ ] Ensure the current Unit content is snapshotted to `unit_versions` as version 1 before any refinement is applied
- [ ] Return refined text as a proposal (not saved to DB yet) along with a character-level diff
- [ ] Create `components/ai/RefinementDiffView.tsx` showing side-by-side original (left) and refined (right) panels
- [ ] Implement diff highlighting: additions in green, removals in red using a diff library (e.g., `diff` npm package)
- [ ] Add Accept button: calls tRPC `unit.update` with refined content, sets `origin_type: "ai_refined"`, `quality: "refined"`, creates version 2 with `change_reason: "AI refinement"`
- [ ] Add "Keep Original" button: dismisses the diff view, no DB changes
- [ ] Add "Edit" button: replaces the right panel with an editable textarea pre-filled with the refined version; Accept saves the manually edited version
- [ ] Verify that Assembly and Navigator references update automatically because Units are stored by reference (no data copy needed — just confirm the Unit's content field is the source of truth)

## Dev Notes
- The refinement prompt should include the Unit's type as context (e.g., refining a "Question" should sharpen the question, not convert it to a statement)
- Diff computation should happen client-side after receiving the refined text to avoid extra server round-trips
- Use the `diff` npm package's `diffWords` or `diffChars` function for the visual diff
- `origin_type: "ai_refined"` should only be set if the user Accepts — if they Edit before Accepting, the origin_type should remain "ai_refined" (the AI still authored the starting point)
- The version history snapshot must happen before the mutation returns the refined text, in case the user's session drops between receiving and accepting the proposal
- Loading state on the "Refine" button should show a spinner while AI generates (typically 2-5 seconds)

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: AI provider abstraction (prerequisite)
- Story 5.11: `origin_type: "ai_refined"` counts toward AI contribution ratio
- Story 5.5: Unit Split also creates version history (similar version management pattern)
