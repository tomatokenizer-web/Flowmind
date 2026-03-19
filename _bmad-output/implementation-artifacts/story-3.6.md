# Story 3.6: Context Briefing & Re-Entry Experience

Status: complete

## Story

As a user,
I want a summary of where I left off when I return to a Context,
So that I can quickly re-enter my previous cognitive state without re-reading everything.

## Acceptance Criteria

1. **Given** a user has previously visited a Context and returns to it after a period of absence, **When** the Context loads, **Then** a ContextBriefing component displays: a session summary (last visit date, units added/modified since last visit), a list of open questions (from `unresolved_questions`), and AI suggestions placeholder per UX-DR16, FR9
2. The briefing offers two CTAs: "Continue where I left off" (scrolls to last-viewed Unit) and "Start fresh" (shows full Context view) per UX-DR16
3. The briefing appears automatically without user request per NFR16
4. The user can dismiss the briefing and it collapses to a small indicator in the toolbar
5. Last visit timestamp and last-viewed Unit ID are stored per user per Context

## Tasks / Subtasks

- [x] Task 1: Create `ContextVisit` Prisma model (AC: #5)
  - [x] Add `ContextVisit` model: `id` (cuid), `userId` (FK to User), `contextId` (FK to Context), `lastVisitedAt` (DateTime), `lastViewedUnitId` (FK to Unit, nullable), `updatedAt`
  - [x] Add `@@unique([userId, contextId])` to ensure one visit record per user per context
  - [x] Add index on `userId` and `contextId` for query performance
  - [x] Run migration: `npx prisma migrate dev --name add-context-visit`

- [x] Task 2: Create context visit service → `src/server/services/contextVisitService.ts` (AC: #5)
  - [x] `recordVisit({ userId, contextId, lastViewedUnitId? })` — upsert `ContextVisit` record, update `lastVisitedAt` to now
  - [x] `getLastVisit(userId, contextId)` — return visit record or null if first visit
  - [x] `updateLastViewedUnit(userId, contextId, unitId)` — update the `lastViewedUnitId` as user scrolls/navigates

- [x] Task 3: Create context briefing service → `src/server/services/contextBriefingService.ts` (AC: #1)
  - [x] `getBriefing(userId, contextId)` — returns briefing data:
    - Last visit date from `ContextVisit`
    - Count of units added since last visit (query `unit_context` + `Unit.createdAt > lastVisitedAt`)
    - Count of units modified since last visit (query `Unit.updatedAt > lastVisitedAt` for units in context)
    - List of `unresolved_questions` from the Context model
    - AI suggestions placeholder (static array for now)
    - Last-viewed Unit ID for "Continue where I left off"
  - [x] Return `null` if no previous visit (first visit — skip briefing)

- [x] Task 4: Create tRPC procedures (AC: #1, #2, #5)
  - [x] `contextVisit.getBriefing` — input: `{ contextId }`, calls `contextBriefingService.getBriefing` with session userId
  - [x] `contextVisit.recordVisit` — input: `{ contextId, lastViewedUnitId? }`, calls `contextVisitService.recordVisit`
  - [x] `contextVisit.updateLastViewedUnit` — input: `{ contextId, unitId }`, calls `contextVisitService.updateLastViewedUnit`
  - [x] Register router in `src/server/api/root.ts`

- [x] Task 5: Create ContextBriefing component → `src/components/context/ContextBriefing.tsx` (AC: #1, #2, #3, #4)
  - [x] Fetch briefing data via `trpc.contextVisit.getBriefing` on context load
  - [x] Display session summary: "Last visited [relative time]. [N] units added, [M] modified since then."
  - [x] Display open questions list from `unresolved_questions` (each as a clickable item)
  - [x] Display AI suggestions placeholder section with static suggestions
  - [x] "Continue where I left off" CTA button — scrolls to last-viewed Unit per AC #2
  - [x] "Start fresh" CTA button — dismisses briefing and shows full Context view per AC #2
  - [x] Auto-display on context load (no user action required) per AC #3
  - [x] Skip briefing entirely on first visit (no previous visit record)
  - [x] Framer Motion fade-in animation on appear (consistent with existing transitions)

- [x] Task 6: Create CollapsedBriefingIndicator → `src/components/context/CollapsedBriefingIndicator.tsx` (AC: #4)
  - [x] Small toolbar icon that appears after briefing is dismissed
  - [x] Click to re-expand the briefing
  - [x] Tooltip: "View Context Briefing"
  - [x] Badge showing count of open questions

- [x] Task 7: Integrate visit tracking into Context View (AC: #5)
  - [x] On Context View mount, call `trpc.contextVisit.recordVisit` to update last visit timestamp
  - [x] On scroll/navigation within context, debounced call to `trpc.contextVisit.updateLastViewedUnit` (debounce 2s)
  - [x] Store dismissed state in Zustand session store (resets per session)

- [x] Task 8: Write tests
  - [x] Test `recordVisit` creates/updates visit record correctly
  - [x] Test `getBriefing` returns correct counts of added/modified units
  - [x] Test `getBriefing` returns null for first-time visitors
  - [x] Test ContextBriefing renders session summary and open questions
  - [x] Test "Continue where I left off" scrolls to correct unit
  - [x] Test "Start fresh" dismisses briefing
  - [x] Test dismissed briefing collapses to toolbar indicator
  - [x] Test re-expanding collapsed briefing shows full content

## Dev Notes

- The `ContextVisit` model is a simple tracking table — it stores the last visit per user per context. For MVP, we only need the most recent visit, not a history of visits.
- The "units added/modified since last visit" queries should use the `lastVisitedAt` timestamp from `ContextVisit` to filter units. This is a simple date comparison, not a changelog.
- The `lastViewedUnitId` update should be debounced on the client (2 seconds) to avoid excessive API calls as the user scrolls through units.
- AI suggestions are placeholder for now — just show static text like "Consider revisiting Unit X" or "3 open questions need attention". Real AI integration comes in Epic 5.
- The briefing should not block the Context from loading — render it as an overlay or top section that can be dismissed while the context content loads underneath.

### Architecture References

- [Source: architecture.md] — Feature module isolation: `features/contexts/` for context-related components
- [Source: architecture.md] — tRPC router naming: camelCase verb-first procedures
- [Source: architecture.md] — Zustand for client-side session state
- [Source: epics.md#Story 3.6] — Story definition and acceptance criteria

### UX References

- [Source: ux-design-specification.md] — UX-DR16: Context re-entry experience with briefing
- [Source: ux-design-specification.md] — NFR16: Automatic briefing display without user request
- [Source: project-context.md] — Framer Motion for animations, Radix UI primitives for accessible components
