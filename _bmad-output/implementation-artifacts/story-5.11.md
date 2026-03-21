# Story 5.11: AI Contribution Transparency Display and Ratio Warnings

**Status: pending**

## Description
As a user,
I want to see the ratio of my own writing versus AI contributions in each Context,
So that I maintain awareness of how much of my thinking is genuinely mine versus AI-assisted.

## Acceptance Criteria

**Given** a Context with a mix of user-written and AI-generated Units
**When** the Context Dashboard or sidebar is viewed
**Then** a contribution transparency bar is displayed showing three segments: (a) directly written by user (green), (b) AI-generated then approved (blue), (c) AI-generated not yet approved (gray)
**And** percentage labels are shown for each segment

**Given** the contribution display is rendered
**When** the ratios are calculated
**Then** the calculation uses `origin_type` field: "direct_write" for user, "ai_generated"/"ai_refined" for AI, and lifecycle state for approval status

**Given** the AI-generated ratio in a Context exceeds 40%
**When** the threshold is crossed (checked after each AI generation)
**Then** a warning toast is shown: "AI contributions exceed 40% of this Context. Consider adding more of your own thoughts."
**And** the transparency bar's AI segment turns amber/warning color

**Given** a Unit with `ai_trust_level: "inferred"`
**When** it is displayed anywhere in the application
**Then** it shows an "AI Inference" badge (small, non-intrusive) next to the type indicator

**Given** the transparency display
**When** the user clicks on it
**Then** a detailed breakdown popover shows: total Unit count, user-written count, AI-generated approved count, AI-generated pending count, AI-refined count

**Given** the ratio warning has been shown
**When** the user dismisses it
**Then** the warning does not reappear until the ratio changes by more than 5 percentage points (avoids repeated interruption)

## Tasks
- [ ] Create `server/ai/contributionRatioService.ts` with `computeContributionRatio(contextId)` that queries Units by `origin_type` and lifecycle, returning `{ userWritten, aiApproved, aiPending, aiRefined, total, aiRatio }`
- [ ] Create tRPC query `ai.getContributionRatio` accepting `{ contextId }` that calls the ratio service
- [ ] Build `components/ai/ContributionTransparencyBar.tsx`: a horizontal segmented bar with three colored segments (green / blue / gray) and percentage labels
- [ ] Render amber color on the AI segment when `aiRatio > 0.40`
- [ ] Integrate the transparency bar into the Context Dashboard and Context sidebar header
- [ ] After each AI generation (in Story 5.1 safety guard), call the ratio service and trigger a warning toast if ratio crosses 40%
- [ ] Implement toast dismissal state: store `lastWarningRatio` in user session; only re-show warning when ratio changes by >5 percentage points from `lastWarningRatio`
- [ ] Add `AiInferenceBadge` component: a small tag/pill with "AI" text and an inference icon, rendered next to the type indicator on UnitCards when `ai_trust_level === "inferred"`
- [ ] Apply `AiInferenceBadge` to all locations where UnitCard type is displayed (UnitCard, Unit Detail Panel, sidebar list)
- [ ] Implement clickable transparency bar: clicking opens a `ContributionBreakdownPopover` showing the detailed counts (total, user-written, AI-approved, AI-pending, AI-refined)
- [ ] Add ARIA labels to the transparency bar segments for screen reader accessibility

## Dev Notes
- `origin_type` values to track: `direct_write` (user), `ai_generated` (AI, may be pending or approved), `ai_refined` (AI refinement of user content)
- "AI-generated approved" = `origin_type IN ('ai_generated', 'ai_refined') AND lifecycle = 'confirmed'`
- "AI-generated pending" = `origin_type IN ('ai_generated', 'ai_refined') AND lifecycle IN ('draft', 'pending')`
- The ratio query should be efficient — use a single GROUP BY query on `unit_context_memberships` joined with `units`
- The warning toast state (lastWarningRatio) can live in localStorage per context ID — no need for server persistence
- `AiInferenceBadge` should be visually small (12-14px font, compact padding) to avoid cluttering the UI

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: Safety guard returns `ai_ratio_warning` flag that triggers this display
- Story 5.4: `ai_trust_level: "inferred"` set on AI suggestions triggers the badge
- Story 5.10: "Epistemic Humility" badge is visually distinct from "AI Inference" badge
