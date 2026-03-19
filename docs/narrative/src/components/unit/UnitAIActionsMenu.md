# Unit AI Actions Menu

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/unit/UnitAIActionsMenu.tsx`
> **Status**: Active

---

## Context & Purpose

This component provides a dropdown menu of AI-powered analytical tools for individual thought units. It embodies FlowMind's philosophy that AI should serve as a **thinking partner** -- not generating content for users, but helping them examine their own ideas from different angles, stress-test their arguments, and surface hidden assumptions.

**Business Need**: When users capture thoughts, they often get stuck in one perspective. A claim might be better expressed as a question. An argument might rest on unstated premises. The same idea could connect differently to the rest of the knowledge graph depending on how it's framed. This menu gives users immediate access to AI-powered analytical tools that help them think more rigorously without leaving the unit context.

**When Used**: The sparkle icon button appears on unit cards and in unit detail views. Clicking it reveals four AI actions:
- **Alternative Framing**: When users want to explore different ways to express an idea (e.g., turning a claim into a question, or an observation into a hypothesis)
- **Counter-Arguments**: When users want to strengthen their argument by anticipating objections
- **Identify Assumptions**: When users want to surface the unstated premises their reasoning depends on
- **Stance Classification**: When users want AI help determining how one unit relates to another (supports, opposes, neutral, exploring)

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

**UI Components**:
- `~/components/ui/dropdown-menu`: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuTrigger` -- the container and items for the action menu
- `~/components/ui/dialog`: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` -- modal containers displaying AI results
- `~/components/ui/button`: `Button` -- action buttons within result dialogs (Replace, Add as New)

**API Layer**:
- `~/trpc/react`: The tRPC React client providing hooks for server communication. This component uses four mutations:
  - `api.ai.generateAlternativeFraming.useMutation()` -- requests alternative ways to express content
  - `api.ai.suggestCounterArguments.useMutation()` -- requests challenges to an argument
  - `api.ai.identifyAssumptions.useMutation()` -- requests identification of hidden premises
  - `api.ai.classifyStance.useMutation()` -- requests stance classification between two units

**Type Definitions**:
- `~/server/ai`: Types for AI response structures:
  - `AlternativeFraming` -- { reframedContent, newType, confidence, rationale }
  - `CounterArgument` -- { content, strength, targetsClaim, rationale }
  - `IdentifiedAssumption` -- { content, importance, isExplicit, rationale }
  - `StanceClassification` -- { stance, confidence, rationale, keyIndicators }

**Icons**:
- `lucide-react`: `Sparkles` (menu trigger), `RefreshCw` (framing), `MessageSquareWarning` (counter-arguments), `Lightbulb` (assumptions), `Scale` (stance), `Loader2` (loading), `Plus` (create new), `ChevronRight` (replace)

### Dependents (What Needs This)

Currently, this component is defined but not yet integrated into the codebase (no imports found). It is designed to be embedded in:

- **UnitCard** (`src/components/unit/unit-card.tsx`): As an action button in the card's toolbar
- **Unit Detail Panel**: As part of the unit editing interface
- **ThreadView** (`src/components/thread/ThreadView.tsx`): For AI actions on units within discussion threads

### Data Flow

```
User clicks Sparkles icon
    |
    v
DropdownMenu opens with 4 options
    |
    v
User selects action (e.g., "Alternative Framing")
    |
    v
Dialog opens + Mutation fires to /api/ai/generateAlternativeFraming
    |
    v
AI Service processes request via Claude API
    |
    v
Results returned: Array of AlternativeFraming objects
    |
    v
FramingResults component renders options with confidence scores
    |
    v
User chooses "Replace" or "Add as New"
    |
    v
Callback invoked: onUpdateUnit() or onCreateUnit()
    |
    v
