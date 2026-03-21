# Story 5.13: Scope Jump Warning and Inline Intervention Nudges

**Status: pending**

## Description
As a user,
I want to be warned when I use narrow evidence to support broad claims, and receive non-intrusive nudges for misuse patterns,
So that I maintain intellectual rigor and learn to use the system effectively.

## Acceptance Criteria

**Given** an Evidence Unit with a narrow scope (e.g., specific case study, single data point) is connected via "supports" relation to a Claim Unit with broad scope (e.g., general statement about a category)
**When** the scope analysis runs (triggered on relation creation)
**Then** a scope jump warning is generated: "This evidence has a narrow scope but supports a broad claim. Consider: is this evidence representative?"

**Given** the scope jump warning is generated
**When** it is displayed
**Then** it appears as an inline indicator on the relation line in Graph View (small warning icon)
**And** in the Unit Detail Panel's Relations tab, the relation row shows an amber warning icon with the message

**Given** the user dismisses a scope jump warning
**When** the dismissal is recorded
**Then** the warning never reappears for that specific relation (NFR13 — one-time nudge)

**Given** the system detects a misuse pattern (e.g., creating many Units without any relations, using only one Unit type, never reviewing AI suggestions)
**When** the pattern threshold is met (configurable, e.g., 10 unconnected Units in a row)
**Then** an inline intervention nudge appears: a subtle, non-blocking card with a helpful tip
**And** the nudge fires exactly once per pattern type per user — never repeats after dismissal

**Given** an intervention nudge is displayed
**When** the user clicks "Dismiss" or "Got it"
**Then** the nudge disappears and is permanently suppressed for that pattern
**And** the dismissal is recorded in user preferences

**Given** the nudge system
**When** multiple nudges would fire simultaneously
**Then** only the highest-priority nudge is shown (queue behavior, one at a time)
**And** remaining nudges are queued and shown only if still relevant when the user completes the first

## Tasks
- [ ] Implement `server/ai/scopeAnalysisService.ts` with a prompt that classifies Evidence scope (narrow/broad) and Claim scope (narrow/broad), returning `{ evidenceScope, claimScope, hasScopeJump: boolean }`
- [ ] Create Trigger.dev job `jobs/analyzeScopeJump.ts` triggered on `relation.created` where `relation_type = "supports"` and source is Evidence, target is Claim
- [ ] Store scope jump warnings in `relation_warnings` table: `relation_id`, `warning_type`, `message`, `dismissed_at`
- [ ] Create tRPC mutation `ai.dismissScopeWarning` accepting `{ relationId }` that sets `dismissed_at` — permanent, never re-fires for that relation
- [ ] Add warning icon overlay on relation lines in Graph View when the relation has an active (non-dismissed) scope warning
- [ ] Add amber warning icon + message to the relation row in Unit Detail Panel's Relations tab when scope warning is active
- [ ] Define misuse patterns in `server/ai/misusePatternsService.ts`:
  - Pattern `isolated_units`: 10+ Units created in current session with 0 relations
  - Pattern `single_type`: 15+ Units created all with the same type
  - Pattern `unreviewed_suggestions`: 10+ AI suggestions pending without any action taken
- [ ] Create `user_nudge_dismissals` table: `user_id`, `pattern_type`, `dismissed_at` — stores permanent suppressions
- [ ] Implement pattern detection as lightweight event listeners (on `unit.created`, `relation.created`) that check thresholds
- [ ] Create tRPC query `ai.getPendingNudge` that checks all pattern thresholds and returns the highest-priority non-dismissed nudge (or null)
- [ ] Build `components/ai/InterventionNudgeCard.tsx`: non-blocking floating card with tip text and "Got it" / "Dismiss" button
- [ ] On "Got it"/"Dismiss" click: call tRPC `ai.dismissNudge` accepting `{ patternType }`, insert into `user_nudge_dismissals`
- [ ] Implement nudge queue: if `getPendingNudge` returns a nudge while another is displayed, queue it and show after the current one is dismissed

## Dev Notes
- Scope classification can be done heuristically (keyword-based) first: narrow indicators = "single", "one case", "specific", "study of"; broad indicators = "all", "always", "generally", "in most cases" — only call AI for ambiguous cases
- `relation_warnings` needs an index on `(relation_id, dismissed_at)` for fast lookup during Graph View render
- Pattern thresholds should be configurable via a constants file (`constants/aiNudgeThresholds.ts`) not hardcoded in multiple places
- The nudge queue state lives in the frontend store (Zustand) — no server persistence needed for the queue itself, only for dismissals
- Priority order for nudges: `isolated_units` > `single_type` > `unreviewed_suggestions` (most impactful first)

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.8: Flow prediction alerts (similar inline indicator pattern; both are one-time per dismissal)
- Story 5.1: Safety guard (separate from nudges — nudges are educational, guard is enforcement)
- Story 5.14: Scope warnings may surface in the AI Suggestion Queue
