# AI Insights Panel

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/ai/AIInsightsPanel.tsx`
> **Status**: Active

---

## Context & Purpose

This component serves as Flowmind's **AI analysis dashboard** -- a dedicated panel where users can request and view multiple types of AI-powered insights about their thinking context. Rather than having AI suggestions scattered throughout the interface, this panel centralizes all AI analysis capabilities in one accessible location.

**Business Need**: When users build complex arguments or knowledge structures, they often cannot see the forest for the trees. They may miss contradictions between their claims, overlook gaps in their reasoning, or fail to notice that several units are essentially expressing the same idea. The AI Insights Panel addresses this by offering a suite of analytical tools that examine the user's context from multiple angles -- summarizing the overall argument, identifying logical weaknesses, suggesting improvements, and extracting key terminology.

**When Used**:
- **During active thinking sessions**: Users open this panel when they want AI feedback on their current context's argument structure
- **Before finalizing an argument**: A "sanity check" to catch contradictions, missing evidence, or unclear terms
- **When feeling stuck**: The "Next Steps" and "Questions" tabs provide prompts to continue productive thinking
- **During knowledge consolidation**: The "Merge" tab helps identify redundant units that can be combined

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `~/trpc/react` (api): The tRPC client hook that connects this component to the server's AI router. All seven insight types flow through this client.

- `~/components/ui/button` (Button): Reusable button component for "Run Analysis" and "Re-scan" actions.

- `~/server/ai` (type imports): TypeScript interfaces defining the shape of each insight type:
  - `ContradictionPair`: Pairs of units that logically conflict
  - `MergeSuggestion`: Units that could be combined
  - `CompletenessAnalysis`: Argument completeness score with missing elements
  - `ContextSummary`: Main thesis, key points, and open questions
  - `GeneratedQuestion`: AI-proposed questions to deepen thinking
  - `NextStepSuggestion`: Prioritized actions to improve the argument
  - `ExtractedTerm`: Key terminology with importance ratings

- `lucide-react` (icons): Visual indicators for each tab and insight type (Sparkles, BookOpen, CheckCircle2, AlertTriangle, Merge, HelpCircle, Target, Lightbulb, Loader2, ArrowRight).

### Dependents (What Needs This)

- **Context Canvas / Main Panel** (planned integration): The primary workspace view will mount this panel alongside the canvas, allowing users to reference AI insights while editing their context.

- **Context Detail View**: When viewing a specific context, this panel appears in the right sidebar providing analytical tools.

### Data Flow

**Summary Tab (Auto-Fetching)**:
```
Panel renders with Summary tab active
    |
    v
useQuery(summarizeContext) fires automatically
    |
    v
Server aggregates all units in context --> Claude generates summary
    |
    v
Returns { mainThesis, keyPoints, openQuestions, conflictingViews }
    |
    v
SummaryView renders structured display
```

**On-Demand Tabs (User-Triggered)**:
```
User switches to Completeness/Contradictions/Merge/Questions/NextSteps/Terms tab
    |
    v
Panel displays "Run [Analysis Type]" button (no auto-fetch)
    |
    v
User clicks button --> mutation fires
    |
    v
Server fetches units --> Claude analyzes --> Returns structured insights
    |
    v
Corresponding view component renders results
    |
    v
User can click "Re-analyze"/"Re-scan"/"Refresh" to run again
```

**Interactive Actions**:
```
User views Contradictions --> clicks "View Unit A" or "View Unit B"
    |
    v
onNavigateToUnit(unitId) callback fires --> parent navigates to unit

User views Questions/Terms --> clicks "Add as Unit" or "Define"
    |
    v
