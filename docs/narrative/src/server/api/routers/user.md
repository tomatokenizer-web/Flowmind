# userRouter

**Path:** `src/server/api/routers/user.ts`

## Purpose

tRPC router exposing user-profile-level procedures. Currently focused on onboarding state persistence so that progress is stored in the database and survives localStorage clears, browser changes, and multi-device use.

## Procedures

### `user.getOnboardingState` — query (protected)

Returns the authenticated user's current onboarding state from the database.

**Response shape:**
```ts
{ onboardingCompleted: boolean; onboardingStep: number }
```

Defaults to `{ onboardingCompleted: false, onboardingStep: 0 }` for rows that predate the migration.

### `user.saveOnboardingStep` — mutation (protected)

**Input:** `{ step: number }` (non-negative integer)

Updates `onboarding_step` for the current user. Called on each tour step advancement so the DB always reflects the furthest step reached.

### `user.completeOnboarding` — mutation (protected)

Sets `onboarding_completed = true` on the user row. Idempotent. Called when the user finishes or skips the tour.

## Integration

- Registered as `user` in `src/server/api/root.ts`.
- Consumed by `src/hooks/use-onboarding.ts` which uses `user.getOnboardingState` on mount and falls back to localStorage when the query is still loading or the user is unauthenticated.
- The `onboardingCompleted` and `onboardingStep` fields are added to the `User` Prisma model via the Story 2.9 migration.
