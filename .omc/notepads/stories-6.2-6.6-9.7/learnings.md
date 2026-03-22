# Learnings: Stories 6.2, 6.6, 9.7

## Story 6.2 — Edge Rendering (GlobalGraphCanvas)

- Canvas render loop already had `category` → dash style logic; extended it with `weight` → strokeWidth table
- Arrow heads drawn manually with `ctx.lineTo` using `Math.atan2` angle computation; shortened source/target endpoints by `NODE_RADIUS` so lines stop at node boundary
- Animated dash offset for `contradicts`: `dashOffset = (performance.now() / 40) % 13` produces smooth 40ms/px animation; guarded by `prefersReducedMotion`
- `RELATION_TYPE_WEIGHT` covers all known relation types; unmapped types fall back to "medium"
- Legend SVGs updated to include arrow polygon markers to match canvas rendering

## Story 6.6 — Context Stats

- `getContextStats` added to `contextRouter`; computes all metrics in application layer (no SQL aggregates) — acceptable for context sizes (typically < 200 units)
- `unitType` is a Prisma enum (`UnitType`) but usable as `Record<string, number>` key in TypeScript since enum extends string
- `ContextStatsPanel` mounts in `context-view.tsx` just above `MissingArgumentAlert` when `activeContextId` is set and not loading
- Sparkline uses SVG `polyline` + `circle` per point; y-axis normalized to max value to handle sparse data cleanly
- Shadow docs created at `docs/narrative/src/components/dashboard/ContextStatsPanel.md`

## Story 9.7 — Project Dashboard

- `getProjectStats` added to `projectRouter`; uses `orderBy: { unitContexts: { _count: "desc" } }` for most active context — valid Prisma relational aggregate
- `ProjectStatsBar` mounts at top of default canvas view in `DashboardPage`, above `CompletenessCompass`
- "Create Context" quick action fires `flowmind:open-create-context` custom event (sidebar already listens for similar events pattern)
- "Start Capture" switches to canvas view and attempts to focus `[data-capture-bar]` after 100ms
- Template completion section renders only when project has a template with scaffold questions

## Patterns Noted

- All new tRPC endpoints follow `protectedProcedure.input(z.object({...})).query(...)` pattern
- `api.X.Y.useQuery({ ... }, { staleTime: N })` is consistent across dashboard components
- Custom events (`flowmind:fit-all`, `flowmind:open-create-context`) used for cross-component communication without prop drilling
