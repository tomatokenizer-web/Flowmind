# Story 8.5: Reverse Provenance Tracking

**Status: pending**

## Description
As a user,
I want to click an external resource and see all Thought Units derived from it and all Assemblies containing those Units,
So that I can trace the full impact of any source material on my thinking.

## Acceptance Criteria

**Given** a Resource Unit derived from external text exists
**When** the user clicks on it
**Then** the system queries and displays: all Thought Units derived from it (via `source_span.parent_input_id`), and all Assemblies containing those derived Units per FR21
**And** the result is shown as a tree: Resource → [derived Unit 1, derived Unit 2, ...] → [Assembly A, Assembly B, ...]
**And** each node in the tree is clickable and navigates to the corresponding Unit or Assembly
**And** the reverse tracking query is available via tRPC procedure `resource.getReverseProvenance`

## Tasks
- [ ] Create `server/repositories/provenanceRepository.ts` — recursive query: given a parent Unit id, find all Units where `source_span->>'parent_input_id' = $id`, then find all Assemblies referencing those Units
- [ ] Create `server/services/provenanceService.ts` — builds the provenance tree structure (Resource → derived Units → Assemblies)
- [ ] Add tRPC procedure `resource.getReverseProvenance` — accepts Unit id, returns tree data structure
- [ ] Create `components/provenance/ReverseProvenancePanel.tsx` — slide-out panel showing the provenance tree
- [ ] Create `components/provenance/ProvenanceTree.tsx` — recursive tree component with Resource node, derived Unit nodes, Assembly leaf nodes
- [ ] Create `components/provenance/ProvenanceTreeNode.tsx` — clickable node with icon by node type (resource/unit/assembly), click navigates to item
- [ ] Add "View Impact" / provenance icon button to Resource Unit cards and Unit detail panel when `origin_type` is external
- [ ] Add Zustand store slice for provenance panel open state and cached tree data
- [ ] Write unit tests for recursive provenance query
- [ ] Write integration tests for the full tree traversal from Resource to Assemblies

## Dev Notes
- Key files: `server/repositories/provenanceRepository.ts`, `server/services/provenanceService.ts`, `server/api/routers/resource.ts`, `components/provenance/ReverseProvenancePanel.tsx`
- Dependencies: Story 2.1 (Unit model with source_span JSON field), Story 5.x (Assembly model), Story 8.4 (imports create Resource Units with source_span)
- Technical approach: `source_span` is a JSONB field; Postgres query uses `->>` operator: `WHERE source_span->>'parent_input_id' = $unitId`. For deep trees, use a recursive CTE or iterative BFS limited to depth 5. Tree nodes include: `{ id, type: 'resource'|'unit'|'assembly', content, path }`.

## References
- Epic 8: Feedback Loop & Thought Evolution
- FR21: Reverse provenance tracking from Resource Unit to derived Units to Assemblies
- Related: Story 8.4 (imports set source_span), Story 5.x (Assembly model), Story 2.1 (source_span field)
