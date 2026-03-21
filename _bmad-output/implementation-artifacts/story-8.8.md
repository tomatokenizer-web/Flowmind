# Story 8.8: Branch Project from Drift Detection

**Status: pending**

## Description
As a user,
I want to branch drifted Units into a new independent project while maintaining a reference relation with the original project,
So that valuable tangential explorations become their own focused workspace without losing the connection to where they originated.

## Acceptance Criteria

**Given** a Unit or group of Units has been flagged by Drift Detection with a drift_score above threshold
**When** the user selects the "Branch into new project" option
**Then** a new Project is created with fields: `branched_from` (original project ID), `branch_reason` (user-provided or AI-suggested), and `shared_units[]` (Units shared between both projects) per PRD Section 19
**And** the selected drifted Units are moved to the new project's initial Context
**And** a `references` relation is maintained between the original project and the branched project
**And** shared Units appear in both projects simultaneously (not duplicated)
**And** the original project's drift indicator updates to reflect the resolved drift
**And** the branched project inherits the original project's template (if any) or can be assigned a different template
**And** a creation dialog allows the user to name the new project, provide a purpose statement, and confirm which Units to include

## Tasks
- [ ] Add `branched_from` String? (FK to Project) field to Project model
- [ ] Add `branch_reason` String? field to Project model
- [ ] Add `shared_units` Json? (array of Unit ids) field to Project model
- [ ] Create `ProjectRelation` Prisma model for project-to-project references: `id`, `source_project_id`, `target_project_id`, `relation_type` (enum: branched_from, references)
- [ ] Create `server/repositories/branchRepository.ts` — project branching, shared Unit membership management
- [ ] Create `server/services/branchService.ts` — creates new Project, moves/shares selected Units to new Context, creates ProjectRelation, updates drift_acknowledged on original Units, triggers purpose embedding computation for new project
- [ ] Add tRPC procedures: `branch.createFromDrift`, `branch.getSharedUnits`, `branch.getProjectRelations`
- [ ] Create `components/branch/BranchProjectDialog.tsx` — multi-step dialog: (1) name + purpose statement, (2) select Units to include (pre-selected drifted Units), (3) template selection, (4) confirm
- [ ] Create `components/branch/BranchIndicatorBadge.tsx` — visual branch icon shown in project selector for branched projects
- [ ] Update Project sidebar to show branch lineage (parent project link)
- [ ] Ensure moved Units retain all their relations and appear in both projects' graphs
- [ ] Write unit tests for branchService Unit sharing logic (no duplication)
- [ ] Write integration tests for full branch creation flow from DriftResolutionDialog

## Dev Notes
- Key files: `server/services/branchService.ts`, `server/api/routers/branch.ts`, `components/branch/BranchProjectDialog.tsx`
- Dependencies: Story 8.7 (Drift Detection provides the entry point), Story 9.1 (Project model), Story 2.3 (Context membership for new project's Context)
- Technical approach: "Shared Units" are not duplicated — a Unit can have ContextMembership in Contexts across multiple Projects. The `shared_units` array on the new Project is for quick reference. Moving a Unit means adding a ContextMembership in the new project's root Context while optionally retaining the original Context membership (user choice in dialog). ProjectRelation is a separate table to support future multi-hop lineage queries.

## References
- Epic 8: Feedback Loop & Thought Evolution
- PRD Section 19: Branch Project structure
- FR64: Branch Project as drift resolution option
- Related: Story 8.7 (Drift Detection), Story 9.1 (Project model), Story 9.2 (Domain Templates for template inheritance)
