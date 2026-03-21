# Story 5.3: DecompositionReview Component

**Status: pending**

## Description
As a user,
I want to review AI-proposed decomposition boundaries with visual overlays and adjust them before accepting,
So that I maintain full control over how my text is broken into Thought Units.

## Acceptance Criteria

**Given** the AI has proposed decomposition boundaries (Story 5.2)
**When** the DecompositionReview component renders
**Then** the original text is displayed with highlighted boundary overlays showing where each proposed Unit starts and ends
**And** each proposed Unit section has a type-colored badge (UX-DR2 colors) showing the proposed type

**Given** the boundary overlays are displayed
**When** the user clicks "Accept" on an individual proposed Unit
**Then** that Unit transitions from proposal to draft lifecycle in the database
**And** the accepted section's overlay changes from dashed to solid border
**And** a physics-based card settling animation plays as the Unit "drops" into the confirmed area

**Given** the boundary overlays are displayed
**When** the user clicks "Reject" on a proposed Unit
**Then** that proposal is discarded and the text section returns to unprocessed state
**And** adjacent Units' boundaries are not affected

**Given** a boundary between two proposed Units
**When** the user drags the boundary handle left or right
**Then** the text content of both adjacent Units updates in real time as the boundary moves
**And** the boundary snaps to sentence boundaries by default (with an option to snap to word boundaries)

**Given** the user has finished reviewing all proposals
**When** some are accepted and some rejected
**Then** an "Accept All Remaining" button processes all unreviewed proposals at once
**And** a summary shows: N accepted, M rejected, K modified

**Given** the DecompositionReview is displayed
**When** the user changes a proposed Unit's type via the type badge dropdown
**Then** the badge color updates to match the new type and the proposal is updated

**Given** the physics-based card settling animation
**When** an accepted Unit animates into the confirmed area
**Then** the card drops with a spring easing (200ms per UX-DR8) and slight bounce
**And** if prefers-reduced-motion is enabled, the card simply appears without animation

**Given** the DecompositionReview component
**When** it renders
**Then** all interactive elements are keyboard accessible (Tab through proposals, Enter to accept, Delete to reject, arrow keys to move boundary)
**And** screen readers announce each proposal's content and type

## Tasks
- [ ] Create `components/ai/DecompositionReview.tsx` component accepting `proposals` array and `originalText` as props
- [ ] Implement text overlay rendering: map character positions from proposals to highlighted spans within the original text display
- [ ] Style boundary overlays with dashed border (proposed) and solid border (accepted) using CSS classes matching UX-DR2 type colors
- [ ] Add type-colored badge component per proposed Unit section using the existing unit type color system
- [ ] Implement per-proposal Accept button: calls tRPC `unit.create` with `lifecycle: "draft"` and `origin_type: "ai_generated"`, then updates overlay style
- [ ] Implement per-proposal Reject button: removes the proposal from local state, restores text section to unprocessed appearance
- [ ] Build draggable boundary handle using pointer events — update adjacent proposals' `start`/`end` character positions on drag
- [ ] Implement sentence-boundary snapping: on drag end, snap to nearest sentence boundary (detect via period/question/exclamation + whitespace)
- [ ] Add word-boundary snap toggle option
- [ ] Implement "Accept All Remaining" button that batch-creates all unreviewed proposals as draft Units
- [ ] Show post-review summary toast: "N accepted, M rejected, K modified"
- [ ] Implement type badge dropdown that updates proposal's `unitType` in local state and re-colors the badge
- [ ] Add spring animation (200ms, slight bounce) for card settling using Framer Motion or CSS spring transition
- [ ] Add `prefers-reduced-motion` media query check and disable animation when enabled
- [ ] Implement full keyboard navigation: Tab between proposals, Enter to accept, Delete to reject, Arrow keys to nudge boundary
- [ ] Add ARIA labels and live region announcements for screen readers

## Dev Notes
- Character position mapping must handle multi-byte Unicode characters correctly — use `Array.from(text)` not `text.length` for indexing
- The draggable boundary handle should have a minimum drag target size of 24x44px for touch accessibility
- Sentence boundary snapping regex: `/[.!?]\s+/` — find the nearest match within ±50 chars of the drag release position
- Physics animation: use `spring({ stiffness: 300, damping: 20 })` in Framer Motion for the card drop
- Store proposal review state in component-local state (not global store) — only commit to DB on Accept
- The component should be rendered in a modal or side panel overlay, not inline in the main editor
- Batch "Accept All" should fire a single tRPC `unit.createMany` mutation, not N individual mutations

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.2: AI Text Decomposition provides the proposals this component reviews
- Story 5.1: Safety guard enforces the 3-unit-per-request limit upstream
- Story 5.14: Accepted proposals may appear in the AI Suggestion Queue
