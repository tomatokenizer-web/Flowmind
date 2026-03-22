# ReasoningChainPanel

**Path:** `src/components/assembly/ReasoningChainPanel.tsx`

## Purpose

Collapsible panel in the context view that allows users to create, browse, and edit reasoning chains. A reasoning chain is an ordered sequence of units tagged with a logical role (premise, inference, conclusion) that traces a line of argument through a context.

## Sub-components

### `ChainView`
Shows a single chain's steps as a vertical flow with directional arrows between steps. Each step displays a role badge and unit content. Steps can be removed individually. A form at the bottom lets the user pick a role + unit from the context to append as a new step.

### `CreateChainForm`
Inline form with a name field (required) and goal field (optional). On submit calls `api.reasoningChain.create` and navigates into the new chain's `ChainView`.

### `ReasoningChainPanel` (main)
- Collapsed by default; lists all chains for the context once opened.
- Each list item shows name, optional goal, and step count.
- Clicking a list item navigates to `ChainView`.
- A "New chain" button opens `CreateChainForm`.

## Step Role Color Coding

| Role | Color |
|------|-------|
| premise | blue |
| inference | amber |
| conclusion | green |

## Props

| Prop | Type | Description |
|------|------|-------------|
| `contextId` | `string` (UUID) | Context whose reasoning chains are displayed |

## tRPC Calls

| Call | When |
|------|------|
| `api.reasoningChain.list` | On panel open |
| `api.reasoningChain.getById` | On chain selection |
| `api.reasoningChain.create` | On create form submit |
| `api.reasoningChain.addStep` | On "Add" in ChainView |
| `api.reasoningChain.removeStep` | On step trash button |
| `api.reasoningChain.delete` | On chain trash button |
| `api.context.getById` | To populate the unit picker in ChainView |

## Dependencies

- `~/trpc/react`: `api`
- `~/components/ui/button`: `Button`
- `~/lib/utils`: `cn`
- `lucide-react`: `ChevronDown`, `GitBranch`, `Plus`, `Trash2`, `ArrowDown`
