# Story 5.7: Branch Potential Score and AI-Suggested Exploration Directions

**Status: pending**

## Description
As a user,
I want to see a Branch Potential Score on each Unit and explore AI-suggested directions,
So that I know which thoughts are ripe for further development and what directions I might take.

## Acceptance Criteria

**Given** a confirmed Unit in a Context
**When** the UnitCard renders
**Then** a Branch Potential Score is displayed as a dot indicator (e.g., 3 of 4 dots filled) representing derivation potential

**Given** the Branch Potential Score is computed
**When** the calculation runs
**Then** the score considers: number of existing outgoing relations (fewer = more potential), type of Unit (Questions and Ideas score higher), recency, and whether common follow-up types are missing (e.g., a Claim without Evidence)

**Given** a Unit with a high Branch Potential Score (3+ dots)
**When** the user clicks the score indicator
**Then** a popover shows 2-3 AI-suggested exploration directions
**And** each direction includes: a question or prompt to explore, the expected Unit type of the result, and which existing Units it might connect to

**Given** the user clicks on one of the suggested exploration directions
**When** the action triggers
**Then** a new draft Unit is created with the suggested prompt as placeholder content
**And** a proposed relation from the original Unit to the new Unit is created
**And** the new Unit opens in the editor for the user to write their response

**Given** the safety guard
**When** a user clicks exploration directions 3 times consecutively without creating manual Units in between
**Then** the 4th click shows a message: "Consider adding your own thoughts before exploring more AI suggestions"
**And** the exploration is blocked until the user creates a manual Unit

**Given** a Context has Units with varying scores
**When** the Context Dashboard (Story 6.9) is viewed
**Then** the top 5 highest Branch Potential Units are listed as "Recommended exploration points"

## Tasks
- [ ] Implement `server/ai/branchPotentialService.ts` with scoring function: `computeBranchPotential(unit, contextRelations): number (1-4)`
- [ ] Scoring logic: start at 4, subtract 1 for each existing outgoing relation (min 0), add 1 if type is Question or Idea, add 1 if missing expected follow-up types (Claim without Evidence), cap at 4
- [ ] Store computed score in `unit_context_memberships.branch_potential_score` column (integer 1-4), recompute on relation changes via Trigger.dev job
- [ ] Add branch potential dot indicator to `UnitCard` component: render 4 dot slots, fill N dots based on score
- [ ] Only render the dot indicator on confirmed Units (skip draft/pending)
- [ ] Create tRPC query `ai.getExplorationDirections` accepting `{ unitId, contextId }` that calls AI to generate 2-3 exploration directions
- [ ] Build exploration directions prompt: include Unit content, type, existing relations, and Context topic — return array of `{ prompt, expectedUnitType, relatedUnitIds }`
- [ ] Create popover component `components/ai/BranchPotentialPopover.tsx` triggered by clicking the dot indicator
- [ ] In the popover, render exploration directions with prompt text, expected type badge, and related Unit previews
- [ ] On direction click: call tRPC `unit.create` with `lifecycle: "draft"`, content = suggested prompt, then create a proposed relation, then open the new Unit in editor
- [ ] Implement consecutive exploration guard: track `consecutiveBranchCount` in user session (Redis); increment on each direction click, reset when a manual Unit is created; block at count >= 3 with the warning message
- [ ] Add tRPC query `context.getTopBranchPotentialUnits` accepting `{ contextId }` returning top 5 Units by `branch_potential_score` for Context Dashboard

## Dev Notes
- Branch potential score recomputation should be a lightweight Trigger.dev job triggered on `relation.created` and `relation.deleted` events
- The score is per-unit-context combination (stored in `unit_context_memberships`) because the same Unit can have different relation counts in different Contexts
- Exploration directions are generated on-demand (not pre-computed) — cache results in Redis for 1 hour per `unitId:contextId` key
- The consecutive branch guard state must be per-user per-session in Redis, not in-memory, to survive page refreshes
- Dot indicator accessibility: add `aria-label="Branch potential: N out of 4"` to the indicator element

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: AI provider abstraction and consecutive branch generation limit (safety guard)
- Story 5.9: "Generative" intensity level enables direct draft Unit generation from exploration
- Story 6.9: Context Dashboard consumes top branch potential Units (referenced in AC)
