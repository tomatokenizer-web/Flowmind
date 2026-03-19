# AI Service Layer

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/ai/aiService.ts`
> **Status**: Active

---

## Context & Purpose

This module serves as Flowmind's **AI orchestration layer** -- the central coordinator that combines raw AI capabilities (from the provider) with safety controls (from the safety guard) to deliver intelligent features safely to the application. It is the primary interface that feature code uses when it needs AI-powered functionality.

**Business Need**: Flowmind differentiates itself from basic note-taking apps through intelligent assistance. When users capture thoughts, they should not need to manually classify each one as a "claim," "question," or "evidence." When they add new ideas, the system should proactively suggest relationships to existing thoughts. This module encapsulates these intelligent behaviors while ensuring AI usage remains balanced and does not overwhelm human contribution.

**When Used**:
- **Unit type suggestion**: When a user creates a new unit, the frontend can request an AI-suggested classification based on the content
- **Relation suggestion**: When a new unit enters a context, the service suggests logical relationships to existing units
- **Contribution metrics**: Dashboard components query this service to display the AI-vs-human contribution ratio for a context
- **Session management**: When users create manual content, the service resets safety counters to reward human participation

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `@prisma/client` (PrismaClient): Database access for querying unit origin types and calculating contribution ratios. The service reads `unitContext` and `unit` tables to understand the composition of each context.

- `./provider` (getAIProvider, AIProvider): The abstracted AI interface that handles actual communication with Claude. The service delegates prompt execution to the provider's `generateStructured()` method.

- `./safetyGuard` (createSafetyGuard, SafetyGuard): The guardian module that prevents AI overuse. Before every AI operation, the service runs safety checks through this component.

- `../logger`: Flowmind's logging infrastructure for recording suggestion events. Enables monitoring of AI feature usage without exposing sensitive content.

### Dependents (What Needs This)

- `src/server/ai/index.ts`: Re-exports `createAIService` and its types, making this the public API for AI features across the server codebase.

- **Planned consumers** (Epic 5 integration):
  - `src/server/api/routers/ai.ts`: Will expose AI suggestions as tRPC procedures for the frontend
  - `src/server/api/routers/unit.ts`: May integrate auto-classification during unit creation
  - Dashboard components: Will query contribution ratios for transparency displays

### Data Flow

**Type Suggestion Flow**:
```
User creates unit with content
    |
    v
Frontend calls suggestUnitType(content, context)
    |
    v
Safety guard runs all checks (rate limits, AI ratio)
    |
    +--[blocked]---> Throw error with guidance message
    |
    v [allowed]
Service constructs classification prompt with unit type ontology
    |
    v
AIProvider.generateStructured() sends prompt to Claude
    |
    v
Claude returns {unitType, confidence, reasoning}
    |
    v
Service logs event, returns typed suggestion to caller
```

**Relation Suggestion Flow**:
```
New unit enters context with existing units
    |
    v
Frontend calls suggestRelations(newContent, existingUnits, context)
    |
    v
Safety guard validates request
    |
    v
Service constructs prompt with new unit + top 10 existing units
    |
    v
AIProvider.generateStructured() queries Claude
    |
    v
Claude returns array of {targetUnitId, relationType, strength, reasoning}
    |
    v
Service returns up to 3 relation suggestions
```

**Contribution Ratio Flow**:
```
Dashboard requests AI contribution metrics
    |
    v
getContributionRatio(contextId) called
    |
    v
Query all unitContext entries for this context
    |
    v
Group by originType: direct_write vs ai_generated vs ai_refined
    |
    v
Calculate ratio = (aiGenerated + aiRefined) / total
    |
    v
