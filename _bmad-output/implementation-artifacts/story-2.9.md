# Story 2.9: Onboarding First-Time Experience

Status: ready-for-dev

## Story

As a new user,
I want a guided introduction that shows me the value of Flowmind immediately,
So that I understand the thought-unit paradigm without reading documentation.

## Acceptance Criteria

1. **Given** a user has signed in for the first time (no existing Units), **When** they land on the app, **Then** they see a clean, single-input view with "What are you thinking about?" as the placeholder — identical to Capture Mode but as the full-screen experience per UX-DR34
2. After submitting their first thought, a brief 3-step tooltip tour highlights: (1) their newly created Unit card, (2) the sidebar where Contexts will appear, (3) the view switcher in the toolbar
3. Each tooltip has a "Next" and "Skip" option
4. The tour completion state is stored in user preferences so it doesn't repeat
5. The first-input decomposition trigger is a placeholder — the actual AI decomposition comes in Epic 5 (Story 5.3 wires it), but a visual hint ("Later, AI will help you break this down into connected ideas") is shown per UX-DR34

## Tasks / Subtasks

- [ ] Task 1: Detect first-time user state (AC: #1)
  - [ ] Check if the authenticated user has zero Units in the database
  - [ ] Check user preferences for `onboardingCompleted` flag
  - [ ] Create `useOnboarding` hook: `src/hooks/useOnboarding.ts`
  - [ ] Return `{ isFirstTime, completeTour, skipTour }`
- [ ] Task 2: Create first-time landing experience (AC: #1)
  - [ ] Create `src/components/onboarding/FirstTimeExperience.tsx`
  - [ ] Full-screen centered input, identical to Capture Mode styling
  - [ ] Placeholder: "What are you thinking about?"
  - [ ] Clean, minimal — no sidebar, no toolbar, no distractions
  - [ ] Subtle Flowmind branding/logo above the input
  - [ ] Optional subheading: "Start by capturing your first thought"
- [ ] Task 3: Create tooltip tour system (AC: #2, #3)
  - [ ] Create `src/components/onboarding/TooltipTour.tsx`
  - [ ] Implement positioned tooltip component with arrow pointer
  - [ ] Support highlighting a target element (spotlight effect with backdrop dimming)
  - [ ] Step 1: Highlight the newly created UnitCard — "This is your first Thought Unit"
  - [ ] Step 2: Highlight the sidebar area — "Contexts help you organize related thoughts"
  - [ ] Step 3: Highlight the view switcher — "Switch between list, graph, and canvas views"
  - [ ] Each tooltip has "Next" (primary button) and "Skip" (text link)
  - [ ] Navigation: forward only (1 → 2 → 3 → done)
- [ ] Task 4: Show AI decomposition hint (AC: #5)
  - [ ] After first Unit creation, show a subtle info card below the Unit
  - [ ] Text: "Later, AI will help you break this down into connected ideas"
  - [ ] Styled as a soft informational callout (blue-50 bg, blue icon)
  - [ ] Dismissible with an X button
- [ ] Task 5: Persist onboarding state (AC: #4)
  - [ ] Add `onboarding_completed` boolean to user preferences (database or localStorage)
  - [ ] Set to `true` when tour is completed or skipped
  - [ ] Never show the tour again once completed/skipped
  - [ ] Add `onboarding_completed_at` timestamp for analytics
- [ ] Task 6: Create smooth transitions between states
  - [ ] First-time view → Capture submission → Unit appears → Tour starts
  - [ ] Each transition animated (fade/slide, 200-300ms)
  - [ ] Tour completion transitions to normal app view with sidebar visible
- [ ] Task 7: Write tests
  - [ ] Test first-time user detection (zero Units)
  - [ ] Test first-time landing view renders correctly
  - [ ] Test thought submission triggers tour
  - [ ] Test tooltip tour progresses through 3 steps
  - [ ] Test "Skip" ends tour and sets completion flag
  - [ ] Test tour doesn't appear for returning users
  - [ ] Test AI hint card is shown and dismissible

## Dev Notes

- The onboarding experience IS the Capture Mode, just presented as the full-screen default for first-time users
- Keep the tooltip tour lightweight — 3 steps maximum, each dismissible. Users hate long onboarding flows.
- The "spotlight" effect can be achieved with a dark overlay (rgba backdrop) with a cutout positioned over the target element
- Consider using `localStorage` for the onboarding flag for immediate reads, backed by a database field for cross-device consistency
- The AI decomposition hint is purely informational — no actual AI processing happens here. It sets user expectations for Epic 5.
- Test with both new users (zero Units) and existing users (should never see onboarding)

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — User preferences storage
- [Source: _bmad-output/planning-artifacts/architecture.md] — Zustand for UI state
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.9] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR34: First-time user experience specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR42: Animation timing
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR59: Capture Mode (reused for onboarding)
