# ThoughtRank Service (PageRank-Inspired Importance Scoring)

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/services/thoughtRankService.ts`
> **Status**: Active

---

## Context & Purpose

This module implements **ThoughtRank**, a PageRank-inspired algorithm that computes importance scores for units (thoughts) in the Flowmind knowledge graph. Just as Google's PageRank determines which web pages are most important based on how other pages link to them, ThoughtRank determines which thoughts are most central based on how they connect to other thoughts.

**Business Need**: Not all thoughts are equally important. Some are foundational claims that support many other ideas; others are peripheral observations. Users need a way to quickly identify which thoughts deserve attention, especially in large knowledge bases. Rather than forcing users to manually tag importance, ThoughtRank infers it automatically from the connection structure.

**When Used**:
- **Manual recomputation**: When a user explicitly requests ThoughtRank recalculation via the API
- **After significant graph changes**: After merging units, adding many relations, or restructuring contexts
- **Periodic background jobs**: For maintaining up-to-date importance scores across projects
- **Sorting and filtering**: When users sort units by "importance" in the unit list

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `@prisma/client` (PrismaClient): Database client for fetching units and relations, and for persisting computed importance scores back to the `units` table.

### Dependents (What Needs This)

- `src/server/api/routers/context.ts`: The `recomputeThoughtRank` mutation exposes this service as a protected API endpoint, allowing clients to trigger importance recalculation for a specific context.

- `src/server/api/routers/unit.ts`: The `list` query allows sorting by `importance`, relying on the pre-computed scores that this service maintains in the database.

- **Future consumers** (anticipated):
  - AI context selection: Choosing the most important units to include in prompts
  - Graph visualization: Node sizing based on importance
  - Dashboard analytics: Identifying central themes in a knowledge base

### Data Flow

**ThoughtRank Computation Flow**:
```
Trigger (API call or scheduled job)
    |
    v
Fetch all units in scope (context or project)
    |
    v
Fetch all relations between those units (source, target, strength)
    |
    v
Build adjacency lists (outgoing edges, incoming edges)
    |
    v
Initialize ranks: each unit gets 1/N (equal starting importance)
    |
    v
Iterate 20 times:
    |
    +---> For each unit, sum weighted incoming contributions
    |     (source's rank * edge weight / source's total outgoing weight)
    |
    +---> Apply damping: new_rank = teleport + 0.85 * incoming_sum
    |
    v
Normalize final ranks to 0-1 range (min-max scaling)
    |
    v
Batch update Unit.importance in database
```

**Context-Level Update Flow**:
```
contextId received
    |
    v
Query UnitContext table to find all unitIds in context
    |
    v
Query Relation table for relations where both endpoints are in scope
    |
    v
Pass units and relations to computeThoughtRank()
    |
    v
Update each Unit.importance with computed score
```

**Project-Level Update Flow**:
```
projectId received
    |
    v
Query Unit table directly for all units in project
    |
    v
Query Relation table for internal relations
    |
    v
Pass units and relations to computeThoughtRank()
    |
    v
