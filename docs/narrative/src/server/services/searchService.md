# Search Service (Multi-Layer Unit Discovery)

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/services/searchService.ts`
> **Status**: Active

---

## Context & Purpose

This module implements Flowmind's **multi-dimensional search system**, enabling users to find units across three complementary discovery axes: text content, structural properties, and temporal position. Rather than forcing users into a single search paradigm, the service allows layering multiple filters simultaneously to surface precisely the thoughts they need.

**Business Need**: As knowledge bases grow, finding the right thought becomes increasingly difficult. A simple text search might return hundreds of matches, but what the user actually needs is "that claim I wrote last week about distributed systems that has lots of supporting evidence." This service enables such compound queries by combining text matching with structural awareness (unit type, lifecycle, connection density) and temporal context (when created, recency).

**When Used**:
- **Global search**: When users invoke the search bar to find units across their project
- **Filtered exploration**: When users want to find all "questions" created this month with no connections yet (orphaned thoughts)
- **Context-scoped search**: When users search within a specific context rather than the entire project
- **Ranked results**: When the system needs to present the most relevant results first, scored by match quality

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `@prisma/client` (PrismaClient, UnitType, Lifecycle, Prisma): Database client and types for querying units. The service uses both Prisma's query builder for structural/temporal filters and raw SQL for text matching with PostgreSQL's ILIKE operator.

### Dependents (What Needs This)

- `src/server/api/routers/search.ts`: The tRPC router that exposes the search service as a protected API endpoint. It constructs filter objects from user input and delegates to `service.search()`.

- **Future consumers** (planned):
  - Command palette components for quick unit lookup
  - Graph visualization for highlighting search matches
  - AI context gathering when selecting relevant units for prompts

### Data Flow

**Multi-Layer Search Flow**:
```
User enters query + selects filters
    |
    v
tRPC router validates input (max 500 chars, valid UUIDs)
    |
    v
searchService.search() invoked with query, options, filters
    |
    v
Build base WHERE clause (projectId, optional contextId)
    |
    +------+------+------+
    |      |      |      |
    v      v      v      |
[TEXT]  [STRUCT] [TEMP]  | (layers execute in parallel conceptually)
    |      |      |      |
    +------+------+------+
           |
           v
Merge results by unitId (keep highest score, combine highlights)
    |
    v
Sort by score descending, apply limit
    |
    v
Return SearchResult[] to client
```

**Text Layer Flow**:
```
Query string received
    |
    v
Escape SQL wildcards (% → \%, _ → \_)
    |
    v
Execute raw PostgreSQL query with ILIKE
    |
    v
Fetch relation counts for matched units
    |
    v
Calculate text match score (0-1) per result
    |
    v
Extract up to 3 highlight snippets with context
```

**Structural Layer Flow**:
```
Apply base where + unitType/lifecycle filters
    |
    v
Include relation counts via Prisma _count
    |
    v
Post-filter by min/max relation count
    |
    v
Calculate structural score based on connectivity
```

**Temporal Layer Flow**:
```
Apply base where + date range filters
    |
    v
Sort by createdAt (asc or desc)
    |
    v
