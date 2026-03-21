# Story 8.6: Action Unit Completion & Result Records

**Status: pending**

## Description
As a user,
I want the system to propose creating a result record when I complete an Action Unit,
So that my decision-making history is preserved alongside execution outcomes.

## Acceptance Criteria

**Given** an Action Unit (unit_type: "action") exists with related decision-making Units
**When** the user marks the Action Unit as "completed"
**Then** the system proposes creating a result record Unit connected to the original decision-making Units per FR57
**And** the result record Unit is pre-populated with: the Action Unit's content, completion date, and suggested relation to the decision Units (derives_from, references)
**And** the user can edit the result record content before confirming
**And** Action Units preserve their decision-making history via relations per FR56
**And** the result record carries `origin_type: "direct_write"` and `unit_type: "observation"` by default

## Tasks
- [ ] Add `action_status` enum to Unit model: `pending | in_progress | delegated | completed | cancelled`
- [ ] Add `completed_at` DateTime? field to Unit model
- [ ] Create `server/services/actionService.ts` — `completeAction(unitId)`: sets action_status to completed, fetches related decision Units, builds pre-populated result record draft
- [ ] Add tRPC procedures: `action.complete`, `action.createResultRecord`, `action.getDecisionChain`
- [ ] Create `components/action/ActionCompletionDialog.tsx` — modal triggered on action completion, shows pre-populated result record form with editable content, related decision Unit list, confirm/skip buttons
- [ ] Create `components/action/ResultRecordCard.tsx` — card style for observation Units that are result records (shows loop icon ↩, links back to completed action)
- [ ] Create `components/action/DecisionChainPanel.tsx` — slide-out panel showing full provenance: originating thoughts → action → result record
- [ ] Add "Complete" button/shortcut to Action Unit cards and detail view
- [ ] Add `is_result_record: true` metadata flag to the created observation Unit for identification
- [ ] Add feedback loop indicator (↩ icon) to UnitCard when `is_result_record` relation exists
- [ ] Write unit tests for completeAction service method and result record pre-population
- [ ] Write integration tests for the complete → propose → confirm → result record creation flow

## Dev Notes
- Key files: `server/services/actionService.ts`, `server/api/routers/action.ts`, `components/action/ActionCompletionDialog.tsx`, `components/action/DecisionChainPanel.tsx`
- Dependencies: Story 2.1 (Unit model), Story 2.4 (Relation types: derives_from, references), Story 3.x (UnitCard component)
- Technical approach: On `action.complete`, query all Units related to the Action Unit via `derives_from` and `references` relations filtered to decision-type Units (claim, question, evidence, counterargument). Pre-populate result record content as: `"Result of: [action content]. Completed on [date]."`. DecisionChainPanel reuses relation traversal logic from the Graph View but with action-specific styling.

## References
- Epic 8: Feedback Loop & Thought Evolution
- FR56: Action Unit decision-making history via relations
- FR57: Result record proposal on Action Unit completion
- Related: Story 8.10 (extends this with external service delegation), Story 2.4 (Relation types)
