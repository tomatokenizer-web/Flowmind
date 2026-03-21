# DriftPanel

## Purpose

Displays drifting units for the current project in the sidebar and provides per-unit and bulk resolution actions. It is the primary UI for drift detection (Story 8.7) and the entry point for branching (Story 8.8).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `projectId` | `string` | — | UUID of the project to check for drift |
| `collapsed` | `boolean` | `false` | When true, renders a compact icon-only badge instead of the full panel |

## Modes

### Collapsed mode
Shows a single `AlertTriangle` icon with a numeric badge. Renders nothing if there are no drifting units.

### Expanded mode
A collapsible section with:
1. **Header row** — click to expand/collapse; shows drift count.
2. **"Branch all" button** — opens `BranchProjectDialog` pre-populated with all drifting unit IDs.
3. **Unit list** — one card per drifting unit showing:
   - Content preview (2-line clamp)
   - Drift score pill (warning/danger colour based on ≥85% threshold)
   - Unit type label
   - Three action buttons: Keep, Move back, Branch

## Actions

| Button | Behaviour |
|--------|-----------|
| Keep | Calls `resolveDrift` with `action: "keep"` — resets `driftScore` to 0 |
| Move back | Calls `resolveDrift` with `action: "move"` — reassigns unit to a context |
| Branch (per-unit) | Opens `BranchProjectDialog` with that single unit pre-selected |
| Branch all | Opens `BranchProjectDialog` with every drifting unit pre-selected |

## State

- `open` — whether the list is expanded.
- `branchDialogOpen` / `branchUnitIds` — control the `BranchProjectDialog`.

After any `resolveDrift` success, `getDriftUnits` is invalidated so the list refreshes. After a successful branch, the same invalidation runs to remove newly-branched units from the list.
