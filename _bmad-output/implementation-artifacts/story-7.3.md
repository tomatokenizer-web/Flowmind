# Story 7.3: Assembly Templates with AI Slot Mapping

**Status: pending**

## Description
As a user,
I want to start composing from a template that proposes a structure and automatically maps my existing Units to slots,
So that I get a head start on document structure with AI doing the heavy lifting.

## Acceptance Criteria

**Given** the Assembly model supports templates
**When** the user creates an Assembly from a template
**Then** Assembly Templates propose structure based on writing purpose (e.g., "Argumentative Essay" has Introduction, Thesis, Evidence 1–3, Counterargument, Conclusion) per FR17

**Given** a template is applied to an Assembly
**When** the Assembly view loads
**Then** AI auto-maps existing Units in the active Context to template slots based on Unit type and content relevance per FR17
**And** empty slots are visually distinguished with dashed border and "Drop a Unit here" placeholder per FR17, UX-DR13

**Given** AI slot mapping proposals are shown
**When** the user reviews each slot
**Then** they can accept, reject, or override any AI slot mapping

**Given** the system has built-in templates
**When** listing available templates
**Then** at least 4 are available: Essay, Report, Decision Brief, Research Summary

**Given** a user has an existing Assembly arrangement
**When** they choose "Save as Template"
**Then** the current slot structure is saved as a new user-defined template

## Tasks
- [ ] Add `AssemblyTemplate` model to `prisma/schema.prisma` with fields: `id` (cuid), `name` (String), `description` (String?), `slots` (Json — array of `{ slotName, description, expectedUnitTypes[], position }`), `isSystem` (Boolean default false), `userId` (String?, nullable for system templates), `createdAt`, `updatedAt`
- [ ] Run `prisma migrate dev --name add-assembly-template` and regenerate client
- [ ] Create database seed data for 4 system templates in `prisma/seed.ts`:
  - Essay: Introduction (observation), Thesis (claim), Evidence 1–3 (evidence), Counterargument (claim/question), Conclusion (claim)
  - Report: Executive Summary (claim), Background (observation), Findings (evidence x3), Recommendations (action)
  - Decision Brief: Context (observation), Options (claim x2), Pros/Cons (evidence), Decision (claim), Next Steps (action)
  - Research Summary: Research Question (question), Methodology (observation), Key Findings (evidence x3), Conclusions (claim)
- [ ] Create `src/server/services/assemblyTemplateService.ts` with: `listTemplates`, `getTemplateById`, `createUserTemplate`, `proposeSlotMappings(templateId, contextId, userId)`
- [ ] Implement `proposeSlotMappings`: for each template slot, query Units in the given Context filtered by `expectedUnitTypes`; rank by embedding cosine similarity to slot description; return top-1 candidate per slot with a confidence score (high: >0.8, medium: 0.5–0.8, low: <0.5)
- [ ] Create tRPC router `src/server/api/routers/assemblyTemplate.ts` with procedures: `assemblyTemplate.list`, `assemblyTemplate.getById`, `assemblyTemplate.createFromAssembly`, `assemblyTemplate.proposeSlotMappings`
- [ ] Register `assemblyTemplateRouter` in `src/server/api/root.ts`
- [ ] Create `src/components/assembly/TemplatePickerDialog.tsx` — modal showing template cards (name, description, slot preview); on select, calls `trpc.assembly.create` with the chosen `templateId` then redirects to Assembly View
- [ ] Create `src/components/assembly/TemplateSlotCard.tsx` — renders an individual slot; shows slot name, description, expected unit types as badges; if empty: dashed border with "Drop a Unit here" placeholder text; if filled: renders the unit card with accept/reject/swap controls
- [ ] Update `AssemblyBoard.tsx` to detect when `assembly.templateId` is set and render `TemplateSlotCard` components in slot order instead of free-form order
- [ ] Create `src/components/assembly/SlotMappingProposal.tsx` — overlay/drawer shown after template creation; lists each slot with AI-proposed Unit (confidence badge), Accept / Swap / Skip buttons per slot; "Apply All Accepted" confirms the batch
- [ ] On "Accept" slot: call `trpc.assembly.addUnit` with `slotName`; on "Swap": open a Unit picker dialog; on "Skip": leave slot empty
- [ ] Add "Save as Template" button to Assembly header; on click: open a name/description dialog then call `trpc.assemblyTemplate.createFromAssembly` with current `assemblyId`
- [ ] Write tests: 4 system templates exist in seed, proposeSlotMappings returns one candidate per slot, empty slots render dashed placeholder, accept/reject/swap each work correctly, save-as-template creates a new user template

## Dev Notes
- Key files: `prisma/schema.prisma`, `prisma/seed.ts`, `src/server/services/assemblyTemplateService.ts`, `src/server/api/routers/assemblyTemplate.ts`, `src/components/assembly/TemplatePickerDialog.tsx`, `src/components/assembly/TemplateSlotCard.tsx`
- Dependencies: Story 7.1 (Assembly model, `templateId` FK), Story 7.2 (AssemblyBoard rendering), Story 5.x (embeddings for similarity scoring)
- Technical approach: Slot definitions are stored as a JSON array on the template. The `proposeSlotMappings` service uses vector cosine similarity (pgvector or in-memory dot product over pre-computed embeddings) between the slot description and Unit content embeddings. If embeddings are not yet available (Epic 5 not complete), fall back to keyword matching on unit_type. The slot ordering in the Assembly respects `position` from the template's slot array.
- Story 7.10 specifically extends the auto-mapping flow with a more interactive UI — this story establishes the underlying service.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.1 (Assembly model), Story 7.2 (AssemblyBoard), Story 7.10 (auto-mapping UI extension)
- FR17: Assembly Templates with AI slot mapping; UX-DR13: empty slot dashed border placeholder
