# Story 10.1: Context Export REST API

**Status: pending**

## Description
As a developer or power user,
I want a REST API endpoint that exports a Context's Unit structure in multiple formats,
So that I can integrate my Flowmind knowledge with external AI tools and workflows.

## Acceptance Criteria

**Given** the architecture specifies a REST endpoint at `GET /api/context/{contextId}/export`
**When** the endpoint is called with valid authentication
**Then** it returns the Context's Unit structure in the requested format per FR34:
  `prompt_package` — structured AI prompt format with background, claims, evidence, open questions
  `json` — full Unit graph with relations, types, metadata
  `markdown` — human-readable markdown with Units organized by type and relation
**And** query parameters support: `format` (required), `depth` (relation traversal depth, default 2), `types` (Unit type filter, comma-separated), `status` (lifecycle filter: draft, pending, confirmed) per FR34
**And** authentication uses API key in `Authorization: Bearer {key}` header
**And** API keys are manageable from user settings (create, revoke, list)
**And** rate limiting is enforced on the endpoint
**And** the API is format-agnostic and AI-model-agnostic per NFR19

## Tasks
- [ ] Define `ApiKey` Prisma model: `id`, `user_id`, `name`, `key_hash` (hashed for storage), `key_prefix` (first 8 chars for display), `scopes` (Json array: read, write), `last_used_at`, `created_at`, `revoked_at`
- [ ] Create `server/repositories/apiKeyRepository.ts` — CRUD, `findByHash`, `updateLastUsed`
- [ ] Create `server/services/apiKeyService.ts` — `generate()`: creates cryptographically random key, stores hash; `validate(key)`: hash lookup; `revoke(id)`
- [ ] Add tRPC procedures: `apiKey.create`, `apiKey.list`, `apiKey.revoke` (accessible from user settings)
- [ ] Create Next.js API route `app/api/context/[contextId]/export/route.ts` — handles GET requests
- [ ] Implement API key auth middleware for the export route (extract Bearer token, hash it, look up in DB)
- [ ] Implement rate limiting on the export route (use `@upstash/ratelimit` with Redis or in-memory store; limit: 60 requests/minute per API key)
- [ ] Create `server/services/exportService.ts` — `exportContext(contextId, options)`: fetches Units with relation traversal up to `depth`, filters by `types` and `status`, formats output
- [ ] Implement `prompt_package` formatter: structured text with sections: `# Background`, `## Key Claims`, `## Supporting Evidence`, `## Constraints`, `## Open Questions`
- [ ] Implement `json` formatter: full Unit graph `{ units: Unit[], relations: Relation[], context: Context }`
- [ ] Implement `markdown` formatter: grouped by unit_type with headers, relation links shown as `→ related: [content]`
- [ ] Create `components/settings/ApiKeyManager.tsx` — settings page section for creating (shows key once), listing (prefix + name + last used), and revoking API keys
- [ ] Write unit tests for all three formatters
- [ ] Write integration tests for auth (valid key, invalid key, revoked key, rate limit exceeded)

## Dev Notes
- Key files: `app/api/context/[contextId]/export/route.ts`, `server/services/exportService.ts`, `server/services/apiKeyService.ts`, `server/repositories/apiKeyRepository.ts`, `components/settings/ApiKeyManager.tsx`
- Dependencies: Story 2.1 (Unit model), Story 2.3 (Context membership), Story 2.4 (Relations), Story 1.x (auth/session for tRPC key management)
- Technical approach: API key is generated as `flowmind_sk_[random 32 bytes base64url]`. Store only `sha256(key)` in DB — never the plaintext. Show full key to user exactly once at creation time. Rate limiting: use a sliding window counter stored in-memory (Map with cleanup) for MVP; swap to Redis/Upstash for production. `depth` parameter controls BFS traversal depth when expanding relations — cap at depth 5 to prevent runaway queries. The export route is a Next.js App Router route handler, not a tRPC procedure, to support standard REST semantics.

## References
- Epic 10: External Integration & Context Export API
- FR34: Context Export REST API with multiple formats
- NFR19: Format-agnostic and AI-model-agnostic API
- NFR20: Privacy controls — data sent to external services only on explicit export
- Related: Story 10.2 (AI Prompt Auto-Generation reuses prompt_package format), Story 10.4 (Privacy Controls for export)
