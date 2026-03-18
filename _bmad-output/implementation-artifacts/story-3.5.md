# Story 3.5: Context Hierarchy — Split, Merge & Cross-Reference

Status: completed

## Story

As a user,
I want to split a large Context into sub-Contexts, merge related Contexts, and cross-reference between them,
So that my organizational structure can evolve as my thinking deepens.

## Acceptance Criteria

1. **Given** one or more Contexts exist, **When** the user chooses "Split Context", **Then** a dialog allows them to name two new sub-Contexts and assign Units to each; the original Context becomes the parent of both per FR8
2. Units not assigned to either sub-Context remain in the parent Context
3. **When** the user selects two Contexts and chooses "Merge Contexts", **Then** a dialog allows them to name the merged Context; all Units from both are combined; perspective data is preserved (conflicts prompt the user to choose which perspective to keep) per FR8
4. **When** the user adds a cross-reference between two Contexts, **Then** a `context_reference` record links them (bidirectional), and each Context shows the cross-reference in its header per FR8
5. Split, merge, and cross-reference operations are undoable via Cmd+Z

## Tasks / Subtasks

- [ ] Task 1: Create `ContextReference` Prisma model (AC: #4)
  - [ ] Add `ContextReference` model: `id` (cuid), `sourceContextId` (FK), `targetContextId` (FK), `createdAt`
  - [ ] Add `@@unique([sourceContextId, targetContextId])` to prevent duplicates
  - [ ] Bidirectional: create two records (A→B and B→A) or query both directions
  - [ ] Run migration: `npx prisma migrate dev --name add-context-reference`

- [x] Task 2: Create context operations service → `src/server/services/contextOperationsService.ts` (AC: #1, #2, #3, #4)
  - [ ] `splitContext({ contextId, subContextA: { name, unitIds[] }, subContextB: { name, unitIds[] } })`:
    - Create two new sub-contexts with the original as parent
    - Move assigned units to respective sub-contexts (create `unit_context` entries)
    - Units not in either list remain in the parent context per AC #2
    - Copy relevant perspectives to new sub-contexts
    - Return both new context IDs
  - [ ] `mergeContexts({ contextIdA, contextIdB, mergedName, perspectiveConflictResolutions? })`:
    - Create a new merged context
    - Combine all units from both contexts
    - Detect perspective conflicts (same unit with different perspectives in A vs B)
    - If `perspectiveConflictResolutions` provided, apply them; otherwise return conflicts for user resolution
    - Delete original contexts after merge (or archive)
  - [ ] `addCrossReference(sourceContextId, targetContextId)`:
    - Create bidirectional `ContextReference` records
    - Validate contexts exist and are not the same
  - [ ] `removeCrossReference(sourceContextId, targetContextId)`:
    - Delete both direction records

- [x] Task 3: Create tRPC procedures (AC: #1, #3, #4)
  - [ ] `context.split` — input: `{ contextId, subContextA: { name, unitIds }, subContextB: { name, unitIds } }`
  - [ ] `context.merge` — input: `{ contextIdA, contextIdB, mergedName, conflictResolutions? }`
  - [ ] `context.getMergeConflicts` — input: `{ contextIdA, contextIdB }`, returns perspective conflicts for user review
  - [ ] `context.addCrossReference` — input: `{ sourceContextId, targetContextId }`
  - [ ] `context.removeCrossReference` — input: `{ sourceContextId, targetContextId }`
  - [ ] `context.getCrossReferences` — input: `{ contextId }`, returns linked contexts

- [x] Task 4: Create SplitContextDialog → `src/components/context/SplitContextDialog.tsx` (AC: #1, #2)
  - [ ] Radix UI Dialog with two name inputs for sub-contexts
  - [ ] Unit assignment UI: list of units in the context with checkboxes for "Sub-Context A" / "Sub-Context B" / "Keep in Parent"
  - [ ] Default: all units unassigned (remain in parent)
  - [ ] Validate: at least one unit assigned to at least one sub-context
  - [ ] Submit calls `trpc.context.split`

- [x] Task 5: Create MergeContextDialog → `src/components/context/MergeContextDialog.tsx` (AC: #3)
  - [ ] Radix UI Dialog showing both contexts side-by-side
  - [ ] Input for merged context name (default: "Context A + Context B")
  - [ ] If perspective conflicts exist, show a conflict resolution UI:
    - List conflicting units with their perspectives from each context
    - User selects which perspective to keep per conflict
  - [ ] Fetch conflicts on dialog open via `trpc.context.getMergeConflicts`
  - [ ] Submit calls `trpc.context.merge` with resolutions

- [ ] Task 6: Create CrossReferenceUI → `src/components/context/CrossReferenceIndicator.tsx` (AC: #4)
  - [ ] In the Context View header, show cross-referenced contexts as linked badges
  - [ ] Each badge is clickable — navigates to the referenced context
  - [ ] "Add Cross-Reference" button opens a context picker popover
  - [ ] "Remove" option on each cross-reference badge (with confirmation)

- [ ] Task 7: Integrate with undo system (AC: #5)
  - [ ] Register `context.split` as undoable action in undo store (Story 2.10)
  - [ ] Undo split: delete sub-contexts, restore original unit assignments
  - [ ] Register `context.merge` as undoable action
  - [ ] Undo merge: recreate original contexts with their units and perspectives
  - [ ] Register cross-reference operations as undoable

- [ ] Task 8: Write tests
  - [ ] Test split creates two sub-contexts with correct parent
  - [ ] Test split assigns units correctly to sub-contexts
  - [ ] Test unassigned units remain in parent context
  - [ ] Test merge combines units from both contexts
  - [ ] Test merge detects perspective conflicts
  - [ ] Test merge applies conflict resolutions correctly
  - [ ] Test cross-reference creates bidirectional links
  - [ ] Test cross-reference displays in context header
  - [ ] Test undo of split restores original state
  - [ ] Test undo of merge restores both original contexts

## Dev Notes

- Split and merge are complex operations that touch multiple tables (`contexts`, `unit_context`, `unit_perspectives`). Use database transactions to ensure atomicity.
- Perspective conflict detection during merge: query `unit_perspectives` for units that exist in both contexts. If the same `unitId` has different `typeOverride`, `importance`, or `stance` in each context, that's a conflict.
- For undo of merge, the undo action needs to store the complete state of both original contexts (including all unit memberships and perspectives). This may be a large payload — consider storing a snapshot rather than full data.
- Cross-references are conceptually similar to bookmarks between contexts. They're a lightweight navigation aid, not a structural relationship.
- The "Move" option from Story 3.3's context menu can be implemented here as a special case of split (move selected units to a different context).

### Architecture References

- [Source: architecture.md] — Database transactions for multi-table operations
- [Source: architecture.md] — `unit_perspectives` table: UNIQUE(unit_id, context_id)
- [Source: architecture.md] — Zustand undo stack for client-side undo
- [Source: epics.md#Story 3.5] — Story definition and acceptance criteria

### UX References

- [Source: project-context.md] — No modal for routine actions, but split/merge are complex enough to warrant dialogs
- [Source: project-context.md] — Radix UI Dialog primitive for accessible modals
- [Source: ux-design-specification.md] — UX-DR41: Undo/redo system for all major operations