Update each Unit.importance with computed score
```

---

## Macroscale: System Integration

### Architectural Layer

This module operates at the **Service Layer** of Flowmind's server architecture:

- **Layer 4: Client** (React components displaying importance, sorting controls)
- **Layer 3: API Routes** (contextRouter.recomputeThoughtRank endpoint)
- **Layer 2: Services** -- **You are here** (thoughtRankService computes graph-based importance)
- **Layer 1: Infrastructure** (Prisma ORM, PostgreSQL)
- **Layer 0: Database** (Unit.importance field, Relation table with strength weights)

The service implements a **Graph Algorithm Pattern** -- it treats the knowledge base as a directed weighted graph and applies iterative numerical methods to derive meaningful scores.

### Big Picture Impact

This module is the **importance inference engine** of Flowmind. It enables:

- **Automatic importance ranking**: No manual tagging required; importance emerges from structure
- **Hub discovery**: Identifying foundational thoughts that many others depend on
- **Quality signals**: Thoughts with high importance but low evidence might need attention
- **Smart prioritization**: AI features can focus on the most structurally important units
- **User orientation**: Newcomers to a context can start with the highest-importance units

Without this module:
- Users would have to manually rate importance for every thought
- No way to identify structurally central ideas automatically
- Sorting by "importance" would be impossible
- AI context selection would lack structural awareness

### Critical Path Analysis

**Importance Level**: Medium-High (for large knowledge bases)

ThoughtRank becomes increasingly valuable as knowledge bases grow. For small graphs (under 20 units), importance is often obvious. For large graphs (hundreds of units), automatic importance ranking is essential for navigation.

**Failure modes**:
- If the algorithm fails: Importance scores remain stale (last computed values persist)
- If database update fails: Partial updates possible (individual unit updates are independent)
- If computation is slow: No immediate UX impact (computation happens asynchronously)

**Performance considerations**:
- Algorithm is O(iterations * edges), which is O(20 * E) -- linear in relation count
- Database updates are parallelized via `Promise.all`
- For very large graphs (10,000+ units), might need batching or incremental updates

**Blast radius**: Low. ThoughtRank is a computed metric, not a core data structure. If it fails, users lose sorting/filtering by importance but all other functionality remains intact.

---

## Technical Concepts (Plain English)

### PageRank Algorithm
**Technical**: An iterative algorithm that assigns importance scores to nodes in a graph based on the link structure. A node's importance is determined by the number and importance of nodes that link to it.

**Plain English**: Imagine a voting system where every thought can "vote" for the thoughts it connects to. But votes from important thoughts count more than votes from unimportant ones. After running this voting process many times, thoughts that receive lots of votes from other important thoughts end up with high scores.

**Why We Use It**: PageRank elegantly captures the intuition that importance is transitive -- if many important ideas depend on a single thought, that thought is likely foundational.

### Damping Factor (0.85)
**Technical**: A probability parameter that controls how much of a node's rank comes from incoming links versus a baseline "teleport" probability. Standard value is 0.85.

**Plain English**: Imagine a reader randomly clicking through your knowledge graph. 85% of the time they follow a link to a connected thought. 15% of the time they "teleport" to a random thought. This prevents any single chain of links from dominating importance scores.

**Why We Use It**: Without damping, disconnected clusters would have zero importance. The teleport probability ensures every thought has at least some baseline importance, even if poorly connected.

### Weighted Relations (Strength)
**Technical**: Each relation has a `strength` value (0-1) that weights its contribution to importance propagation. Higher-strength relations transfer more rank.

**Plain English**: Not all connections are equal. A strong "supports" relation (strength 0.9) should count more than a weak "maybe related" link (strength 0.3). ThoughtRank respects these weights when distributing importance.

**Why We Use It**: Enables users to express confidence in connections. Strong relations have more influence on what ends up being "important."

### Iteration Count (20)
**Technical**: The algorithm runs 20 iterations before returning final scores. PageRank typically converges within 10-50 iterations depending on graph structure.

**Plain English**: Each iteration refines the importance scores, letting them "settle" toward stable values. Twenty passes is usually enough for the scores to stop changing significantly.

**Why We Use It**: More iterations means more accurate scores but slower computation. 20 is a practical balance for knowledge graphs of typical size.

### Min-Max Normalization
**Technical**: After PageRank completes, raw scores are scaled to 0-1 range using `(value - min) / (max - min)`.

**Plain English**: PageRank produces raw scores that depend on graph size. Normalizing ensures the most important thought always scores 1.0 and the least important scores 0.0, regardless of how many thoughts exist.

**Why We Use It**: Consistent 0-1 range makes importance scores interpretable and comparable across different contexts or projects.

### Teleport Probability
**Technical**: `(1 - dampingFactor) / N` -- the baseline probability of landing on any given node via random teleportation.

**Plain English**: Every thought gets a small "base vote" just for existing. This equals 15% of the total probability divided equally among all thoughts.

**Why We Use It**: Prevents "rank sinks" where disconnected or poorly connected thoughts would otherwise have zero importance.

### Adjacency Lists
**Technical**: Data structures mapping each node to its outgoing and incoming edges, enabling efficient traversal during iteration.

**Plain English**: A lookup table for each thought: "which thoughts does this one connect to?" and "which thoughts connect to this one?" Building these upfront makes the algorithm much faster than searching through all relations every iteration.

**Why We Use It**: Graph algorithms need fast neighbor lookups. Adjacency lists provide O(1) access to a node's connections.

---

## Implementation Notes

### Factory Function Design
`createThoughtRankService(db)` returns an object with three methods. This functional approach:
- Enables dependency injection of the Prisma client
- Facilitates testing with mock databases
- Exposes a clean API: `computeThoughtRank` (pure function), `updateThoughtRankForContext`, `updateThoughtRankForProject` (side-effecting)

### Pure vs. Side-Effecting Functions
- `computeThoughtRank(units, relations)` is a **pure function** -- given the same inputs, it always returns the same scores. No database access.
- `updateThoughtRankForContext` and `updateThoughtRankForProject` are **side-effecting** -- they read from and write to the database.

This separation enables testing the algorithm logic independently of database operations.

### Parallel Database Updates
```typescript
await Promise.all(updatePromises);
```
Each unit's importance update is independent, so they execute in parallel. For large graphs, this significantly reduces total update time compared to sequential updates.

### Scope Filtering
- **Context scope**: Joins through `UnitContext` to find units belonging to a specific context
- **Project scope**: Queries `Unit` table directly with `projectId` filter

The algorithm only considers relations where **both endpoints** are in scope, ensuring importance scores reflect the subgraph being analyzed.

### Edge Case: Empty Graphs
If `units.length === 0`, the function returns an empty `Map<string, number>` immediately, avoiding division-by-zero errors in initialization.

### Edge Case: Equal Ranks
If all units end up with the same rank (no differentiation), normalization would cause division by zero. The code detects this (`range === 0`) and assigns all units a neutral 0.5 importance instead.

---

## Exported Types

### UnitNode
```typescript
interface UnitNode {
  id: string;
}
```
Minimal representation of a unit for ThoughtRank computation. Only the ID is needed; content is irrelevant for graph analysis.

### RelationEdge
```typescript
interface RelationEdge {
  sourceUnitId: string;
  targetUnitId: string;
  strength: number;
}
```
Edge in the knowledge graph with weighted strength (0-1).

---

## API Exposure

### tRPC Endpoint
**Route**: `context.recomputeThoughtRank`
**Input**: `{ id: string }` (context UUID)
**Output**: `{ success: true }`
**Access**: Protected (requires authentication)

This mutation recalculates importance scores for all units in the specified context and persists them to the database.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created ThoughtRank service with PageRank-based importance computation
- **Why**: Epic 6 requires importance-based sorting and AI context selection
- **Impact**: Enables automatic importance inference from graph structure, supporting sorting by importance in unit lists and future AI features

