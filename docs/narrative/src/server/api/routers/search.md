# Search Router

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/api/routers/search.ts`
> **Status**: Active

---

## Context & Purpose

This module provides the API endpoint for multi-layer search across thinking units in FlowMind. It exists because users need to find specific thoughts, ideas, and connections within their growing knowledge base using different search strategies.

**Business Need**: As users accumulate hundreds or thousands of thinking units, locating specific content becomes critical. Unlike simple keyword search, FlowMind's search understands three dimensions of knowledge: what something says (text), how it connects (structural), and when it was created (temporal).

**When Used**:
- When a user types into the search bar looking for specific content
- When filtering units by type (e.g., "show only questions")
- When exploring recently created content
- When finding well-connected hub units in the knowledge graph

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/server/api/trpc.ts`: `createTRPCRouter`, `protectedProcedure` - Provides the tRPC infrastructure for type-safe API definitions and authentication enforcement
- `src/server/services/searchService.ts`: `createSearchService`, `SearchLayer` - The actual search implementation that queries the database across multiple dimensions
- `zod`: Schema validation library - Ensures all incoming search parameters are valid before processing

### Dependents (What Needs This)

**Note**: Currently this router is imported in `src/server/api/root.ts` but not yet wired into the `appRouter`. This appears to be a newly added feature awaiting integration.

Future consumers will include:
- Search UI components calling `api.search.query.useQuery()`
- Context dashboard for finding related units
- Navigator components for exploring the knowledge graph

### Data Flow

```
User enters search terms + filters
       |
       v
Frontend calls api.search.query({ query, projectId, layers, filters })
       |
       v
[search.ts Router] - Validates input via Zod schemas
       |
       v
[searchService] - Executes parallel searches across selected layers
       |
       +-- Text Layer: PostgreSQL ILIKE for content matching
       +-- Structural Layer: Filter by unit type, lifecycle, relation count
       +-- Temporal Layer: Date range filtering with recency scoring
       |
       v
Results merged, deduplicated, scored, and sorted
       |
       v
SearchResult[] returned to frontend
```

---

## Macroscale: System Integration

### Architectural Layer

This router sits in the **API Layer** of FlowMind's three-tier architecture:

- **Layer 1**: Client (search UI, filters, result display)
- **Layer 2**: This router (request validation, service orchestration)
- **Layer 3**: searchService + Prisma + PostgreSQL (data retrieval and scoring)

### Big Picture Impact

The search system is a **discovery enabler** that makes the entire knowledge graph navigable. Without it, users would have to manually browse through contexts and scroll through lists to find anything.

**Enables:**
- Rapid content discovery across the entire knowledge base
- Structural exploration (finding well-connected "hub" units)
- Temporal navigation (what was I thinking about last week?)
- Filtered views (show only questions, only draft items, etc.)

### Critical Path Analysis

**Importance Level**: High (for usability), Medium (for core functionality)

- **If this fails**: Users lose search capability but can still browse contexts manually. The system degrades gracefully rather than breaking completely.
- **Performance sensitivity**: Search latency directly impacts user experience. The three-layer architecture allows selective layer activation to balance thoroughness vs. speed.
- **Scaling consideration**: As unit count grows, text search via ILIKE becomes expensive. Future optimization may require PostgreSQL full-text search or external indexing.

---

## Technical Concepts (Plain English)

### Multi-Layer Search

**Technical**: A search architecture that queries the same dataset through multiple orthogonal dimensions simultaneously, merging results by highest relevance score.

**Plain English**: Instead of just searching "what did I write," FlowMind searches three ways at once: by content (what the words say), by structure (how things connect), and by time (when things were created). The best matches from any dimension bubble up to the top.

**Why We Use It**: Different mental tasks need different search strategies. Looking for a specific phrase? Text search. Finding influential ideas? Structural search. Recalling recent thoughts? Temporal search.

### SearchLayer Enum

**Technical**: A discriminated union type (`"text" | "structural" | "temporal"`) that selects which search dimensions to activate.

**Plain English**: A switch that lets users choose which search "lens" to use. They can enable one, two, or all three depending on what they're looking for.

**Why We Use It**: Flexibility without complexity. Users can get fast results with just text search, or enable all layers for thorough exploration.

### Structural Filters

**Technical**: Query parameters that filter units by `unitType`, `lifecycle`, and relation count ranges.

**Plain English**: Like saying "show me only questions that are still drafts and have at least 3 connections to other ideas." It's searching by the shape of the knowledge, not the content.

**Why We Use It**: The structure of thinking matters. A claim with 10 supporting evidence links is different from an isolated claim, even if they say similar things.

### Score Merging

**Technical**: When the same unit appears in multiple layer results, the system keeps the highest score and merges highlights from all matching layers.

**Plain English**: If a unit is found by both text search (because the words match) and structural search (because it's well-connected), it gets credit for both rather than appearing twice.

**Why We Use It**: Deduplication with intelligence. Units that match multiple criteria should rank higher, not just appear multiple times.

### Protected Procedure

**Technical**: A tRPC procedure wrapped with authentication middleware that ensures only logged-in users can execute the query.

**Plain English**: A security checkpoint that says "you must be logged in to search." This prevents unauthorized access to private knowledge bases.

**Why We Use It**: User data privacy. Each user's thinking units are private to their projects.

---

## Input Schema Details

The router accepts a single `search.query` procedure with the following parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string (max 500) | Yes | The search text to match |
| `projectId` | UUID string | Yes | Which project to search within |
| `contextId` | UUID string | No | Optionally limit to a specific context |
| `layers` | Array of SearchLayer | No (default: ["text"]) | Which search dimensions to activate |
| `limit` | number (1-100) | No (default: 50) | Maximum results to return |
| `unitTypes` | Array of UnitType | No | Filter to specific unit types |
| `lifecycles` | Array of Lifecycle | No | Filter to specific lifecycle states |
| `minRelationCount` | number | No | Minimum connections required |
| `maxRelationCount` | number | No | Maximum connections allowed |
| `createdAfter` | Date | No | Only units created after this date |
| `createdBefore` | Date | No | Only units created before this date |
| `sortOrder` | "asc" or "desc" | No | Temporal sort direction |

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created search router with multi-layer search capability
- **Why**: Epic 6 requirement for comprehensive search functionality
- **Impact**: Enables content discovery across the knowledge graph; awaiting integration into appRouter
