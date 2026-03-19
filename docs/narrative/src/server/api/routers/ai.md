# AI Router (tRPC AI Operations)

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/api/routers/ai.ts`
> **Status**: Active

---

## Context & Purpose

This module serves as the API gateway for all artificial intelligence operations in FlowMind. It exposes three endpoints that allow the frontend to request AI-powered suggestions and metrics -- specifically, intelligent classification of thought units, automated relationship discovery between units, and transparency metrics showing how much content came from AI versus the user.

**Business Need**: FlowMind's core promise is helping users organize their thinking. However, the cognitive overhead of manually classifying each thought and discovering connections between ideas can slow users down. This router enables "AI as a thinking partner" -- the system can suggest what type of thought a unit represents (claim, question, evidence, etc.) and propose meaningful relationships to other units, while maintaining full transparency about AI involvement.

**When Used**:
- **suggestType**: Called when a user creates or edits a unit, typically in a capture or editing flow, to receive an AI recommendation for the unit's cognitive type
- **suggestRelations**: Called after a unit is created or when the user requests connection suggestions, returning up to three proposed links to other units in the same context
- **getContributionRatio**: Called by dashboard or analytics views to display how much of a context's content is user-written versus AI-generated or AI-refined

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/server/api/trpc.ts`: `createTRPCRouter` and `protectedProcedure` -- the tRPC infrastructure providing route definition and **authentication middleware** (a checkpoint that verifies the user is logged in before any AI operation proceeds)
- `src/server/ai/index.ts`: `createAIService` factory function -- constructs the AI service instance that actually performs type suggestions, relation suggestions, and contribution calculations
- `src/server/ai/aiService.ts`: The core AI service implementation containing `suggestUnitType()`, `suggestRelations()`, and `getContributionRatio()` methods
- `src/server/ai/provider.ts`: The underlying AI provider abstraction (Anthropic Claude) that the AI service uses for structured generation
- `src/server/ai/safetyGuard.ts`: Rate limiting and safety checks that protect against AI abuse
- `zod`: Schema validation library ensuring input data meets expected formats before processing

### Dependents (What Needs This)
- `src/server/api/root.ts`: Registers this router under the `ai` namespace, making endpoints accessible as `api.ai.suggestType`, `api.ai.suggestRelations`, and `api.ai.getContributionRatio` throughout the application
- Frontend components (planned): Unit capture forms will call `suggestType` for intelligent classification; relation creation UI will call `suggestRelations` for connection recommendations; dashboard views will call `getContributionRatio` for transparency metrics

### Data Flow

**suggestType Mutation**:
```
Client sends content + optional contextId
  --> protectedProcedure verifies authentication
    --> Zod validates input (1-5000 chars, valid UUID if present)
      --> AI service instantiated with database connection
        --> Safety guard checks rate limits and quotas
          --> AI provider analyzes content with structured prompt
            --> Returns { unitType, confidence, reasoning, aiTrustLevel }
```

**suggestRelations Mutation**:
```
Client sends content + contextId
  --> protectedProcedure verifies authentication
    --> Zod validates input
      --> Router fetches up to 20 recent non-draft units from context
        --> AI service compares new content against existing units
          --> Returns array of up to 3 suggestions with { targetUnitId, relationType, strength, reasoning }
```

**getContributionRatio Query**:
```
Client sends contextId
  --> protectedProcedure verifies authentication
    --> AI service queries UnitContext join table
      --> Counts units by originType (direct_write, ai_generated, ai_refined)
        --> Returns { total, userWritten, aiGenerated, aiRefined, ratio }
```

---

## Macroscale: System Integration

### Architectural Layer
This sits in the **API Layer** of FlowMind's three-tier architecture:
- **Layer 1**: Client components (unit capture forms, relation pickers, dashboards)
- **Layer 2**: This router (orchestrates AI operations, validates input, enforces auth) <-- You are here
- **Layer 3**: AI Service + Database (Claude API calls, unit/relation persistence)

### Big Picture Impact
FlowMind differentiates itself from simple note-taking apps by offering structured thinking assistance. This router is the **bridge** between that promise and reality. It enables:

1. **Intelligent Classification**: Instead of users pausing to decide "is this a claim, a question, or evidence?", the AI suggests a classification with confidence scores. This reduces friction in the capture flow and improves consistency across the knowledge graph.

2. **Relationship Discovery**: The most powerful thinking happens when ideas connect. But discovering those connections manually is cognitively expensive. This router enables the AI to propose relationships ("this new claim supports that existing evidence"), surfacing connections the user might miss.

