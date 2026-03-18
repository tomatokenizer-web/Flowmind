# Story 3.2: Perspective Layer — Per-Context Unit Views

Status: complete

## Story

As a user,
I want a Unit to have different types, importance, stance, and notes depending on which Context I'm viewing it in,
So that the same thought can serve different roles in different investigations.

## Acceptance Criteria

1. **Given** a Unit belongs to multiple Contexts, **When** the Perspective model is defined, **Then** it includes: `id`, `unit_id`, `context_id`, `type_override` (nullable, overrides the global Unit type within this Context), `importance` (0.0–1.0), `stance` (enum: supporting, opposing, neutral, exploring), `notes` (text), `relations` (JSON array — placeholder for Epic 4) per FR3, FR12
2. The global Unit content is stored once; only perspective fields vary per Context per NFR7
3. Resource Units also support the Perspective Layer — the same resource can function as "evidence" in one Context and "inspiration" in another per FR5
4. tRPC procedures `perspective.upsert`, `perspective.getForUnit` are available
5. When viewing a Context, Unit cards display the perspective-specific type (if overridden), importance, and stance rather than global defaults
6. Editing a perspective field only affects that Context, not others

## Tasks / Subtasks

- [ ] Task 1: Create Prisma schema for UnitPerspective model (AC: #1, #2)
  - [ ] Add `UnitPerspective` model with fields: `id` (cuid), `unitId` (FK to Unit), `contextId` (FK to Context), `typeOverride` (string, nullable — overrides Unit's global type), `importance` (Float, default 0.5, range 0.0–1.0), `stance` (enum: SUPPORTING, OPPOSING, NEUTRAL, EXPLORING, default NEUTRAL), `notes` (string, default ""), `relations` (Json, default [] — placeholder for Epic 4), `canvasX` (Float, nullable), `canvasY` (Float, nullable), `canvasZoom` (Float, nullable)
  - [ ] Add `@@unique([unitId, contextId])` constraint per architecture spec
  - [ ] Add index on `unitId` and `contextId` for query performance
  - [ ] Add cascade delete on both `unitId` and `contextId`
  - [ ] Run migration: `npx prisma migrate dev --name add-unit-perspective`

- [ ] Task 2: Create Stance enum (AC: #1)
  - [ ] Define `Stance` enum in Prisma: `SUPPORTING`, `OPPOSING`, `NEUTRAL`, `EXPLORING`
  - [ ] Export TypeScript type from Prisma client for use in frontend

- [ ] Task 3: Create perspective service → `src/server/services/perspectiveService.ts` (AC: #4, #5, #6)
  - [ ] `upsertPerspective({ unitId, contextId, typeOverride?, importance?, stance?, notes? })` — create or update perspective for a unit-context pair
  - [ ] `getForUnit(unitId, contextId)` — return perspective data for a specific unit in a specific context
  - [ ] `getForContext(contextId)` — return all perspectives in a context (for Context View rendering)
  - [ ] `deletePerspective(unitId, contextId)` — remove perspective override (reverts to global defaults)
  - [ ] Validate that `importance` is within 0.0–1.0 range
  - [ ] Ensure edits only affect the targeted context per AC #6

- [ ] Task 4: Create tRPC router → `src/server/api/routers/perspective.ts` (AC: #4)
  - [ ] `perspective.upsert` — input: `{ unitId, contextId, typeOverride?, importance?, stance?, notes? }`
  - [ ] `perspective.getForUnit` — input: `{ unitId, contextId }`, returns perspective or null (null = use global defaults)
  - [ ] `perspective.getForContext` — input: `{ contextId }`, returns all unit perspectives in context
  - [ ] `perspective.delete` — input: `{ unitId, contextId }`
  - [ ] Register router in `src/server/api/root.ts`

- [ ] Task 5: Add Zod validation schemas → `src/server/api/schemas/perspective.ts`
  - [ ] `upsertPerspectiveSchema` — unitId: cuid, contextId: cuid, typeOverride: optional unit type enum, importance: number 0–1, stance: enum, notes: string max 2000
  - [ ] `getForUnitSchema` — unitId + contextId cuid validation

- [ ] Task 6: Create `usePerspective` hook → `src/features/perspectives/hooks/usePerspective.ts` (AC: #5)
  - [ ] Hook accepts `unitId` and `contextId`
  - [ ] Returns merged view: perspective fields override global Unit fields when present
  - [ ] `effectiveType` = `perspective.typeOverride ?? unit.type`
  - [ ] Provides `updatePerspective` mutation with optimistic UI

- [ ] Task 7: Update UnitCard to show perspective-aware fields (AC: #5)
  - [ ] When rendered within a Context View, use `usePerspective` to resolve effective type
  - [ ] Display perspective-specific type badge color and label
  - [ ] Show importance indicator (0.0–1.0) if set
  - [ ] Show stance badge (supporting/opposing/neutral/exploring) if set

- [ ] Task 8: Write tests
  - [ ] Test perspective upsert creates new record
  - [ ] Test perspective upsert updates existing record
  - [ ] Test editing perspective in Context A does not affect Context B per AC #6
  - [ ] Test Resource Units support perspectives per AC #3
  - [ ] Test `getForUnit` returns null when no perspective exists
  - [ ] Test importance validation rejects values outside 0.0–1.0
  - [ ] Test UnitCard renders perspective-specific type when override exists

## Dev Notes

- The architecture defines `unit_perspectives` table with: `id`, `unit_id`, `context_id`, `type`, `stance`, `importance`, `note`, `canvas_x`, `canvas_y`, `canvas_zoom` with `UNIQUE(unit_id, context_id)`.
- This is the core of Flowmind's differentiator — the same Unit appearing differently in different Contexts. Implementation must be rock-solid.
- The `relations` JSON field is a placeholder for Epic 4 — don't build relation logic here, just include the field.
- Canvas position fields (`canvasX`, `canvasY`, `canvasZoom`) are nullable and used by Canvas View in Epic 4 (Story 4.10). Include them in the model now but don't expose in the perspective editor UI yet.
- The `usePerspective` hook pattern: always resolve "effective" values by merging perspective overrides onto global Unit defaults. Components should never need to check both sources manually.

### Architecture References

- [Source: architecture.md] — `unit_perspectives` table: id, unit_id, context_id, type, stance, importance, note, canvas_x, canvas_y, canvas_zoom, UNIQUE(unit_id, context_id)
- [Source: architecture.md] — Perspective Layer is a cross-cutting concern spanning layers 1-3
- [Source: architecture.md] — `features/perspectives/` module: PerspectiveSelector, PerspectiveEditor, usePerspective hook
- [Source: architecture.md] — `server/api/routers/perspective.ts` and `server/services/perspectiveService.ts`
- [Source: epics.md#Story 3.2] — Story definition and acceptance criteria

### UX References

- [Source: ux-design-specification.md] — Unit type color system (Claim: blue, Question: amber, Evidence: green, etc.) applies to perspective-overridden types
- [Source: project-context.md] — Type-colored but muted design principle applies to perspective badges
