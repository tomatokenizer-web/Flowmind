# Story 5.1: AI Provider Abstraction and Safety Guard Middleware

**Status: pending**

## Description
As a developer,
I want an AI provider abstraction layer and safety guard middleware,
So that AI calls are centralized, rate-limited, swappable between providers, and generation limits are enforced consistently.

## Acceptance Criteria

**Given** the file `server/ai/provider.ts`
**When** it is implemented
**Then** it exports an `AIProvider` interface with methods: `generateText(prompt, options)`, `generateStructured(prompt, schema, options)`, `generateEmbedding(text)`
**And** two implementations exist: `AnthropicProvider` (primary) and `OpenAIProvider` (fallback)
**And** provider selection is configured via environment variable `AI_PRIMARY_PROVIDER`

**Given** the primary provider (Anthropic) is unavailable or returns a 5xx error
**When** an AI operation is invoked
**Then** the system automatically falls back to the secondary provider (OpenAI)
**And** a warning is logged via pino with the error details and fallback event

**Given** the file `server/ai/safetyGuard.ts`
**When** it is implemented
**Then** it exports middleware that wraps all AI generation calls and enforces: max 3 Units generated per request, max 3 consecutive branch generations per user session, and 40% AI ratio warning per Context

**Given** a user has already generated 3 Units in a single request
**When** the AI attempts to generate a 4th Unit
**Then** the safety guard rejects the generation with error type `AI_GENERATION_LIMIT` and message "Maximum 3 Units per request reached"

**Given** a user has triggered 3 consecutive branch generations without creating any manual Units in between
**When** the user requests a 4th branch generation
**Then** the safety guard rejects with error type `AI_CONSECUTIVE_LIMIT` and message "Please add your own thoughts before generating more branches"

**Given** a Context where AI-generated Units (origin_type = 'ai_generated' or 'ai_refined') exceed 40% of total Units
**When** any new AI generation is requested for that Context
**Then** the safety guard allows the generation but returns a warning flag `ai_ratio_warning: true` with the current ratio percentage
**And** this warning is displayed to the user in the UI (Story 5.11)

**Given** the AI provider abstraction
**When** any tRPC router needs AI functionality
**Then** it calls the AI service layer (never the provider directly) and the service layer calls the provider through the safety guard

**Given** the embedding generation function
**When** a Unit is created or its content is updated
**Then** an embedding is generated via OpenAI `text-embedding-3-small` (vector(1536)) through a Trigger.dev background job
**And** the embedding is stored in the Unit's `embedding` column

## Tasks
- [ ] Create `server/ai/provider.ts` with `AIProvider` interface defining `generateText`, `generateStructured`, and `generateEmbedding` method signatures
- [ ] Implement `AnthropicProvider` class in `server/ai/providers/anthropic.ts` using the Anthropic SDK
- [ ] Implement `OpenAIProvider` class in `server/ai/providers/openai.ts` using the OpenAI SDK
- [ ] Add `AI_PRIMARY_PROVIDER` env var to `.env.example` and environment validation in `server/env.ts`
- [ ] Create `server/ai/providerFactory.ts` that reads `AI_PRIMARY_PROVIDER` and returns the correct provider instance
- [ ] Add automatic fallback logic: catch 5xx errors from primary provider and retry with secondary provider
- [ ] Add pino logging in `server/ai/providerFactory.ts` for fallback events with error details
- [ ] Create `server/ai/safetyGuard.ts` exporting `withSafetyGuard` wrapper function
- [ ] Implement per-request Unit count enforcement (max 3) with `AI_GENERATION_LIMIT` error type
- [ ] Implement per-session consecutive branch generation counter with `AI_CONSECUTIVE_LIMIT` error type
- [ ] Implement AI ratio check: query Context's Units by `origin_type`, compute percentage, return `ai_ratio_warning` flag when >40%
- [ ] Create `server/ai/service.ts` as the single entry point for all AI calls (routes call service, service calls provider via guard)
- [ ] Add Trigger.dev background job `jobs/generateEmbedding.ts` that calls `OpenAIProvider.generateEmbedding` on Unit create/update
- [ ] Add `embedding` column (vector(1536)) to units table schema and run migration
- [ ] Write unit tests for `safetyGuard.ts` covering all three limit scenarios

## Dev Notes
- Use `@anthropic-ai/sdk` for AnthropicProvider and `openai` npm package for OpenAIProvider
- The `generateStructured` method should use Anthropic tool_use / OpenAI function_calling for structured JSON output
- Safety guard state for consecutive branch tracking should be stored in the user's session (Redis or DB) not in-memory, to survive restarts
- Embeddings use `text-embedding-3-small` (1536 dimensions) — requires `pgvector` extension in Postgres
- The `embedding` column update job should be idempotent and queued via Trigger.dev to avoid blocking Unit creation
- All AI errors should extend a base `AIError` class with `type`, `message`, and optional `retryable` fields

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.2: consumes the provider abstraction for decomposition
- Story 5.4: consumes the provider for type/relation suggestions
- Story 5.11: displays the `ai_ratio_warning` flag from safety guard
- Story 5.9: AI intervention levels gate which safety guard rules apply
