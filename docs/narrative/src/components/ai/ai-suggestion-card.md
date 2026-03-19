# AI Suggestion Card

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/ai/ai-suggestion-card.tsx`
> **Status**: Active

---

## Context & Purpose

This module provides the visual presentation layer for AI-generated suggestions in Flowmind. When the AI service analyzes a user's newly created thought unit and proposes a classification (type) or connections to other units (relations), this component renders that suggestion in a non-intrusive, dismissible card format that invites user review without demanding immediate attention.

**Business Need**: Flowmind's value proposition centers on reducing cognitive friction -- users should be able to capture thoughts rapidly without pausing to classify or connect them. However, the system cannot automatically apply AI classifications without user consent (that would violate the "human-in-the-loop" principle). This component bridges that gap: it presents AI intelligence as a gentle suggestion the user can accept with one click or dismiss without consequence.

**When Used**:
- After a user creates a new unit in Capture Mode or via direct creation, when background AI analysis completes
- When the AI detects potential relationships between a new unit and existing units in the same context
- Anywhere the application needs to surface AI-inferred values that require user confirmation

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `react` (useState, useCallback): Core React hooks for managing local UI state (expanded reasoning, dismissing animation).

- `lucide-react` (Check, X, Sparkles): Icon library providing visual indicators. The Sparkles icon signals "AI-originated," creating consistent visual language across all AI features.

- `framer-motion` (motion, AnimatePresence): Animation library enabling smooth entrance, exit, and expand/collapse transitions. Crucial for the "polished, Apple-like" experience specified in UX requirements.

- `~/lib/utils` (cn): The class merging utility that safely combines base styles with consumer-provided classNames without Tailwind conflicts.

- `~/components/ui/button` (Button): The foundational button component used for Accept and Dismiss actions, ensuring visual consistency with the rest of the Flowmind design system.

### Dependents (What Needs This)

- `src/components/ai/index.ts`: The barrel export that makes these components available to the rest of the application via a clean import path.

- **Planned consumers** (as Story 5.4 integration progresses):
  - Unit detail panels: Will display type suggestions below newly created units
  - Context view: Will show relation suggestions when units enter a context
  - Capture mode: May show inline suggestions as thoughts are captured

### Data Flow

**Suggestion Display Flow**:
```
AI Service generates suggestion (type or relation)
    |
    v
Parent component receives suggestion data
    |
    v
AISuggestionCard mounted with {type, suggestion, confidence, reasoning}
    |
    v
Framer Motion animates card entrance (opacity + y-translate)
    |
    v
User sees: badge (Type/Relation), suggestion text, confidence indicator
    |
    +--[Click "Show reasoning"]--> AnimatePresence expands reasoning text
    |
    +--[Click "Accept"]--> onAccept callback fired --> parent updates unit
    |
    +--[Click "Dismiss"]--> isDismissing = true --> exit animation --> onDismiss callback
```

**Badge Display Flow**:
```
Component with AI-inferred value (e.g., type badge)
    |
    v
AIInferenceBadge rendered inline
    |
    v
User sees: small "AI" badge with sparkles icon
    |
    v
