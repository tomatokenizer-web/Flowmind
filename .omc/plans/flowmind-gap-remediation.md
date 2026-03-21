# FlowMind Gap Remediation & Feature Implementation Plan

**Plan ID**: PLAN-2026-001
**Created**: 2026-03-19
**Status**: draft
**Total Gaps**: ~80 items across Epics 1-4
**Source Files**: 218 TypeScript/TSX files
**Architecture**: Next.js 15 + tRPC + Prisma + Anthropic AI

---

## Overview

6-phase prioritized plan to remediate ~80 gaps in Epics 1-4, then build Epics 5-10.
Priority order: Security > Data Integrity > Core UX > AI Infrastructure > Polish > New Features.

---

## Phase 0: 보안 긴급 패치 (Security Emergency)

**Goal**: Eliminate active security vulnerabilities before any other work.
**Estimated Duration**: 1 day
**Parallelizable**: All tasks independent

### Task 0.1: API Key Rotation & Env Hardening
- **Effort**: S
- **Description**: Rotate ANTHROPIC_API_KEY immediately. Add `ANTHROPIC_API_KEY` to `.env.example`. Add `ANTHROPIC_API_KEY` to `env.js` via `@t3-oss/env-nextjs` server schema with `z.string().min(1)`.
- **Files**: `.env`, `.env.example`, `src/env.js`
- **Acceptance**: env.js validates ANTHROPIC_API_KEY at startup; .env.example documents all required vars
- **Dependencies**: None

### Task 0.2: Prompt Injection Mitigation
- **Effort**: M
- **Description**: Audit `src/server/ai/aiService.ts` (1281 lines). Identify all user-content interpolation points. Wrap user content in XML delimiter tags (`<user_content>...</user_content>`). Add system prompt instructions to ignore instructions within user content. Sanitize angle brackets in user input.
- **Files**: `src/server/ai/aiService.ts`
- **Acceptance**: No raw user string appears in system prompts; all user content delimited
- **Dependencies**: None

### Task 0.3: Unsafe JSON Parsing → Zod Validation
- **Effort**: M
- **Description**: Find all `JSON.parse(...) as T` patterns in AI service and replace with Zod schema validation. Create response schemas for each AI endpoint return type.
- **Files**: `src/server/ai/aiService.ts`, potentially router files
- **Acceptance**: Zero `as T` casts on parsed JSON; all AI responses validated through Zod schemas
- **Dependencies**: None

### Task 0.4: In-Memory Session Guard Fix
- **Effort**: S
- **Description**: Replace `Date.now()` session ID with crypto-random UUID. Move session tracking from in-memory Map to database or Redis-backed store (for serverless compatibility). If Redis not available, use Prisma-backed session table as interim.
- **Files**: `src/server/ai/safetyGuard.ts`
- **Acceptance**: Session tracking survives serverless cold starts; session IDs are cryptographically random
- **Dependencies**: None

---

## Phase 1: 데이터 무결성 & 핵심 기능 복원 (Data Integrity & Core Feature Restoration)

**Goal**: Fix P0 blocking issues that prevent core features from functioning.
**Estimated Duration**: 1-2 sprints (5-10 days)

### Task 1.1: Email Auth Repair (Story 1.3)
- **Effort**: L
- **Description**: Install `resend` package. Configure email provider in NextAuth. Resolve JWT vs DB session mismatch - standardize on DB sessions via `@auth/prisma-adapter` (already installed). Ensure session strategy is `"database"` not `"jwt"`.
- **Files**: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `package.json`
- **Acceptance**: Email magic link login works end-to-end; sessions persist in DB
- **Dependencies**: Task 0.1 (env vars must be stable first)
- **Parallelizable**: Yes, with Tasks 1.2-1.5

