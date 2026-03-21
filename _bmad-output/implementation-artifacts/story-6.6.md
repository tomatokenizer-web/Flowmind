# Story 6.6: Context Dashboard — Statistics & Entry Points

**Status: pending**

## Description
As a user,
I want a dashboard for each Context showing key metrics, gaps, and recommended starting points,
So that I can quickly assess the state of an exploration and decide where to focus.

## Acceptance Criteria

**Given** a Context has Units with relations
**When** the user opens the Context Dashboard
**Then** it displays: total Unit count, incomplete/unresolved questions, key hub Units (highest ThoughtRank), unaddressed counterarguments (claims without support), unsupported claims, cycle presence indicator, and recommended entry points per FR42

**Given** the dashboard is showing metrics
**When** ThoughtRank is available
**Then** recommended entry points are the top 3 Units by ThoughtRank within the Context

**Given** a metric or hub Unit is displayed
**When** the user clicks it
**Then** clicking any metric or hub Unit navigates to that Unit in the active view

**Given** Units or Relations change within the Context
**When** the change is persisted
**Then** the dashboard auto-refreshes when Units or Relations change within the Context

**Given** the dashboard is open
**When** the user clicks the help icon
**Then** the Relation Type Glossary is accessible from the dashboard via a help icon per NFR15

## Tasks
- [ ] Create `contextDashboardService.ts` at `src/server/services/contextDashboardService.ts` with:
  - `getDashboardStats(contextId: string): Promise<ContextDashboardStats>`
  - Computes: `totalUnits`, `unresolvedQuestions` (units with type 'question' and no ANSWERS_TO relation), `hubUnits` (top 3 by thought_rank), `unsupportedClaims` (claims with no SUPPORTS incoming relation), `unaddressedCounterarguments` (contradicts relations with no response), `hasCycle` (cycle detection via DFS), `entryPoints` (top 3 by thought_rank)
- [ ] Add `context.getDashboardStats` tRPC procedure in `src/server/routers/context.ts`
- [ ] Implement cycle detection algorithm in `contextDashboardService.ts` — DFS with visited + recursion stack, returns boolean + cycle path
- [ ] Create `ContextDashboard` component at `src/features/contexts/ContextDashboard.tsx` — main dashboard layout
- [ ] Create `DashboardStatCard` component at `src/features/contexts/DashboardStatCard.tsx` — reusable metric tile with label, value, and optional click handler
- [ ] Create `HubUnitsList` component at `src/features/contexts/HubUnitsList.tsx` — renders top 3 hub units as compact clickable cards
- [ ] Create `EntryPointsList` component at `src/features/contexts/EntryPointsList.tsx` — renders top 3 recommended entry points
- [ ] Create `CycleIndicator` component at `src/features/contexts/CycleIndicator.tsx` — warning badge when cycles are detected, tooltip showing cycle path
- [ ] Create `RelationTypeGlossary` component at `src/features/contexts/RelationTypeGlossary.tsx` — modal/popover listing all relation types with descriptions per NFR15
- [ ] Add help icon button in dashboard header that opens `RelationTypeGlossary`
- [ ] Implement click navigation from dashboard: clicking a stat card or unit navigates by dispatching to the selection store (Story 6.8 / `selectionStore`)
- [ ] Add real-time refresh: use tRPC query with `refetchOnWindowFocus: true` and invalidate on `context.unitChanged` events; also set `staleTime: 30_000` for 30-second auto-refresh
- [ ] Integrate `ContextDashboard` into the Context View layout as a panel accessible via a "Dashboard" tab in the context header
- [ ] Add loading skeleton for dashboard stats while data is fetching
- [ ] Write unit tests for `getDashboardStats` — verify counts, cycle detection, hub unit selection
- [ ] Write component tests for `ContextDashboard` — verify all stat cards render, click navigation fires

## Dev Notes
- Key files to create: `src/server/services/contextDashboardService.ts`, `src/features/contexts/ContextDashboard.tsx`, `src/features/contexts/DashboardStatCard.tsx`, `src/features/contexts/HubUnitsList.tsx`, `src/features/contexts/EntryPointsList.tsx`, `src/features/contexts/CycleIndicator.tsx`, `src/features/contexts/RelationTypeGlossary.tsx`
- Key files to modify: `src/server/routers/context.ts` (add getDashboardStats procedure), `src/features/contexts/ContextView.tsx` (add Dashboard tab)
- Dependencies: Epic 1 (Unit types, lifecycle), Epic 3 (Context model), Epic 4 (Relation model), Story 6.5 (ThoughtRank — must be computed before dashboard can show hub units)
- Technical approach: `getDashboardStats` runs all sub-queries in parallel with Promise.all for performance. Cycle detection uses a standard DFS — for large graphs, limit to 500 relations max before returning a "Too complex to analyze" indicator. The "unsupported claims" query is: SELECT units WHERE type='claim' AND id NOT IN (SELECT target_unit_id FROM relations WHERE relation_type='SUPPORTS'). Stats are intentionally server-computed (not client-side) to avoid sending full unit/relation payloads to the client.

## References
- Epic 6: Navigation, Search & Discovery
- FR42: Context Dashboard statistics and entry points
- NFR15: Relation Type Glossary accessibility
- Related: Story 6.5 (ThoughtRank for hub units and entry points), Story 6.8 (selection store for click navigation), Story 3.4 (Context View where dashboard is embedded)