onCreateUnit(content, type) callback fires --> parent creates new unit
```

---

## Macroscale: System Integration

### Architectural Layer

This component operates at **Layer 4 (Feature Components)** in Flowmind's frontend architecture:

- **Layer 5: Pages** (route-level containers)
- **Layer 4: Feature Components** -- **You are here** (AI Insights Panel)
- **Layer 3: Domain Components** (Summary/Completeness/Contradictions views)
- **Layer 2: Composite UI** (Button, LoadingState)
- **Layer 1: Primitive UI** (icons, text styling)

The panel is a **compound component** -- it orchestrates seven distinct sub-views (SummaryView, CompletenessView, ContradictionsView, MergeView, QuestionsView, NextStepsView, TermsView), each tailored to present a specific type of AI analysis.

### Big Picture Impact

This panel transforms Flowmind from a passive note-taking tool into an **active thinking partner**. It enables:

- **Argument Quality Assurance**: Users can verify their reasoning is complete and consistent before sharing or acting on it
- **Blind Spot Detection**: AI identifies contradictions and gaps that users may overlook due to cognitive biases
- **Knowledge Consolidation**: Merge suggestions reduce redundancy and clarify the core argument
- **Thinking Prompts**: Generated questions and next steps help users push past creative blocks
- **Terminology Clarity**: Extracted terms ensure key concepts are properly defined

**Design Philosophy Connection**:
Flowmind's AI philosophy is "assistant, not author." This panel embodies that principle by offering *analysis* and *suggestions* rather than auto-generating content. Every insight presented here requires user action to incorporate -- the AI proposes, the user decides.

### Critical Path Analysis

**Importance Level**: High (for AI-assisted workflow), Optional (for core functionality)

- **If this panel is unavailable**: Users can still create, organize, and connect units manually. The knowledge graph functionality remains intact. However, the analytical capabilities that differentiate Flowmind from simpler tools become inaccessible.

- **If a single tab fails**: Other tabs remain functional. Each insight type is an independent mutation/query with isolated error handling.

- **If the AI service is unavailable**: All tabs show loading states indefinitely or error states. The panel cannot function without the backend AI service.

**Dependency Chain**:
```
AIInsightsPanel
    --> tRPC Client (api)
        --> AI Router (ai.ts)
            --> AI Service (aiService.ts)
                --> AI Provider (Claude API)
