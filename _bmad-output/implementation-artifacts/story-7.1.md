# Story 7.1: Assembly Data Model & CRUD API

**Status: pending**

## Description
As a user,
I want to create Assemblies as ordered lists of Unit references that I can name and manage,
So that I can compose documents from my existing thoughts without duplicating content.

## Acceptance Criteria

**Given** the database schema
**When** the Assembly model is defined
**Then** it includes: `id` (cuid), `name`, `description` (optional), `user_id`, `template_id` (nullable FK), `created_at`, `updated_at` per FR16
**And** an `assembly_unit` join table stores ordered references: `assembly_id`, `unit_id`, `position` (integer for ordering), `slot_name` (optional, for template slots)

**Given** Units are referenced by Assemblies
**When** a Unit is modified
**Then** all Assemblies referencing that Unit automatically reflect the change — content is not copied per FR16, NFR12

**Given** tRPC procedures are defined
**When** a client calls the assembly router
**Then** procedures `assembly.create`, `assembly.getById`, `assembly.list`, `assembly.update`, `assembly.delete`, `assembly.addUnit`, `assembly.removeUnit`, `assembly.reorderUnits` are all available

**Given** an Assembly is being populated
**When** the user attempts to add a draft Unit (lifecycle: "draft")
**Then** the operation is rejected with a validation error per NFR8

**Given** an Assembly exists
**When** the user views it
**Then** Units from multiple Contexts can be present in the same Assembly

## Tasks
- [ ] Add `Assembly` model to `prisma/schema.prisma` with fields: `id` (cuid), `name` (String), `description` (String?), `userId` (String, FK to User), `templateId` (String?, nullable FK to AssemblyTemplate), `createdAt`, `updatedAt`
- [ ] Add `AssemblyUnit` join table to schema with fields: `id` (cuid), `assemblyId` (FK), `unitId` (FK), `position` (Int), `slotName` (String?), `createdAt`; add unique constraint on `(assemblyId, position)` and `(assemblyId, unitId)`
- [ ] Add `source_map` JSON field to `Assembly` model as `sourceMap Json?` for Story 7.8
- [ ] Add `bridge_text` JSON field to `Assembly` model as `bridgeText Json?` for Story 7.4
- [ ] Run `prisma migrate dev --name add-assembly-model` and regenerate Prisma client
- [ ] Create `src/server/services/assemblyService.ts` with functions: `createAssembly`, `getAssemblyById`, `listAssemblies`, `updateAssembly`, `deleteAssembly`, `addUnitToAssembly`, `removeUnitFromAssembly`, `reorderAssemblyUnits`
- [ ] In `addUnitToAssembly`: validate unit lifecycle is not "draft" before insertion; throw `TRPCError` with code `BAD_REQUEST` if draft
- [ ] In `reorderAssemblyUnits`: accept `positions: { unitId: string; position: number }[]` array and batch-update positions in a Prisma transaction
- [ ] In `getAssemblyById`: include `assemblyUnits` ordered by `position` with nested `unit` data
- [ ] Create `src/server/api/routers/assembly.ts` with tRPC router defining all 8 procedures using Zod input schemas
- [ ] Register the assembly router in `src/server/api/root.ts`
- [ ] Write unit tests for `assemblyService.ts`: create/read/update/delete, add unit (success and draft rejection), remove unit, reorder units
- [ ] Write integration tests for the tRPC assembly router procedures

## Dev Notes
- Key files: `prisma/schema.prisma`, `src/server/services/assemblyService.ts`, `src/server/api/routers/assembly.ts`, `src/server/api/root.ts`
- Dependencies: Story 1.x (Unit model), Story 2.x (Unit lifecycle), Story 7.3 (AssemblyTemplate FK), Story 7.7 (export history)
- Technical approach: Assemblies are pure reference containers. Use `position` integer for ordering (fractional indexing or integer gap strategy — gap of 1000 to allow insertions without renumbering). Reorder in a single Prisma transaction with `$transaction`. The `sourceMap` and `bridgeText` JSON fields are nullable and populated by later stories.
- Draft unit guard: query the unit's `lifecycle` field before insertion and throw early if "draft" — do not rely on DB constraint alone.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.2 (Assembly View), Story 7.3 (Templates), Story 7.4 (Bridge Text), Story 7.7 (Export History), Story 7.8 (Source Map)
- FR16: Assembly as ordered Unit references; NFR12: live reflection of Unit changes; NFR8: draft Unit restriction
