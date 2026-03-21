# UnitCardList

**Path:** `src/components/unit/unit-card-list.tsx`

## Purpose

Virtualized scrollable list of `UnitCard` components. Uses `@tanstack/react-virtual` to render only the cards currently visible in the viewport, keeping DOM size constant regardless of how many units a project contains.

## Key Behavior

- **Dynamic measurement**: After initial paint each row's real DOM height is measured via `measureElement`, so cards with varying content lengths (compact vs. expanded) are correctly positioned.
- **Overscan**: 5 extra rows are kept rendered above and below the viewport for imperceptible scroll performance.
- **Gap support**: The `gap` prop (default 12 px) is passed to the virtualizer so inter-card spacing is accounted for in position calculations.
- **Scroll container**: The component renders its own `overflow-y: auto` container. Pass an explicit `height` prop when the parent does not constrain height; otherwise it fills 100% of available space.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `units` | `UnitCardUnit[]` | required | Ordered array of unit data |
| `height` | `number` | `"100%"` | Scroll container height in px |
| `estimatedRowHeight` | `number` | `120` | Initial height estimate per row |
| `gap` | `number` | `12` | Gap between cards in px |
| `selectedUnitIds` | `Set<string>` | — | IDs of currently selected units |
| `onUnitClick` | `(unit, event?) => void` | — | Click handler (receives mouse event for shift-select) |
| `onLifecycleAction` | `UnitCardProps["onLifecycleAction"]` | — | Passed through to each card |
| `getOnRemoveFromContext` | `(unit) => (() => void) \| undefined` | — | Per-unit remove-from-context callback factory |
| `projectId` | `string` | — | Enables split functionality on cards |
| `listLabel` | `string` | `"Unit list"` | `aria-label` on the scroll container |

## Usage

```tsx
<UnitCardList
  units={visibleUnits}
  height={600}
  selectedUnitIds={selectedUnitIds}
  onUnitClick={handleUnitClick}
  onLifecycleAction={handleLifecycleAction}
  getOnRemoveFromContext={(unit) =>
    activeContextId
      ? () => removeUnit.mutate({ unitId: unit.id, contextId: activeContextId })
      : undefined
  }
  projectId={projectId}
  listLabel={context ? `Units in ${context.name}` : "All units"}
/>
```

## Integration Points

- Replaces the plain `Array.map` rendering in `context-view.tsx`.
- Each row gets `id="unit-{id}"` for the "continue where you left off" scroll-into-view feature in `ContextBriefing`.
- Accessibility: the container has `role="list"` and each row has `role="listitem"`, matching the previous non-virtual implementation.
