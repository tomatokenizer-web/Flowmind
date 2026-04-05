# DerivationSuggestions

> **Last Updated**: 2026-04-04
> **Code Location**: `src/components/unit/DerivationSuggestions.tsx`
> **Status**: Active

---

## Context & Purpose

This component provides AI-powered "next step" suggestions when a user is exploring a thought unit in FlowMind's navigation view. It answers the question every thinker faces: "I have this idea -- now what?" By analyzing the content and type of a unit, it generates 3-4 concrete derivation suggestions that the user can instantly turn into new linked units with a single click.

**Business/User Need**: FlowMind is a thinking tool, and thinking doesn't happen in isolation. Users need guidance on how to branch their ideas -- what questions to ask, what counterarguments to consider, what evidence to seek. Without this, users stare at a unit and wonder what to do next. This component acts as a thinking partner that reduces the "blank page" friction of knowledge work.

**When Used**: Appears inside the expanded variant of `UnitCard` in the derivation section. Critically, it uses a **lazy-loading pattern** (the AI query only fires when the user explicitly clicks to expand the section). This means the component renders as a lightweight toggle by default, consuming zero AI tokens until the user actively requests suggestions. This is a deliberate cost-control mechanism -- AI calls are expensive, and most users will only expand suggestions on units they're actively working with.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/trpc/react.ts`: `api.ai.suggestDerivations` -- the **tRPC query hook** (a type-safe API call mechanism) that fetches AI-generated derivation suggestions from the server
- `src/components/unit/unit-type-badge.tsx`: `UnitTypeBadge` -- renders the colored badge showing each suggestion's unit type (claim, question, evidence, etc.)
- `src/lib/utils.ts`: `cn()` -- **class name merge utility** (combines Tailwind CSS classes cleanly, resolving conflicts)
- `@prisma/client`: `UnitType` -- the TypeScript type definition for valid unit types, ensuring suggestions match the data model
- `lucide-react`: Icons for the sparkle indicator, expand/collapse chevrons, create button, and loading spinner

### Dependents (What Needs This)
- `src/components/unit/unit-card.tsx`: The parent component that renders `DerivationSuggestions` inside the expanded card variant. It passes `unitId`, `contextId`, `projectId`, and an `onCreateUnit` callback. When the user clicks "Create" on a suggestion, the parent handles the actual unit creation mutation and relation linking.

### Data Flow
```
User clicks expand toggle
    -> Component sets expanded=true
    -> tRPC query fires (enabled: expanded)
    -> Server fetches unit content + sibling context from database
    -> AI provider generates structured suggestions (or heuristic fallback)
    -> Response: array of { content, unitType, relationToOrigin, rationale }
    -> Component renders suggestion cards
    -> User clicks "Create" on a suggestion
    -> onCreateUnit callback fires in parent (unit-card.tsx)
    -> Parent creates new unit via createUnit mutation (lifecycle: "draft", originType: "ai_refined")
    -> Parent creates relation linking origin unit to new unit
    -> UI updates with toast confirmation
```

---

## Macroscale: System Integration

### Architectural Layer
This component sits at the **presentation layer** of FlowMind's AI assistance pipeline:

- **Layer 1 (UI)**: This component -- collapsible suggestion panel with create actions
- **Layer 2 (API)**: `src/server/api/routers/ai.ts` -- the `suggestDerivations` procedure that orchestrates the AI call
- **Layer 3 (AI Engine)**: `src/server/ai/provider.ts` -- the AI provider abstraction that calls the underlying LLM
- **Layer 4 (Data)**: Prisma database -- stores the unit content used as input and the newly created derived units

### Big Picture Impact
DerivationSuggestions is a key piece of FlowMind's **AI-augmented thinking** philosophy. The application treats knowledge not as static notes but as living thought graphs. This component is the primary mechanism by which users grow their thought graphs outward from existing units. It directly enables:

