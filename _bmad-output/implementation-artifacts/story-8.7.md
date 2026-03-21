# Story 8.7: Unit Drift Detection from Project Purpose

**Status: pending**

## Description
As a user,
I want the system to detect when my Units are drifting away from the project's stated purpose,
So that I can stay focused or consciously expand the scope.

## Acceptance Criteria

**Given** a Project has a defined purpose (from domain template or user description)
**When** the Drift Detection service analyzes Units in the project
**Then** each Unit receives a `drift_score` (0.0–1.0) measuring semantic distance from the project purpose per FR64
**And** when a Unit's drift_score exceeds a configurable threshold (default 0.7), the user is presented with options: (1) keep in project (mark as intentional expansion), (2) move to a different Context, (3) split into a sub-context, (4) branch into a new project (Story 8.8) per FR64
**And** the drift detection runs as a Trigger.dev background job on Unit creation/update
**And** the Project Dashboard shows an aggregate drift indicator
**And** the notification follows non-interrupting policy per NFR24

## Tasks
- [ ] Add `drift_score` Float? field to Unit model (0.0–1.0, null means not yet evaluated)
- [ ] Add `drift_acknowledged` Boolean default false to Unit model (set true when user selects "keep as intentional expansion")
- [ ] Add `purpose_embedding` Json? field to Project model (vector embedding of project purpose text)
- [ ] Create `server/repositories/driftRepository.ts` — query high-drift Units for a project, update drift_score and drift_acknowledged
- [ ] Create `server/services/driftService.ts` — compute cosine distance between Unit embedding and project purpose embedding, update drift_score, identify Units above threshold
- [ ] Add tRPC procedures: `drift.getHighDriftUnits`, `drift.acknowledgeExpansion`, `drift.moveToContext`, `drift.splitToSubContext`, `drift.triggerBranchProject`
- [ ] Create Trigger.dev job `drift-detection-job.ts` — triggered on Unit create/update events, computes drift_score, queues non-interrupting notification if threshold exceeded
- [ ] Create `components/drift/DriftIndicator.tsx` — aggregate drift badge on Project Dashboard (e.g., "3 units drifting")
- [ ] Create `components/drift/DriftResolutionDialog.tsx` — options modal: keep/expand, move to Context, split sub-context, branch project
- [ ] Add drift_score visual indicator to UnitCard (subtle warning color when > 0.7 and not acknowledged)
- [ ] Write unit tests for cosine distance calculation and threshold logic
- [ ] Write integration tests for all four resolution paths

## Dev Notes
- Key files: `server/services/driftService.ts`, `server/api/routers/drift.ts`, `components/drift/DriftResolutionDialog.tsx`
- Dependencies: Story 9.1 (Project model with purpose field), Story 4.x (embeddings/pgvector), Story 8.8 (Branch Project action), Trigger.dev
- Technical approach: Project purpose embedding is computed once on project create/update and stored in `purpose_embedding`. On each Unit write, Trigger.dev job computes cosine distance between Unit's embedding and `purpose_embedding`. `drift_score = cosine_distance` (0=identical, 1=orthogonal). Threshold configurable via `DRIFT_THRESHOLD` env var (default 0.7). Notification batched: only one notification per 24h per project even if multiple Units drift.

## References
- Epic 8: Feedback Loop & Thought Evolution
- FR64: Unit drift detection from project purpose
- NFR24: Non-interrupting notification policy
- Related: Story 8.8 (Branch Project from drift), Story 9.1 (Project model), Story 4.x (embeddings)
