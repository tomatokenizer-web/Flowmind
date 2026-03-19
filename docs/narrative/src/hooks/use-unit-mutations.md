# Unit Mutations Hook

> **Last Updated**: 2026-03-19
> **Code Location**: `src/hooks/use-unit-mutations.ts`
> **Status**: Active

---

## Context & Purpose

This hook exists to solve a fundamental user experience problem: destructive operations should be reversible. When a user creates, edits, deletes, or reorders a unit in FlowMind, they expect to be able to press Cmd+Z (or Ctrl+Z) and have that action undone, just like in any modern productivity tool.

Rather than letting each component independently call tRPC mutations and separately manage undo logic, this hook centralizes that concern into a single place. Every unit mutation passes through here, and every mutation automatically records a snapshot to the undo stack before or after execution. This means any UI component that modifies units gets undo support "for free" simply by using this hook instead of calling tRPC directly.

**Business Need**: Users working with knowledge units need the confidence that accidental deletions, edits, or reorderings can be instantly reversed. Without this, a single misclick could destroy work with no recovery path short of refreshing the page or contacting support.

**When Used**: Any time a React component needs to create, update, delete, or reorder a unit within a specific project. The hook is instantiated with a `projectId` and returns wrapped mutation functions that are safe to call from event handlers, drag-and-drop callbacks, or form submissions.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/trpc/react.ts`: **api** -- the tRPC React client that provides `useMutation` and `useUtils` hooks for calling server-side procedures and invalidating cached queries
- `src/stores/undo-store.ts`: **useUndoStore** -- a Zustand store that maintains the undo/redo stacks; this hook calls `pushAction` to record each mutation as an undoable entry
- `src/lib/undo-actions.ts`: **UnitSnapshot** (type) -- the shape of data captured before a mutation, containing enough information (id, content, unitType, lifecycle, projectId) to fully reverse the operation

### Server-Side Chain (Indirect)

- `src/server/api/routers/unit.ts`: Defines the tRPC procedures (`unit.create`, `unit.update`, `unit.delete`, `unit.reorder`) that the mutations invoke over the network
- `src/server/services/unitService.ts`: Business logic layer that the router delegates to
- `src/server/repositories/unitRepository.ts`: Database access layer for unit persistence

### Dependents (What Needs This)

Currently no components have integrated this hook yet (it was recently created). It is designed to be consumed by any component that manipulates units, such as:
- Unit list views with inline editing
- Unit creation forms
- Drag-and-drop reorder interfaces
- Context menus with delete actions

### Data Flow

```
UI event (click, drag, form submit)
  --> useUnitMutations wrapper function (createUnit, updateUnit, etc.)
    --> pushAction() records snapshot to undo store (synchronous, instant)
    --> mutateAsync() sends request to tRPC server (asynchronous)
      --> onSuccess callback invalidates relevant query caches
        --> React Query refetches fresh data from server
          --> UI re-renders with updated state
```

For the **create** operation, the undo snapshot is pushed in `onSuccess` (after the server responds) because the unit's server-generated ID is needed. For **update**, **delete**, and **reorder**, the snapshot is pushed *before* the async call because all necessary data is already available from the caller.

---

## Macroscale: System Integration

### Architectural Layer

This hook sits at the **Client Application Logic Layer**, bridging three concerns:

- **Layer above (UI Components)**: Call simple functions like `createUnit("My note")` without knowing about tRPC or undo mechanics
- **This layer (Mutation Orchestration)**: Coordinates the tRPC call with undo stack recording and cache invalidation
- **Layer below (Server API)**: tRPC procedures that persist changes to the database

It is part of a broader pattern in FlowMind where hooks encapsulate side-effect orchestration so that components remain declarative and focused on rendering.

### Big Picture Impact

This hook is the **single gateway** for all unit write operations on the client. Its role in the system:

1. **Undo/Redo System**: Without this hook pushing actions to the undo store, the entire Cmd+Z undo feature for units would not function. The undo store itself is generic -- it only knows about action entries. This hook is what populates it with unit-specific actions.

2. **Cache Consistency**: After each mutation succeeds, the hook invalidates the relevant tRPC query caches (`unit.list`, `unit.hasAny`). This ensures that all components displaying unit data automatically refresh without manual coordination.

3. **API Surface Simplification**: Components do not need to understand tRPC mutation syntax, cache invalidation patterns, or undo action shapes. They call `deleteUnit(snapshot)` and everything else happens internally.

### Critical Path Analysis

**Importance Level**: High

- If this hook fails to push undo actions: Users lose the ability to reverse unit operations. No data loss occurs, but the "safety net" disappears.
- If the tRPC mutations fail: Unit changes are not persisted. The undo entry may still be recorded (for update/delete/reorder where pushAction runs first), creating a potential inconsistency between undo state and server state.
- If cache invalidation is skipped: The UI would show stale data until the user manually refreshes or navigates away and back.

**Failure mitigation**: The hook uses `mutateAsync` (which returns promises), allowing consuming components to catch errors and handle them. The undo store caps history at 50 entries to prevent unbounded memory growth.

---

## Technical Concepts (Plain English)

### tRPC Mutation Wrapping
**Technical**: Each raw `api.unit.*.useMutation` call is wrapped in a `useCallback` that adds undo stack integration and provides a simplified calling signature.
**Plain English**: Think of it like a gift-wrapping service. The raw mutation is the gift -- functional but bare. This hook wraps it with undo recording, cache cleanup, and a simpler label, so the recipient (UI component) gets a nicer package to work with.
**Why We Use It**: Prevents every component from reimplementing the same undo + invalidation boilerplate.

### Optimistic Undo Recording
**Technical**: For update, delete, and reorder operations, `pushAction` is called synchronously before `mutateAsync`, meaning the undo entry exists before the server confirms the operation.
**Plain English**: Like writing down what you are about to do in a journal before you actually do it. If you need to undo later, you already have the "before" state recorded, even if the server is still processing.
**Why We Use It**: Ensures the undo stack is immediately available. If the user performs an action and hits Cmd+Z within milliseconds, the entry is already there.

### Query Cache Invalidation
**Technical**: `utils.unit.list.invalidate()` and `utils.unit.hasAny.invalidate()` mark cached tRPC query results as stale, triggering automatic refetches by React Query (TanStack Query).
**Plain English**: Like telling a news ticker "your information is outdated, go check the source again." Any component displaying a list of units will automatically refresh its data after a mutation succeeds, without the component needing to know a mutation happened.
**Why We Use It**: Keeps the UI in sync with the database without manual refresh logic scattered across components.

### UnitSnapshot
**Technical**: A plain object capturing the essential fields of a unit (id, content, unitType, lifecycle, projectId) at a point in time, used to restore the unit to its previous state during undo.
**Plain English**: A photograph of a unit's state taken just before you change it. If you want to undo the change, you look at the photograph and restore everything to how it was.
**Why We Use It**: Undo requires knowing what the data looked like *before* the change. Without snapshots, there would be no way to reverse operations.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created the hook with four mutation wrappers (create, update, delete, reorder) and undo stack integration
- **Why**: FlowMind units needed a centralized mutation layer that automatically enables undo/redo for all write operations
- **Impact**: Any component consuming this hook gets Cmd+Z support without additional effort; establishes the pattern for future mutation hooks (relations, contexts, etc.)
