# Story 9.1: Project Data Model & Purpose-Optimized Environment

**Status: pending**

## Description
As a user,
I want to create Projects as purpose-optimized workspaces with their own UI configuration,
So that my tools adapt to what I'm trying to accomplish.

## Acceptance Criteria

**Given** the database schema
**When** the Project model is defined
**Then** it includes: `id` (cuid), `name`, `description`, `purpose` (text), `user_id`, `template_id` (nullable FK to DomainTemplate), `constraint_level` (enum: strict, guided, open), `created_at`, `updated_at` per FR63
**And** a Project contains Contexts (one-to-many) and determines the UI environment per FR63
**And** type-specific default views are configured per project type (research → Thread View, decision → Graph View) per FR63
**And** tRPC procedures `project.create`, `project.getById`, `project.list`, `project.update`, `project.delete` are available
**And** the sidebar project selector (placeholder from Epic 3) now shows real projects
**And** MVP starts with pre-defined project templates; custom composition is deferred

## Tasks
- [ ] Define `Project` Prisma model: `id` (cuid), `name`, `description`, `purpose`, `user_id` (FK User), `template_id` (nullable FK DomainTemplate), `constraint_level` (enum: strict, guided, open, default: open), `default_view` (enum: thread, graph, dashboard), `branched_from` (nullable FK Project, for Story 8.8), `branch_reason` (String?), `created_at`, `updated_at`
- [ ] Define `ConstraintLevel` enum in Prisma schema
- [ ] Define `DefaultView` enum in Prisma schema
- [ ] Update Context model to add `project_id` FK to Project (Contexts belong to a Project)
- [ ] Run `prisma migrate dev` for Project and updated Context models
- [ ] Create `server/repositories/projectRepository.ts` — CRUD, `findByUserId`, `findWithContexts`
- [ ] Create `server/services/projectService.ts` — create (with default Context scaffolding), update, delete (cascade Contexts), get with Contexts
- [ ] Add tRPC router `server/api/routers/project.ts` with procedures: `project.create`, `project.getById`, `project.list`, `project.update`, `project.delete`
- [ ] Register project router in `server/api/root.ts`
- [ ] Update Zustand store: add `activeProjectId`, `projects[]` to global store slice
- [ ] Update sidebar project selector to fetch real projects via `project.list`
- [ ] Update routing: project selection sets `activeProjectId` and filters Contexts shown in sidebar
- [ ] Write unit tests for projectService CRUD and cascade delete
- [ ] Write integration tests for tRPC project procedures

## Dev Notes
- Key files: `prisma/schema.prisma`, `server/repositories/projectRepository.ts`, `server/services/projectService.ts`, `server/api/routers/project.ts`, sidebar component from Epic 3
- Dependencies: Story 1.x (Prisma/DB setup), Story 2.3 (Context model — add project_id FK), Story 3.1 (Sidebar project selector placeholder), Story 9.2 (DomainTemplate model referenced by template_id)
- Technical approach: On project create, always create one default Context named "Main" belonging to the new Project. `default_view` determines which view component renders when navigating to a Project. The sidebar project selector becomes a real dropdown/list populated from `project.list`. Context FK to Project is a required field — all Contexts must belong to a Project; a "default project" is auto-created for new users during onboarding.

## References
- Epic 9: Projects & Domain Templates
- FR63: Project as purpose-optimized workspace
- Related: Story 9.2 (Domain Template model), Story 9.3 (Constraint Levels), Story 8.7 (Project purpose embedding for Drift Detection), Story 8.8 (branched_from field on Project)
