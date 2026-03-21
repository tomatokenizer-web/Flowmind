# Story 6.3: Navigators — User-Defined & AI-Generated Reading Paths

**Status: pending**

## Description
As a user,
I want to create named reading paths through my Units for specific purposes,
So that I can share curated journeys through my thinking or revisit them later.

## Acceptance Criteria

**Given** Units exist across one or more Contexts
**When** the user creates a Navigator
**Then** they can name it, add an ordered list of Unit references (not copies), and optionally describe its purpose per FR35
**And** multiple Navigators can be created from the same Units per FR35
**And** Navigators do not copy or move Units — they reference them per FR35

**Given** a Navigator exists
**When** the user opens it
**Then** the Navigator displays as a sequential card list with "Previous" / "Next" navigation

**Given** a user states a purpose
**When** AI auto-generates a Navigator
**Then** AI creates a Navigator based on relation graph traversal matching the stated purpose (e.g., "Create a reading path for my argument about X")
**And** Navigators are listed in the sidebar under a "Navigators" section
**And** draft Units (lifecycle: "draft") cannot be added to Navigators per FR27, NFR8

**Given** a Navigator contains a Unit
**When** that Unit's content is edited
**Then** the edit is automatically reflected in all Navigators containing it per NFR12

## Tasks
- [ ] Add `Navigator` model to DB schema in `src/server/db/schema.ts`: `id` (cuid), `name`, `description` (nullable), `user_id`, `created_at`, `updated_at`
- [ ] Add `navigator_unit` join table: `navigator_id`, `unit_id`, `position` (integer), with unique constraint on (`navigator_id`, `unit_id`)
- [ ] Write and run Drizzle migration for Navigator and navigator_unit tables
- [ ] Create `navigator` tRPC router at `src/server/routers/navigator.ts` with procedures:
  - `navigator.create` — input: `{ name, description? }`
  - `navigator.getById` — returns Navigator with ordered unit list
  - `navigator.list` — returns all Navigators for current user
  - `navigator.update` — input: `{ id, name?, description? }`
  - `navigator.delete`
  - `navigator.addUnit` — input: `{ navigatorId, unitId, position? }`, validates unit lifecycle !== 'draft'
  - `navigator.removeUnit` — input: `{ navigatorId, unitId }`
  - `navigator.reorderUnits` — input: `{ navigatorId, orderedUnitIds: string[] }`
- [ ] Create `NavigatorService` at `src/server/services/navigatorService.ts` — AI path generation using relation graph traversal
- [ ] Implement AI Navigator generation: `navigatorService.generateFromPurpose(purpose: string, contextId?: string)` — performs BFS on relation graph weighted by purpose mode, returns ordered unit IDs
- [ ] Create `NavigatorView` component at `src/features/navigators/NavigatorView.tsx` — renders sequential card list
- [ ] Create `NavigatorCard` component at `src/features/navigators/NavigatorCard.tsx` — UnitCard with Previous/Next navigation controls
- [ ] Create `NavigatorSidebar` section at `src/features/navigators/NavigatorSidebarSection.tsx` — lists all navigators with create button
- [ ] Integrate `NavigatorSidebarSection` into main sidebar layout (modify `src/components/sidebar/Sidebar.tsx`)
- [ ] Create `CreateNavigatorDialog` component at `src/features/navigators/CreateNavigatorDialog.tsx` — name + description input, option to generate via AI
- [ ] Create `AINavigatorPromptInput` within the dialog — text field for purpose statement, "Generate" button that calls navigator.generateFromPurpose
- [ ] Add unit list management UI within Navigator detail view: drag-to-reorder (dnd-kit), search-and-add popover, remove button per unit
- [ ] Add lifecycle guard in `navigator.addUnit` procedure — throw TRPCError if unit lifecycle === 'draft'
- [ ] Verify content reflection (NFR12) — Navigator displays live unit data via `getById` join; no denormalization needed
- [ ] Write unit tests for Navigator CRUD procedures and lifecycle guard
- [ ] Write unit tests for `generateFromPurpose` graph traversal logic
- [ ] Write component tests for NavigatorView Previous/Next navigation

## Dev Notes
- Key files to create: `src/server/db/schema.ts` (Navigator + navigator_unit tables), `src/server/routers/navigator.ts`, `src/server/services/navigatorService.ts`, `src/features/navigators/NavigatorView.tsx`, `src/features/navigators/NavigatorCard.tsx`, `src/features/navigators/NavigatorSidebarSection.tsx`, `src/features/navigators/CreateNavigatorDialog.tsx`
- Key files to modify: `src/server/db/schema.ts`, `src/server/routers/index.ts` (register navigator router), `src/components/sidebar/Sidebar.tsx`
- Dependencies: Epic 1 (Unit model + lifecycle), Epic 2 (UnitCard), Epic 3 (sidebar layout), Epic 4 (relations for graph traversal), Story 6.2 (navigation purpose for AI path generation)
- Technical approach: AI Navigator generation uses the same relation graph used by the Graph View. BFS from seed units related to the stated purpose (found via semantic search on unit content), following relations weighted by the relevant navigation purpose. The result is a topologically ordered list of unit IDs. No LLM call needed for simple graph traversal; use LLM only if semantic reranking of results is desired.
- The `position` field in `navigator_unit` allows stable reordering. Use integer gaps (10, 20, 30) or fractional indexing to allow inserts without full rewrite.

## References
- Epic 6: Navigation, Search & Discovery
- FR35: User-defined Navigators (ordered unit reference lists)
- FR27: Draft unit lifecycle restriction
- NFR8: Draft units excluded from Navigators
- NFR12: Unit edits reflected in all Navigators
- Related: Story 6.1 (Thread View — similar sequential card display), Story 6.2 (purpose modes for AI generation), Story 6.4 (search for finding units to add)
