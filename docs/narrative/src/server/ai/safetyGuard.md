# Safety Guard Service (AI Generation Limits)

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/ai/safetyGuard.ts`
> **Status**: Active
> **Epic**: Epic 5 - Story 5.1

---

## Context & Purpose

This module implements the "safety guardrails" that prevent AI from dominating the user's thinking process in FlowMind. It solves a fundamental tension in AI-assisted knowledge tools: how do you offer helpful AI generation without letting the tool think *for* the user instead of *with* them?

**Business Need**: FlowMind's core mission is to help users develop their own thinking. If the AI generates unlimited content on demand, users may fall into a pattern of passively accepting AI output rather than actively engaging with ideas. The safety guard enforces healthy friction -- gentle limits that nudge users back toward authorship while still providing AI assistance when genuinely needed.

**When Used**: This service is invoked before any AI generation request (branch suggestions, content expansion, question generation, etc.). It acts as a checkpoint that evaluates whether the generation should proceed, be blocked, or be allowed with a warning.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@prisma/client`: PrismaClient type -- the database connection needed to query unit origin statistics
- `src/server/logger.ts`: logger -- a **structured logging utility** (records events with contextual data like key-value pairs, not just plain text messages) using Pino for observability

### Dependents (What Needs This)
- *Currently not yet integrated* -- This module was created as part of Epic 5 Story 5.1 and will be consumed by AI generation endpoints such as:
  - Future AI branch generation tRPC procedures
  - Future AI content refinement handlers
  - Any endpoint that creates units with `originType: ai_generated` or `ai_refined`

### Data Flow
```
AI generation request arrives
  --> SafetyGuard.runAllChecks() invoked
    --> checkGenerationLimit(): Is request size reasonable?
      --> If over limit: BLOCK with AI_GENERATION_LIMIT error
    --> checkConsecutiveBranchLimit(): Too many AI branches in a row?
      --> If exceeded: BLOCK with AI_CONSECUTIVE_LIMIT error
    --> checkAIRatio(): Is AI content overwhelming the context?
      --> If over threshold: ALLOW but return AI_RATIO_WARNING
  --> Result returned to caller (allowed: true/false + optional error/warning)
```

The design deliberately separates **blocking errors** from **non-blocking warnings**. Generation limit and consecutive branch violations halt the request entirely. AI ratio concerns only warn the user -- they can proceed if they choose, but they receive a nudge to contribute more of their own thoughts.

---

## Macroscale: System Integration

### Architectural Layer
This sits in the **AI Service Layer** of FlowMind's architecture:
- **Layer 1**: Client (AI generation buttons, branch suggestion UI)
- **Layer 2**: tRPC API procedures (will call SafetyGuard before AI operations)
- **Layer 3**: SafetyGuard + AIProvider (validation + AI execution) <-- You are here
- **Layer 4**: Database (tracks unit origins, context membership)

### Big Picture Impact
SafetyGuard is the ethical backbone of FlowMind's AI integration strategy. It embodies the product philosophy that AI should augment human thinking, not replace it. The module enables several critical behaviors:

**Prevents AI Flooding**: Without per-request limits, a user could accidentally (or intentionally) generate hundreds of units in seconds, overwhelming both the system and their own ability to engage meaningfully with the content.

**Encourages Interleaved Thinking**: The consecutive branch limit forces users to pause and add their own contributions between AI suggestions. This **interleaving pattern** (alternating between human and AI input) is shown in cognitive research to improve learning and retention versus passive consumption.

**Maintains Human Authorship Signal**: The AI ratio warning tracks what percentage of a context's content is AI-generated. This metric becomes valuable for:
- User self-reflection ("Am I actually thinking, or just collecting AI outputs?")
- Future trust indicators (contexts with high AI ratios might be flagged differently)
- Export/publication contexts where authorship matters

### Critical Path Analysis
**Importance Level**: High

This is a **policy enforcement** module -- if it fails or is bypassed, the product loses its core differentiation from tools that simply generate unlimited AI content. However, the fail mode is graceful: if SafetyGuard errors, the worst case is that limits are not enforced (AI generation proceeds unchecked), not that the application crashes.

