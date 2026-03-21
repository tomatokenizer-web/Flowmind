# Story 5.4: AI Type and Relation Suggestion for Units

**Status: pending**

## Description
As a user,
I want AI to suggest the type and relations for new and existing Units,
So that I can quickly categorize my thoughts and connect them to relevant existing Units.

## Acceptance Criteria

**Given** a user creates a new Unit manually (Capture Mode or direct creation)
**When** the Unit content is saved
**Then** a background Trigger.dev job analyzes the content and proposes a Unit type from the 9 base types
**And** the suggestion appears as a subtle AI suggestion card (UX-DR39) below the Unit with the proposed type and confidence score

**Given** a new Unit is created within an active Context containing other Units
**When** the AI analysis completes
**Then** the AI also proposes up to 3 relations to existing Units in the Context
**And** each proposed relation includes: target Unit (with preview), relation type, estimated strength, and a one-line rationale

**Given** the user receives type and relation suggestions
**When** the user clicks "Accept" on the type suggestion
**Then** the Unit's type is updated to the suggested type within the active Context's perspective
**And** the suggestion card is dismissed

**Given** the user receives relation suggestions
**When** the user clicks "Accept" on one relation suggestion
**Then** the relation is created with lifecycle = "pending" (not yet confirmed)
**And** the relation appears in the graph with the Pending visual style (yellow border per UX-DR3)

**Given** the user clicks "Dismiss" on a suggestion
**When** the dismissal is processed
**Then** the suggestion card disappears with a fade-out animation
**And** the dismissed suggestion is not shown again for that Unit

**Given** a Unit already has a confirmed type in the active Context
**When** AI analysis runs
**Then** only relation suggestions are generated (type suggestion is skipped)

**Given** the AI returns suggestions
**When** the safety guard checks
**Then** all suggestions carry `ai_trust_level: "inferred"` and display the "AI Inference" badge (FR30)

## Tasks
- [ ] Create Trigger.dev job `jobs/suggestTypeAndRelations.ts` that fires on `unit.created` event
- [ ] Implement `server/ai/typeSuggestionService.ts` with prompt that classifies Unit content into one of the 9 base unit types, returning `{ type, confidence }`
- [ ] Implement `server/ai/relationSuggestionService.ts` that fetches up to 20 existing Context Units and proposes up to 3 relations with `{ targetUnitId, relationType, strength, rationale }`
- [ ] Add `ai_suggestions` table (or JSONB column on units) to store pending type/relation suggestions with `unit_id`, `suggestion_type`, `payload`, `dismissed_at`
- [ ] Create tRPC query `ai.getSuggestionsForUnit` returning pending suggestions for a given Unit
- [ ] Create tRPC mutation `ai.acceptTypeSuggestion` that updates `unit_context_memberships.unit_type` and marks suggestion as used
- [ ] Create tRPC mutation `ai.acceptRelationSuggestion` that creates a relation with `lifecycle: "pending"` and marks suggestion as used
- [ ] Create tRPC mutation `ai.dismissSuggestion` that sets `dismissed_at` on the suggestion and ensures it never re-fires for that Unit
- [ ] Build `components/ai/AISuggestionCard.tsx` (UX-DR39 style) showing type badge with confidence score and Accept/Dismiss buttons
- [ ] Build `components/ai/RelationSuggestionCard.tsx` showing target Unit preview (first 50 chars), relation type, strength, and rationale
- [ ] Add `ai_trust_level: "inferred"` field to all suggestion payloads and render "AI Inference" badge on suggestion cards
- [ ] Skip type suggestion generation in the job when Unit already has a confirmed type in its Context membership
- [ ] Add fade-out animation on dismissal (Framer Motion `AnimatePresence` / CSS transition)

## Dev Notes
- The Trigger.dev job should run with a small delay (e.g., 2 seconds) after unit creation to avoid blocking the save response
- Relation suggestion requires fetching Context Units — limit to 20 most recently modified to keep prompt size manageable
- The `ai_suggestions` table needs an index on `(unit_id, dismissed_at)` for fast lookups
- `ai_trust_level` should be stored on the suggestion payload, not the Unit itself — it reflects how the suggestion was generated
- Use `generateStructured` (Story 5.1) for both type classification and relation proposals to get reliable JSON output
- The suggestion card should subscribe to real-time updates via tRPC subscriptions or polling so it appears without page refresh

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: AI provider abstraction (prerequisite)
- Story 5.14: AI Suggestion Queue aggregates these suggestions for bulk review
- Story 5.9: intervention intensity level "Minimal" suppresses relation suggestions
- Story 5.11: ai_trust_level "inferred" triggers the AI Inference badge display
