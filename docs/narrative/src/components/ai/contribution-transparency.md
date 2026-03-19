# Contribution Transparency

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/ai/contribution-transparency.tsx`
> **Status**: Active

---

## Context & Purpose

This component displays the ratio of human-written content versus AI-generated content within a context, making AI involvement visible to users. It exists to support Flowmind's core philosophy: **AI should assist human thinking, not replace it**. When users can see exactly how much AI contributed to their knowledge base, they maintain agency over their intellectual output.

**Business Need**: Knowledge workers using AI tools face a subtle risk -- over-reliance on AI can erode independent thinking. By surfacing contribution metrics prominently, Flowmind nudges users toward balanced collaboration. The 40% threshold warning reflects a design decision that human-originated content should always constitute the majority of a knowledge base.

**When Used**:
- **Context dashboards**: Shows overall AI contribution for a project or topic
- **Canvas toolbars**: Compact indicator while working on a context
- **Export/share flows** (planned): Transparency badge showing content origin
- **Self-reflection checkpoints**: Helps users assess their thinking habits over time

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `~/trpc/react` (api): The tRPC React client that connects to the backend API. The component uses `api.ai.getContributionRatio.useQuery()` to fetch contribution metrics for a specific context.

- `~/components/ui/popover`: Provides the click-to-expand panel that shows detailed breakdown. Uses Radix-based Popover for accessible, collision-aware floating content.

- `~/lib/utils` (cn): Tailwind class merging utility for conditional styling (warning state colors, variant-specific layouts).

### Dependents (What Needs This)

- **Context views** (planned): Will embed this component in the canvas header or sidebar to show live contribution metrics while users work.

- **Dashboard cards** (planned): Project overview screens will use the compact variant to show AI involvement at a glance.

- **Export dialogs** (planned): May include contribution transparency badges on exported content to indicate AI involvement.

### Data Flow

```
Component mounts with contextId prop
    |
    v
tRPC useQuery fetches api.ai.getContributionRatio
    |
    v
Backend queries unitContext table, groups by originType
    |
    v
Returns: {total, userWritten, aiGenerated, aiRefined, ratio}
    |
    v
Component calculates percentages, determines warning state
    |
    v
Renders progress bar (or compact badge) with breakdown
    |
    v