**If this module fails**:
- AI generation requests would bypass all limits
- Users could generate unlimited consecutive branches
- No warnings about AI content dominance
- Product loses its "thinking partner" philosophy enforcement

**Dependencies**:
- Database must be accessible for AI ratio checks (queries UnitContext table)
- Session state (in-memory Map) must persist for consecutive branch tracking

---

## Technical Concepts (Plain English)

### In-Memory Session Tracking
**Technical**: A JavaScript Map that stores branch generation counts keyed by `userId:sessionId`, allowing state persistence within a server process without database writes.

**Plain English**: Like a whiteboard in a classroom where the teacher makes tally marks each time a student asks for help. When the student works independently (creates manual content), the teacher erases their tally marks and they start fresh. The whiteboard exists only in this classroom (server process) -- if you move to a different classroom, there's no history.

**Why We Use It**: Tracking every branch generation in the database would be overkill for this use case. We only need to detect consecutive AI actions within a short window, and losing this data on server restart is acceptable (users simply get a fresh quota).

**Production Note**: The code comments acknowledge this is a development approach. In production, this would migrate to Redis or similar distributed cache so that users have consistent limits across server instances in a load-balanced environment.

### AI Contribution Ratio
**Technical**: A calculated percentage derived from counting units where `originType IN ('ai_generated', 'ai_refined')` divided by total units in a context.

**Plain English**: Imagine a collaborative whiteboard where every sticky note is either blue (human-written) or green (AI-suggested). The AI ratio is simply "what percentage of sticky notes are green?" If more than 40% are green, the system gently asks: "Would you like to add more of your own ideas?"

**Why We Use It**: This metric creates visibility into content authorship that users might not otherwise notice. It's easy to click "generate more" without realizing you've accumulated mostly AI content. The warning surfaces this pattern without blocking the user.

### Three-Tier Safety Response
**Technical**: The SafetyCheckResult type uses a discriminated structure with `allowed: boolean`, optional `error` object (for blocking violations), and optional `warning` object (for non-blocking concerns).

**Plain English**: Think of a traffic light with an extra signal:
- **Green** (`allowed: true`, no error/warning): Proceed freely
- **Yellow** (`allowed: true`, warning present): You can go, but here's something to consider
- **Red** (`allowed: false`, error present): Stop, this action is not permitted

This three-tier approach lets the caller decide how to present feedback to users -- a blocking error might show a modal dialog, while a warning might show a subtle toast notification.

### Idempotent Reset
**Technical**: The `resetBranchCount` function deletes the session key entirely rather than setting it to zero, ensuring consistent behavior whether the key exists or not.

**Plain English**: Like completely removing someone's name from a waiting list rather than writing "0" next to it. Either way, they start fresh -- but removing the entry entirely means there's no ambiguity and the list stays clean.

**Why We Use It**: When a user creates manual content, they've demonstrated active engagement. We reward this by giving them a completely fresh slate for AI generation, not just a reset counter.

---

## Configuration Options

The SafetyGuard accepts configurable thresholds through `SafetyGuardOptions`:

| Option | Default | Purpose |
|--------|---------|---------|
| `maxUnitsPerRequest` | 3 | Maximum units any single AI generation can create |
| `maxConsecutiveBranches` | 3 | How many AI branches before user must contribute manually |
| `aiRatioWarningThreshold` | 0.4 | Percentage (40%) of AI content that triggers a warning |

These defaults encode product philosophy:
- **3 units per request**: Enough to offer meaningful variety, not so many that users lose track
- **3 consecutive branches**: Allows exploring an idea, but forces reflection before going deeper
- **40% AI ratio**: A minority, but substantial enough to prompt self-awareness

---

## Change History

### 2026-03-19 - Initial Implementation (Epic 5, Story 5.1)
- **What Changed**: Created SafetyGuard service with generation limits, consecutive branch tracking, and AI ratio monitoring
- **Why**: Implement guardrails to ensure AI assists rather than dominates user thinking
- **Impact**: Provides foundation for all future AI generation endpoints to enforce healthy usage patterns
