# AI Module Entry Point (Barrel Export)

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/ai/index.ts`
> **Status**: Active

---

## Context & Purpose

This file serves as the **barrel export** (a pattern where a single file re-exports items from multiple related modules, creating a unified entry point) for Flowmind's AI subsystem. Instead of forcing consumers to import from three separate files, this module gathers all AI-related exports into one clean import path.

**Business Need**: As Flowmind's AI capabilities grow (Epic 5 and beyond), multiple services need access to AI providers, safety guardrails, and the AI service itself. Without a barrel export, import statements would become verbose and fragile:

```typescript
// Without barrel export (fragile, verbose)
import { getAIProvider } from "@/server/ai/provider";
import { createSafetyGuard } from "@/server/ai/safetyGuard";
import { createAIService } from "@/server/ai/aiService";

// With barrel export (clean, maintainable)
import { getAIProvider, createSafetyGuard, createAIService } from "@/server/ai";
```

**When Used**: Any server-side code that needs AI capabilities imports from this module. Currently, the primary consumer is `src/server/api/routers/ai.ts`, which exposes AI features to the client via tRPC endpoints.

---

## Microscale: Direct Relationships

### Dependencies (What This Module Re-exports)

This barrel file aggregates exports from three internal modules:

- `./provider.ts`: Exports `getAIProvider`, `setAIProvider`, `AnthropicProvider` (class), and types `AIProvider`, `AIGenerateTextOptions`, `AIGenerateStructuredOptions`. This is the abstraction layer for communicating with Claude or other AI backends.

- `./safetyGuard.ts`: Exports `createSafetyGuard` and types `SafetyGuard`, `SafetyCheckResult`, `SafetyGuardOptions`. This is the rate limiter and guardrail system that prevents AI abuse (excessive generation, over-reliance on AI content).

- `./aiService.ts`: Exports `createAIService` and types `AIService`, `TypeSuggestion`, `RelationSuggestion`, `AIServiceContext`. This is the high-level service that orchestrates AI-powered features like auto-classification and relationship inference.

### Dependents (What Needs This)

- `src/server/api/routers/ai.ts`: The tRPC router that exposes AI features (`suggestType`, `suggestRelations`, `getContributionRatio`) to the frontend. Imports `createAIService` from this barrel.

- **Future consumers**: Any new server-side feature requiring AI capabilities will import from this module, keeping import paths consistent across the codebase.

### Data Flow

```
Consumer imports from "@/server/ai"
    |
    v
Barrel file re-exports from ./provider, ./safetyGuard, ./aiService
    |
    v
Consumer gets access to:
  - getAIProvider() -> AI backend connection
  - createSafetyGuard(db) -> Rate limiting + guardrails
  - createAIService(db) -> High-level AI operations
