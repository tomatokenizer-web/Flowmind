# EpistemicHumilityBanner

**Path:** `src/components/feedback/EpistemicHumilityBanner.tsx`
**Story:** 5.10 — Epistemic Humility Mode

## Purpose

Displays an inline warning banner when the content of a unit is detected as containing controversial topics or absolutist language. The goal is to nudge authors toward acknowledging multiple perspectives and qualifying strong claims.

## Behaviour

1. **Auto-detection**: When `content` changes, the component debounces (800 ms) and calls `api.ai.detectControversialTopic` — a heuristic tRPC mutation that checks for controversial keywords and absolute-language patterns without making an AI API call.
2. **Conditional render**: The banner only renders when `isControversial === true` and the user has not dismissed it.
3. **Collapsible suggestions**: A chevron button toggles a list of four actionable writing suggestions (add qualifying language, consider counterarguments, cite sources, hedge claims).
4. **Per-unit dismissal**: Clicking the X hides the banner. The dismissed state resets whenever `unitId` changes, so it reappears for new units.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Raw unit content (HTML or plain text) to analyse |
| `unitId` | `string` | Unit UUID — used to reset dismissal state on unit change |
| `className` | `string?` | Optional Tailwind class overrides |

## Integration

Mounted inside `UnitDetailPanel.tsx` → `ContentTab`, placed between the rich-text editor and the lifecycle controls. The banner auto-fires on every content keystroke (debounced), so the author sees the notice as they type without an explicit trigger.

## Detection logic

Handled server-side in `ai.detectControversialTopic` (no AI call):

- **Controversial keywords**: politics, religion, abortion, gun control, immigration, race, gender, climate change, vaccine, war, death penalty, etc.
- **Absolute-language patterns**: "everyone knows", "obviously", "clearly", "always", "never", "all X are", "no one", "undeniably", etc.

## Design notes

- Uses amber tones to signal a soft warning (not an error).
- Fully keyboard accessible (focus rings on all interactive elements).
- Works in both light and dark themes via `dark:` variants.
- Avoids re-triggering the mutation if the banner is already dismissed.
