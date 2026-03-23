# project-context.tsx

## Purpose
React context provider that resolves and validates the active project ID for the authenticated user.

## Why
Multiple user accounts can share the same browser. The Zustand store persists `activeProjectId` in localStorage, but if the user switches accounts, the stored ID may belong to a different user. Without validation, all downstream tRPC queries (context.list, unit.list, project.getProjectStats, etc.) fail IDOR ownership checks with NOT_FOUND errors.

## How it works
1. Fetches the server default project via `getOrCreateDefault`
2. Fetches all user projects via `project.list` to validate the persisted ID
3. If the persisted ID isn't in the user's project list, resets to server default
4. Only exposes `projectId` once validated — downstream queries never fire with an invalid ID

## Key relationships
- **useProjectStore** (Zustand): persists `activeProjectId` in localStorage
- **useDefaultProject**: fetches/creates the user's default project via tRPC
- **Dashboard page**: consumes `useProjectId()` and `useProjectLoading()` to guard rendering