### Task 1.2: Tiptap Rich Text Integration (Story 2.8)
- **Effort**: L
- **Description**: Replace plain textarea in unit detail panel with Tiptap editor. Tiptap packages already installed (`@tiptap/react`, `@tiptap/starter-kit` found in node_modules). Create `RichTextEditor` component with StarterKit. Wire to unit content save via tRPC mutation. Add slide-in animation (framer-motion available), Escape handler to close, responsive breakpoints.
- **Files**: `src/components/panels/UnitDetailPanel.tsx`, new `src/components/editor/RichTextEditor.tsx`
- **Acceptance**: Rich text editing with bold/italic/lists; content saves; panel slides in; Escape closes
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 1.3: Draft Lifecycle Enforcement (Story 2.5)
- **Effort**: M
- **Description**: Add lifecycle checks in `relationService.ts` and `assemblyService.ts`. Draft units cannot be added to assemblies. Draft units cannot have confirmed relations. Enforce at service layer, not just UI.
- **Files**: `src/server/services/relationService.ts`, `src/server/services/assemblyService.ts`
- **Acceptance**: Attempting to create relation/assembly with draft unit returns error; existing tests pass
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 1.4: ContextReference Model & Cross-Reference Feature (Story 3.5)
- **Effort**: XL
- **Description**: Add `ContextReference` model to Prisma schema (references between contexts). Create migration. Build `contextReferenceService.ts`. Add tRPC router. Build cross-reference UI in context view. Ensure split context copies perspectives.
- **Files**: `prisma/schema.prisma`, new `src/server/services/contextReferenceService.ts`, new `src/server/api/routers/context-reference.ts`, `src/components/context/context-view.tsx`
- **Acceptance**: Users can create cross-references between contexts; references display in context view; split copies perspectives
- **Dependencies**: None
- **Parallelizable**: Yes, with Tasks 1.1-1.3

### Task 1.5: Chunk Service tRPC Router (Story 4.7)
- **Effort**: S
- **Description**: `chunkService.ts` exists but has no tRPC router. Create `src/server/api/routers/chunk.ts` with CRUD operations. Register in app router.
- **Files**: new `src/server/api/routers/chunk.ts`, `src/server/api/routers/` (root router file)
- **Acceptance**: Chunk operations callable via tRPC; existing chunk logic accessible from frontend
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 1.6: Graph Depth Slider Fix (Story 4.4)
- **Effort**: M
- **Description**: Graph depth slider shows 1-3 but only depth 1 is implemented. Implement recursive neighbor fetching for depth 2 and 3 in graph data query. Add layer transition animation.
- **Files**: `src/components/graph/GraphView.tsx`, `src/components/graph/GlobalGraphCanvas.tsx`, related tRPC query
- **Acceptance**: Depth 2 shows neighbors-of-neighbors; depth 3 adds one more layer; smooth transition between depths
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 1.7: Keyboard Graph Navigation (Story 4.10)
- **Effort**: M
- **Description**: Implement arrow key navigation between graph nodes. Tab to cycle nodes. Enter to select/open. Escape to deselect. Use existing keyboard shortcut infrastructure in `use-keyboard-shortcuts.ts`.
- **Files**: `src/components/graph/GlobalGraphCanvas.tsx`, `src/hooks/use-keyboard-shortcuts.ts`
- **Acceptance**: Full keyboard navigation of graph; focus ring visible on selected node; accessible
- **Dependencies**: None
- **Parallelizable**: Yes

---

## Phase 2: 주요 UX 갭 해소 (Major UX Gap Resolution)

**Goal**: Fix P1 issues that significantly degrade user experience.
**Estimated Duration**: 1-2 sprints (5-10 days)

### Task 2.1: Keyboard Shortcut Registry Completion (Stories 2.5, 2.10, 3.8)
- **Effort**: M
- **Description**: Register missing shortcuts: D/P/C for lifecycle transitions, Cmd+Z/Shift+Z for undo/redo, Ctrl+Shift+F for focus mode. Wire to existing `use-keyboard-shortcuts.ts` hook and `global-keyboard-shortcuts.tsx`.
- **Files**: `src/components/shared/global-keyboard-shortcuts.tsx`, `src/hooks/use-keyboard-shortcuts.ts`, `src/hooks/use-undo-redo.ts`
- **Acceptance**: All specified shortcuts functional; shown in keyboard help overlay
- **Dependencies**: None
- **Parallelizable**: Yes, with all Phase 2 tasks

