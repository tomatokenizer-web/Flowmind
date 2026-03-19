# AI Provider Abstraction Layer

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/ai/provider.ts`
> **Status**: Active

---

## Context & Purpose

This module exists as Flowmind's gateway to artificial intelligence capabilities. It implements the **Strategy Pattern** (a design approach where you define a family of interchangeable algorithms behind a common interface, letting you swap implementations without changing the code that uses them). For Flowmind, this means the application can work with Claude today and potentially OpenAI, Gemini, or local models tomorrow -- without rewriting the features that depend on AI.

**Business Need**: Epic 5 (AI Integration) introduces intelligent features throughout Flowmind: auto-classification of thought units, semantic relationship suggestions, and natural language queries. These features need AI, but the project cannot be locked into a single vendor. This abstraction layer solves the vendor lock-in problem while providing a clean, testable interface for AI operations.

**When Used**: Any server-side code that needs AI capabilities calls `getAIProvider()` to obtain a provider instance. Currently anticipated consumers include:
- Unit auto-classification (detecting whether a captured thought is a Note, Task, or Idea)
- Relationship inference (suggesting connections between units based on semantic similarity)
- Smart search (interpreting natural language queries against the knowledge graph)

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@anthropic-ai/sdk`: The official Anthropic SDK for communicating with Claude models. Handles authentication, request formatting, and response parsing for the Claude API.
- `../logger`: Flowmind's centralized logging utility (built on Pino). Used to record errors when AI calls fail, enabling debugging without exposing sensitive prompt content to end users.

### Dependents (What Needs This)
- **Currently**: No consumers yet (Epic 5 is in initial implementation)
- **Planned consumers**:
  - `src/server/services/classificationService.ts`: Will use `generateStructured()` to auto-detect unit types
  - `src/server/services/suggestionService.ts`: Will use `generateText()` for relationship suggestions
  - `src/server/api/routers/ai.ts`: Will expose AI features to the client via tRPC procedures

### Data Flow

```
Feature code calls getAIProvider()
    |
    v
Factory returns singleton AnthropicProvider (or test mock)
    |
    v
Feature calls generateText(prompt) or generateStructured(prompt, schema)
    |
    v
AnthropicProvider formats request for Claude API
    |
    v
Claude processes prompt, returns response
    |
    v
Provider extracts text content (or parses JSON for structured output)
    |
    v
Feature receives clean string or typed object
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits at the **Infrastructure Layer** of Flowmind's server architecture -- the foundational services that higher-level business logic depends on:

- **Layer 3: API Routes** (tRPC routers expose endpoints)
- **Layer 2: Services** (business logic orchestrates operations)
- **Layer 1: Infrastructure** -- **You are here** (AI provider, database, logging)
- **Layer 0: External Systems** (Anthropic API, Prisma/SQLite, etc.)

The provider acts as an **adapter** (a wrapper that translates between Flowmind's internal interface and the external Anthropic API, hiding vendor-specific details from the rest of the codebase).

### Big Picture Impact

This module enables the entire "intelligent" dimension of Flowmind. Without it:
- No auto-classification: Users must manually tag every thought unit
- No smart suggestions: The relationship graph becomes purely manual
- No semantic search: Users limited to keyword-based queries
- No future AI features can be added without significant refactoring

The abstraction design also unlocks:
- **Testability**: Tests can inject a mock provider that returns predictable responses
- **Cost control**: Swap to a cheaper model (or local LLM) by changing the factory
- **Resilience**: Future fallback logic could try multiple providers if one fails

### Critical Path Analysis

**Importance Level**: High (for AI-dependent features), Low (for core CRUD operations)

The provider is **optional for Flowmind's core functionality** -- users can capture, organize, and link thought units without AI. However, it is **critical for Epic 5+ features** that differentiate Flowmind from basic note-taking apps.

**Failure mode**: If Anthropic API is unavailable or the key is invalid:
- AI features gracefully degrade (manual classification, no suggestions)
- Errors are logged with full context for debugging
- Core functionality (CRUD, graph visualization) remains unaffected

---

## Technical Concepts (Plain English)

### AIProvider Interface
**Technical**: A TypeScript interface defining the contract that any AI provider implementation must fulfill: `generateText()` for freeform output and `generateStructured<T>()` for JSON-parsed typed responses.

**Plain English**: A blueprint that says "any AI service we use must be able to answer questions in plain text AND return structured data in a specific format." Like a job description that any candidate (Claude, GPT, Gemini) must be able to fulfill.

**Why We Use It**: Lets us swap AI backends without changing feature code. Test mocks can also implement this interface for predictable unit tests.

### Singleton Pattern (via Factory)
**Technical**: `getAIProvider()` lazily initializes and caches a single `AnthropicProvider` instance, reusing it across all calls.

**Plain English**: Instead of creating a new connection to Claude every time we need AI, we create one connection and reuse it. Like having a single phone line to the AI instead of dialing a new number each time.

**Why We Use It**: Avoids redundant initialization, keeps configuration in one place, and makes it easy to swap the provider globally (e.g., for testing via `setAIProvider()`).

### Dependency Injection via setAIProvider()
**Technical**: Allows external code to replace the default provider instance, enabling test mocks or alternative implementations without modifying the module.

**Plain English**: A backdoor that lets tests say "ignore the real AI and use this fake one instead." Like being able to swap out the engine in a car without redesigning the whole vehicle.

**Why We Use It**: Critical for unit testing AI-dependent features without hitting the actual API (which would be slow, costly, and non-deterministic).

### Structured Output with Schema Validation
**Technical**: `generateStructured<T>()` sends a JSON schema in the prompt, instructs Claude to respond with matching JSON, then parses the response into the TypeScript type `T`.

**Plain English**: Instead of asking the AI "what type is this note?" and parsing its English answer, we say "fill out this form with fields: type, confidence, reasoning." The AI returns a predictable shape we can use directly in code.

**Why We Use It**: Eliminates fragile string parsing. Features get typed objects (e.g., `{ type: "Task", confidence: 0.92 }`) instead of unpredictable prose.

### Temperature Parameter
**Technical**: A float between 0 and 1 that controls randomness in AI responses. Lower values (0.3) produce more deterministic, focused outputs; higher values (0.7-1.0) produce more creative, varied responses.

**Plain English**: A "creativity dial" for the AI. Turn it down for factual, consistent answers (like classification). Turn it up when you want diverse, imaginative suggestions.

**Why We Use It**: `generateStructured()` uses 0.3 (we want consistent JSON), while `generateText()` defaults to 0.7 (allowing natural variation in prose responses).

---

## Implementation Notes

### Default Model Selection
The provider defaults to `claude-sonnet-4-20250514` -- a balanced choice optimizing for:
- Speed: Fast enough for real-time UI interactions
- Quality: Capable enough for classification and reasoning tasks
- Cost: More economical than Opus for high-volume operations

### Error Handling Strategy
Both generation methods catch errors, log them with full context via Pino, then re-throw. This ensures:
- Calling code can handle failures gracefully (show fallback UI)
- Operations team has visibility into failure patterns
- No silent failures that could cause data inconsistencies

### JSON Extraction Robustness
`generateStructured()` includes regex handling for markdown code blocks. Even if Claude wraps its JSON in triple backticks (a common LLM behavior), the parser extracts the clean JSON. This defensive coding prevents subtle parsing failures in production.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created AIProvider interface, AnthropicProvider implementation, and factory functions
- **Why**: Epic 5 AI Integration requires a clean abstraction for AI capabilities
- **Impact**: Enables auto-classification, relationship suggestions, and semantic search features in subsequent stories
