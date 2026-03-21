# Story 7.9: Reasoning Chain Visualization

**Status: pending**

## Description
As a user,
I want to trace the explicit reasoning path from evidence through inference to conclusion within a Context,
So that I can evaluate the logical structure of my arguments and identify gaps in reasoning.

## Acceptance Criteria

**Given** Units exist within a Context with relation chains connecting evidence to conclusions
**When** the user requests a Reasoning Chain view
**Then** the system constructs a ReasoningChain structure with: `id`, `goal` (the conclusion being reasoned toward), and `steps[]` array per FR76, PRD Appendix B

**Given** a ReasoningChain is constructed
**When** the steps are rendered
**Then** each step includes: `unit_id`, `role` (foundation / motivation / validation / inference / conclusion), `evidence_domain`, `scope`, and `transition` (logic for moving to the next step) per PRD Appendix B
**And** the chain visualization displays steps sequentially with relation types connecting each step (e.g., Evidence →[supports]→ Claim →[derives_from]→ Conclusion)

**Given** gaps exist in the reasoning chain
**When** the chain is analyzed
**Then** gaps are highlighted: "This conclusion has no supporting evidence path" or "Scope jump: personal evidence supports domain-general claim"

**Given** the user wants AI-assisted chain construction
**When** they trigger AI auto-generate
**Then** AI analyzes the relation graph within a Context and auto-generates Reasoning Chains per Feature Reference

**Given** the user wants to manually build a chain
**When** they select Units and assign roles
**Then** they can create or edit Reasoning Chains by selecting Units and assigning roles

**Given** Reasoning Chains exist
**When** the user navigates
**Then** they are viewable from both Context detail and Assembly detail views

## Tasks
- [ ] Add `ReasoningChain` model to `prisma/schema.prisma` with fields: `id` (cuid), `goal` (String — description of the conclusion being reasoned toward), `contextId` (FK to Context), `assemblyId` (String?, nullable FK to Assembly), `userId` (FK to User), `steps` (Json — `ReasoningStep[]`), `createdAt`, `updatedAt`
- [ ] Define `ReasoningStep` type: `{ unitId: string; role: 'foundation' | 'motivation' | 'validation' | 'inference' | 'conclusion'; evidenceDomain: string | null; scope: string | null; transition: string | null }`
- [ ] Run `prisma migrate dev --name add-reasoning-chain` and regenerate client
- [ ] Create `src/server/services/reasoningChainService.ts` with functions:
  - `createReasoningChain(contextId, goal, steps, userId)` — validates step unitIds exist in context
  - `getReasoningChain(id)` — returns chain with hydrated unit data for each step
  - `listReasoningChains(contextId)` — all chains for a context
  - `updateReasoningChain(id, updates)` — update goal or steps
  - `deleteReasoningChain(id)`
  - `autoGenerateReasoningChain(contextId)` — AI-assisted: traverse the relation graph to identify evidence→claim→conclusion paths, assign roles, detect gaps
  - `detectGaps(steps)` — returns `GapWarning[]`: checks for missing evidence, scope jumps, unsupported conclusions
- [ ] Implement `autoGenerateReasoningChain`: fetch all units and relations in the context; build a directed graph; use BFS/DFS to find paths from `evidence` type units to `claim` units via `supports` relations; select the strongest path based on relation count; return as a `ReasoningStep[]` array
- [ ] Implement `detectGaps` logic: a "scope jump" occurs when a step with `scope: 'personal'` is followed by a step with `scope: 'general'`; an "unsupported conclusion" occurs when the last step has no incoming `supports` relation from an evidence step
- [ ] Create tRPC router `src/server/api/routers/reasoningChain.ts` with procedures: `reasoningChain.create`, `reasoningChain.getById`, `reasoningChain.list`, `reasoningChain.update`, `reasoningChain.delete`, `reasoningChain.autoGenerate`
- [ ] Register `reasoningChainRouter` in `src/server/api/root.ts`
- [ ] Create `src/components/reasoning/ReasoningChainView.tsx` — vertical step-by-step visualization:
  - Each step is a card showing: unit content preview, role badge (color-coded: foundation=blue, motivation=purple, validation=green, inference=amber, conclusion=red), evidence_domain tag, scope tag
  - Between steps: relation arrow with relation type label (e.g., `→[supports]→`)
  - Gap warnings shown as red alert banners between the relevant steps
- [ ] Create `src/components/reasoning/ReasoningChainBuilder.tsx` — manual editing mode:
  - Unit selector (search/browse units in the context)
  - Role assignment dropdown per step
  - Drag-to-reorder steps (reuse dnd-kit from Story 7.2)
  - "Add Step" button
  - Goal text input at the top
- [ ] Add "Reasoning Chains" tab/section to Context detail view (`src/app/(app)/context/[id]/page.tsx`)
- [ ] Add "Reasoning Chain" tab to Assembly detail view (`src/app/(app)/assembly/[id]/page.tsx`) — shows chains whose `assemblyId` matches the current assembly
- [ ] Write tests: autoGenerateReasoningChain finds correct path in a sample relation graph, detectGaps identifies scope jump and unsupported conclusion, CRUD procedures work, reasoning chain renders all steps with role badges

## Dev Notes
- Key files: `prisma/schema.prisma`, `src/server/services/reasoningChainService.ts`, `src/server/api/routers/reasoningChain.ts`, `src/components/reasoning/ReasoningChainView.tsx`, `src/components/reasoning/ReasoningChainBuilder.tsx`
- Dependencies: Story 7.1 (Assembly FK), Epic 4 (Relation model for graph traversal), Epic 2 (Unit model with type/scope fields)
- Technical approach: Steps are stored as a JSON array on the `ReasoningChain` record — this avoids a separate join table and simplifies ordering. The `autoGenerate` function builds an in-memory adjacency list from the context's units and relations, then runs a weighted path search prioritizing `supports` and `derives_from` relation types. Gap detection is a post-processing pass over the assembled steps array. Story 8.10 (Action Unit delegation) reuses `ReasoningChainView` with different styling — the component should accept a `variant` prop.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.1 (assemblyId FK), Epic 4 (Relation model), Story 8.10 (DecisionChainPanel reuses this component)
- FR76: Reasoning Chain visualization; PRD Appendix B: ReasoningChain and ReasoningStep schema