- **Thought branching**: Users can explore multiple angles from a single idea without having to formulate each branch themselves
- **Epistemic diversity**: The AI deliberately suggests different unit types and relation types (questions, counterarguments, supporting evidence) to push users beyond their default thinking patterns
- **Low-friction knowledge creation**: One click turns a suggestion into a first-class unit in the graph, complete with a typed relation back to its origin
- **Graceful degradation**: When no AI provider is configured, **heuristic fallback suggestions** (pre-written templates keyed by unit type) ensure the feature still provides value

### Critical Path Analysis
**Importance Level**: Medium-High

This is not a blocking component -- the application functions fully without it. However, it is one of the most visible AI features in the navigation view and a significant differentiator for FlowMind's value proposition. If this fails:
- **Silent failure**: The try/catch in the server procedure falls back to heuristic suggestions, so users always see something
- **AI unavailable**: Users see generic template suggestions instead of contextual ones -- reduced quality but not broken
- **Complete removal**: Users lose guided derivation, making thought graph expansion entirely manual. This doesn't break functionality but significantly increases the cognitive effort required to develop ideas

---

## Technical Concepts (Plain English)

### Lazy Query (enabled: expanded)
**Technical**: The tRPC `useQuery` hook is configured with `enabled: false` by default. The query only executes when the `expanded` state becomes `true`, preventing unnecessary network requests and AI token consumption.

**Plain English**: Like a vending machine that only starts making your coffee after you press the button -- it doesn't pre-brew every option just in case you might want one. The AI only thinks about suggestions when you actually ask for them.

**Why We Use It**: AI API calls cost real money (tokens). If every visible UnitCard immediately fetched derivation suggestions on render, a page with 20 units would fire 20 AI calls. The lazy pattern means zero AI calls until the user explicitly wants suggestions for a specific unit.

### Structured AI Output (generateStructured with Zod Schema)
**Technical**: The server uses `provider.generateStructured()` with a Zod schema (`DerivationSuggestionsSchema`) to constrain the AI's output to a typed object with specific fields, enums, and length limits. The schema caps the response at 4 suggestions, each with content (max 500 chars), a valid unit type, a valid relation type, and a rationale (max 200 chars).

**Plain English**: Instead of asking the AI to write a free-form essay and then trying to parse it, we give it a strict fill-in-the-blanks form. "Give me exactly these fields, pick from these options, stay within these limits." This ensures the response always fits perfectly into our UI without post-processing surprises.

**Why We Use It**: Unstructured AI output is unpredictable -- sometimes it returns JSON, sometimes prose, sometimes something in between. Structured output guarantees the response shape matches what the component expects, eliminating an entire category of runtime errors.

### Heuristic Fallback
**Technical**: When the AI provider throws an error (unavailable, rate-limited, misconfigured), the server catches the exception and returns pre-defined suggestion templates from a static `fallbacks` map keyed by the origin unit's type.

**Plain English**: Like a restaurant that has a "chef's special" when the regular menu can't be prepared -- it's not personalized to your taste, but it's still a reasonable meal. If the AI can't generate custom suggestions, you get sensible generic ones like "What evidence supports this claim?" for claim-type units.

**Why We Use It**: Ensures the feature never shows an error state to users. The quality degrades gracefully rather than failing completely.

### Event Propagation Stop (e.stopPropagation)
**Technical**: Both the expand toggle and create buttons call `e.stopPropagation()` to prevent click events from bubbling up to the parent `UnitCard`, which has its own click handler for selection/navigation.

**Plain English**: Like clicking a button inside a clickable card -- without stopping propagation, clicking "Create" would also trigger the card's click action (e.g., selecting the unit or opening a detail panel). The stop ensures each click does exactly one thing.

**Why We Use It**: The component is nested inside `UnitCard`, which has an `onClick` handler. Without propagation stopping, every interaction with DerivationSuggestions would also trigger the parent card's behavior, creating confusing double-actions.

---

## Change History

### 2026-04-04 - Initial Documentation
- **What Changed**: Created narrative documentation for existing component
- **Why**: Shadow Map documentation coverage for the unit component family
- **Impact**: Improves onboarding understanding of FlowMind's AI derivation pipeline
