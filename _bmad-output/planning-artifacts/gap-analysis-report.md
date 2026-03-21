# FlowMind Gap Analysis Report

**Date:** 2026-03-19
**Scope:** Epic 1-4 (Stories marked "complete") vs. actual codebase
**Method:** AC-by-AC verification against source code

---

## Executive Summary

All 38 "complete" stories across Epic 1-4 were audited. **Every story has at least one gap.** Total gaps identified: **~80+**. They fall into 4 severity tiers:

| Tier | Count | Description |
|------|-------|-------------|
| **P0 - Blocking** | 8 | Core functionality missing or broken |
| **P1 - Major** | 15 | Significant feature gaps visible to users |
| **P2 - Moderate** | 25+ | Partial implementations, stubs, missing animations |
| **P3 - Minor** | 30+ | Tests missing, structural deviations, cosmetic |

---

## P0 - Blocking Issues (Fix First)

| # | Story | Gap | Impact |
|---|-------|-----|--------|
| 1 | **1.3** | Email magic link: `resend` package not installed, provider not configured in auth.ts | Auth flow broken for email users |
| 2 | **1.3** | Session strategy is `JWT` but spec requires `database` sessions | Security model divergence |
| 3 | **2.8** | Tiptap not integrated — Content tab uses plain `<textarea>` | Core editing experience degraded |
| 4 | **2.5** | Draft unit restrictions NOT enforced in relation/assembly service layer | Data integrity: drafts can leak into assemblies/relations |
| 5 | **3.5** | `ContextReference` model + entire cross-reference feature missing (model, API, UI) | Feature entirely absent |
| 6 | **4.7** | Chunk service has no tRPC router — backend unreachable from frontend | Feature entirely inaccessible |
| 7 | **4.4** | Graph depth slider shows 1-3 but only depth 1 implemented | Visible broken control |
| 8 | **4.10** | Keyboard graph navigation entirely absent (only ARIA container exists) | Accessibility requirement unmet |

---

## P1 - Major Issues (Fix Soon)

| # | Story | Gap |
|---|-------|-----|
| 1 | **2.5** | D/P/C keyboard shortcuts for lifecycle cycling not registered |
| 2 | **2.10** | Cmd+Z / Cmd+Shift+Z undo/redo shortcuts not registered |
| 3 | **2.2** | Heuristic-assigned types don't set lifecycle to "draft" |
| 4 | **3.2** | `usePerspective` hook missing; no stance/importance badges on UnitCard |
| 5 | **3.3** | Sidebar drag-to-reorder is a no-op stub; no keyboard navigation |
| 6 | **3.5** | Split context doesn't copy perspectives to sub-contexts |
| 7 | **3.8** | Focus mode Ctrl+Shift+F shortcut is cosmetic only (no event listener) |
| 8 | **3.8** | `useViewStatePreservation` only saves scroll (not selection/panels/filters/zoom), never integrated |
| 9 | **4.3** | Mini-map shows empty background (no node positions rendered) |
| 10 | **4.3** | Zoom not centered on cursor position |
| 11 | **4.5** | Relation type filter UI not wired (store exists, no component) |
| 12 | **4.5** | "Fit all" button resets to (0,0) instead of calculating bounding box |
| 13 | **4.6** | Custom relation type `created_by` missing — scope enforcement impossible |
| 14 | **4.9** | Cross-tab WebSocket sync not implemented (local store only) |
| 15 | **4.9** | No scroll-into-view or highlight animation on cross-view selection |

---

## P2 - Moderate Issues

### Epic 1
| Story | Gap |
|-------|-----|
| 1.5 | No axe-core accessibility testing integration |
| 1.7 | `FormField` inline validation component not implemented |
| 1.8 | Integration test directory structure doesn't match spec; no DB test helpers/factories |
| 1.9 | High-contrast mode toggle not implemented |
| 1.9 | No `browserslist` config in package.json |

