# NudgeBadge

## Purpose

A lightweight, client-side nudge indicator rendered on unit cards. It performs pattern-matching checks against the unit's existing data (no AI call required) and surfaces a small amber lightbulb icon with a tooltip when a potential issue is detected.

## Checks Performed

All checks are pure functions over the props — zero network requests.

| Check | Condition | Suggested action |
|-------|-----------|-----------------|
| Claim typed as question | `unitType === "claim"` and content ends with `?` or starts with an interrogative word | Change type to "question" |
| Isolated confirmed unit | `lifecycle === "confirmed"` and `relationCount === 0` | Connect to related thoughts |
| Short confirmed unit | `lifecycle === "confirmed"` and content length < 20 chars | Expand for clarity |

## Props

| Prop | Type | Description |
|------|------|-------------|
| `unitType` | `UnitType` | Prisma enum — the unit's current type |
| `content` | `string` | The unit's text content |
| `lifecycle` | `string` | Lifecycle state string (e.g. `"confirmed"`) |
| `relationCount` | `number` | Number of relations the unit has |

## Rendering

Returns `null` when no nudge applies (no DOM cost). When a nudge is detected, renders a `Lightbulb` icon wrapped in a Radix UI `Tooltip`. The tooltip message describes the specific issue.

## Usage

```tsx
<NudgeBadge
  unitType={unit.unitType}
  content={unit.content}
  lifecycle={unit.lifecycle}
  relationCount={unit.relationCount ?? 0}
/>
```

Placed in the metadata row of `UnitCard` alongside `FlowAlertBadge` and `DriftIndicator`.
