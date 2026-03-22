# ExternalKnowledgePanel

**Path:** `src/components/ai/ExternalKnowledgePanel.tsx`
**Story:** 5.15 — External Knowledge Search

## Purpose

Provides a collapsible panel that lets users discover related knowledge for a selected unit. It uses the Anthropic AI's training knowledge (via `api.ai.searchExternalKnowledge`) to surface relevant concepts, topics, and reading directions — this is not a live web search.

## Behaviour

1. **Collapsed by default**: The panel renders as a single header row with a "Related Knowledge" label. Clicking it toggles the body open.
2. **Pre-filled query**: When the panel opens, the query input is pre-populated with the first 200 characters of the unit's plain-text content (HTML tags stripped).
3. **Custom queries**: The user can edit the query field and press Enter or click "Search" to re-run.
4. **Suggestion cards**: Each result renders as a `SuggestionCard` showing title, description, and an expandable "Why relevant" section.
5. **Add as Unit**: Each card has an "Add as Unit" button that calls `onAddAsUnit` with `"<title>: <description>"` as the initial content, letting the caller create a new unit from the suggestion.
6. **Related concepts**: Concept chips below the cards act as one-click re-query shortcuts — clicking a chip fills the query and immediately fires a new search.
7. **Unit change reset**: When `unitId` changes, the query resets to the new unit's content so results stay contextually relevant.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `unitId` | `string` | UUID of the active unit — used to key the query reset effect and passed to the tRPC mutation |
| `unitContent` | `string` | Raw HTML content of the unit; stripped to plain text for the default query |
| `onAddAsUnit` | `(content: string) => void` (optional) | Callback invoked when user clicks "Add as Unit" on a suggestion |
| `className` | `string?` | Optional Tailwind class overrides |

## Integration

Mounted inside `UnitDetailPanel.tsx` → `AITab`, rendered after the existing AI refinement and branch-potential sections. It is always visible to users regardless of AI intensity level since it is an on-demand (not proactive) feature.

## API dependency

Calls `api.ai.searchExternalKnowledge` (tRPC mutation in `src/server/api/routers/ai.ts`).

- Input: `{ query: string, unitId?: string }`
- Output: `{ suggestions: Array<{ title, description, relevance }>, relatedConcepts: string[] }`
- The server uses `getAIProvider().generateStructured` with a structured JSON schema prompt.
- Errors (credit exhaustion, invalid key) are surfaced via `toast.error`.

## Design notes

- Chevron icon on each suggestion card independently controls that card's relevance disclosure.
- All interactive elements have visible focus rings for keyboard accessibility.
- Loading state shows a spinner with descriptive text; empty-initial state shows a brief prompt.
- No auto-fetch on mount — the user must explicitly trigger a search to avoid unnecessary API calls.
