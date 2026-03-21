# Story 9.4: Scaffold Units & Gap Detection

**Status: pending**

## Description
As a user,
I want my project to start with pre-planted questions that guide my thinking, and have the system detect what's still missing,
So that I have a clear path forward and know what needs attention.

## Acceptance Criteria

**Given** a Project is created with a Domain Template
**When** the project initializes
**Then** Scaffold Units (pre-planted questions/prompts from the template) are created as draft Units within the project's default Context per FR67
**And** Scaffold Units have `origin_type: "ai_generated"` and a special `scaffold: true` metadata flag
**And** gap detection rules from the template continuously evaluate: which scaffold questions have been addressed (have confirmed Units connected to them), which remain open, and what structural elements are missing per FR67
**And** gap detection results are shown in the Context Dashboard and Completeness Compass
**And** the AI live guide uses gap detection to suggest next steps

## Tasks
- [ ] Add `scaffold` Boolean default false field to Unit model (identifies Scaffold Units)
- [ ] Add `scaffold_slot_id` String? field to Unit model (ties a Scaffold Unit to a template contextSlot id)
- [ ] Create `server/services/scaffoldService.ts` — `initializeScaffolds(projectId)`: reads template.scaffoldUnits config, creates draft Units with `scaffold: true` and `origin_type: "ai_generated"` in project's default Context
- [ ] Create `server/services/gapDetectionService.ts` — `detectGaps(projectId)`: evaluates template.gapDetectionRules against current Units in project; returns `{ filled: SlotStatus[], missing: SlotStatus[], partiallyFilled: SlotStatus[] }`
- [ ] Add tRPC procedures: `scaffold.getForProject`, `scaffold.addressScaffold`, `gap.detect`, `gap.getResults`
- [ ] Create Trigger.dev job `gap-detection-job.ts` — triggered on Unit create/update within a project, recomputes gap state and caches results
- [ ] Create `components/scaffold/ScaffoldUnitCard.tsx` — visual variant of UnitCard for scaffold Units: shows the template question prominently, "Answer this question" CTA, addressed/open state indicator
- [ ] Create `components/gap/GapDetectionPanel.tsx` — panel in Context Dashboard showing gap results: green checkmarks for filled, red/orange badges for missing/partial
- [ ] Create `components/gap/GapSuggestionTooltip.tsx` — tooltip shown on hover of missing gap slot with AI-generated suggestion text
- [ ] Update Context Dashboard to show `GapDetectionPanel` when project has a template
- [ ] Implement "addressed" detection: a Scaffold Unit is addressed when at least one confirmed Unit with matching type has a `references` or `supports` relation to the Scaffold Unit
- [ ] Write unit tests for scaffoldService.initializeScaffolds and gapDetectionService.detectGaps
- [ ] Write integration tests for project creation → scaffold initialization → gap detection flow

## Dev Notes
- Key files: `server/services/scaffoldService.ts`, `server/services/gapDetectionService.ts`, `server/api/routers/scaffold.ts`, `components/scaffold/ScaffoldUnitCard.tsx`, `components/gap/GapDetectionPanel.tsx`
- Dependencies: Story 9.1 (Project model), Story 9.2 (template config with scaffoldUnits and gapDetectionRules), Story 2.1 (Unit model — add scaffold fields), Story 2.4 (Relation types for "addressed" detection)
- Technical approach: Template `scaffoldUnits` config is an array of `{ id, content, requiredUnitType, priority }`. On project init, each scaffold item becomes a real Unit. `gapDetectionRules` config is an array of `{ slotId, description, requiredTypes[], minCount, relation_check }`. Gap detection runs against these rules using SQL queries. Cache gap results in a `project_gap_cache` JSON column on Project or in Redis to avoid recomputing on every render.

## References
- Epic 9: Projects & Domain Templates
- FR67: Scaffold Units and gap detection
- Related: Story 9.2 (template config), Story 9.3 (AiLiveGuide uses gap results), Story 9.5 (Completeness Compass consumes gap results), Story 8.9 (high-energy suggestion → run gap detection)