### Task 2.2: Heuristic Type Assignment Sets Draft Lifecycle (Story 2.2)
- **Effort**: S
- **Description**: In `typeHeuristicService.ts`, ensure that when a unit type is auto-assigned, lifecycle is set to `"draft"`.
- **Files**: `src/server/services/typeHeuristicService.ts`
- **Acceptance**: Auto-typed units always start as draft
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 2.3: usePerspective Hook & UnitCard Stance/Importance (Story 3.2)
- **Effort**: M
- **Description**: Create `usePerspective` hook. Add stance and importance display to `UnitCard` component. Wire to perspective tRPC queries.
- **Files**: new `src/hooks/use-perspective.ts`, `src/components/` (UnitCard or equivalent)
- **Acceptance**: UnitCard shows stance indicator and importance badge; perspective data loads correctly
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 2.4: Sidebar Drag-to-Reorder Implementation (Story 3.3)
- **Effort**: M
- **Description**: Replace no-op drag stub in sidebar with working `@dnd-kit/sortable` implementation (already installed). Add keyboard nav for reorder (Alt+Up/Down). Add "Move" option to context menu.
- **Files**: `src/components/layout/sidebar.tsx`, `src/components/context/context-tree.tsx`
- **Acceptance**: Drag reorder persists; keyboard reorder works; context menu has "Move"
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 2.5: useViewStatePreservation Completion (Story 3.8)
- **Effort**: M
- **Description**: Complete the `use-view-state-preservation.ts` hook (currently incomplete and unused). Integrate into context view and graph view to preserve scroll position, selected items, zoom level across navigation.
- **Files**: `src/hooks/use-view-state-preservation.ts`, `src/components/context/context-view.tsx`, `src/components/graph/GraphView.tsx`
- **Acceptance**: Navigating away and back preserves view state; breadcrumb includes unit-level depth
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 2.6: Graph Mini-Map & Zoom Fix (Story 4.3)
- **Effort**: L
- **Description**: Implement mini-map content (currently empty). Fix zoom to be cursor-centered. Add lifecycle badge to tooltip. Consider Louvain clustering as stretch.
- **Files**: `src/components/graph/GlobalGraphCanvas.tsx`, `src/components/graph/GraphControls.tsx`
- **Acceptance**: Mini-map shows graph overview; zoom centers on cursor; tooltip shows lifecycle
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 2.7: Relation Type Filter & Fit-All (Story 4.5)
- **Effort**: M
- **Description**: Wire relation type filter UI to actual filtering logic. Implement "Fit all" button that calculates bounding box of all visible nodes and adjusts viewport. Add dimming for unmatched nodes. Respect `prefers-reduced-motion`.
- **Files**: `src/components/graph/GraphControls.tsx`, `src/components/graph/GlobalGraphCanvas.tsx`
- **Acceptance**: Filter hides/dims unmatched; Fit All zooms to show all; reduced-motion respected
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 2.8: Custom Relation Type & Delete Cascade (Stories 4.6, 4.8)
- **Effort**: M
- **Description**: Add `created_by` field to custom relation types. When deleting a relation type, set affected relations to "untyped" instead of cascading. Make loopback edges visually distinct. Emit `unit.merged` event.
- **Files**: `src/server/api/routers/customRelationType.ts`, `src/server/services/relationService.ts`, `src/server/services/unitMergeService.ts`, `src/components/graph/GlobalGraphCanvas.tsx`
- **Acceptance**: created_by tracked; delete sets to untyped; loopback edges styled differently; merge emits event
- **Dependencies**: None
- **Parallelizable**: Yes

### Task 2.9: Cross-Tab Sync Stub (Story 4.9)
- **Effort**: S (stub) / XL (full WebSocket)
- **Description**: For now, implement BroadcastChannel API for same-browser cross-tab sync. Full WebSocket (Socket.io already in deps) deferred to Phase 5.
- **Files**: new `src/lib/cross-tab-sync.ts`, integrate into relevant stores
- **Acceptance**: Changes in one tab reflect in another tab of same browser within 1s
- **Dependencies**: None
- **Parallelizable**: Yes

