# Story 9.6: Freeform-to-Formal Template Export

**Status: pending**

## Description
As a user,
I want to retroactively apply structure to a freeform project by having AI analyze my existing Units and propose type mappings,
So that I can start loose and formalize later without losing work.

## Acceptance Criteria

**Given** a Project created in freeform mode with existing Units
**When** the user selects "Export to Formal Template"
**Then** AI analyzes the existing Units and proposes: which system template best fits the content, type mappings for each Unit, and suggested structural gaps per FR69
**And** the user reviews and approves/modifies each proposed mapping
**And** upon confirmation, the project's template is updated and Unit types are adjusted per the approved mappings
**And** existing relations are preserved — only types and template metadata change
**And** the operation is undoable via Cmd+Z

## Tasks
- [ ] Create `FormalizeJob` Prisma model: `id`, `project_id`, `status` (enum: analyzing, proposed, confirmed, undone), `proposed_template_id`, `unit_mappings` (Json — array of `{ unitId, currentType, proposedType, confidence }`), `gap_suggestions` (Json), `created_at`
- [ ] Create `server/repositories/formalizeRepository.ts` — CRUD for FormalizeJob, snapshot of pre-formalize state for undo
- [ ] Create `server/services/formalizeService.ts` — AI analysis: (1) embed all project Units, (2) compute cluster signatures, (3) match against 4 system template signatures to find best fit, (4) per-Unit type mapping via structured AI prompt, (5) gap analysis against target template's gapDetectionRules
- [ ] Add tRPC procedures: `formalize.analyze`, `formalize.confirm`, `formalize.undo`, `formalize.getJob`
- [ ] Create `components/formalize/FormalizeWizard.tsx` — multi-step flow: analysis progress → template match review → unit mapping review → confirm
- [ ] Create `components/formalize/TemplateFitCard.tsx` — shows the proposed template match with fit score, description, and "Use this" / "Choose different" options
- [ ] Create `components/formalize/UnitMappingTable.tsx` — table of all Units with current type, proposed type (editable dropdown), confidence indicator, and per-row approve/reject toggle
- [ ] Create `components/formalize/GapSuggestionList.tsx` — list of structural gaps in the target template that the freeform project lacks
- [ ] Implement undo: `formalize.undo` restores all Unit types from the snapshot stored in `FormalizeJob.unit_mappings` original values
- [ ] Register undo action with the global undo/redo store (event bus pattern)
- [ ] Add "Export to Formal Template" option to Project Settings menu (only shown when constraint_level is open/freeform)
- [ ] Write unit tests for template matching algorithm and unit type mapping prompts
- [ ] Write integration tests for full analyze → confirm → undo cycle

## Dev Notes
- Key files: `server/services/formalizeService.ts`, `server/api/routers/formalize.ts`, `components/formalize/FormalizeWizard.tsx`, `components/formalize/UnitMappingTable.tsx`
- Dependencies: Story 9.1 (Project model), Story 9.2 (system templates with config), Story 2.1 (Unit model — update unit_type), Story 4.x (AI embeddings for cluster analysis)
- Technical approach: Template matching uses centroid similarity — compute mean embedding of all project Units, compare against pre-computed centroids for each system template (stored at seed time). Per-Unit type mapping prompt: `"Given this Unit content and the target template's unit types [list], what type best fits? Respond with JSON: { type, confidence }."` Undo is implemented as a snapshot — before confirming, store original `{ unitId, originalType }` array in FormalizeJob. `formalize.undo` runs a bulk Prisma update restoring all types, then sets job status to "undone".

## References
- Epic 9: Projects & Domain Templates
- FR69: Freeform-to-formal template export with AI type mapping
- Related: Story 9.2 (system templates to match against), Story 9.1 (Project constraint_level), Story 2.1 (Unit type field update)
