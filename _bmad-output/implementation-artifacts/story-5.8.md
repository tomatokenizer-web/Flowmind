# Story 5.8: Label-Based Flow Prediction — Missing Argument Structure Alerts

**Status: pending**

## Description
As a user,
I want the AI to alert me when my argument structure has gaps,
So that I can strengthen my reasoning by addressing missing evidence, counterarguments, or answers.

## Acceptance Criteria

**Given** a Unit of type "Claim" in a Context
**When** the flow prediction analysis runs (triggered on relation changes)
**Then** if the Claim has no "supports" or "exemplifies" relation from an Evidence or Observation Unit, an alert is generated: "This claim has no supporting evidence"

**Given** a Unit of type "Question"
**When** flow prediction runs
**Then** if the Question has no outgoing "derives_from" or incoming "supports" relation to a Claim, Observation, or Evidence Unit, an alert is generated: "This question has no answer or exploration yet"

**Given** a Unit of type "Evidence"
**When** flow prediction runs
**Then** if the Evidence has no outgoing "supports" relation, an alert is generated: "This evidence is not connected to any claim"

**Given** a Claim with supporting Evidence but no Counterargument
**When** flow prediction runs
**Then** a softer suggestion (not alert) is generated: "Consider: are there counterarguments to this claim?"

**Given** flow prediction alerts are generated
**When** they are displayed on the UnitCard
**Then** they appear as subtle inline indicators (small warning icon + text) below the card content
**And** clicking the indicator opens a suggestion to create the missing Unit type

**Given** the user dismisses a flow prediction alert
**When** the dismissal is recorded
**Then** the alert does not reappear for that Unit unless the Unit's relations change (NFR13)

**Given** a Context with many Units
**When** flow prediction runs
**Then** the analysis completes as a background Trigger.dev job and results are cached
**And** alerts are prioritized by: Units with high ThoughtRank first, then by severity of the gap

## Tasks
- [ ] Create `server/ai/flowPredictionService.ts` with rule-based analysis (no AI call needed for basic structural rules)
- [ ] Implement rule: Claim with no incoming `supports`/`exemplifies` from Evidence/Observation → alert "This claim has no supporting evidence"
- [ ] Implement rule: Question with no outgoing `derives_from` or incoming `supports` from Claim/Observation/Evidence → alert "This question has no answer or exploration yet"
- [ ] Implement rule: Evidence with no outgoing `supports` → alert "This evidence is not connected to any claim"
- [ ] Implement soft suggestion: Claim with Evidence but no Counterargument unit connected → suggestion "Consider: are there counterarguments to this claim?"
- [ ] Create Trigger.dev job `jobs/runFlowPrediction.ts` triggered on `relation.created` and `relation.deleted` events within a Context
- [ ] Store flow prediction results in `unit_flow_alerts` table: `unit_id`, `alert_type`, `message`, `severity` (alert|suggestion), `dismissed_at`, `invalidated_at`
- [ ] Create tRPC query `ai.getFlowAlerts` accepting `{ unitId }` returning active (non-dismissed, non-invalidated) alerts
- [ ] Add inline alert indicator to `UnitCard`: small warning icon (orange for alert, gray for suggestion) with first 60 chars of message
- [ ] On alert indicator click: open a popover with full message and a "Create missing Unit" quick action button
- [ ] "Create missing Unit" button: pre-fill a new draft Unit with the appropriate type (e.g., Evidence for a missing evidence alert)
- [ ] Create tRPC mutation `ai.dismissFlowAlert` that sets `dismissed_at` on the alert record
- [ ] On relation change: set `invalidated_at` on existing alerts for the affected Unit so they are re-evaluated
- [ ] Prioritize alerts by `unit_thoughtrank_score DESC, severity` when returning from the query
- [ ] Cache flow prediction job results in Redis with a TTL of 5 minutes per Context to avoid redundant computation

## Dev Notes
- Flow prediction is purely rule-based (relation graph traversal) — no AI API call required, making it fast and cheap to run
- The Trigger.dev job should be debounced per Context (e.g., 10-second delay) to batch multiple rapid relation changes into a single analysis run
- `unit_flow_alerts` needs indexes on `(unit_id, dismissed_at, invalidated_at)` for fast per-unit lookup
- Alert invalidation on relation change should be scoped: only invalidate alerts for the Units directly involved in the changed relation (not the whole Context)
- Severity levels: "alert" (red/orange icon) for hard gaps, "suggestion" (gray icon) for soft/optional gaps

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.9: "Minimal" intervention intensity only shows these alerts (no other AI features)
- Story 5.13: Scope jump warning follows similar inline indicator pattern
- Story 5.14: Flow alerts appear in the AI Suggestion Queue under the "Alerts" group
