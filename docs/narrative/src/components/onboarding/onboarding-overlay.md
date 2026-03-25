# OnboardingOverlay

> **Last Updated**: 2026-03-24
> **Code Location**: `src/components/onboarding/onboarding-overlay.tsx`
> **Status**: Active

---

## Purpose

Orchestrates the full three-phase first-time user onboarding flow. Renders nothing for returning users. Mounts on the project workspace and drives the user from zero to their first captured thought.

## Phases

| Phase | Component | Trigger |
|-------|-----------|---------|
| `first-capture` | `FirstCaptureExperience` | `isFirstTime === true` on mount |
| `tour` | `TourTooltip` | `startTour()` called after first unit submits successfully |
| AI hint | `AIDecompositionHint` | `showAIHint` set to `true` on first capture success |

## Props

| Prop | Type | Description |
|------|------|-------------|
| `projectId` | `string` | Passed to the capture mutation to associate the first unit |

## Key Behaviors

- Returns `null` immediately for returning users (`!isFirstTime`) and while loading state resolves.
- The AI decomposition hint persists through the tour phase and can be independently dismissed.
- A skip button (bottom-right, fixed position) lets developers and testers bypass onboarding entirely via `skipTour()`. Uses a `lucide-react` `ArrowRight` icon rather than a raw Unicode arrow for consistent rendering.
- `startTour()` is delayed 600 ms after first capture success to allow the new unit card to render before the tooltip spotlight activates.

## State and Hooks

- `useOnboarding()` — provides `phase`, `isFirstTime`, `isLoading`, `startTour`, `completeTour`, `skipTour`, `tourStep`, `nextStep`, `totalSteps`.
- `showAIHint` — local boolean, set on mutation success, cleared on hint dismiss.
- `api.capture.submit` — tRPC mutation that persists the first unit; on success invalidates `unit.list` and triggers the tour.

## 2026-03-24 Changes

- Replaced Unicode arrow `→` in the skip button text with `<ArrowRight className="h-3.5 w-3.5 inline-block ml-1" />` from `lucide-react` for cross-platform rendering consistency.