### Epic 2
| Story | Gap |
|-------|-----|
| 2.1 | Unit content uniqueness (NFR12) not enforced |
| 2.3 | `UnitCardList` with TanStack Virtual not implemented |
| 2.7 | `unit.contentChanged` event not emitted (only `unit.updated`) |
| 2.7 | `UnitVersion` model lacks `origin_type` and `source_span` provenance fields |
| 2.8 | Panel slide-in animation missing (static div) |
| 2.8 | No Escape key handler in detail panel |
| 2.8 | No tablet/mobile responsive behavior |
| 2.9 | Onboarding only in localStorage (no DB persistence for cross-device) |
| 2.10 | Optimistic UI for drag reorder not implemented |
| 2.11 | No AnalyserNode waveform; no audio detail view with timestamp markers |

### Epic 3
| Story | Gap |
|-------|-----|
| 3.3 | No "Move" action in context menu (re-parent) |
| 3.4 | No cursor-based pagination on `listByContext` |
| 3.4 | No undo toast on "Remove from Context" |
| 3.6 | `recordVisit` not called on Context View mount |
| 3.6 | No debounced `updateLastViewedUnit` on scroll |
| 3.8 | Breadcrumb lacks Unit-level depth segment |

### Epic 4
| Story | Gap |
|-------|-----|
| 4.1 | Missing composite index on `(source_unit_id, target_unit_id, perspective_id)` |
| 4.1 | No `relation.created/updated/deleted` events (only `unit.updated`) |
| 4.2 | Category name mismatch: seed uses `structure` but code uses `structure_containment` |
| 4.2 | 3 relation type names differ from spec (precedes/supersedes/complements vs refutes/specifies/abstracts) |
| 4.3 | No Louvain community detection (natural force clustering only) |
| 4.3 | Canvas 2D used, not WebGL as documented |
| 4.3 | Tooltip missing lifecycle state |
| 4.4 | No transition animation between global/local layers |
| 4.4 | Clicking UnitCard in local view doesn't open detail panel |
| 4.5 | Disconnected nodes not dimmed to 30% on filter |
| 4.5 | No `prefers-reduced-motion` support in graph |
| 4.6 | Deleting in-use custom type doesn't set affected relations to "untyped" |
| 4.8 | Loopback edges not visually differentiated (no dashed lines) |
| 4.8 | No `unit.merged` event emitted |

---

## P3 - Minor Issues (Tests & Documentation)

**Tests missing across all epics:**
- Story 2.1, 2.3, 2.6, 2.10, 2.11 — no unit/integration tests
- Story 3.1-3.8 — virtually no tests for any context feature
- Story 4.x — no graph component tests

**Structural deviations:**
- 1.8: Tests in `src/__tests__/server/` instead of `__tests__/integration/`
- 1.9: Keyboard registry in hook instead of `lib/keyboard-registry.ts`
- 2.1: Lifecycle enum has 7 values (spec says 3) — exceeds spec, not a problem
- 2.9: All tasks unchecked despite working implementation

---

## Recommended Fix Order

### Phase 1: Core Functionality (P0)
1. Install `resend`, configure email provider, switch to database sessions → **Story 1.3**
2. Integrate Tiptap in Unit Detail Panel → **Story 2.8**
3. Add draft lifecycle enforcement in relation/assembly services → **Story 2.5**
4. Create `ContextReference` model + API + UI → **Story 3.5**
5. Expose chunk service via tRPC router → **Story 4.7**
6. Implement depth 2-3 queries for local graph → **Story 4.4**

### Phase 2: Key UX Gaps (P1)
7. Register all missing keyboard shortcuts (D/P/C, Cmd+Z, Ctrl+Shift+F) → **Stories 2.5, 2.10, 3.8**
8. Create `usePerspective` hook + wire stance/importance to UnitCard → **Story 3.2**
9. Fix graph controls: cursor-centered zoom, bounding-box fit, mini-map nodes → **Stories 4.3, 4.5**
10. Wire relation type filter UI to existing store → **Story 4.5**

### Phase 3: Polish (P2)
11. Animations: panel slide-in, graph layer transitions, card spring animations
12. Responsive breakpoints for detail panel
13. View state preservation hook completion + integration
14. Event bus completeness (relation events, content changed, merged)

### Phase 4: Quality (P3)
15. Test coverage across all epics
16. Accessibility: keyboard graph nav, axe-core, high-contrast mode