```

---

## Technical Concepts (Plain English)

### Query vs Mutation Pattern

**Technical**: The Summary tab uses `useQuery` (auto-fetches when enabled), while all other tabs use `useMutation` (fires only when explicitly triggered).

**Plain English**: Summary is "always ready" -- like a car that starts itself when you open the door. Other insights are "on-demand" -- like appliances you must turn on yourself. This saves API costs by not running expensive analyses until the user explicitly requests them.

**Why We Use It**: AI analysis calls cost money and take time. Auto-fetching everything would waste resources. The Summary tab auto-fetches because it is the default view and provides immediate value. Other tabs wait for explicit user intent.

### Tab-Based Analysis Architecture

**Technical**: Seven distinct insight types presented in a tabbed interface, each with its own sub-component, data shape, and visual treatment.

**Plain English**: Think of it like a dashboard with different instruments -- speedometer, fuel gauge, temperature gauge. Each "instrument" (tab) shows different information about your argument, and you switch between them to get the full picture.

**Why We Use It**: Different types of analysis serve different needs. Contradictions need side-by-side comparison UI. Completeness needs a score with missing elements list. Questions need "add to context" actions. Separate tabs keep each analysis type focused and actionable.

### Severity/Priority Color Coding

**Technical**: Each insight type uses a consistent color scheme for severity or priority levels -- red for high/direct, amber for medium/tension, gray for low/potential.

**Plain English**: Like traffic lights for your thinking. Red means "pay attention to this first" (direct contradiction, high-priority missing element). Yellow means "be aware" (tension, medium priority). Gray means "nice to know" (potential issue, low priority).

**Why We Use It**: Visual hierarchy helps users triage insights. With many suggestions on screen, color coding provides instant scanning ability.

### Callback Props for Integration

**Technical**: `onCreateUnit` and `onNavigateToUnit` are callback props allowing parent components to handle user actions without the panel needing to know about routing or state management.

**Plain English**: When you click "Add as Unit" on a question, the panel does not create the unit itself. Instead, it calls the parent and says "the user wants to create a unit with this content." The parent handles the actual creation. This keeps the panel flexible -- it can work with different parent implementations.

**Why We Use It**: **Inversion of Control** (letting the parent decide how to handle actions). The panel focuses on displaying insights; creation and navigation are external concerns.

### Conditional Data Fetching with `enabled`

**Technical**: `api.ai.summarizeContext.useQuery({ contextId }, { enabled: activeTab === "summary" })` only runs when the Summary tab is active.

**Plain English**: The panel does not pre-load summary data while you are looking at another tab. It waits until you actually switch to Summary before fetching. This prevents unnecessary API calls when users jump straight to other tabs.

**Why We Use It**: Token/cost efficiency. Users who open the panel specifically for contradiction detection should not incur summary generation costs.

### Run-Once-Then-Cache Pattern

**Technical**: Mutation results persist in React Query's cache until the user explicitly clicks "Re-analyze" or switches contexts. No automatic refetching.

**Plain English**: Once you run an analysis, the results stick around. You do not need to wait for it to load again if you switch tabs and come back. If you want fresh results (perhaps after editing units), you manually re-run the analysis.

**Why We Use It**: AI analyses are expensive and context-dependent. Users should control when to spend that cost. Automatic refetching would be wasteful and confusing.

---

## Sub-Component Overview

### SummaryView

Displays the AI-generated context summary including main thesis, key points, open questions, and conflicting views. This is the only auto-fetching tab, providing immediate value when the panel opens.

### CompletenessView

Shows an argument completeness percentage score with a color-coded indicator (green/amber/red based on thresholds). Lists missing elements (evidence, counterarguments, definitions, examples, assumptions) with priority badges. Includes suggestions for improvement.

### ContradictionsView

Displays pairs of contradicting units with severity badges (direct, tension, potential). Each pair shows a description and suggested resolution. Interactive buttons allow navigating to either unit involved in the contradiction.

### MergeView

Lists units that AI suggests could be combined. Shows the number of units to merge, confidence score, rationale, and a preview of the proposed merged content. Helps users consolidate redundant thoughts.

### QuestionsView

Presents AI-generated questions to deepen the user's thinking. Questions are categorized by type (clarifying, challenging, exploratory, connecting) with color-coded badges. Users can add questions directly to their context as new units.

### NextStepsView

Shows prioritized action suggestions for improving the argument. Each suggestion has a type (research, define, challenge, connect, expand, resolve), priority level, and rationale. Helps users know what to work on next.

### TermsView

Extracts key terminology from the context with importance ratings (key, supporting, peripheral). Terms flagged as needing definition can be quickly added as definition units with one click.

---

## Implementation Notes

### Helper Components

The file includes four utility components that provide consistent styling across all tabs:

- **Section**: Renders a titled section with uppercase label styling
- **LoadingState**: Centered spinner animation during API calls
- **EmptyState**: Simple text message for empty/pending states
- **RunButton**: Centered call-to-action button with Sparkles icon for triggering analysis

### No External State Management

The panel manages all state internally via React hooks (`useState` for active tab) and tRPC query/mutation hooks. It does not depend on Zustand stores or React context, making it highly portable and testable.

### Type Safety Through Shared Types

All insight data shapes are imported from `~/server/ai`, ensuring frontend and backend stay in sync. TypeScript will catch mismatches at compile time.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created the AI Insights Panel with seven analysis tabs: Summary, Completeness, Contradictions, Merge, Questions, Next Steps, and Terms
- **Why**: Part of the AI-assisted thinking features enabling users to receive structured feedback on their argument quality
- **Impact**: Users can now access a comprehensive AI analysis toolkit from a single panel, improving argument completeness and consistency
