# Story 8.3: Orphan Unit Recovery

**Status: pending**

## Description
As a user,
I want to periodically see Units that aren't included in any Assembly or Context,
So that I can decide whether to connect them or consciously let them go.

## Acceptance Criteria

**Given** Units exist that have no Context membership and no Assembly references
**When** the Orphan Recovery feature runs (periodically or on-demand)
**Then** orphan Units are listed in a dedicated view showing: Unit content preview, creation date, type, and lifecycle state per FR62
**And** the user can: assign to a Context, add to the Incubation Queue, archive, or delete each orphan
**And** bulk actions (assign all to Context, archive all) are available
**And** orphan detection counts Units with zero Context memberships AND zero Assembly references
**And** the orphan count is displayed as a badge in the sidebar

## Tasks
- [ ] Create `server/repositories/orphanRepository.ts` — query Units with no ContextMembership rows AND no AssemblyUnit rows for given user
- [ ] Create `server/services/orphanService.ts` — orphan detection, bulk action logic (assign to Context, queue to incubation, archive, delete)
- [ ] Add tRPC procedures: `orphan.list` (paginated), `orphan.assignToContext`, `orphan.sendToIncubation`, `orphan.archive`, `orphan.delete`, `orphan.bulkAssign`, `orphan.bulkArchive`, `orphan.getCount`
- [ ] Create `components/orphan/OrphanRecoveryView.tsx` — full-page list view with filter/sort by type and lifecycle
- [ ] Create `components/orphan/OrphanUnitRow.tsx` — row showing content preview, type badge, date, action buttons
- [ ] Create `components/orphan/OrphanBulkActionBar.tsx` — floating bar appearing when multiple Units selected
- [ ] Add orphan badge count to sidebar nav item (real-time via tRPC query with refetch interval)
- [ ] Create Trigger.dev job `orphan-detection-job.ts` — periodic orphan count refresh and non-interrupting notification if count increases
- [ ] Write unit tests for orphan detection query logic
- [ ] Write integration tests for individual and bulk action flows

## Dev Notes
- Key files: `server/repositories/orphanRepository.ts`, `server/services/orphanService.ts`, `server/api/routers/orphan.ts`, `components/orphan/OrphanRecoveryView.tsx`
- Dependencies: Story 2.1 (Unit model), Story 2.3 (Context membership), Story 5.x (Assembly/AssemblyUnit join), Story 8.1 (Incubation Queue — sendToIncubation reuses incubationService)
- Technical approach: Orphan query uses `NOT EXISTS` subqueries on `context_memberships` and `assembly_units` tables. Badge count is cached in Zustand store and refreshed on Unit mutations via event bus subscription. Bulk actions use Prisma `updateMany`/`deleteMany` for efficiency.

## References
- Epic 8: Feedback Loop & Thought Evolution
- FR62: Orphan Unit Recovery
- Related: Story 8.1 (Incubation Queue), Story 2.3 (Context membership model), Story 5.x (Assembly model)
