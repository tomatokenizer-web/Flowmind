# Story 6.2: Purpose-Based Relation Weight Rendering

**Status: pending**

## Description
As a user,
I want relation line thickness, color, and visibility to change dynamically based on my current navigation purpose,
So that I see the most relevant connections for what I'm currently exploring.

## Acceptance Criteria

**Given** Units are displayed in Graph View or Thread View with relations
**When** the user selects a navigation purpose mode
**Then** in Argument Exploration mode: supports, contradicts are highlighted (thick lines, full opacity); inspires, echoes are dimmed (thin lines, 30% opacity) per FR37
**And** in Creative mode: inspires, echoes, foreshadows are highlighted; supports, contradicts are dimmed per FR37
**And** in Chronological mode: relation strength is recalculated by created_at order per FR37

**Given** custom relation types exist with a `purpose_tag` field
**When** a navigation purpose mode is active
**Then** custom relation types with a matching `purpose_tag` are included in the navigation weight system per FR38
**And** weight changes update in real time without page reload per NFR2

**Given** the Graph View floating filter bar or Thread View toolbar is visible
**When** the user opens the purpose mode selector
**Then** they can select from: Argument, Creative, Chronological, Explore (default)
**And** the active purpose mode is persisted in session state

## Tasks
- [ ] Define `NavigationPurpose` enum in `src/lib/types/navigation.ts`: `'explore' | 'argument' | 'creative' | 'chronological'`
- [ ] Define `RelationWeightConfig` type mapping relation types to `{ strokeWidth, opacity, color }` per purpose
- [ ] Create `navigationPurposeStore.ts` in `src/store/` using Zustand — stores `activePurpose`, `setPurpose()`, persisted to sessionStorage
- [ ] Create `src/lib/navigation/purposeWeights.ts` — exports `getRelationWeight(relationType, purpose, customPurposeTag?)` returning stroke width and opacity values
- [ ] Implement weight configs for each purpose:
  - Argument: supports/contradicts → strokeWidth 3, opacity 1.0; others → strokeWidth 1, opacity 0.3
  - Creative: inspires/echoes/foreshadows → strokeWidth 3, opacity 1.0; others → strokeWidth 1, opacity 0.3
  - Chronological: weight by time delta between connected units (normalize to 1–4 stroke width)
  - Explore: all relations equal weight (strokeWidth 2, opacity 0.7)
- [ ] Update Graph View edge renderer (Epic 4) to consume `purposeWeights` — replace static edge styles with purpose-aware values from store
- [ ] Update `RelationConnector` (Story 6.1) to apply purpose weights to Thread View connector lines
- [ ] Create `PurposeModeSelector` component at `src/features/navigation/PurposeModeSelector.tsx` — segmented control with 4 options and icon per mode
- [ ] Integrate `PurposeModeSelector` into Graph View's floating filter bar (modify `src/features/graph/GraphFilterBar.tsx`)
- [ ] Integrate `PurposeModeSelector` into Thread View toolbar (modify `src/features/thread/ThreadViewToolbar.tsx`)
- [ ] Ensure custom relation types with `purpose_tag` column in DB are included: add `purpose_tag` field to `relation_type` table via migration if not present
- [ ] Add `purpose_tag` to `RelationType` schema in `src/server/db/schema.ts` and Zod validators
- [ ] Write unit tests for `purposeWeights.ts` — verify correct weights returned per purpose and relation type
- [ ] Write component tests for `PurposeModeSelector` — mode selection updates store

## Dev Notes
- Key files to create: `src/store/navigationPurposeStore.ts`, `src/lib/navigation/purposeWeights.ts`, `src/features/navigation/PurposeModeSelector.tsx`
- Key files to modify: `src/features/graph/GraphFilterBar.tsx`, `src/features/thread/ThreadViewToolbar.tsx`, Graph View edge renderer, DB schema for `purpose_tag`
- Dependencies: Story 6.1 (Thread View + RelationConnector), Epic 4 (Graph View edge rendering), Epic 4 Story 4.2 (relation types)
- Technical approach: The weight config is a pure function of (relationType, purpose) — no server calls needed. Chronological mode requires the `created_at` of both connected units to compute a time delta; fetch this in the edge data query. Real-time update (NFR2) is achieved by reading the Zustand store in the edge renderer — React reactivity handles the re-render. No page reload needed.
- Persist `activePurpose` to `sessionStorage` so it survives navigation but resets on new browser session.

## References
- Epic 6: Navigation, Search & Discovery
- FR37: Purpose-based navigation weight rendering
- FR38: Custom relation types with purpose_tag
- NFR2: Real-time updates without page reload
- Related: Story 6.1 (Thread View), Story 6.7 (Graph View purpose integration), Epic 4 Story 4.2 (relation types)