---

## Phase 3: 중간 수준 개선 & AI 인프라 (Moderate Improvements & AI Infrastructure)

**Goal**: Address P2 gaps and restructure AI layer for reliability.
**Estimated Duration**: 2 sprints (10 days)

### Track A: AI Infrastructure Overhaul (Can run parallel with Track B)

#### Task 3.A1: aiService.ts Decomposition
- **Effort**: XL
- **Description**: Split 1281-line `aiService.ts` into domain-focused modules:
  - `ai/classification.ts` - type classification, heuristics
  - `ai/decomposition.ts` - thought decomposition
  - `ai/suggestion.ts` - suggestions, insights
  - `ai/structured.ts` - structured generation (switch from prompt-JSON to tool_use)
  - `ai/embedding.ts` - embedding generation (text-embedding-3-small)
  - `ai/provider.ts` - provider abstraction (Anthropic primary, OpenAI fallback)
  - `ai/rate-limiter.ts` - per-user rate limiting
  Keep `ai/index.ts` as facade re-exporting all modules.
- **Files**: `src/server/ai/aiService.ts` -> split into 7+ files
- **Acceptance**: Same public API; each file < 300 lines; all existing AI features work
- **Dependencies**: Phase 0 tasks (security fixes applied first)

#### Task 3.A2: Structured Output via Tool Use
- **Effort**: M
- **Description**: Replace `generateStructured` prompt-based JSON parsing with Anthropic tool_use API. Define tool schemas matching current response types.
- **Files**: `src/server/ai/structured.ts` (from 3.A1)
- **Acceptance**: Structured outputs use tool_use; JSON validation via Zod; no more prompt-hacking for JSON
- **Dependencies**: Task 3.A1

#### Task 3.A3: API Rate Limiting
- **Effort**: M
- **Description**: Add per-user rate limiting on AI endpoints. Use sliding window counter (DB-backed). Configurable limits per endpoint. Return 429 with retry-after header.
- **Files**: new `src/server/ai/rate-limiter.ts`, AI tRPC router middleware
- **Acceptance**: Rate limits enforced; 429 returned when exceeded; limits configurable
- **Dependencies**: Task 3.A1

#### Task 3.A4: Model Configuration
- **Effort**: S
- **Description**: Extract hardcoded model names to env config. Add `AI_MODEL` and `AI_EMBEDDING_MODEL` to env.js. Support model override per-request for testing.
- **Files**: `src/env.js`, `src/server/ai/provider.ts`
- **Acceptance**: Model changeable via env var; no hardcoded model strings in service code
- **Dependencies**: Task 3.A1

### Track B: P2 UX Fixes (Parallel with Track A)

#### Task 3.B1: FormField Component (Story 1.7)
- **Effort**: S
- **Description**: Create reusable `FormField` component with label, error state, description, required indicator. Use in all form contexts.
- **Files**: new `src/components/ui/form-field.tsx`
- **Acceptance**: FormField used in at least auth and project creation forms
- **Dependencies**: None

#### Task 3.B2: High-Contrast Mode Toggle (Story 1.9)
- **Effort**: S
- **Description**: Add high-contrast mode toggle to settings. Use CSS custom properties to switch palette. Persist preference.
- **Files**: `src/app/settings/page.tsx`, `src/styles/`, new `src/lib/theme.ts`
- **Acceptance**: Toggle switches to high-contrast palette; persists across sessions
- **Dependencies**: None

#### Task 3.B3: Unit Content Uniqueness (Story 2.1)
- **Effort**: S
- **Description**: Add uniqueness check on unit content within same project. Warn user on duplicate, allow override.
- **Files**: `src/server/services/unitService.ts`, unit creation UI
- **Acceptance**: Duplicate warning shown; user can override; exact duplicates flagged
- **Dependencies**: None

