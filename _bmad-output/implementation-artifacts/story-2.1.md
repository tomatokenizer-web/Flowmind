# Story 2.1: Thought Unit Data Model & CRUD API

Status: complete

## Story

As a user,
I want to create, read, update, and delete Thought Units with globally unique IDs and full metadata,
So that my thoughts are persisted as first-class cognitive units in the system.

## Acceptance Criteria

1. **Given** the Prisma schema and database from Epic 1, **When** the Thought Unit model is defined, **Then** each Unit has: `id` (cuid), `content` (text), `created_at`, `updated_at`, `user_id`, `unit_type` (enum: claim, question, evidence, counterargument, observation, idea, definition, assumption, action), `lifecycle` (enum: draft, pending, confirmed), `origin_type` (enum: direct_write, external_excerpt, external_inspiration, external_summary, ai_generated, ai_refined), `source_span` (JSON: parent_input_id, position, excerpt_preview), and `ai_trust_level` (enum: user_authored, ai_confirmed, inferred; default: user_authored) per FR1, FR2, FR20, FR30
2. tRPC router exposes `unit.create`, `unit.getById`, `unit.list`, `unit.update`, `unit.delete` procedures
3. The service layer (`server/services/unitService.ts`) handles business logic; routers never access Prisma directly
4. The repository layer (`server/repositories/unitRepository.ts`) is the sole Prisma accessor
5. All mutations publish events via the internal event bus (`server/events/eventBus.ts`) per architecture requirement
6. Unit content is globally unique and immutable in identity per NFR12
7. `prisma migrate dev` creates the migration successfully
8. Unit tests cover all CRUD operations including validation errors

## Tasks / Subtasks

- [x] Task 1: Define Prisma schema for Thought Unit (AC: #1)
  - [x] Add `UnitType` enum (claim, question, evidence, counterargument, observation, idea, definition, assumption, action)
  - [x] Add `Lifecycle` enum (draft, pending, confirmed)
  - [x] Add `OriginType` enum (direct_write, external_excerpt, external_inspiration, external_summary, ai_generated, ai_refined)
  - [x] Add `AiTrustLevel` enum (user_authored, ai_confirmed, inferred)
  - [x] Define `Unit` model with all fields, snake_case `@@map` conventions
  - [x] Add `source_span` as `Json?` field
  - [x] Run `prisma migrate dev` to generate and apply migration
- [x] Task 2: Create repository layer (AC: #4)
  - [x] Create `server/repositories/unitRepository.ts`
  - [x] Implement `create`, `findById`, `findMany`, `update`, `delete` methods
  - [x] Ensure all Prisma access is isolated here
- [x] Task 3: Create event bus (AC: #5)
  - [x] Create `server/events/eventBus.ts` with typed event emitter
  - [x] Define event types: `unit.created`, `unit.updated`, `unit.deleted`
  - [x] Implement publish/subscribe pattern
- [x] Task 4: Create service layer (AC: #3, #5, #6)
  - [x] Create `server/services/unitService.ts`
  - [x] Implement CRUD methods calling repository
  - [x] Publish events on all mutations
  - [x] Add validation logic (content uniqueness, required fields)
- [x] Task 5: Create tRPC router (AC: #2)
  - [x] Create `server/api/routers/unit.ts`
  - [x] Define `unit.create` with Zod input validation
  - [x] Define `unit.getById` with cuid validation
  - [x] Define `unit.list` with pagination, filtering by type/lifecycle
  - [x] Define `unit.update` with partial input validation
  - [x] Define `unit.delete` with cuid validation
  - [x] Register router in `server/api/root.ts`
- [x] Task 6: Write unit tests (AC: #8)
  - [x] Test all CRUD operations via tRPC procedures
  - [x] Test validation errors (missing required fields, invalid enums)
  - [x] Test event bus emissions on mutations
  - [x] Test pagination and filtering on `unit.list`

## Dev Notes

- Follow the 3-layer architecture: Router → Service → Repository. Routers handle input validation and response shaping. Services handle business logic and event publishing. Repositories handle Prisma access.
- Use Zod schemas for tRPC input validation — these should mirror but not duplicate the Prisma schema
- The event bus is a foundational piece used throughout the app for real-time updates, undo/redo, and cross-component communication
- `source_span` is JSON because its structure varies by `origin_type` — keep it flexible
- camelCase in TypeScript/API, snake_case in database (Prisma `@map`/`@@map` handles mapping)
- `ai_trust_level` defaults to `user_authored` for manually created Units

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — 3-layer architecture (Router → Service → Repository)
- [Source: _bmad-output/planning-artifacts/architecture.md] — Event bus pattern for mutation side effects
- [Source: _bmad-output/planning-artifacts/architecture.md] — camelCase/snake_case naming convention
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR58: Optimistic UI updates for all mutations
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR10: Unit card visual states
