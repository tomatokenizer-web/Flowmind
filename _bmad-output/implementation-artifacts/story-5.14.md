# Story 5.14: AI Suggestion Queue with Pending Review and Bulk Actions

**Status: pending**

## Description
As a user,
I want a centralized queue of all pending AI suggestions with bulk accept/reject,
So that I can efficiently manage AI proposals without hunting through individual Units.

## Acceptance Criteria

**Given** multiple AI suggestions exist across the active Context (type proposals, relation proposals, refinement proposals, tension alerts)
**When** the sidebar renders
**Then** a badge shows the count of pending suggestions (e.g., "AI: 7")

**Given** the user clicks the AI suggestion badge
**When** the suggestion queue panel opens
**Then** all pending suggestions are listed, grouped by type: "Type Suggestions", "Relation Suggestions", "Refinement Suggestions", "Alerts"
**And** each item shows: the affected Unit preview (first 50 chars), the suggestion detail, and AI reasoning

**Given** the suggestion queue is open
**When** the user clicks "Accept" on an individual suggestion
**Then** the suggestion is applied (type set, relation created, refinement accepted) and removed from the queue
**And** the badge count decrements

**Given** the suggestion queue is open
**When** the user clicks "Reject" on an individual suggestion
**Then** the suggestion is discarded and removed from the queue
**And** the badge count decrements

**Given** the suggestion queue has 5+ items of the same type
**When** the user clicks "Accept All [Type Suggestions]"
**Then** all suggestions in that group are applied at once
**And** a toast confirms "Accepted N type suggestions"
**And** an undo option is available for 4 seconds (UX-DR35)

**Given** the suggestion queue has items
**When** the user clicks "Reject All"
**Then** a confirmation dialog asks "Dismiss all N suggestions? This cannot be undone."
**And** confirmed dismissal clears the queue

**Given** the suggestion queue panel
**When** it renders
**Then** suggestions are sorted by: relevance to current navigation purpose first, then by creation time (newest first)
**And** each suggestion's AI reasoning is expandable (collapsed by default)

## Tasks
- [ ] Create tRPC query `ai.getSuggestionQueue` accepting `{ contextId }` that aggregates all pending suggestions: type suggestions from `ai_suggestions`, relation suggestions, flow alerts from `unit_flow_alerts`, tension alerts from `context_tensions`
- [ ] Return grouped response: `{ typeSuggestions, relationSuggestions, refinementSuggestions, alerts }` each as arrays with `{ id, unitId, unitPreview, detail, reasoning, createdAt }`
- [ ] Add suggestion count badge to the sidebar: subscribe to `ai.getSuggestionQueue` count and display "AI: N" badge
- [ ] Build `components/ai/SuggestionQueuePanel.tsx` side panel with four grouped sections
- [ ] Render each suggestion item: Unit preview (first 50 chars truncated), suggestion detail, collapsible AI reasoning (collapsed by default)
- [ ] Per-item Accept button: routes to the correct acceptance mutation based on suggestion type (calls existing Story 5.4/5.6/5.8/5.12 mutations) then removes from queue
- [ ] Per-item Reject button: calls `ai.dismissSuggestion` with the suggestion ID and type, removes from queue
- [ ] "Accept All" button per group: shown when group has 5+ items; calls bulk acceptance mutation, shows toast "Accepted N [type] suggestions"
- [ ] Implement 4-second undo for bulk accept: store accepted suggestion IDs, undo mutation reverses the batch operation within the window
- [ ] "Reject All" button: show confirmation dialog "Dismiss all N suggestions? This cannot be undone."; on confirm, call bulk dismiss mutation
- [ ] Sort suggestions: primary sort by relevance score (if current Unit is selected, suggestions related to it rank first), secondary sort by `created_at DESC`
- [ ] Expandable reasoning: render AI reasoning in a collapsible section (`<details>` element or Radix `Collapsible`) defaulting to collapsed
- [ ] Keep badge count in real-time sync: use tRPC subscription or polling (every 10s) on the suggestion count

## Dev Notes
- The suggestion queue aggregation query should be a single tRPC call that JOINs across multiple tables — avoid N separate queries from the frontend
- Bulk accept/reject should use DB transactions to ensure atomicity — if any individual acceptance fails, the whole batch rolls back (or the failed items are reported)
- Suggestion relevance scoring: if `activeUnitId` is set in the navigation store, boost suggestions for that Unit ID by sorting them first
- The undo mechanism for bulk accept: store the list of applied suggestion IDs in Redis with a 5-second TTL, provide an undo endpoint that reverses each one
- Badge count should update optimistically when individual items are accepted/rejected from the queue panel

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.4: Type and relation suggestions sourced into this queue
- Story 5.6: Refinement proposals sourced into this queue
- Story 5.8: Flow prediction alerts appear in the "Alerts" group
- Story 5.12: Tension alerts appear in the "Alerts" group