Hover shows tooltip: "This value was suggested by AI"
```

---

## Macroscale: System Integration

### Architectural Layer

This component operates at the **Presentation Layer** of Flowmind's AI feature stack:

- **Layer 4: This component (Presentation)** -- You are here
- Layer 3: tRPC procedures expose AI suggestions to frontend
- Layer 2: AI Service orchestrates provider + safety guard
- Layer 1: AI Provider communicates with Claude API
- Layer 0: Anthropic Claude (external system)

The component follows the **Presentational Component Pattern** (contains no business logic, only receives data and emits events). It does not know about tRPC, AI services, or databases -- it simply displays whatever suggestion data it receives and fires callbacks when the user acts.

### Big Picture Impact

This component is the **human-AI handoff point** for suggestion features. It embodies Flowmind's core philosophy:

- **AI assists, humans decide**: Suggestions are presented, never auto-applied
- **Transparency**: Confidence levels and reasoning are visible, not hidden
- **Non-intrusive**: Dashed borders and soft blue tones signal "optional, not urgent"
- **Graceful dismissal**: Unwanted suggestions disappear without friction or guilt

The component enables:
- **Story 5.4**: AI type and relation suggestions for units
- **Future stories**: Any AI feature that requires user confirmation before applying

Without this component:
- AI suggestions would have no visual presence in the UI
- Users would lack a standardized way to accept/dismiss AI proposals
- The application would need ad-hoc suggestion UIs for each feature

### Critical Path Analysis

**Importance Level**: High (for AI feature UX), Non-blocking (for core functionality)

This component is **essential for AI feature usability** but has **zero impact on core Flowmind functionality**. Users can create, classify, and connect units entirely manually without ever seeing this component.

**Failure modes**:
- If animation library fails: Component still renders, just without smooth transitions
- If icons fail to load: Accept/Dismiss buttons remain functional with text labels
- If component fails entirely: AI suggestions cannot be displayed (feature degraded, not broken)

**Blast radius**: Contained to AI suggestion features only.

---

## Technical Concepts (Plain English)

### Confidence Level Color Coding
**Technical**: A three-tier visual system that maps confidence scores (0-1) to semantic colors: emerald (>=0.8), amber (>=0.5), and tertiary text (<0.5).

**Plain English**: Like a traffic light for AI certainty. Green means "the AI is very confident," yellow means "the AI thinks this is probably right," and gray means "the AI is guessing." Users can decide whether to trust suggestions based on this visual signal.

**Why We Use It**: Not all suggestions deserve equal attention. A 95% confidence type suggestion is nearly certain; a 45% confidence one warrants skepticism.

### AnimatePresence for Exit Animations
**Technical**: Framer Motion's AnimatePresence component tracks when children are removed from the React tree and delays their unmounting until exit animations complete.

**Plain English**: Normally, when you remove something from a React page, it just vanishes instantly. AnimatePresence adds a "goodbye" animation -- the card fades out and shrinks before actually disappearing. This feels polished rather than abrupt.

**Why We Use It**: Instant disappearance feels jarring, especially for something the user just interacted with. The fade-out confirms "your dismiss action worked."

### Delayed Dismiss Callback
**Technical**: The dismiss handler sets `isDismissing = true` immediately but delays calling `onDismiss()` by 200ms to allow the exit animation to play.

**Plain English**: Instead of calling the parent immediately (which would unmount the component mid-animation), we start the animation first, then notify the parent after the visual effect completes. The user sees a smooth exit rather than a cut.

**Why We Use It**: Coordinates visual feedback with data updates. The animation provides closure while the callback handles business logic.

### Dashed Border Visual Language
**Technical**: The card uses `border-dashed border-blue-300` to visually distinguish it from regular content cards.

**Plain English**: The dashed line says "this is temporary and optional" -- like a placeholder or suggestion. Solid borders mean "this is real content." Dashed borders mean "this is waiting for your decision."

**Why We Use It**: Visual hierarchy. Users should instantly recognize suggestion cards as different from committed content without reading labels.

### Type vs Relation Badge
**Technical**: A small pill badge displays either "Type" or "Relation" to indicate what the suggestion is proposing.

**Plain English**: Two different kinds of AI help: "Type" suggestions classify what kind of thought this is (question, claim, evidence, etc.). "Relation" suggestions propose how this thought connects to other thoughts. The badge tells users which kind of suggestion they are looking at.

**Why We Use It**: One component handles both use cases. The badge distinguishes them without duplicating the entire UI.

### AI Inference Badge (AIInferenceBadge)
**Technical**: A minimal inline badge component that marks any value as AI-suggested, following FR30 requirements.

**Plain English**: A tiny "AI" label with a sparkle icon that appears next to any value the AI contributed. Like a watermark that says "the AI suggested this, not the user." Used throughout the app wherever AI-inferred values appear.

**Why We Use It**: Transparency. Users should always know when they are looking at AI-contributed content versus their own writing.

---

## Design Decisions

### Why Two Components in One File
The `AISuggestionCard` and `AIInferenceBadge` are co-located because they share visual language (blue color scheme, Sparkles icon) and purpose (marking AI contributions). However, they serve different roles:
- `AISuggestionCard`: Displays suggestions requiring user action (accept/dismiss)
- `AIInferenceBadge`: Marks already-applied AI values (informational only)

This co-location makes it easy to maintain consistent styling and import both from the same path.

### Why No Loading State
The component assumes the suggestion data is already available when mounted. Loading states are handled by the parent component that fetches AI suggestions. This keeps the suggestion card focused on presentation.

### Why Expandable Reasoning
Not all users want to see AI explanations. Power users who trust the system may accept suggestions without reading reasoning. Skeptical users can expand to understand why the AI proposed this. The expandable design satisfies both without cluttering the default view.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created AISuggestionCard and AIInferenceBadge components for Story 5.4
- **Why**: AI type and relation suggestions need a consistent, polished UI for user review and action
- **Impact**: Enables the presentation layer for all AI suggestion features throughout Flowmind