User clicks --> Popover shows detailed contribution breakdown
```

---

## Macroscale: System Integration

### Architectural Layer

This component operates at **Layer 4 (Feature Components)** in Flowmind's frontend architecture:

- **Layer 5: Pages** (route-level containers)
- **Layer 4: Feature Components** -- **You are here** (AI feature widgets)
- **Layer 3: Domain Components** (Unit cards, Relation lines)
- **Layer 2: Composite UI** (Popover, Dialog, Command)
- **Layer 1: Primitive UI** (Button, Input, Badge)

It sits alongside other AI-specific components like `ai-suggestion-card.tsx`, forming the AI transparency and interaction layer.

### Big Picture Impact

This component embodies Flowmind's **Human-AI Balance Principle**. It enables:

- **Self-awareness**: Users see their collaboration patterns quantified
- **Behavioral nudging**: The 40% warning encourages original contribution
- **Trust through transparency**: No hidden AI involvement -- everything is visible
- **Intellectual integrity**: Users can confidently say their knowledge base reflects their thinking

**Design Philosophy Connection**:
The 40% threshold aligns with the Safety Guard's `maxAIRatioForContext` setting. Both the backend (blocking excessive AI generation) and frontend (warning display) reinforce the same value: human thought should dominate.

### Critical Path Analysis

**Importance Level**: Medium (for feature completeness), Non-blocking (for core functionality)

- **If this fails**: Users lose visibility into AI contribution, but can still use all other features
- **Graceful degradation**: Returns `null` when loading or no data -- silently absent rather than broken
- **No data loss**: This is a read-only display component with no mutation capabilities
- **Backend dependency**: Relies on `getContributionRatio` API -- if that fails, component simply does not render

---

## Technical Concepts (Plain English)

### Contribution Ratio

**Technical**: The ratio is calculated as `(aiGenerated + aiRefined) / total` on the backend, representing the proportion of AI-involved units within a context.

**Plain English**: If you have 10 thoughts in a project and AI helped write 3 of them, your ratio is 0.30 (30%). This component visualizes that number as a progress bar -- green for your contributions, blue for AI's.

**Why We Use It**: A single number summarizes the human-AI balance. Easier to grasp than "you wrote 7, AI generated 2, AI refined 1."

### Origin Type Classification

**Technical**: Each unit has an `originType` field distinguishing `direct_write` (user-authored), `ai_generated` (AI-created), and `ai_refined` (user-written, AI-improved).

**Plain English**: Like tracking who wrote each paragraph in a document -- you, AI, or "you with AI help." The component shows this breakdown visually.

**Why We Use It**: Users care about the degree of AI involvement. "AI refined" (editing your work) feels different from "AI generated" (creating from scratch). The detailed breakdown honors this distinction.

### 40% Warning Threshold

**Technical**: When `ratio > 0.4`, the component enters warning state -- changing colors from blue to amber and displaying guidance text.

**Plain English**: A yellow flag that says "AI is doing a lot of the work here." It is not blocking you, just reminding you that your knowledge base may be leaning too heavily on AI assistance.

**Why We Use It**: Soft intervention. The backend Safety Guard hard-blocks at 50%, but this visual warning at 40% gives users a chance to course-correct before hitting limits.

### Variant System (bar vs compact)

**Technical**: The `variant` prop switches between two rendering modes -- "bar" (full progress bar with legend) and "compact" (minimal badge showing percentages).

**Plain English**: Like choosing between a detailed chart and a quick number. Use "bar" when you have space (dashboards), use "compact" when you need it small (toolbars, headers).

**Why We Use It**: Different contexts need different information density. A canvas toolbar cannot afford a full progress bar, but a context overview page can.

### Popover Breakdown

**Technical**: Both variants include a `<ContributionBreakdown>` popover that shows exact counts for user-written, AI-generated, and AI-refined units.

**Plain English**: Click for details. The progress bar shows percentages at a glance; the popover shows the actual numbers behind them.

**Why We Use It**: Progressive disclosure. Most users only need the quick visual; curious users can dig into specifics.

---

## Visual Design Decisions

### Color Semantics

| Color | Meaning | State |
|-------|---------|-------|
| Emerald (green) | User-written content | Always |
| Blue | AI-involved content | Normal (< 40%) |
| Amber | AI-involved content | Warning (> 40%) |

The color shift from blue to amber provides an immediate visual signal without requiring users to read text.

### Progress Bar Segments

The bar variant renders three stacked segments:
1. **User written** (emerald-500): Always leftmost, representing human contribution
2. **AI generated** (blue-500 or amber-500): Full AI authorship
3. **AI refined** (blue-400 or amber-400): Lighter shade for "human + AI" collaboration

This gradient of shades conveys that refinement is a lighter form of AI involvement than full generation.

### Accessibility Considerations

- **ARIA progressbar**: The bar variant includes `role="progressbar"` with proper value attributes
- **Color + text**: Warning state uses both amber color AND text label ("AI > 40%") -- never color alone
- **Focus indicators**: Popover triggers are interactive buttons with focus states

---

## Implementation Patterns

### Early Return Pattern

```tsx
if (isLoading || !data || data.total === 0) {
  return null;
}
```

The component silently disappears when there is nothing meaningful to show. This prevents awkward empty states or loading spinners for a secondary indicator.

### Percentage Calculation

All percentages are `Math.round()`ed for display. Fractional percentages (47.3%) would suggest false precision for what is meant to be a quick mental model.

### Warning State Derivation

The `isWarning` boolean is derived from data (`ratio > 0.4`) rather than passed as a prop. This keeps the warning logic centralized and consistent with backend safety thresholds.

---

## Change History

### 2026-03-19 - Initial Implementation (Story 5.11)
- **What Changed**: Created ContributionTransparency component with bar and compact variants, popover breakdown, and 40% warning threshold
- **Why**: Story 5.11 requires visible AI contribution metrics to support human-AI balance philosophy
- **Impact**: Users can now see exactly how much AI contributed to their knowledge base in any context
