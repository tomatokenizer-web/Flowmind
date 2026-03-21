# Story 5.15: Type/Context-Aware External Knowledge Connection via AI Search

**Status: pending**

## Description
As a user,
I want the AI to search for and suggest relevant external knowledge based on my Unit's type and Context,
So that I can enrich my thinking with curated external references without leaving the application.

## Acceptance Criteria

**Given** a confirmed Unit in an active Context
**When** the user clicks "Find related knowledge" in the Unit Detail Panel
**Then** the AI formulates a search query based on the Unit's content, type, and the Context's topic/purpose
**And** a loading indicator shows while the search executes

**Given** the AI has formulated a search query
**When** search results are returned
**Then** results are displayed as a list of external sources: title, URL, snippet, relevance score
**And** results are filtered/ranked based on the Unit's type (e.g., Evidence Units get academic sources higher, Idea Units get creative/design sources higher)

**Given** the user selects a search result
**When** they click "Connect"
**Then** a new Resource Unit is created with the external source's metadata (URL, title, snippet)
**And** a "references" relation is created from the original Thought Unit to the new Resource Unit
**And** the Resource Unit has `origin_type: "external_excerpt"` and tracks the source URL

**Given** the user selects a search result
**When** they click "Save for later"
**Then** the source is saved to an "Unconnected Resources" area within the Context for later review

**Given** the Context has a specific topic (e.g., "social media effects on mental health")
**When** the AI formulates the search query
**Then** the Context topic is included as a contextual filter to improve relevance
**And** the search avoids returning sources already referenced in the Context

**Given** the external knowledge search
**When** it runs
**Then** the AI provider (Story 5.1) handles the search through its API
**And** results are cached for 24 hours to avoid redundant API calls for the same Unit

**Given** no relevant results are found
**When** the search completes with zero results
**Then** an empty state is shown: "No relevant external sources found. Try refining the Unit content or broadening the Context."

## Tasks
- [ ] Add "Find related knowledge" button to the Unit Detail Panel action bar (visible for confirmed Units only)
- [ ] Create tRPC mutation `ai.searchExternalKnowledge` accepting `{ unitId, contextId }` that calls the external knowledge service
- [ ] Implement `server/ai/externalKnowledgeService.ts` with query formulation: combine Unit content, Unit type, and Context topic into a search query string
- [ ] Add type-specific source ranking hints to the query: Evidence/Observation → academic sources; Idea/Hypothesis → patents, design sources; Claim → news, analysis sources
- [ ] Integrate with AI provider's web search capability (Anthropic's built-in search tool or an external search API like Bing/Tavily)
- [ ] Exclude URLs already referenced in the Context: before returning results, query existing Resource Units in the Context and filter out matching URLs
- [ ] Return results as `Array<{ title, url, snippet, relevanceScore, sourceType }>` sorted by `relevanceScore DESC`
- [ ] Cache search results in Redis with key `search:{unitId}:{contentHash}` and TTL of 24 hours
- [ ] Build `components/ai/ExternalKnowledgePanel.tsx`: sliding panel or modal with search result list
- [ ] Render each result: title (linked), snippet, relevance score badge, source type label, "Connect" and "Save for later" buttons
- [ ] Show loading indicator (spinner or skeleton) while search executes
- [ ] Show empty state component when zero results returned
- [ ] Implement "Connect": calls tRPC `unit.create` with `unit_type: "resource"`, `origin_type: "external_excerpt"`, `source_url`, `title`, `content = snippet`; then calls `relation.create` with `relation_type: "references"` from source Unit to new Resource Unit
- [ ] Implement "Save for later": saves to `context_unconnected_resources` table (`context_id`, `url`, `title`, `snippet`, `saved_at`) without creating a Unit
- [ ] Add "Unconnected Resources" section to Context sidebar/Dashboard showing saved-for-later sources with "Connect" action
- [ ] Write integration test for query formulation verifying Context topic is included and existing URLs are excluded

## Dev Notes
- The external search integration depends on which search API is available — use Anthropic's search tool if on Claude claude-sonnet-4-6 model; otherwise use Tavily or Bing Search API as a fallback
- Cache key should include a hash of the Unit's current content so stale cache is invalidated when the Unit is updated
- Source type classification ("academic", "news", "design", "patent") can be inferred from domain (`.edu`, `.gov`, arxiv.org, patents.google.com, etc.) — no AI call needed
- The `context_unconnected_resources` table is a lightweight staging area — it does not create Units and should not appear in normal Unit queries
- Resource Units created via "Connect" should have `lifecycle: "confirmed"` immediately since the user explicitly chose to connect them

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: AI provider abstraction handles the search call
- Story 5.4: Resource Unit creation follows the same Unit creation pattern
- Story 5.11: Resource Units with `origin_type: "external_excerpt"` count toward AI contribution ratio
