# useOnboarding

**Path:** `src/hooks/use-onboarding.ts`

## Purpose

React hook that drives the first-time user onboarding flow. Determines whether a user is a first-time visitor, manages tour phase transitions, and persists progress to both the database (via tRPC) and localStorage (as a fallback for unauthenticated/offline states).

## State Machine

```
idle → first-capture → tour → completed
             ↑               ↗
         (zero units)   (skip)
```

- `idle`: initial; DB/localStorage not yet resolved.
- `first-capture`: user has zero units and has not completed onboarding; shows capture prompt.
- `tour`: step-by-step spotlight tour.
- `completed`: tour finished or skipped; onboarding hidden permanently.

## Persistence Strategy

| Layer | When used |
|-------|-----------|
| DB (`user.getOnboardingState`) | Primary source of truth for authenticated sessions |
| localStorage | Fallback when DB query is loading, fails, or user is unauthenticated |

On mount the hook queries `api.user.getOnboardingState`. Once resolved, DB values win. If the query errors or the user is not signed in, `localStorage` values are used instead. Both layers are written on every state change so they stay in sync.

## Key Exports

| Symbol | Description |
|--------|-------------|
| `OnboardingPhase` | Union type: `"idle" \| "first-capture" \| "tour" \| "completed"` |
| `useOnboarding()` | The hook itself; returns `UseOnboardingReturn` |

## `UseOnboardingReturn` Fields

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `OnboardingPhase` | Current phase |
| `isFirstTime` | `boolean` | True when user has zero units and onboarding not completed |
| `isLoading` | `boolean` | True while DB or units query is in-flight |
| `startTour` | `() => void` | Transition `first-capture → tour`, reset step to 0 |
| `completeTour` | `() => void` | Mark completed, transition to `completed` |
| `skipTour` | `() => void` | Same as `completeTour` |
| `tourStep` | `number` | Current 0-based step index |
| `nextStep` | `() => void` | Advance step; auto-completes on last step |
| `totalSteps` | `number` | Always `3` |

## Security Notes

- No credentials, secrets, or tokens are handled in this hook.
- The `alreadyCompleted` flag starts as `true` to prevent a flash of the onboarding UI before the DB query resolves.
- All tRPC mutations (`saveOnboardingStep`, `completeOnboarding`) are `protectedProcedure` — server enforces authentication; the client-side hook does not need to gate on auth state explicitly.