```

---

## Macroscale: System Integration

### Architectural Layer

This barrel sits at the **Module Boundary Layer** -- the organizational level where related implementations are grouped and exposed through a single, stable interface:

- **Layer 4: API Routes** (`/api/routers/ai.ts` - tRPC endpoints)
- **Layer 3: Module Boundary** -- **You are here** (barrel export)
- **Layer 2: Services** (`aiService.ts` - business logic)
- **Layer 1: Infrastructure** (`provider.ts`, `safetyGuard.ts`)
- **Layer 0: External** (Anthropic API, database)

### Big Picture Impact

This module is the **single point of entry** to Flowmind's AI subsystem. Its existence enables:

1. **Encapsulation**: Internal module structure can change (rename files, split/merge modules) without breaking consumers -- they only import from the barrel.

2. **Discoverability**: Developers see all available AI exports in one place, making the API self-documenting.

3. **Tree-shaking optimization**: Build tools can analyze the barrel to eliminate unused exports in production bundles.

4. **Consistent patterns**: Aligns with Next.js/tRPC codebase conventions where subsystems expose barrels (`@/server/db`, `@/server/auth`, etc.).

### Critical Path Analysis

**Importance Level**: Medium (organizational, not functional)

The barrel itself is **purely organizational** -- it adds no runtime logic. If it were deleted:
- Consumers would need to update import paths (tedious but not breaking)
- The AI system would still function identically

However, maintaining the barrel is **critical for code health**:
- Without it, refactoring the AI module's internal structure becomes risky
- Import inconsistencies accumulate over time
- New developers struggle to discover available exports

---

## Technical Concepts (Plain English)

### Barrel Export Pattern

**Technical**: A file that re-exports public APIs from multiple internal modules, creating a single import path for external consumers. Uses `export { X } from "./internal"` syntax.

**Plain English**: Like the reception desk of a company. Instead of wandering the building to find accounting, HR, and IT, you go to reception and say "I need help with X" -- they direct you to the right place. The barrel is the reception desk for the AI module.

**Why We Use It**: Keeps imports tidy, hides internal structure, and makes refactoring safer. If we reorganize how files are split internally, only the barrel needs updating.

### Type Re-exports

**Technical**: The `export type { X }` syntax re-exports TypeScript types without including them in the JavaScript output. This is required when `isolatedModules` is enabled (common in Next.js).

**Plain English**: Some things (types) only exist at "design time" when TypeScript checks your code -- they vanish when the code runs. The `export type` syntax tells the build system "this is only for type-checking, don't try to include it in the actual program."

**Why We Use It**: Prevents build errors with modern TypeScript configurations. Also makes the distinction clear: functions/classes are runtime exports, types are compile-time exports.

### Path Aliasing (@/server/ai)

**Technical**: The `@/` prefix is a TypeScript path alias configured in `tsconfig.json` that maps to the `src/` directory, enabling absolute imports.

**Plain English**: Instead of writing `../../server/ai` (which breaks if you move the file), you write `@/server/ai` (which always works because it's measured from the project root, not the current file).

**Why We Use It**: Makes imports readable and refactor-safe. Moving a file doesn't break its imports.

---

## Export Inventory

### Runtime Exports (Functions & Classes)

| Export | Source | Purpose |
|--------|--------|---------|
| `getAIProvider` | `provider.ts` | Factory that returns the singleton AI provider instance |
| `setAIProvider` | `provider.ts` | Dependency injection hook for testing (swap in mocks) |
| `AnthropicProvider` | `provider.ts` | The concrete Claude AI implementation |
| `createSafetyGuard` | `safetyGuard.ts` | Factory that creates a guardrail checker bound to the database |
| `createAIService` | `aiService.ts` | Factory that creates the high-level AI service |

### Type Exports

| Export | Source | Purpose |
|--------|--------|---------|
| `AIProvider` | `provider.ts` | Interface contract for AI providers |
| `AIGenerateTextOptions` | `provider.ts` | Options for freeform text generation |
| `AIGenerateStructuredOptions` | `provider.ts` | Options for JSON-structured responses |
| `SafetyGuard` | `safetyGuard.ts` | Return type of `createSafetyGuard` |
| `SafetyCheckResult` | `safetyGuard.ts` | Result of safety checks (allowed/denied + reason) |
| `SafetyGuardOptions` | `safetyGuard.ts` | Configuration for guardrail thresholds |
| `AIService` | `aiService.ts` | Return type of `createAIService` |
| `TypeSuggestion` | `aiService.ts` | AI response format for unit type classification |
| `RelationSuggestion` | `aiService.ts` | AI response format for relationship inference |
| `AIServiceContext` | `aiService.ts` | Session context required for AI operations |

---

## Design Decisions

### Why Separate Safety Guard from AI Service?

The `SafetyGuard` is intentionally a separate module from `AIService` for **separation of concerns** (dividing code so each piece has one job):

1. **Testability**: Safety logic can be tested independently of AI calls
2. **Reusability**: Guards could protect non-AI operations in the future
3. **Configurability**: Different contexts might need different limits

The `AIService` *uses* the guard internally but doesn't expose its complexity to consumers.

### Why Factory Functions Instead of Classes?

Both `createSafetyGuard` and `createAIService` are factory functions (functions that create and return objects) rather than classes because:

1. **Closure-based state**: Cleaner than class instance variables for simple services
2. **Functional style**: Aligns with the React ecosystem's preference for functions
3. **Testing**: Easier to mock a function return than to extend a class
4. **No inheritance needed**: These services don't benefit from class hierarchies

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created barrel export aggregating provider, safetyGuard, and aiService modules
- **Why**: Epic 5 AI Integration requires a clean entry point for AI capabilities
- **Impact**: Establishes the import convention (`@/server/ai`) that all future AI consumers will follow
