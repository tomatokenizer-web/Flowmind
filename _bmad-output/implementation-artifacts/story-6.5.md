# Story 6.5: ThoughtRank Importance Score

**Status: pending**

## Description
As a user,
I want each Unit to have an importance score reflecting its centrality in my knowledge graph,
So that search results and navigation prioritize my most significant thoughts.

## Acceptance Criteria

**Given** Units exist with relations, Context memberships, and Assembly references
**When** ThoughtRank is computed for a Unit
**Then** the score combines: number of referencing Units, number of Assemblies it appears in, diversity of connected Contexts, recency, and hub role (high in-degree + high out-degree) per FR40

**Given** a navigation purpose is active
**When** ThoughtRank is queried
**Then** ThoughtRank is re-calculable per Unit with different weights depending on navigation purpose at query time per NFR4

**Given** ThoughtRank scores exist
**When** search results are returned
**Then** search results are ranked by ThoughtRank as one of the sorting factors

**Given** a UnitCard is rendered
**When** it has relations
**Then** Unit card relation/attribute display is prioritized by: (1) relevance to current navigation purpose, (2) ThoughtRank of connected Unit, (3) recency per FR41
**And** by default, top 3–5 relations are shown on each card; "See more" expands the full list per FR41

**Given** Units or relations change
**When** the change is persisted
**Then** ThoughtRank scores are recomputed asynchronously via a background job and cached; the cache is invalidated on relation changes

## Tasks
- [ ] Add `thought_rank` column to `units` table in `src/server/db/schema.ts`: `thought_rank FLOAT DEFAULT 0`, with index
- [ ] Add `thought_rank_updated_at` column to `units` table for cache freshness
- [ ] Write Drizzle migration for new columns
- [ ] Create `thoughtRankService.ts` at `src/server/services/thoughtRankService.ts` with:
  - `computeThoughtRank(unitId: string, purpose?: NavigationPurpose): Promise<number>`
  - `computeBatch(unitIds: string[]): Promise<Map<string, number>>`
  - `computeForContext(contextId: string): Promise<void>` — computes and persists ranks for all units in a context
- [ ] Implement ThoughtRank formula in `thoughtRankService.ts`:
  - `inDegree` = count of relations where unit is target
  - `outDegree` = count of relations where unit is source
  - `assemblyCount` = count of `assembly_unit` rows for this unit
  - `contextDiversity` = count of distinct contexts the unit belongs to
  - `recencyScore` = normalize `created_at` to 0–1 over past 90 days
  - `hubScore` = inDegree * outDegree (high when both are high)
  - Final: `(inDegree * 0.3) + (assemblyCount * 0.2) + (contextDiversity * 0.2) + (recencyScore * 0.1) + (hubScore * 0.2)`
- [ ] Add purpose-weight override to formula: in Argument mode, weight `supports`/`contradicts` relation counts more; in Creative mode, weight `inspires`/`echoes` more
- [ ] Create Trigger.dev job at `src/jobs/recomputeThoughtRank.ts` — triggered on `relation.created`, `relation.deleted`, `assembly_unit.created`, `assembly_unit.deleted`
- [ ] Register Trigger.dev job in the job registry
- [ ] Add `unit.getThoughtRank` tRPC procedure — returns cached score, triggers recompute if stale (older than 1 hour)
- [ ] Update UnitCard component to show top 3–5 relations sorted by: (1) purpose relevance, (2) connected unit ThoughtRank, (3) recency
- [ ] Add "See more relations" expand button on UnitCard — shows remaining relations in an expandable section
- [ ] Update search result ranking in `searchService.ts` (Story 6.4) to incorporate `thought_rank` as a scoring factor
- [ ] Create `useThoughtRank(unitId)` React hook at `src/hooks/useThoughtRank.ts` — subscribes to unit's thought_rank via tRPC query
- [ ] Write unit tests for ThoughtRank formula with various graph configurations
- [ ] Write unit tests for purpose-weight override behavior
- [ ] Write integration test: relation creation triggers ThoughtRank recompute

## Dev Notes
- Key files to create: `src/server/services/thoughtRankService.ts`, `src/jobs/recomputeThoughtRank.ts`, `src/hooks/useThoughtRank.ts`
- Key files to modify: `src/server/db/schema.ts` (new columns), `src/server/routers/unit.ts` (add getThoughtRank), `src/components/unit/UnitCard.tsx` (relation display priority), `src/server/services/searchService.ts` (ranking)
- Dependencies: Epic 1 (Unit model), Epic 4 (Relation model + types), Story 6.2 (NavigationPurpose type), Story 6.4 (search service needs ThoughtRank), Trigger.dev setup (from Epic 2/5)
- Technical approach: ThoughtRank is intentionally simple (no iterative PageRank) to keep compute costs low. The formula is a weighted sum of graph signals. The background job uses Trigger.dev's event-triggered runs so it fires on every relation mutation but doesn't block the mutation response. Cache TTL of 1 hour is a balance between freshness and compute cost. For large graphs, `computeForContext` can batch-update all units in one SQL query.

## References
- Epic 6: Navigation, Search & Discovery
- FR40: ThoughtRank importance score
- FR41: Unit card relation display prioritization
- NFR4: Purpose-weight query-time adjustment
- Related: Story 6.4 (search ranking), Story 6.6 (Context Dashboard uses ThoughtRank for hub units), Story 6.7 (Graph View node sizing by ThoughtRank)
