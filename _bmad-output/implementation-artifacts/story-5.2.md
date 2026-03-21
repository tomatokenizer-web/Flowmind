# Story 5.2: AI Text Decomposition — 3-Step Process

**Status: pending**

## Description
As a user,
I want the AI to decompose my raw text into Thought Units following a 3-step process,
So that my long-form text is intelligently broken into atomic, typed, and connected cognitive units.

## Acceptance Criteria

**Given** the user submits raw text (paragraph or longer) in Organize Mode
**When** the AI decomposition is triggered
**Then** Step 1 executes: AI analyzes the text to understand the user's purpose (arguing, brainstorming, researching, defining, etc.) and returns a purpose classification

**Given** Step 1 has determined the user's purpose
**When** Step 2 executes
**Then** AI proposes decomposition boundaries within the text using semantic, logical, topical, and structural properties
**And** each proposed boundary includes: start/end character positions in the original text, proposed Unit content, proposed Unit type (from the 9 base types + any domain template types), and a confidence score (0.0-1.0)

**Given** Step 2 has proposed boundaries
**When** Step 3 executes
**Then** AI proposes relations between the newly created Units AND between new Units and existing Units in the active Context
**And** each proposed relation includes: source_unit (new), target_unit (new or existing), relation_type, strength, and a brief rationale

**Given** the 3-step process completes
**When** the results are returned to the client
**Then** all proposed Units have lifecycle = "draft" and origin_type = "ai_generated"
**And** the proposals are NOT saved to the database until the user reviews them (Story 5.3)

**Given** the input text is fewer than 20 characters
**When** decomposition is triggered
**Then** the system creates a single Unit with the entire text (no decomposition) and prompts for type assignment only

**Given** the AI generates proposals
**When** the safety guard checks the count
**Then** no more than 3 Units are proposed per request; if the text warrants more, the response includes a "Continue decomposition" action for the next batch

**Given** the decomposition is in progress
**When** the AI is processing
**Then** the UI shows a dot animation loading state (UX-DR36) with a "Cancel" button
**And** cancellation stops the AI call and discards partial results

## Tasks
- [ ] Create tRPC mutation `ai.decompose` in `server/routers/ai.ts` accepting `{ text: string, contextId: string }`
- [ ] Implement `server/ai/decompositionService.ts` with the 3-step orchestration logic
- [ ] Build Step 1 prompt: purpose classification returning one of `arguing | brainstorming | researching | defining | other`
- [ ] Build Step 2 prompt: boundary detection using the Step 1 purpose as context, returning array of `{ start, end, content, unitType, confidence }`
- [ ] Build Step 3 prompt: relation proposal between new units and existing Context units, returning array of `{ sourceUnit, targetUnit, relationType, strength, rationale }`
- [ ] Add input validation: if `text.length < 20`, skip to single-unit path and return type-assignment-only response
- [ ] Enforce safety guard: cap proposed units at 3 per request, include `hasMore: boolean` and `continueToken` in response when text has more content
- [ ] Store proposals temporarily in Redis (keyed by `userId:contextId:decompositionId`) — do NOT write to DB at this stage
- [ ] Create tRPC mutation `ai.cancelDecomposition` that deletes the Redis key for in-progress decomposition
- [ ] Add Zod schemas for all decomposition response shapes in `server/ai/schemas/decomposition.ts`
- [ ] Write integration test for the 3-step flow with a mock AI provider
- [ ] Add loading/cancel state management in the frontend store for decomposition progress

## Dev Notes
- Step 1 and Step 2 should use `generateStructured` from Story 5.1's provider abstraction
- Step 3 needs the existing Context Units as input — query them before building the Step 3 prompt (limit to 50 most recent to avoid token overflow)
- The `continueToken` for batch continuation should encode the character position offset in the original text
- Proposals returned to client are plain JSON — the DecompositionReview component (Story 5.3) handles rendering and eventual DB writes
- Use streaming if Anthropic streaming is available to show partial Step 2 results earlier (reduces perceived latency)
- All three steps should be called in sequence within a single tRPC call to avoid multiple round-trips

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: AI provider abstraction and safety guard (prerequisite)
- Story 5.3: DecompositionReview component consumes this output
- Story 5.9: intervention intensity level gates whether decomposition is offered
