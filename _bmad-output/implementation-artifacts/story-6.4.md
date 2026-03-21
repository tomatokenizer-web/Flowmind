# Story 6.4: 4-Layer Search Index & Search View

**Status: pending**

## Description
As a user,
I want to search my thoughts across text, meaning, structure, and time,
So that I can find any thought regardless of how I remember it.

## Acceptance Criteria

**Given** Units exist with content, embeddings, types, relations, and timestamps
**When** the Search View is opened
**Then** a prominent query input is displayed at the top per UX-DR31

**Given** a search query is entered
**When** results are returned
**Then** the system supports 4-layer indexing per FR39:
- Text index — keyword-based search via full-text PostgreSQL search
- Semantic index — vector embedding similarity via pgvector `<=>` operator
- Structure index — search by Unit type, lifecycle state, Context membership, relation graph position
- Temporal index — search by creation time, modification time, relation formation order
**And** results are grouped by type (Units, Contexts, Projects) per UX-DR31
**And** the search supports natural-language queries (e.g., "things I claimed about social media") per FR43

**Given** the Search View is empty
**When** no query has been entered
**Then** an empty state displays suggestions for what to search per UX-DR37

**Given** the Command Palette is open (Cmd+K)
**When** the user types a search query
**Then** search is also accessible and returns results inline per UX-DR25

## Tasks
- [ ] Create `search` tRPC router at `src/server/routers/search.ts` with `search.query` procedure — input: `{ query: string, filters?: SearchFilters, layer?: SearchLayer[] }`, returns `SearchResults`
- [ ] Define `SearchFilters` type: `{ unitType?, lifecycle?, contextId?, dateFrom?, dateTo?, relationDepth? }`
- [ ] Define `SearchLayer` enum: `'text' | 'semantic' | 'structure' | 'temporal'`
- [ ] Implement text search in `src/server/services/searchService.ts` using PostgreSQL `to_tsvector` / `to_tsquery` on unit `content` and `title` columns
- [ ] Add GIN index on `units.content` tsvector column via migration for efficient full-text search
- [ ] Implement semantic search using pgvector: `SELECT * FROM units ORDER BY embedding <=> $queryEmbedding LIMIT 20` — requires embedding generation for the query string
- [ ] Add query embedding generation: call AI embedding endpoint (same model used in Epic 5 for unit embeddings) for the search query string
- [ ] Implement structure search: filter by `unit_type`, `lifecycle`, `context_id` (via `unit_context` join), relation count
- [ ] Implement temporal search: filter/sort by `created_at`, `updated_at`, allow relative queries ("last week", "this month")
- [ ] Implement natural-language query parsing in `searchService.ts`: detect intent keywords (e.g., "claimed", "questioned") and map to unit type filters
- [ ] Implement result merging and deduplication — combine results from multiple layers, rank by ThoughtRank (Story 6.5) + recency
- [ ] Create `SearchView` component at `src/features/search/SearchView.tsx` — full-screen search interface
- [ ] Create `SearchInput` component at `src/features/search/SearchInput.tsx` — prominent top-of-view input with debounced query (300ms)
- [ ] Create `SearchFiltersBar` component at `src/features/search/SearchFiltersBar.tsx` — layer toggles, type filter chips, date range picker
- [ ] Create `SearchResultsGroup` component at `src/features/search/SearchResultsGroup.tsx` — renders grouped results (Units, Contexts, Projects sections)
- [ ] Create `SearchResultCard` component at `src/features/search/SearchResultCard.tsx` — compact unit card with highlighted matching text
- [ ] Create `SearchEmptyState` component at `src/features/search/SearchEmptyState.tsx` — suggestions list per UX-DR37
- [ ] Integrate search into Command Palette (modify existing Command Palette component) — route queries to `search.query` and display inline results
- [ ] Add Search View route at `/search` or as a panel accessible from sidebar
- [ ] Add keyboard shortcut Cmd+Shift+F to open Search View (Cmd+K opens Command Palette)
- [ ] Add ARIA live region on results count: "N results found" announced on query change per UX-DR55
- [ ] Write unit tests for each search layer in `searchService.ts`
- [ ] Write integration tests for combined multi-layer result merging

## Dev Notes
- Key files to create: `src/server/routers/search.ts`, `src/server/services/searchService.ts`, `src/features/search/SearchView.tsx`, `src/features/search/SearchInput.tsx`, `src/features/search/SearchFiltersBar.tsx`, `src/features/search/SearchResultsGroup.tsx`, `src/features/search/SearchResultCard.tsx`, `src/features/search/SearchEmptyState.tsx`
- Key files to modify: `src/server/db/schema.ts` (GIN index), `src/server/routers/index.ts` (register search router), Command Palette component
- Dependencies: Epic 1 (Unit model, content, type, lifecycle), Epic 2 (unit embeddings from AI), Epic 3 (Context membership), Epic 4 (relations), Story 6.5 (ThoughtRank for ranking — can stub initially)
- Technical approach: Run all enabled search layers in parallel (Promise.all), then merge results using a weighted score: textScore * 0.4 + semanticScore * 0.4 + thoughtRank * 0.2. Deduplicate by unit ID, keep highest composite score. Natural-language intent parsing uses a simple keyword map first (e.g., "claimed" → unitType: 'claim'); LLM-based parsing is a future enhancement. pgvector `<=>` (cosine distance) requires the `pgvector` extension already enabled in Epic 2.

## References
- Epic 6: Navigation, Search & Discovery
- FR39: 4-layer search indexing
- FR43: Natural-language search queries
- UX-DR25: Command Palette (Cmd+K)
- UX-DR31: Search View layout
- UX-DR37: Empty state with suggestions
- Related: Story 6.5 (ThoughtRank for search ranking), Epic 2 (vector embeddings), Epic 3 (Context membership)
