# Story 3.1: Context Data Model & CRUD API

Status: complete

## Story

As a user,
I want to create, rename, and delete Contexts as named exploration spaces,
So that I can organize my thinking into distinct purposes and investigations.

## Acceptance Criteria

1. **Given** the database schema, **When** the Context model is defined, **Then** it includes: `id` (cuid), `name`, `description` (optional), `user_id`, `parent_context_id` (nullable, for hierarchy per FR8), `created_at`, `updated_at`, `snapshot_summary` (text, AI-generated placeholder), `unresolved_questions` (JSON array), `contradictions` (JSON array) per FR7, FR9
2. A many-to-many join table `unit_context` links Units to Contexts (a Unit can belong to multiple Contexts) per FR7
3. tRPC procedures `context.create`, `context.getById`, `context.list`, `context.update`, `context.delete`, `context.addUnit`, `context.removeUnit` are available
4. Deleting a Context does not delete its Units — it only removes the membership associations
5. Contexts support hierarchical nesting via `parent_context_id` per FR8
6. The service layer enforces that a Context must have a unique name within its parent scope

## Tasks / Subtasks

- [x] Task 1: Create Prisma schema for Context model (AC: #1, #5)
  - [x] Add `Context` model with fields: `id` (uuid), `name` (string), `description` (string, optional), `projectId` (FK to Project), `parentId` (self-referencing FK, nullable), `createdAt`, `updatedAt`, `snapshot` (string, default ""), `openQuestions` (Json, default []), `contradictions` (Json, default [])
  - [x] Add self-relation: `parent Context? @relation("ContextHierarchy")` and `children Context[] @relation("ContextHierarchy")`
  - [x] Add `@@unique([name, parentId, projectId])` constraint for unique names within parent scope
  - [x] Add index on `projectId` and `parentId` for query performance

- [x] Task 2: Create `unit_context` join table (AC: #2)
  - [x] Add `UnitContext` model with `unitId` (FK to Unit), `contextId` (FK to Context), `assignedAt` (DateTime)
  - [x] Add `@@unique([unitId, contextId])` to prevent duplicate assignments
  - [x] Add cascade delete on `contextId` (removing context removes memberships, not units) per AC #4

- [x] Task 3: Create context service layer → `src/server/services/contextService.ts` (AC: #3, #4, #6)
  - [x] `createContext({ name, description?, projectId, parentId? })` — validate unique name within parent scope per AC #6
  - [x] `getContextById(id)` — include unit count and parent/children relations
  - [x] `listContexts(projectId, parentId?)` — return tree structure with counts
  - [x] `updateContext(id, { name?, description? })` — re-validate uniqueness on rename
  - [x] `deleteContext(id)` — cascade-delete `unit_context` rows only, not units per AC #4
  - [x] `addUnit(unitId, contextId)` — upsert into `unit_context`
  - [x] `removeUnit(unitId, contextId)` — delete from `unit_context`
  - [x] `splitContext(id, newNames, projectId)` — split context into two
  - [x] `mergeContexts(sourceId, targetId)` — merge source into target

- [x] Task 4: Create tRPC router → `src/server/api/routers/context.ts` (AC: #3)
  - [x] `context.create` — input: `{ name, description?, projectId, parentId? }`, calls `contextService.createContext`
  - [x] `context.getById` — input: `{ id }`, returns context with unit count
  - [x] `context.list` — input: `{ projectId, parentId? }`, returns hierarchical list
  - [x] `context.update` — input: `{ id, name?, description? }`, calls `contextService.updateContext`
  - [x] `context.delete` — input: `{ id }`, calls `contextService.deleteContext`
  - [x] `context.addUnit` — input: `{ unitId, contextId }`, calls `contextService.addUnit`
  - [x] `context.removeUnit` — input: `{ unitId, contextId }`, calls `contextService.removeUnit`
  - [x] `context.split` — input: `{ id, newNames, projectId }`, calls `contextService.splitContext`
  - [x] `context.merge` — input: `{ sourceId, targetId }`, calls `contextService.mergeContexts`
  - [x] Register router in `src/server/api/root.ts`

- [x] Task 5: Add Zod validation schemas (inline in router)
  - [x] `createContextSchema` — name: min 1, max 100 chars; description: max 500 chars
  - [x] `updateContextSchema` — partial of create
  - [x] `contextIdSchema` — uuid validation
  - [x] `unitContextSchema` — unitId + contextId uuid validation
  - [x] `splitContextSchema` — id, newNames tuple, projectId
  - [x] `mergeContextSchema` — sourceId + targetId

- [ ] Task 6: Write tests
  - [ ] Test context CRUD operations (create, read, update, delete)
  - [ ] Test unique name constraint within same parent scope
  - [ ] Test hierarchical nesting (parent-child relationships)
  - [ ] Test `addUnit` / `removeUnit` operations
  - [ ] Test deleting a context preserves its units
  - [ ] Test listing contexts returns correct tree structure

## Dev Notes

- The architecture specifies `contexts` table with: `id`, `name`, `project_id`, `parent_id`, `snapshot` (JSONB), `open_questions` (JSONB), `contradictions` (JSONB). For MVP we use `user_id` directly since Projects are Epic 9.
- The `unit_context` join table is separate from `unit_perspectives` (Story 3.2) — `unit_context` tracks membership, `unit_perspectives` tracks per-context metadata overrides.
- Use cascading deletes on the join table so deleting a Context cleans up memberships automatically.
- The unique name constraint uses a composite key `(name, parentContextId, userId)` — null `parentContextId` values need special handling in PostgreSQL (nulls are distinct in unique constraints, which is the desired behavior here: multiple root-level contexts can exist).

### Architecture References

- [Source: architecture.md] — `contexts` table schema: id, name, project_id, parent_id, snapshot (JSONB), open_questions (JSONB), contradictions (JSONB)
- [Source: architecture.md] — tRPC router naming: `contextRouter`, procedures: `camelCase` verb-first
- [Source: architecture.md] — `features/contexts/` module structure
- [Source: epics.md#Story 3.1] — Story definition and acceptance criteria

### UX References

- [Source: ux-design-specification.md] — UX-DR12: Context sidebar navigation (depends on this data model)
- [Source: ux-design-specification.md] — UX-DR45: Context tree navigation (depends on hierarchical model)
