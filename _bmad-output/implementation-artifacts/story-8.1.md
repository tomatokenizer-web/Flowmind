# Story 8.1: Incubation Queue for Incomplete Thoughts

**Status: pending**

## Description
As a user,
I want a dedicated queue for thoughts that are incomplete but valuable, with periodic surfacing reminders,
So that no potentially important idea gets lost just because it's not fully formed yet.

## Acceptance Criteria

**Given** Units exist in various states of completeness
**When** a Unit is marked as "incubating" (manually or automatically when it has low completeness — e.g., no relations, no Context, single sentence)
**Then** it enters the Incubation Queue per FR58
**And** the Incubation Queue is accessible from the sidebar as a dedicated section
**And** the system periodically surfaces incubating Units to the user (configurable interval: daily, weekly) via non-interrupting notification per FR58, NFR24
**And** surfaced Units show context: when they were created, what they were thinking about at the time
**And** the user can: promote (add to a Context), discard, or snooze each incubating Unit
**And** dismissed notifications don't repeat for the same Unit per NFR24

## Tasks
- [ ] Add `incubation_state` enum to Prisma Unit model: `active | snoozed | promoted | discarded`
- [ ] Add `incubation_snoozed_until` DateTime? field to Unit model
- [ ] Create `server/repositories/incubationRepository.ts` — queries for orphan/low-completeness Units and incubation state updates
- [ ] Create `server/services/incubationService.ts` — auto-detection logic (no relations + no Context + short content), state transitions, snooze scheduling
- [ ] Add tRPC procedures: `incubation.list`, `incubation.promote`, `incubation.discard`, `incubation.snooze`, `incubation.setInterval`
- [ ] Create Trigger.dev job `incubation-surface-job.ts` — periodic surfacing at configured interval (daily/weekly), respects snoozed_until and NFR24 non-interrupting policy
- [ ] Create `components/incubation/IncubationQueue.tsx` — sidebar panel listing incubating Units with creation date context
- [ ] Create `components/incubation/IncubationUnitCard.tsx` — card showing preview, created-at, promote/discard/snooze actions
- [ ] Create `components/incubation/IncubationSurfaceNotification.tsx` — non-interrupting toast/badge for surfaced Units
- [ ] Add incubation interval setting to user preferences (Settings page)
- [ ] Add incubation badge count to sidebar nav item
- [ ] Write unit tests for auto-detection logic and state transitions
- [ ] Write integration tests for tRPC procedures

## Dev Notes
- Key files: `server/repositories/incubationRepository.ts`, `server/services/incubationService.ts`, `server/api/routers/incubation.ts`, `components/incubation/IncubationQueue.tsx`
- Dependencies: Story 2.1 (Unit model), Story 2.3 (Context membership), Story 3.1 (sidebar), Trigger.dev job runner
- Technical approach: Auto-detection criteria: `relations.length === 0 AND contextMemberships.length === 0 AND content.split(' ').length < 10`. Surfacing uses Trigger.dev scheduled jobs with per-user interval stored in user preferences. NFR24 compliance: track `last_surfaced_at` on Unit; don't resurface until interval has passed even if job retries.

## References
- Epic 8: Feedback Loop & Thought Evolution
- FR58: Incubation Queue with periodic surfacing
- NFR24: Non-interrupting notification policy
- Related: Story 8.3 (Orphan Unit Recovery overlaps with orphan detection logic)
