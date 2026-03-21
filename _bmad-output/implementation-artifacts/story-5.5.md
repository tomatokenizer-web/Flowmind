# Story 5.5: Unit Split with Relation Re-Attribution

**Status: pending**

## Description
As a user,
I want to split one Unit into two and have the system propose how existing relations should be redistributed,
So that I can refine my thought granularity without losing any connections.

## Acceptance Criteria

**Given** a confirmed Unit with content and 5 existing relations
**When** the user initiates a Split operation
**Then** the Unit content is displayed in an editor with a draggable split point indicator
**And** the user can position the split point to divide the content into two parts

**Given** the user has positioned the split point
**When** the user clicks "Preview Split"
**Then** two preview cards are shown with the divided content
**And** for each of the 5 existing relations, the AI proposes which of the two resulting Units should inherit it
**And** each proposal shows: relation type, connected Unit preview, and which half the AI recommends (Unit A or Unit B) with a brief rationale

**Given** the split preview is displayed
**When** the user overrides an AI relation attribution (moves a relation from Unit A to Unit B)
**Then** the proposal updates to reflect the user's choice
**And** the override is visually distinguished from the AI's original proposal

**Given** the user confirms the split
**When** the split executes
**Then** the original Unit is archived (not deleted) with a reference to both new Units
**And** two new Units are created with the split content, both inheriting the original Unit's Context memberships
**And** relations are attributed according to the final (user-confirmed) assignment
**And** a `unit.split` event is emitted with original_id, new_unit_a_id, new_unit_b_id

**Given** the original Unit appeared in one or more Assemblies
**When** the split executes
**Then** each Assembly item referencing the original Unit is flagged for review
**And** the user is prompted to choose which new Unit replaces it in each Assembly (or both in sequence)

**Given** the original Unit had version history
**When** the split executes
**Then** both new Units reference the original Unit's version history as their provenance
**And** version 1 of each new Unit records the split event

## Tasks
- [ ] Add "Split" action to the Unit Detail Panel context menu / action bar
- [ ] Create `components/ai/UnitSplitEditor.tsx` modal with the original Unit content and a draggable split point cursor
- [ ] Implement split point drag: visually divide the text at the cursor position, showing Unit A (left/top) and Unit B (right/bottom) previews
- [ ] Create tRPC query `ai.previewSplit` accepting `{ unitId, splitPosition }` that fetches existing relations and calls AI for re-attribution proposals
- [ ] Implement `server/ai/splitService.ts` with prompt that analyzes Unit content halves and each relation, proposing which half should inherit it with rationale
- [ ] Render split preview: two side-by-side Unit cards with relation attribution list below, AI-proposed badge on each attribution
- [ ] Allow user to drag-and-drop relation attributions between Unit A and Unit B columns; mark overridden attributions with "User override" visual style
- [ ] Create tRPC mutation `unit.split` accepting `{ unitId, splitPosition, relationAttributions: Array<{ relationId, assignTo: "a" | "b" }> }`
- [ ] In `unit.split` mutation: archive original Unit (set `archived_at`, add `split_into: [newAId, newBId]` metadata), create two new Units, re-create relations on the assigned new Units
- [ ] Copy all Context memberships from original Unit to both new Units in the split mutation
- [ ] Emit `unit.split` event via Trigger.dev after successful split
- [ ] Query assemblies referencing the original Unit after split, flag them for review, and show a post-split prompt for Assembly replacement
- [ ] Set `provenance_unit_id` on both new Units pointing to the original, and create version 1 records with `change_reason: "split from unit <id>"`

## Dev Notes
- The split mutation should run in a DB transaction: archive original + create A + create B + copy relations — all or nothing
- Split position should be stored as a character index, not a word/sentence index, for precision
- Archived units should remain queryable (for provenance) but not appear in normal Unit listings — add `WHERE archived_at IS NULL` to standard queries
- The AI relation re-attribution prompt should include the full content of both halves AND a summary of each existing relation's target Unit to make an informed recommendation
- Assembly flagging: add an `assembly_items_needing_review` flag or dedicated review queue — do not block the split on Assembly resolution
- Version history provenance: `unit_versions` should have a `provenance_unit_id` FK that both new Units populate with the original's ID

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: AI provider abstraction for relation re-attribution prompts
- Story 4.x: Relation data model and mutation patterns
- Story 5.6: AI Refinement also creates version history entries (similar pattern)
