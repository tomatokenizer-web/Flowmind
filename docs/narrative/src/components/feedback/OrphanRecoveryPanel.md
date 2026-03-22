# OrphanRecoveryPanel

**Path:** `src/components/feedback/OrphanRecoveryPanel.tsx`
**Story:** 8.3 — Orphan Unit Recovery

## Purpose

Sidebar panel that lists units belonging to a project that have no context membership and no assembly membership. These "orphan" units risk being lost; the panel gives the user quick triage actions without leaving the main workspace.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `projectId` | `string` | UUID of the current project |
| `collapsed` | `boolean` | When true, renders a compact icon badge instead of the full list |

## Behavior

- Queries `feedback.getOrphanUnits` on mount (skipped when `projectId` is empty).
- Hides itself entirely when there are no orphans and loading is complete.
- In collapsed mode shows an `Unlink` icon with a numeric badge (capped at "9+").
- In expanded mode renders a collapsible section header; clicking it toggles the unit list.
- Each unit shows:
  - Content preview (2-line clamp)
  - Unit type, creation age ("3 days ago"), and a "fully isolated" warning when the unit also has no relations
  - Three triage actions:
    - **Incubate** — calls `recoverOrphan` with action `"incubate"`; marks the unit as incubating so it surfaces in the incubation queue.
    - **Archive** — calls `recoverOrphan` with action `"archive"`; sets lifecycle to `archived`.
    - **Delete** — calls `recoverOrphan` with action `"delete"`; permanently removes the unit.
- On success, invalidates both `feedback.getOrphanUnits` and `incubation.list` so sibling UI reflects the change.

## Data flow

```
OrphanRecoveryPanel
  └── api.feedback.getOrphanUnits (query)   →  OrphanUnit[]
  └── api.feedback.recoverOrphan (mutation) ←  Incubate / Archive / Delete
```

## Isolation score

The server computes `isolationScore`:
- `1.0` — unit has no relations at all (fully isolated)
- `0.5` — unit has at least one relation but no context or assembly membership

The panel shows the "fully isolated" label only when `isolationScore >= 1`.

## Mount point

Rendered inside `src/components/layout/sidebar.tsx` alongside the drift panel and similar-units panel, below the navigator section and above the bottom nav.