#### Task 3.B4: UnitCardList with TanStack Virtual (Story 2.3)
- **Effort**: M
- **Description**: Replace current unit list with TanStack Virtual (`@tanstack/react-virtual` already installed). Virtualize for performance with large unit counts.
- **Files**: Unit list component(s)
- **Acceptance**: 500+ units render smoothly; scroll performance < 16ms per frame
- **Dependencies**: None

#### Task 3.B5: Version Provenance Fields (Story 2.7)
- **Effort**: M
- **Description**: Add provenance fields to UnitVersion model (who changed, what changed, change type). Emit `unit.contentChanged` event. Add migration.
- **Files**: `prisma/schema.prisma`, `src/server/services/versionService.ts`, `src/server/events/`
- **Acceptance**: Version history shows who/what/when; contentChanged event fires
- **Dependencies**: None

#### Task 3.B6: Onboarding DB Persistence (Story 2.9)
- **Effort**: S
- **Description**: Move onboarding progress from localStorage to DB. Add onboarding fields to User model or separate table.
- **Files**: `prisma/schema.prisma`, `src/hooks/use-onboarding.ts`, `src/components/onboarding/`
- **Acceptance**: Onboarding state persists across devices; localStorage used as fallback only
- **Dependencies**: None

#### Task 3.B7: Optimistic UI for Reorder (Story 2.10)
- **Effort**: M
- **Description**: Add optimistic updates for drag-and-drop reorder operations. Rollback on error.
- **Files**: Sidebar/context tree components, relevant tRPC mutations
- **Acceptance**: Reorder feels instant; errors rollback visually; no flicker
- **Dependencies**: Task 2.4 (drag reorder must work first)

#### Task 3.B8: Context Pagination & Undo Toast (Story 3.4)
- **Effort**: M
- **Description**: Add pagination to context unit list. Add undo toast when removing unit from context.
- **Files**: `src/components/context/context-view.tsx`, `src/lib/toast.ts`
- **Acceptance**: Pagination with 20-item pages; undo toast allows 5s recovery
- **Dependencies**: None

#### Task 3.B9: Visit Tracking Wiring (Story 3.6)
- **Effort**: S
- **Description**: Wire `contextVisitService.ts` to actual context view navigation. Track visits on page load.
- **Files**: `src/server/services/contextVisitService.ts`, `src/app/(app)/context/[id]/page.tsx`
- **Acceptance**: Visit count increments on context view load; last visited timestamp accurate
- **Dependencies**: None

#### Task 3.B10: Relation Category Name Fix (Story 4.2)
- **Effort**: S
- **Description**: Fix category name mismatch: `structure` should be `structure_containment`. Fix 3 differing type names to match spec.
- **Files**: `src/server/services/relationService.ts`, related seed/config files
- **Acceptance**: All relation type names match PRD Appendix spec exactly
- **Dependencies**: None

#### Task 3.B11: Graph Card Click → Detail Panel (Story 4.4)
- **Effort**: S
- **Description**: Clicking a card/node in graph view should open the detail panel for that unit.
- **Files**: `src/components/graph/GlobalGraphCanvas.tsx`, `src/hooks/use-detail-panel.ts`
- **Acceptance**: Click node → detail panel opens with unit info
- **Dependencies**: None

#### Task 3.B12: Composite Index for Relations (Story 4.1)
- **Effort**: S
- **Description**: Add composite index on `(sourceUnitId, targetUnitId, relationType)` in Prisma schema. Add migration. Emit relation events.
- **Files**: `prisma/schema.prisma`, `src/server/events/`
- **Acceptance**: Index exists; duplicate relation queries fast; relation events emitted
- **Dependencies**: None

---

## Phase 4: 마무리 & 테스트 기반 구축 (Polish & Test Foundation)

**Goal**: Address P3 items, build testing infrastructure.
**Estimated Duration**: 1-2 sprints

### Task 4.1: Unit Test Foundation
- **Effort**: XL
- **Description**: Set up vitest test patterns for services layer. Write tests for: unitService, relationService, contextService, aiService (mocked). Target: 1-2 tests per service for critical paths.
- **Files**: `src/__tests__/`, `vitest.config.ts`
- **Acceptance**: `pnpm test` runs; >20 unit tests; CI-ready
- **Dependencies**: Phase 3 complete (stable API surface)

