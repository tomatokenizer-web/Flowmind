# Story 8.2: Compression — Similar Claim Core Extraction

**Status: pending**

## Description
As a user,
I want the system to detect when I've said similar things multiple times and propose extracting the common core,
So that my knowledge graph stays concise without losing nuance.

## Acceptance Criteria

**Given** multiple Units exist with semantically similar content
**When** the Compression service detects variations of similar claims (via embedding similarity threshold)
**Then** it proposes extraction of the common core into a single Unit per FR59
**And** the proposal shows: the similar Units side-by-side, the proposed extracted core Unit, and which variations add unique nuance
**And** the user can accept (creates core Unit, archives variations with relations to core), reject (keeps all as-is), or customize (edit the core before accepting)
**And** accepted compressions preserve all relations from the original Units on the core Unit
**And** the detection runs periodically as a Trigger.dev background job
**And** the user can manually trigger compression detection for a specific Context

## Tasks
- [ ] Create `CompressionProposal` Prisma model: `id`, `user_id`, `source_unit_ids` (Json), `proposed_core_content` (text), `status` (enum: pending, accepted, rejected, customized), `created_at`
- [ ] Create `server/repositories/compressionRepository.ts` — CRUD for CompressionProposal, query similar Unit clusters
- [ ] Create `server/services/compressionService.ts` — embedding similarity clustering (cosine similarity > 0.85 threshold), core extraction via AI, relation merging on accept
- [ ] Add tRPC procedures: `compression.listProposals`, `compression.accept`, `compression.reject`, `compression.customize`, `compression.triggerForContext`
- [ ] Create Trigger.dev job `compression-detection-job.ts` — periodic scan of all user Units, batch embedding comparison, proposal generation
- [ ] Create `components/compression/CompressionProposalDialog.tsx` — side-by-side diff view, proposed core editor, accept/reject/customize actions
- [ ] Create `components/compression/CompressionProposalCard.tsx` — summary card for pending proposals shown in sidebar notification area
- [ ] Add "Detect Compressions" button to Context actions menu (manual trigger)
- [ ] Implement relation merging: on accept, copy all source Unit relations to core Unit, set source Units `lifecycle: archived`, add `derives_from` relation pointing to core
- [ ] Write unit tests for similarity clustering and relation merging logic
- [ ] Write integration tests for accept/reject/customize flows

## Dev Notes
- Key files: `server/services/compressionService.ts`, `server/api/routers/compression.ts`, `components/compression/CompressionProposalDialog.tsx`
- Dependencies: Story 2.1 (Unit model), Story 2.4 (Relations), Story 4.x (AI embeddings/vector store), Trigger.dev
- Technical approach: Embeddings stored in pgvector; use `<->` cosine distance operator to find clusters. Threshold 0.85 is configurable via env var `COMPRESSION_SIMILARITY_THRESHOLD`. Core extraction prompt: "Given these N similar statements, extract the common core idea in one concise sentence." Archived variants keep `lifecycle: archived` and a `refines` relation to the core Unit.

## References
- Epic 8: Feedback Loop & Thought Evolution
- FR59: Compression — similar claim core extraction
- Related: Story 2.4 (Relation types), Story 4.x (AI/embeddings), Story 8.1 (Incubation Queue for low-value Units)