Return breakdown for transparency display
```

---

## Macroscale: System Integration

### Architectural Layer

This module operates at the **Service Layer** of Flowmind's server architecture -- the business logic tier that orchestrates infrastructure components:

- **Layer 4: Client** (React components request AI features)
- **Layer 3: API Routes** (tRPC routers expose service methods)
- **Layer 2: Services** -- **You are here** (AI Service coordinates provider + safety)
- **Layer 1: Infrastructure** (AIProvider, SafetyGuard, Database)
- **Layer 0: External Systems** (Anthropic API, PostgreSQL)

The service follows the **Facade Pattern** (presenting a simplified interface that hides the complexity of coordinating multiple subsystems). Callers do not need to know about safety checks, prompt engineering, or provider selection -- they simply request a type suggestion or relation suggestions.

### Big Picture Impact

This module is the **brain** of Flowmind's intelligent features. It enables:

- **Frictionless capture**: Users can dump raw thoughts without pausing to classify them
- **Discovery through connection**: The system surfaces non-obvious relationships between ideas
- **Balanced collaboration**: AI assists without replacing human thought through safety guardrails
- **Transparency**: Users see exactly how much AI contributed to their knowledge base

Without this module:
- Unit type selection becomes fully manual (increased friction)
- Relation discovery depends entirely on user recall (missed connections)
- No metrics to understand AI influence on personal knowledge
- Safety guardrails would need to be implemented in each consumer

### Critical Path Analysis

**Importance Level**: High (for AI-assisted features), Non-blocking (for core functionality)

The service is **optional for Flowmind's baseline experience** -- users can capture, classify, and connect units manually. However, it is **essential for the differentiating value proposition** of AI-assisted knowledge management.

**Failure modes**:
- If AI provider fails: Features degrade gracefully (no suggestions, manual workflow persists)
- If safety checks fail: Operations are blocked with user-friendly guidance
- If database queries fail: Contribution metrics unavailable, but suggestions still work
- Core CRUD operations remain unaffected by any AI service failure

**Blast radius**: Limited. AI features are enhancement-layer, not foundational infrastructure.

---

## Technical Concepts (Plain English)

### Unit Type Ontology
**Technical**: A predefined enumeration of 9 cognitive unit types (claim, question, evidence, counterargument, observation, idea, definition, assumption, action) that Claude maps content onto.

**Plain English**: A vocabulary for categorizing thoughts. Just as a librarian has categories (fiction, biography, science), Flowmind has categories for different kinds of thinking. The AI learns this vocabulary and suggests which category fits best.

**Why We Use It**: Consistent classification enables powerful filtering and analysis. Users can find "all my unresolved questions" or "evidence supporting this claim" because every thought has a known type.

### Relation Type Vocabulary
**Technical**: 8 semantic relation types (supports, contradicts, derives_from, expands, references, exemplifies, defines, questions) representing logical connections between units.

**Plain English**: The different ways thoughts can connect to each other. Like how evidence "supports" a claim, or a counterargument "contradicts" it. The AI understands these relationships and suggests which apply.

**Why We Use It**: Goes beyond simple linking (like wiki links) to capture the *nature* of connections. This enables graph queries like "show me all counterarguments to this claim."

### Confidence Score
**Technical**: A float between 0 and 1 returned by the AI indicating certainty in its suggestion. Allows downstream code to filter or present suggestions differently based on reliability.

**Plain English**: How sure the AI is about its guess. A 0.95 confidence on "this is a question" means the AI is very certain. A 0.55 confidence means "could go either way." Users can decide whether to accept suggestions with lower confidence.

**Why We Use It**: Not all AI suggestions are equal. High-confidence suggestions can be auto-applied; low-confidence suggestions warrant user review.

### Structured Generation with Schema
**Technical**: Using `generateStructured<T>()` with a JSON Schema to constrain Claude's output to a predictable shape with type-safe parsing.

**Plain English**: Instead of asking Claude "what type is this?" and parsing its prose answer, we give it a form to fill out. The form has specific fields (unitType, confidence, reasoning), and Claude must respond in that exact format. This eliminates guesswork in parsing.

**Why We Use It**: Reliability. Code can depend on receiving `TypeSuggestion` objects, not unpredictable strings.

### Content Truncation (500/300 characters)
**Technical**: The service truncates content to 500 characters for type suggestions and 300 for relation prompts before sending to the AI.

**Plain English**: We do not send entire essays to Claude -- just the beginning. This is like reading the first paragraph of an article to understand what it is about. Saves tokens (cost) and usually contains enough signal for accurate classification.

**Why We Use It**: Token efficiency (cost control) and prompt focus (avoiding context dilution).

### Existing Unit Limit (Top 10)
**Technical**: When suggesting relations, the service only includes the first 10 existing units in the prompt.

**Plain English**: If a context has 100 units, we do not ask Claude to consider relationships to all of them -- just the 10 most relevant. This keeps the AI prompt manageable and focused.

**Why We Use It**: Claude has context limits. Including all units would be expensive and potentially confusing. The service assumes recent/relevant units appear first (future enhancement: semantic sorting).

### Temperature Settings (0.3 / 0.4)
**Technical**: Low temperature values (0.3 for type, 0.4 for relations) produce more deterministic, consistent AI outputs.

**Plain English**: These features need reliable, reproducible results -- not creative variation. The same content should consistently suggest the same type. Low temperature tells Claude to stick to the most likely answer rather than exploring alternatives.

**Why We Use It**: Consistency. Users would be confused if the same content sometimes classified as "claim" and sometimes as "question."

### Origin Type Tracking
**Technical**: Each unit has an `originType` field (direct_write, ai_generated, ai_refined, etc.) stored in the database, enabling contribution ratio calculations.

**Plain English**: Every thought in the system is tagged with its source -- did the user write it directly, or did AI generate or help refine it? This tagging enables transparency about AI involvement.

**Why We Use It**: Supports Flowmind's philosophy of "AI as assistant, not author." Users can see exactly how much of their knowledge base is human-originated.

### Session Branch Count Reset
**Technical**: `resetBranchCount()` clears the consecutive AI generation counter when a user creates manual content.

**Plain English**: When the system notices you are over-relying on AI (asking for too many AI-generated branches in a row), it nudges you to add your own thoughts. Once you do, the counter resets and you can request more AI assistance.

**Why We Use It**: Encourages active thinking rather than passive AI consumption. The reset mechanism rewards human contribution.

---

## Implementation Notes

### Factory Function Design
`createAIService(db)` returns an object with methods rather than a class instance. This functional approach:
- Enables easier testing (pass a mock db)
- Avoids `this` binding issues
- Keeps the module simple and composable

### Safety-First Pattern
Every AI-calling method (suggestUnitType, suggestRelations) runs `safetyGuard.runAllChecks()` before proceeding. This ensures:
- Rate limits are enforced at the service layer (not scattered across callers)
- All safety policies apply uniformly to all AI operations
- Callers do not need to implement their own safety logic

### Exposed SafetyGuard Reference
The service exposes `safetyGuard` directly for edge cases where callers need custom safety checks. This follows the "escape hatch" principle -- encapsulate common use cases while allowing power users to access underlying components.

### TypeScript ReturnType Pattern
`export type AIService = ReturnType<typeof createAIService>` derives the service type from the factory function. This:
- Eliminates redundant interface definitions
- Keeps the type automatically in sync with implementation
- Provides full intellisense for service consumers

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created AI service layer with type suggestion, relation suggestion, and contribution ratio features
- **Why**: Epic 5 Story 5.1 requires AI-powered unit classification and relationship inference with safety guardrails
- **Impact**: Enables intelligent assistance features throughout Flowmind while maintaining human-AI balance