Calculate temporal score (recency decay over 7 days)
```

---

## Macroscale: System Integration

### Architectural Layer

This module operates at the **Service Layer** of Flowmind's server architecture:

- **Layer 4: Client** (React search components, command palette)
- **Layer 3: API Routes** (searchRouter exposes search endpoint)
- **Layer 2: Services** -- **You are here** (searchService orchestrates layers)
- **Layer 1: Infrastructure** (Prisma ORM, PostgreSQL)
- **Layer 0: Database** (Unit table with indexes on unitType, lifecycle, createdAt)

The service implements the **Strategy Pattern** through its layer system -- each search layer (text, structural, temporal) is a distinct strategy for finding units, and users can combine strategies as needed.

### Big Picture Impact

This module is the **discovery engine** of Flowmind. It enables:

- **Information retrieval**: Users can locate thoughts they remember vaguely ("something about API design")
- **Knowledge archaeology**: Finding old ideas by time period ("what was I thinking about in January?")
- **Structural analysis**: Discovering orphaned units (low relation count) or hub units (high relation count)
- **Scoped exploration**: Searching within a context preserves focus while still finding relevant thoughts

Without this module:
- Users would scroll through lists manually to find units
- No way to combine multiple filter dimensions
- No relevance ranking -- results would be unsorted
- Discovery friction would increase as knowledge bases grow

### Critical Path Analysis

**Importance Level**: High (for usability at scale)

As Flowmind knowledge bases grow beyond a few dozen units, manual browsing becomes impractical. The search service is the primary means of navigating large collections.

**Failure modes**:
- If text search fails: Fallback to structural/temporal filtering still works
- If database unavailable: Entire search fails (critical dependency)
- If slow queries: UX degradation but not data loss

**Performance considerations**:
- Text layer uses raw SQL for efficient ILIKE matching
- Results are limited (default 50) to prevent memory issues
- Relation counts require a secondary query for text layer (could be optimized)

**Blast radius**: Moderate. Search is not required for CRUD operations, but significantly impacts discoverability. Users can still navigate via context views and graph visualization if search is unavailable.

---

## Technical Concepts (Plain English)

### Multi-Layer Search
**Technical**: A search architecture where independent query strategies (text, structural, temporal) execute separately and their results are merged with deduplication and score-based ranking.

**Plain English**: Like having three different librarians help you find a book -- one searches by title keywords, another by genre and shelf location, and a third by when the book was added. Each returns candidates, and you get the combined list with duplicates removed and the most relevant books at the top.

**Why We Use It**: Different users search differently. Some remember what they wrote (text), others remember when (temporal), others remember the type (structural). Multi-layer lets all approaches work together.

### PostgreSQL ILIKE
**Technical**: PostgreSQL's case-insensitive LIKE operator, which matches patterns anywhere in text without requiring exact case.

**Plain English**: Search that ignores uppercase/lowercase differences. Searching "API" finds "api", "Api", and "API" equally. The "I" stands for "insensitive."

**Why We Use It**: Users should not need to remember exact capitalization of their thoughts. "React hooks" and "react Hooks" should find the same results.

### Result Deduplication with Score-Based Merging
**Technical**: When multiple layers return the same unit, `mergeResult()` keeps the instance with the highest score while combining highlights from all matches.

**Plain English**: If a unit matches both your text query AND your date filter, it appears once in results (not twice) with the best score. But you see highlights from both matches combined.

**Why We Use It**: Prevents result flooding with duplicates while preserving all the reasons a unit matched.

### Text Match Scoring (0-1 Scale)
**Technical**: A scoring algorithm that assigns 1.0 for exact matches, 0.9 for start-of-content matches, 0.8 for word-boundary matches, and 0.3-0.7 for substring matches based on coverage ratio.

**Plain English**: How closely does your search match the content? Finding exactly what you searched for scores highest. Finding it at the start of the text scores high. Finding it as a complete word (not inside another word) scores medium-high. Finding it buried somewhere scores lower.

**Why We Use It**: Users expect "machine learning" to rank higher when the entire unit is "machine learning" versus when it is mentioned once in a 500-word essay.

### Structural Score Based on Connectivity
**Technical**: Units with more relations score higher (up to 10 relations for maximum bonus), with additional bonus for matching specific unitType/lifecycle filters.

**Plain English**: Well-connected thoughts are often more important -- they are hubs in your knowledge graph. When searching structurally, units with many links rise to the top.

**Why We Use It**: Connectivity often indicates importance. A claim supported by 5 pieces of evidence is likely more significant than an orphaned observation.

### Temporal Score with Exponential Decay
**Technical**: `score = 0.3 + exp(-ageHours / (24 * 7)) * 0.7` -- recent units score near 1.0, scores decay to ~0.3 over 7 days, then asymptotically approach 0.3.

**Plain English**: Newer thoughts score higher than older ones, but the advantage decays over about a week. A thought from yesterday is slightly more relevant than one from last week, but thoughts from months ago have similar (lower) scores.

**Why We Use It**: Recency often indicates relevance -- you are more likely searching for something you worked on recently. But older thoughts should not disappear; they just rank lower.

### Highlight Extraction with Context
**Technical**: For each match, extract up to 3 snippets showing 40 characters before and after the match, with "..." ellipsis for truncation.

**Plain English**: Instead of just saying "this unit matched," show the user the actual matching text with surrounding context so they can quickly judge relevance without opening each result.

**Why We Use It**: Enables rapid scanning of search results. Users can often identify the right unit from the highlight alone.

### Union-Find for Relation Counting
**Technical**: The service fetches `_count.outgoingRelations + _count.incomingRelations` from Prisma to determine each unit's total connection count.

**Plain English**: Count how many arrows point to and from this thought in the knowledge graph. More arrows means a more connected, often more central idea.

**Why We Use It**: Enables structural filtering (find lonely thoughts, find hub thoughts) and contributes to structural relevance scoring.

---

## Implementation Notes

### Factory Function Design
`createSearchService(db)` returns an object with the `search` method. This functional approach:
- Enables dependency injection of the Prisma client
- Facilitates testing with mock databases
- Keeps internal helpers private (not exported)

### Raw SQL for Text Search
The text layer uses `db.$queryRaw` with ILIKE for case-insensitive matching. This is more efficient than Prisma's `contains` with `mode: 'insensitive'` for the specific highlight-extraction use case, and allows direct control over the SQL pattern.

### Wildcard Escaping
`searchPattern` escapes `%` and `_` characters that have special meaning in SQL LIKE patterns. Otherwise, a user searching for "100%" would match everything (since `%` means "any characters").

### Limit Applied at Database and Application Layer
Each layer applies `LIMIT` at the database level for efficiency, then the final merged result set is limited again. This prevents fetching thousands of records from each layer.

### Context Filtering via Join
When `contextId` is provided, the `unitContexts.some({ contextId })` clause filters to units that belong to that specific context. This enables scoped search within a single context.

---

## Exported Types

### SearchLayer
```typescript
type SearchLayer = "text" | "structural" | "temporal"
```
The three discovery dimensions supported by the service.

### SearchOptions
| Field | Type | Description |
|-------|------|-------------|
| contextId | string (optional) | Limit search to a specific context |
| projectId | string | Required project scope |
| layers | SearchLayer[] | Which search strategies to apply |
| limit | number | Maximum results (default 50) |

### SearchResult
| Field | Type | Description |
|-------|------|-------------|
| unitId | string | Unique identifier of the matched unit |
| content | string | Full content of the unit |
| unitType | UnitType | Cognitive classification (claim, question, etc.) |
| lifecycle | Lifecycle | Current status (draft, confirmed, etc.) |
| score | number | Relevance score 0-1 for ranking |
| matchLayer | SearchLayer | Which layer produced the best match |
| highlights | string[] | Up to 3 context snippets showing matches |
| createdAt | Date | When the unit was created |
| relationCount | number | Total incoming + outgoing relations |

### StructuralFilters
| Field | Type | Description |
|-------|------|-------------|
| unitTypes | UnitType[] (optional) | Filter to specific cognitive types |
| lifecycles | Lifecycle[] (optional) | Filter to specific statuses |
| minRelationCount | number (optional) | Minimum connections required |
| maxRelationCount | number (optional) | Maximum connections allowed |

### TemporalFilters
| Field | Type | Description |
|-------|------|-------------|
| createdAfter | Date (optional) | Only units created after this date |
| createdBefore | Date (optional) | Only units created before this date |
| sortOrder | "asc" \| "desc" (optional) | Sort direction for temporal results |

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created multi-layer search service with text, structural, and temporal discovery strategies
- **Why**: Epic 6 requires robust search capabilities for navigating growing knowledge bases
- **Impact**: Enables compound queries combining keywords, unit properties, and time ranges with relevance-ranked results
