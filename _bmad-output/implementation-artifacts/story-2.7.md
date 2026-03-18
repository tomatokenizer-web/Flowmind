# Story 2.7: Unit Versioning & History

Status: completed

## Story

As a user,
I want to see how my thinking has evolved by viewing previous versions of any Unit,
So that I can track my intellectual development and recover earlier formulations.

## Acceptance Criteria

1. **Given** a confirmed Thought Unit, **When** the user edits its content, **Then** the previous content is preserved as a version entry with: `version_number`, `content`, `changed_at`, `change_reason` (optional user input), `diff_summary` per FR60
2. The Unit Detail Panel shows a "Version History" tab listing all versions in reverse chronological order
3. Clicking a version shows a diff view highlighting what changed between that version and the current content
4. The user can restore a previous version, which creates a new version (not destructive) with `change_reason: "Restored from v{N}"`
5. Provenance metadata (`origin_type`, `source_span`) is preserved across versions per FR20
6. All modifications are automatically reflected in Assemblies and Navigators containing this Unit per NFR12

## Tasks / Subtasks

- [x] Task 1: Define Prisma schema for Unit Versions (AC: #1)
  - [x] Create `UnitVersion` model with: `id`, `unit_id` (FK), `version_number`, `content`, `changed_at`, `change_reason`, `diff_summary`, `origin_type`, `source_span`
  - [x] Add relation: Unit hasMany UnitVersion
  - [x] Add index on `unit_id` + `version_number` for efficient lookup
  - [x] Run `prisma migrate dev`
- [x] Task 2: Create version repository (AC: #1)
  - [x] Create `server/repositories/versionRepository.ts`
  - [x] Implement `create`, `findByUnitId` (sorted by version_number desc), `findByVersion`
- [x] Task 3: Implement versioning in unit service (AC: #1, #4, #5)
  - [x] Modify `unitService.update()`: before updating, snapshot current content as a new version
  - [x] Auto-increment `version_number` based on existing version count
  - [x] Generate `diff_summary` by comparing old and new content (simple character/word diff)
  - [x] Preserve `origin_type` and `source_span` in the version record
  - [x] Implement `unitService.restoreVersion(unitId, versionNumber)`: creates new version with `change_reason: "Restored from v{N}"`
- [x] Task 4: Add version tRPC procedures (AC: #1, #4)
  - [x] Add `unit.getVersionHistory` procedure: returns all versions for a unit
  - [x] Add `unit.getVersionDiff` procedure: returns diff between two versions
  - [x] Add `unit.restoreVersion` procedure: restores a specific version
- [x] Task 5: Create VersionHistory component (AC: #2, #3)
  - [x] Create `src/components/units/VersionHistory.tsx`
  - [x] List versions in reverse chronological order
  - [x] Show version number, changed_at (relative date), change_reason, diff_summary
  - [x] Clicking a version expands inline diff view
- [x] Task 6: Create DiffView component (AC: #3)
  - [x] Create `src/components/units/DiffView.tsx`
  - [x] Highlight additions (green background) and deletions (red background)
  - [x] Show line-by-line or word-by-word diff (simple approach: split by words, compare)
  - [x] Show "Restore this version" button below diff
- [x] Task 7: Integrate with Unit Detail Panel (AC: #2)
  - [x] Add "History" tab to Unit Detail Panel (Story 2.8)
  - [x] Show version count badge on the tab
  - [x] Load version history lazily when tab is activated
- [x] Task 8: Ensure Assembly/Navigator reflection (AC: #6)
  - [x] Publish `unit.contentChanged` event when content updates
  - [x] Verify that Assemblies/Navigators reference units by ID (not by content copy)
  - [x] Add integration test confirming content changes propagate
- [x] Task 9: Write tests
  - [x] Test version creation on unit content edit
  - [x] Test version_number auto-increment
  - [x] Test diff generation between versions
  - [x] Test version restoration creates new version (non-destructive)
  - [x] Test provenance metadata preservation
  - [x] Test version history retrieval (sorted correctly)

## Dev Notes

- Versions are append-only — they are never deleted or modified. This creates a complete audit trail.
- The diff algorithm can be simple for MVP: split content by words, use a longest-common-subsequence approach. Libraries like `diff` (npm) can be used.
- Version creation should be transparent — it happens automatically on every content edit, not manually triggered
- The `change_reason` field is optional and shown as a prompt ("Why did you change this?") — but the user can skip it
- For performance, version history should be lazily loaded only when the History tab is opened
- Assemblies and Navigators reference Units by ID, so content changes are automatically reflected — but verify this with integration tests

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Event bus for content change notifications
- [Source: _bmad-output/planning-artifacts/architecture.md] — 3-layer architecture
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.7] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — FR60: Unit version history
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — FR20: Provenance metadata preservation
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — NFR12: Content identity immutability
