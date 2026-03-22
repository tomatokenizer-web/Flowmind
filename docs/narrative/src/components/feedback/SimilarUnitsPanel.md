# SimilarUnitsPanel

**Path:** `src/components/feedback/SimilarUnitsPanel.tsx`
**Story:** 8.2 — Similar Claim Compression

## Purpose

Sidebar panel that surfaces pairs of units with high textual overlap (>=70% Jaccard similarity) within a project, allowing the user to merge, keep, or dismiss each pair without leaving the main workspace.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `projectId` | `string` | UUID of the current project |
| `collapsed` | `boolean` | When true, renders a compact icon badge instead of the full list |

## Behavior

- Queries `feedback.detectSimilarUnits` on mount (skipped when `projectId` is empty).
- Hides itself entirely when there are no active pairs and loading is complete.
- In collapsed mode shows a `Copy` icon with a numeric badge (capped at "9+").
- In expanded mode renders a collapsible section header; clicking it toggles the pair list.
- Each pair shows both content previews, a similarity percentage pill, and three actions:
  - **Merge** — calls `feedback.compressClaims` with the shorter of the two contents as the core; invalidates the query on success.
  - **Keep Both** — client-side dismiss (adds key to local `dismissed` Set).
  - **Dismiss** — same as Keep Both; removes the pair from the visible list without any server call.

## Data flow

```
SimilarUnitsPanel
  └── api.feedback.detectSimilarUnits (query)  →  { pairs[] }
  └── api.feedback.compressClaims (mutation)   ←  Merge action
```

## Mount point

Rendered inside `src/components/layout/sidebar.tsx` between the orphan indicator and the drift panel, visible only when `projectId` is defined and `!collapsed` (or when collapsed with pairs to show).
