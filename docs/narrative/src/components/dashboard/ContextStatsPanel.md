# ContextStatsPanel

**Path:** `src/components/dashboard/ContextStatsPanel.tsx`
**Story:** 6.6 — Context Dashboard Stats

## Purpose

Renders a compact analytics panel for a single context, surfacing key metrics, unit-type distribution, and a 7-day activity sparkline. Intended to be mounted inside the context view or context dashboard to give users an at-a-glance understanding of the health and composition of their context.

## Data Source

Calls `api.context.getContextStats` (tRPC query, 30 s stale-time) with `{ contextId }`.

The endpoint returns:

| Field | Description |
|---|---|
| `unitCount` | Total units in the context |
| `claimCount` | Units with type `claim` |
| `evidenceCount` | Units with type `evidence` |
| `questionCount` | Units with type `question` |
| `relationCount` | Relations whose both endpoints belong to the context |
| `avgRelationsPerUnit` | `relationCount * 2 / unitCount`, rounded to 1 dp |
| `recentActivity` | Array of `{ date, unitCount }` for the last 7 days |
| `topContributingTypes` | Up to 5 `{ type, count, pct }` sorted by count desc |

## Sub-components

### `StatCard`
Pill-style metric card with an icon, numeric value, optional subtitle, and a semantic color variant (`default | primary | success | warning | info`).

### `TypeDistribution`
Horizontal bar chart showing the percentage share of each unit type. Colors match `UNIT_TYPE_COLORS` from `GlobalGraphCanvas` (via the local `TYPE_COLORS` record).

### `ActivitySparkline`
SVG polyline drawn over a 120×28 px canvas. Each of the 7 points maps a day to a normalized y-position. Points with `unitCount > 0` render as larger filled circles. Axis labels show `MM-DD` for the first and last day.

## Loading / Empty States

- While loading: skeleton placeholders for the heading and four stat cards.
- If `stats` is null (query error or no data): renders nothing (`null`).

## Accessibility

- Wrapper `<div>` carries `role="region"` and `aria-label="Context analytics"`.
- The SVG sparkline carries `role="img"` and an `aria-label`. Each data point has a `<title>` with the date and count.

## Usage

```tsx
import { ContextStatsPanel } from "~/components/dashboard/ContextStatsPanel";

<ContextStatsPanel contextId={activeContextId} className="mt-4" />
```

Mount in `context-view.tsx` below the context header when `activeContextId` is defined, or inside `ContextDashboard.tsx` as a supplementary analytics section.