3. **Transparency Metrics**: Users rightly want to know how much of their thinking is their own. The contribution ratio endpoint provides this accountability, showing the balance between human-written and AI-assisted content.

**Without this module**:
- Unit type selection would be entirely manual, increasing cognitive load
- Relationship discovery would rely solely on user memory and manual linking
- There would be no visibility into AI's role in content creation
- The "AI as thinking partner" value proposition would be significantly weakened

### Critical Path Analysis
**Importance Level**: Medium-High

These endpoints enhance the user experience but are not strictly required for core functionality. If they fail:
- **suggestType failure**: Users can still manually select unit types from the dropdown -- inconvenient but not blocking
- **suggestRelations failure**: Users can manually create relations between units -- the knowledge graph remains functional
- **getContributionRatio failure**: Dashboard metrics would be unavailable, but content creation continues unaffected

The AI service includes safety guards (rate limiting, quota checks) that may intentionally block requests when limits are exceeded. This is expected behavior, not a failure, and the frontend should handle `allowed: false` responses gracefully.

---

## Technical Concepts (Plain English)

### protectedProcedure
**Technical**: A tRPC middleware chain that enforces authentication by checking for a valid session before executing the handler.
**Plain English**: A security guard at the door -- only logged-in users can request AI suggestions. Anonymous visitors get turned away with an "UNAUTHORIZED" error.
**Why We Use It**: AI operations have costs (API calls) and should be reserved for authenticated users. Also, suggestions are personalized to user context.

### Mutation vs Query
**Technical**: In tRPC/GraphQL terminology, a mutation indicates a side-effect-producing operation, while a query is read-only.
**Plain English**: Think of queries as "looking something up" (like checking your balance) and mutations as "doing something" (like making a purchase). `suggestType` and `suggestRelations` are mutations because they trigger AI inference (a "doing" action with external API costs), even though they do not persist data. `getContributionRatio` is a query because it only reads existing unit data.
**Why We Use It**: The distinction helps caching layers and client code understand which operations are safe to retry or cache.

### Structured Generation (AI Provider)
**Technical**: Using schema-constrained AI output where the model must respond with JSON matching a predefined structure (via `generateStructured<T>`).
**Plain English**: Instead of asking the AI to write a free-form response and parsing it, we give it a template: "Your answer must be JSON with these exact fields." This makes the AI's output predictable and type-safe.
**Why We Use It**: Free-form AI responses are unpredictable and hard to use programmatically. Structured generation guarantees we get a `TypeSuggestion` or `RelationSuggestion` object we can trust.

### AI Trust Level
**Technical**: The `aiTrustLevel: "inferred"` field returned alongside suggestions indicates the AI's role in producing this data.
**Plain English**: A label saying "the AI figured this out based on content analysis, not because you told it directly." Other possible levels (not currently used) might include "user_confirmed" or "high_confidence".
**Why We Use It**: Transparency about AI involvement. The frontend can display this to users, and future features might treat AI-inferred data differently from user-confirmed data.

### Safety Guard
**Technical**: A middleware layer (`safetyGuard.runAllChecks()`) that enforces rate limits, quota checks, and branching limits before AI operations proceed.
**Plain English**: A bouncer combined with a budget checker -- it makes sure users are not spamming AI requests (rate limit), have not exceeded their monthly quota, and are not creating runaway AI-generated content trees (branch limits).
**Why We Use It**: AI API calls cost money. Safety guards protect against abuse, runaway costs, and ensure fair usage across users.

### Context-Scoped Unit Fetching
**Technical**: The `suggestRelations` mutation queries units via `perspectives.some({ contextId })` to scope relation suggestions to the current context.
**Plain English**: Units in FlowMind can appear in multiple contexts (like files appearing in multiple folders). When suggesting relations, we only consider units that share the same "thinking space" as the new unit -- not every unit the user has ever created.
**Why We Use It**: Relation suggestions are most useful when they connect related ideas. Scoping to context keeps suggestions relevant and prevents noise from unrelated projects.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created the AI router with three endpoints: `suggestType` mutation for unit classification, `suggestRelations` mutation for relationship discovery, and `getContributionRatio` query for transparency metrics
- **Why**: Epic 4 AI integration requires exposing AI capabilities through a clean API layer with proper authentication and input validation
- **Impact**: Enables frontend components to request AI suggestions for unit types and relations, and display AI contribution metrics on dashboards
