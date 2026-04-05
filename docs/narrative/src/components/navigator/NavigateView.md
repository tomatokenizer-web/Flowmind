# NavigateView

## Purpose

`NavigateView` is a full-width wrapper component that renders `NavigatorPanel` as a dedicated view mode. It replaces the previous approach of embedding the Navigator inside the sidebar (constrained to 260px) by giving it a centered, readable layout with proper spacing.

## Location

`src/components/navigator/NavigateView.tsx`

## Props

| Prop | Type | Description |
|------|------|-------------|
| `projectId` | `string` | The active project ID, passed through to `NavigatorPanel` |
| `contextId` | `string` | The active context ID, passed through to `NavigatorPanel` |

## Usage

This component is rendered by the dashboard and context pages when `viewMode === "navigate"`. It is not used inside the sidebar.

```tsx
<NavigateView projectId={projectId} contextId={activeContextId} />
```

## Layout

- `h-full overflow-y-auto` — fills the available viewport height and scrolls internally
- `max-w-3xl mx-auto px-6 py-6` — centers content with comfortable reading width and padding

## Related

- `NavigatorPanel` — the underlying panel that provides navigator functionality
- `layout-store.ts` — `ViewMode` union now includes `"navigate"`
- `toolbar.tsx` — Navigate button (Compass icon) added to the view mode switcher