Dialog closes, parent component handles persistence
```

---

## Macroscale: System Integration

### Architectural Layer

This component sits in the **Presentation Layer** of FlowMind's architecture, specifically in the "intelligent actions" category:

- **Layer 0**: Claude API (external AI provider)
- **Layer 1**: AI Service (`src/server/ai/aiService.ts` -- business logic for prompting and parsing)
- **Layer 2**: AI Router (`src/server/api/routers/ai.ts` -- tRPC endpoints with auth/validation)
- **Layer 3**: tRPC Client (`~/trpc/react` -- type-safe API hooks)
- **Layer 4**: **This Component** (UI for triggering and displaying AI analysis)
- **Layer 5**: Parent components (UnitCard, ThreadView -- embedding context)

### Big Picture Impact

This menu is a key differentiator for FlowMind's value proposition: **AI as thinking partner, not content generator**. Unlike AI writing tools that produce content for users, these actions help users think more rigorously about their own ideas:

1. **Intellectual Rigor**: Counter-arguments and assumption identification encourage users to stress-test their thinking, leading to stronger arguments and more robust reasoning.

2. **Flexible Expression**: Alternative framing helps users find the most appropriate form for their ideas -- sometimes a claim should be a question, or an observation should be framed as evidence.

3. **Relationship Clarity**: Stance classification helps users understand how their ideas relate to each other, improving the semantic accuracy of the knowledge graph.

4. **User Agency**: All results are presented as suggestions with confidence scores. Users choose whether to apply, modify, or ignore AI recommendations. The human remains in control.

**System Dependencies**: This component requires:
- Authenticated user session (all AI endpoints are protected procedures)
- Working Claude API connection
- Rate limits and quotas not exceeded (safety guard layer)

**Without this component**:
- Users would need to manually analyze their arguments for weaknesses
- Reframing ideas would require more cognitive effort
- Assumption identification would be entirely self-directed
- Relationship classification would rely solely on user judgment

### Critical Path Analysis

**Importance Level**: Medium (enhancement, not core functionality)

This is an **enhancement layer** -- FlowMind's core capture and organization features work without it. If the AI actions fail:
- Users can still create, edit, and organize units manually
- The knowledge graph remains fully functional
- Only the AI-assisted analysis features become unavailable

**Failure Modes**:
- API timeout: Loading state persists; user can close dialog and try again
- Rate limit exceeded: AI service returns error; should be communicated to user
- No results returned: EmptyState component displays "No results found"

---

## Technical Concepts (Plain English)

### tRPC Mutations

**Technical**: A `useMutation` hook from tRPC that triggers a server-side procedure with input validation, returning a promise that resolves with typed data or rejects with an error.

**Plain English**: Like ordering food at a restaurant -- you send your request (mutation), the kitchen processes it (server-side AI), and you receive your meal (typed response). Unlike just reading a menu (query), you're asking for something to be done.

**Why We Use It**: AI analysis is a "doing" action with external API costs, not a simple data fetch. Mutations are the appropriate semantic choice, and tRPC gives us type safety from frontend to backend.

### Confidence Scores

**Technical**: A floating-point number between 0 and 1 indicating the AI's estimated reliability of its output, used to help users assess suggestion quality.

**Plain English**: Like a weather forecast saying "70% chance of rain" -- the AI is telling you how sure it is. A 95% confidence suggestion deserves more consideration than a 50% one.

**Why We Use It**: Transparency about AI uncertainty helps users make informed decisions about which suggestions to trust. It's part of FlowMind's "AI as thinking partner" philosophy.

### Implicit vs. Explicit Assumptions

**Technical**: The `isExplicit` boolean in `IdentifiedAssumption` distinguishes between premises stated openly in the text versus those inferred from context or logical structure.

**Plain English**: Explicit assumptions are things you said out loud ("Assuming the market stays stable..."). Implicit assumptions are things you took for granted without saying ("This plan assumes we have budget" -- but you never mentioned budget).

**Why We Use It**: Implicit assumptions are often more dangerous because users may not realize they're making them. Surfacing them helps users examine their hidden reasoning.

### Stance Classification

**Technical**: Categorizing the dialectical relationship between two text units as one of: `support` (reinforces), `oppose` (contradicts), `neutral` (unrelated), or `exploring` (questioning/investigating).

**Plain English**: When you have two ideas, what's their relationship? Does Idea A back up Idea B? Challenge it? Have nothing to do with it? Or is Idea A exploring/questioning Idea B without taking a firm position?

**Why We Use It**: Knowledge graphs become more powerful when relationships are semantically meaningful. Knowing that Unit A *supports* Unit B versus *opposes* it changes how users navigate and reason about their ideas.

### Strength Indicators

**Technical**: The `strength` field in `CounterArgument` (0-1 float) represents how effectively a counter-argument challenges the original claim.

**Plain English**: A weak counter-argument is like saying "but have you considered it might rain?" to a plan for next month. A strong counter-argument points to a fundamental flaw in your reasoning. The strength score helps you focus on the objections that matter most.

**Why We Use It**: Not all counter-arguments deserve equal attention. By scoring strength, users can prioritize addressing the most potent challenges to their arguments.

---

## Component Architecture

### State Management

The component uses a single state variable `activeDialog` to track which result dialog (if any) is open:

```
activeDialog: null         -> No dialog open, menu can be used
activeDialog: "framing"    -> Alternative Framing dialog open
activeDialog: "counter"    -> Counter-Arguments dialog open
activeDialog: "assumptions"-> Assumptions dialog open
activeDialog: "stance"     -> Stance Classification dialog open
```

This "exclusive dialog" pattern ensures only one AI operation displays results at a time.

### Callback Pattern

The component accepts two optional callbacks:
- `onCreateUnit(content, type)`: Called when user chooses "Add as New" -- creates a new unit from AI suggestion
- `onUpdateUnit(id, updates)`: Called when user chooses "Replace" -- modifies the existing unit

This **inversion of control** (component reports user choices, parent handles persistence) keeps the component focused on UI concerns while allowing flexible integration with different state management approaches.

### Result Sub-components

Four specialized result renderers handle the different AI response types:

| Component | Response Type | User Actions |
|-----------|---------------|--------------|
| `FramingResults` | `AlternativeFraming[]` | Replace, Add as New |
| `CounterResults` | `CounterArgument[]` | Add as Unit |
| `AssumptionsResults` | `IdentifiedAssumption[]` | Add as Unit |
| `StanceResults` | `StanceClassification` | View only (informational) |

Each includes `LoadingState` (spinner) and `EmptyState` ("No results found") fallbacks.

---

## Design Decisions

### Why Separate Dialogs Instead of Inline Results?

**Decision**: Each AI action opens a modal dialog rather than expanding inline in the dropdown.

**Rationale**:
1. **Focus**: AI results deserve full attention, not cramped dropdown space
2. **Space**: Results can be lengthy (multiple alternatives, detailed rationale)
3. **Actions**: Users need room to compare options and take actions (Replace, Add as New)
4. **Consistency**: Matches the dialog-based pattern used elsewhere in FlowMind

### Why Mutations Instead of Queries?

**Decision**: All AI actions use `useMutation`, not `useQuery`, even though they don't persist data.

**Rationale**:
1. **Semantic accuracy**: These are "do something" operations (invoke AI), not "fetch cached data"
2. **No caching**: Results should be fresh each time (AI may give different suggestions)
3. **Explicit trigger**: Users must intentionally invoke the action, not load it automatically
4. **Cost awareness**: Mutations signal that this action has external API costs

### Why Optional targetUnit?

**Decision**: The `targetUnit` prop is optional, and Stance Classification only appears when it's provided.

**Rationale**: Stance classification requires two units to compare. In contexts where only one unit is selected (e.g., standalone unit card), the action doesn't make sense and is hidden.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created UnitAIActionsMenu with four AI actions: Alternative Framing, Counter-Arguments, Identify Assumptions, Stance Classification
- **Why**: Epic 5 Stories 5.5-5.7 and 5.15 require per-unit AI analysis tools accessible from unit context
- **Impact**: Enables AI-assisted argument analysis, assumption surfacing, and stance classification directly from unit UI
