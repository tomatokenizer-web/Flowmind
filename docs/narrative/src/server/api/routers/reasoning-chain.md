# reasoning-chain router

**Path:** `src/server/api/routers/reasoning-chain.ts`

## Purpose

tRPC router for managing ReasoningChain records. A reasoning chain represents a user-defined sequence of units that traces a logical path — premise → inference → conclusion — within a context.

## Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | mutation | Create a new chain for a context with optional initial steps |
| `getById` | query | Fetch a chain with step data enriched by unit content |
| `list` | query | List all chains for a context, ordered newest-first |
| `addStep` | mutation | Append a step (unitId + role + order) to an existing chain |
| `removeStep` | mutation | Remove a step by unitId |
| `reorderSteps` | mutation | Reorder all steps given an ordered array of unitIds |
| `delete` | mutation | Delete a chain entirely |

## Data Model

Steps are stored as a `Json` column on `ReasoningChain`. Each step has shape:

```ts
{ unitId: string, role: "premise" | "inference" | "conclusion", order: number }
```

`getById` enriches steps with the corresponding unit's `id`, `content`, `unitType`, and `lifecycle`.

## Authorization

All procedures verify that the chain's context belongs to a project owned by the authenticated user. Unauthorized access returns `FORBIDDEN`.

## Dependencies

- `@/server/api/trpc`: `createTRPCRouter`, `protectedProcedure`
- `@trpc/server`: `TRPCError`
- Prisma models: `ReasoningChain`, `Context`, `Unit`