### Task 4.2: Integration Test Structure
- **Effort**: L
- **Description**: Create integration test patterns matching spec: tRPC router tests with test DB. Set up test database seeding. E2E tests for auth flow and unit CRUD.
- **Files**: `e2e/`, `src/__tests__/integration/`
- **Acceptance**: Integration tests runnable; auth and CRUD paths covered
- **Dependencies**: Task 4.1

### Task 4.3: Accessibility Testing (axe-core) (Story 1.5)
- **Effort**: M
- **Description**: Add axe-core to test suite. Run against key pages (dashboard, context view, graph). Fix critical a11y violations found.
- **Files**: Test files, possibly component fixes
- **Acceptance**: Zero critical a11y violations; axe-core in CI pipeline
- **Dependencies**: Task 4.1

### Task 4.4: Audio Detail View & Waveform (Story 2.11)
- **Effort**: M
- **Description**: Add AnalyserNode-based waveform visualization to audio units. Create audio detail view panel.
- **Files**: `src/lib/audio-utils.ts`, new audio detail component
- **Acceptance**: Audio units show waveform; playback controls work in detail view
- **Dependencies**: None

### Task 4.5: Breadcrumb Unit-Level Depth (Story 3.8)
- **Effort**: S
- **Description**: Extend breadcrumb to show unit-level navigation depth (Project > Context > Unit).
- **Files**: `src/components/navigation/Breadcrumb.tsx`
- **Acceptance**: Breadcrumb shows full path including unit name when in detail view
- **Dependencies**: None

---

## Phase 5: 신규 기능 개발 준비 (New Feature Development Prep)

**Goal**: Build infrastructure for Epics 5-10, implement Story 1.10 (Trigger.dev).
**Estimated Duration**: 2 sprints

### Task 5.1: Trigger.dev Background Job Infrastructure (Story 1.10)
- **Effort**: XL
- **Description**: Set up Trigger.dev (`@trigger.dev/sdk` already installed). Configure project. Create initial job types: AI processing, embedding generation, batch operations. Wire to existing async operations.
- **Files**: new `src/trigger/` directory, `trigger.config.ts`
- **Acceptance**: Trigger.dev running locally; at least 1 AI operation runs as background job
- **Dependencies**: Phase 3 Task 3.A1 (AI service must be modular)

### Task 5.2: Embedding Generation Pipeline
- **Effort**: L
- **Description**: Implement `text-embedding-3-small` (or Anthropic equivalent) embedding generation. Store in pgvector column. Run as Trigger.dev background job on unit create/update.
- **Files**: `src/server/ai/embedding.ts`, `prisma/schema.prisma` (vector column), Trigger.dev job
- **Acceptance**: Units get embeddings on save; semantic search uses vector similarity
- **Dependencies**: Tasks 5.1, 3.A1

### Task 5.3: Cross-Tab WebSocket Sync (Full) (Story 4.9)
- **Effort**: L
- **Description**: Upgrade from BroadcastChannel to Socket.io WebSocket sync across browsers/devices.
- **Files**: new `src/server/ws/`, `src/lib/cross-tab-sync.ts` upgrade
- **Acceptance**: Changes sync across different browsers; connection resilient to drops
- **Dependencies**: Task 2.9 (BroadcastChannel stub exists)

### Task 5.4: User Settings Page (Story 2.12)
- **Effort**: M
- **Description**: Build settings page with: profile management, theme preferences, keyboard shortcut customization, AI usage stats.
- **Files**: `src/app/settings/page.tsx` (exists as stub)
- **Acceptance**: Full settings UI; preferences persist; AI usage visible
- **Dependencies**: None

### Task 5.5: Relation Type Glossary (Story 6.9)
- **Effort**: M
- **Description**: Build glossary view showing all relation types with descriptions, examples, usage counts.
- **Files**: new component, tRPC query for relation type stats
- **Acceptance**: Glossary accessible from graph view; shows all types with stats
- **Dependencies**: None

