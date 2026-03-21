# Story 5.12: Tension Detection — Flag Contradictory Claims

**Status: pending**

## Description
As a user,
I want the AI to detect and flag contradictory claims within the same Context,
So that I can resolve or consciously maintain tensions in my thinking.

## Acceptance Criteria

**Given** a Context contains two or more Claim Units
**When** the tension detection background job runs (triggered on Unit creation/update within Context)
**Then** the AI compares Claim pairs using semantic similarity and logical analysis
**And** pairs with contradictory content are flagged as "tensions"

**Given** a tension is detected between Claim A and Claim B
**When** the tension flag is stored
**Then** it includes: the two Unit IDs, a confidence score (0.0-1.0), a brief description of the contradiction, and a timestamp

**Given** tensions exist in a Context
**When** the Context Dashboard (Story 6.9) is viewed
**Then** tensions are listed in a "Contradictions" section with links to both Units
**And** each tension shows the AI's description of the contradiction

**Given** a tension is flagged
**When** the user views either of the contradicting Units
**Then** a subtle indicator (red dot or tension icon) appears on the UnitCard
**And** clicking reveals the contradicting Unit and the AI's explanation

**Given** the user resolves a tension (by modifying one Unit, creating a reconciliation Unit, or explicitly dismissing)
**When** the resolution action is taken
**Then** the tension flag is removed or marked as "resolved"
**And** if dismissed, the same tension is not re-flagged unless Unit content changes

**Given** a Context with 100+ Claims
**When** tension detection runs
**Then** it executes as a Trigger.dev background job with results cached
**And** only new/modified Claims are compared against existing Claims (incremental, not full O(n^2) every time)

## Tasks
- [ ] Create `context_tensions` table: `id`, `context_id`, `unit_a_id`, `unit_b_id`, `confidence`, `description`, `status` (active|resolved|dismissed), `resolved_at`, `dismissed_at`, `detected_at`
- [ ] Create Trigger.dev job `jobs/detectTensions.ts` triggered on `unit.created` and `unit.updated` events when `unit_type = 'claim'`
- [ ] Implement incremental comparison: only compare the newly created/updated Claim against existing Claims in the Context (not all pairs)
- [ ] Build tension detection prompt in `server/ai/tensionDetectionService.ts`: given two Claim texts, determine if they are logically contradictory, return `{ isContradiction: boolean, confidence: number, description: string }`
- [ ] Use embeddings (from Story 5.1) to pre-filter candidates: only run AI comparison on Claim pairs with cosine similarity > 0.5 (semantically related but possibly contradictory) to reduce unnecessary API calls
- [ ] Insert detected tensions into `context_tensions` with status `active`
- [ ] Create tRPC query `ai.getTensionsForContext` accepting `{ contextId }` returning all active tensions with Unit previews
- [ ] Add "Contradictions" section to Context Dashboard component showing tensions list with Unit A/B previews and description
- [ ] Add tension indicator to `UnitCard`: render a red dot or tension icon when the Unit has active tensions
- [ ] On tension indicator click: open popover showing the contradicting Unit (preview + link) and AI's description
- [ ] Create tRPC mutation `ai.resolveTension` accepting `{ tensionId, resolution: "modified" | "reconciled" | "dismissed" }` that updates `status` and `resolved_at`/`dismissed_at`
- [ ] On `unit.updated`, invalidate existing tensions for that Unit and re-run detection (so dismissed tensions can be re-detected if content changed)
- [ ] Cache tension detection results in Redis per `contextId` with 10-minute TTL

## Dev Notes
- The embedding pre-filter step is critical for scalability: comparing 100 Claim pairs via AI would be extremely expensive; embeddings narrow it to the top-N semantically similar pairs
- Use `pgvector` cosine distance operator `<=>` for the pre-filter: `SELECT unit_id FROM units WHERE embedding <=> $targetEmbedding < 0.5`
- Tension job debouncing: delay 15 seconds after the triggering event to batch multiple rapid updates
- `context_tensions` needs indexes on `(context_id, status)` and `(unit_a_id, status)` and `(unit_b_id, status)`
- The incremental approach: store the last-checked timestamp per Unit in a `unit_tension_check_log` table, only compare Units modified after that timestamp

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: AI provider abstraction; Unit embeddings used for pre-filtering
- Story 5.8: Flow prediction alerts (similar background job pattern)
- Story 5.14: Tensions appear in the AI Suggestion Queue under "Alerts"
- Story 6.9: Context Dashboard displays the "Contradictions" section