---

## Phase 6: Epic 5-10 구현 (Epic 5-10 Implementation)

**Goal**: Implement remaining epics.
**Estimated Duration**: Multiple sprints (scope TBD per epic)
**Note**: Detailed planning for each epic should happen as Phase 5 completes. This is a roadmap placeholder.

### Epic 5: AI-Powered Thinking & Safety (15 stories)
### Epic 6: Navigation, Search & Discovery (9 stories)
### Epic 7: Assembly, Composition & Export (10 stories)
### Epic 8: Feedback Loop & Thought Evolution (10 stories)
### Epic 9: Projects & Domain Templates (7 stories)
### Epic 10: External Integration & Context Export API (3 stories)

*각 Epic은 별도의 상세 계획 세션이 필요합니다. 스토리 파일은 `_bmad-output/implementation-artifacts/`에 준비되어 있습니다.*

---

## Dependency Graph

```
Phase 0 (Security) ─── must complete before all others
    │
    ├── Phase 1 (P0 Blocking) ─── can start after Phase 0
    │       │
    │       ├── Phase 2 (P1 Major) ─── can start after Phase 1 core tasks
    │       │       │
    │       │       └── Phase 3 Track B (P2 UX) ─── after Phase 2 prerequisites
    │       │
    │       └── Phase 3 Track A (AI Infra) ─── can start after Phase 0
    │
    ├── Phase 4 (Polish & Tests) ─── after Phases 1-3 stable
    │
    └── Phase 5 (New Feature Prep) ─── after Phase 3.A (AI modular) + Phase 4
            │
            └── Phase 6 (Epics 5-10) ─── after Phase 5 infra ready
```

## Parallelization Summary

| Phase | Internal Parallelism | Notes |
|-------|---------------------|-------|
| Phase 0 | All 4 tasks parallel | Independent security fixes |
| Phase 1 | Tasks 1.1-1.7 all parallel | No interdependencies |
| Phase 2 | Tasks 2.1-2.9 all parallel | No interdependencies |
| Phase 3 | Track A sequential (3.A1→A2→A3→A4), Track B mostly parallel | Track A & B run in parallel |
| Phase 4 | Tasks 4.1→4.2→4.3 sequential; 4.4, 4.5 parallel | Tests build on each other |
| Phase 5 | 5.1→5.2 sequential; 5.3-5.5 parallel | Trigger.dev needed for embeddings |

## Commit Strategy

- **Phase 0**: Single commit per security fix (4 commits). Prefix: `security:`
- **Phase 1**: One commit per task (7 commits). Prefix: `fix:` for repairs, `feat:` for new features
- **Phase 2**: One commit per task (9 commits). Prefix: `fix:` or `feat:`
- **Phase 3A**: One commit per AI module extraction + one for integration. Prefix: `refactor:`
- **Phase 3B**: Batch related fixes (3-4 commits). Prefix: `fix:`
- **Phase 4**: One commit per test suite. Prefix: `test:`
- **Phase 5**: One commit per feature. Prefix: `feat:`

## Risk Assessment

| Risk | Likelihood | Impact | Score | Mitigation |
|------|-----------|--------|-------|------------|
| Auth refactor breaks existing sessions | 3 | 5 | 15 | Test on fresh DB first; keep JWT fallback temporarily |
| AI service split breaks existing features | 3 | 4 | 12 | Facade pattern preserves public API; test each endpoint |
| Prisma migrations conflict | 2 | 4 | 8 | Run migrations on dev DB first; backup before each |
| Tiptap integration complexity | 2 | 3 | 6 | Package already installed; StarterKit covers basics |
| Cross-tab sync reliability | 3 | 2 | 6 | BroadcastChannel as reliable fallback |

## Success Criteria

1. All P0 blocking issues resolved - core features functional
2. Zero known security vulnerabilities
3. All keyboard shortcuts registered and working
4. AI responses validated through Zod (no unsafe casts)
5. aiService.ts split into <300 line modules
6. Test suite with >20 unit tests passing
7. User can complete full workflow: create project → add units → create relations → view graph → export
