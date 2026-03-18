---
stepsCompleted: [1, 2, 3]
inputDocuments: ['docs/flowmind-prd.md', '_bmad-output/planning-artifacts/architecture.md', '_bmad-output/planning-artifacts/ux-design-specification.md']
storiesCompleted: [1, 2, 3, 4, 5]
---

# Flowmind - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Flowmind, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system must support a Thought Unit as the minimum meaningful cognitive unit, with each Unit carrying a globally unique ID, content (text), creation timestamp, source reference, and version history.

FR2: Every Thought Unit must have a Unit Type (base types: Claim, Question, Evidence, Counterargument, Observation, Idea, Definition, Assumption, Action) that reflects its logical role. Types are first proposed by AI and confirmed by the user.

FR3: The system must support a Perspective Layer per Unit: a Unit's content is global, but its type, relations, stance, importance, and notes can differ per Context via a `perspectives[]` array keyed by `context_id`.

FR4: The system must support Resource Units as first-class citizens for non-text formats (image, table, audio, diagram, link, video, code). A single Resource Unit can be referenced by multiple Thought Units simultaneously.

FR5: Resource Units must also support the Perspective Layer — the same resource can function as "evidence" in one Context and "inspiration" in another.

FR6: The system must support Chunks as dynamically computed intermediate groupings between Unit (minimum) and Context (maximum). Chunks are not stored; they are recalculated in real time based on navigation purpose.

FR7: The system must support Contexts as named exploration spaces where Units of the same purpose gather. A single Unit can belong to multiple Contexts simultaneously with different roles in each.

FR8: Contexts must support hierarchical structure: they can be split when too large, merged when related, and cross-referenced across each other.

FR9: Each Context must automatically maintain: an AI-generated snapshot summary of its current state, a list of unresolved questions, and a list of internal contradictions. A re-entry briefing must be provided when the user returns to a Context.

FR10: The system must model Unit-to-Unit relationships as a Directed General Graph (not a tree), with each relation carrying: target Unit ID, relation type, strength (0.0–1.0), purpose array, creation timestamp, and direction (one-way/bidirectional).

FR11: The system must support all 23 system relation types organized in three groups: Argument-centered (supports, contradicts, derives_from, expands, references, exemplifies, defines, questions), Creative/research/execution-centered (inspires, echoes, transforms_into, foreshadows, parallels, contextualizes, operationalizes), Structure/containment (contains, presupposes, defined_by, grounded_in, instantiates).

FR12: Relations must reside inside `perspective.relations[]`, not at the global Unit level. The same two Units can have completely different relations depending on their active Context.

FR13: The system must support Custom Relation Types (CustomRelation) with: a user-defined name, from/to Unit IDs, scope (private/shared), and a reusable flag. When `reusable: true`, the custom type enters a library and AI can suggest reuse in similar situations.

FR14: The system must detect graph cycles and mark return edges as "loopbacks" so the user only traverses them by conscious choice.

FR15: When two Units are semantically identical, the system must support a Merge operation that unifies them into one Unit and re-attributes all existing relations to the merged Unit.

FR16: The system must support Assembly as an ordered list of references (not copies) to Units. Modifying a Unit must be automatically reflected in all Assemblies containing that Unit.

FR17: The system must support Assembly Templates that propose structure based on writing purpose and automatically map existing Units to slots, identifying empty slots visually.

FR18: The system must accept input with no special length limit and process it according to type: raw thought (propose Unit boundaries), external web clip (create Citation Unit + Resource Unit in parallel), structured note (recognize then decompose), audio transcription (maintain link to original audio), code (Unit-ize by code block).

FR19: When external knowledge is imported (paper, Wikipedia, web clip, book chapter), the system must prompt the user to select a connection mode: (1) connect to an active Context, (2) start a new Context, or (3) hold in Incubation Queue for later.

FR20: Each Unit derived from external text must track provenance via `origin_type` (direct_write, external_excerpt, external_inspiration, external_summary, ai_generated, ai_refined) and `source_span` (parent_input_id, position in original, excerpt preview ≤15 chars).

FR21: Clicking an external text Resource Unit must query and display all Thought Units derived from it and all Assemblies containing those Units (reverse tracking).

FR22: AI decomposition must follow a 3-step process: (1) understand the user's purpose, (2) propose decomposition boundaries using semantic/logical/topical/structural properties, (3) propose relations between new Units and existing Units. All proposals are user-adjustable.

FR23: When splitting a Unit, the system must propose relation re-attribution — assigning each existing relation to one of the two resulting Units, with the user making all final decisions.

FR24: The system must support two distinct input modes: Capture Mode (no AI intervention, for immediate thought capture) and Organize Mode (AI-assisted batch processing of Unit splitting, type assignment, and relation connections).

FR25: Each Unit card must display a Branch Potential Score (e.g., ●●●○) representing derivation potential. Clicking must reveal AI-suggested explorable directions.

FR26: The system must support four configurable AI Intervention Intensity levels: Minimal (alerts on clear logical gaps only), Moderate (suggests exploration directions), Exploratory (asks Socratic questions), Generative (directly generates branch drafts).

FR27: All AI-generated content must go through a 3-stage lifecycle: Draft (dashed border, gray background; cannot be included in Assembly/Navigator; cannot create relations) → Pending (yellow border; under user review) → Confirmed (regular Unit; full functionality).

FR28: The system must enforce generation limits: maximum 3 Units generated per request; warning when AI-generated ratio in a Context exceeds 40%; maximum 3 consecutive branch generations.

FR29: When a topic without social consensus is detected, the system must activate Epistemic Humility Mode: AI must first confirm the exploration purpose, then ask questions instead of providing answers.

FR30: The system must display AI contribution transparency: ratio of (a) directly written by user, (b) AI-generated then approved, (c) AI-generated not yet approved. Units with `ai_trust_level: "inferred"` must automatically receive an "AI Inference" badge.

FR31: The system must support Refinement: transforming raw text into logically coherent expression. The original must be preserved as v1; the refined version proposed as v2.

FR32: The system must support label-based flow prediction: given a Unit's type, AI must alert to what is missing in the argument structure (e.g., "This claim has no evidence," "This question has no answer").

FR33: The system must support type-aware and Context-aware external knowledge connection: search results must be saved as Resource Units and attached as references to the relevant Unit.

FR34: The system must expose a Context Export API (`GET /api/context/{context_id}/export`) that exports Unit structure in `prompt_package`, `json`, or `markdown` format, with configurable depth, type filters, and status filters.

FR35: The system must support Navigators as user-defined or AI-auto-generated paths specifying the reading order of Units for a specific purpose. Multiple Navigators can be created from the same Units. Navigators do not copy or move Units.

FR36: The system must support simultaneous vertical (chronological/derivation order) and horizontal (semantic jump) navigation. Moving from Unit D back to starting Unit A then to Branch 3 must be possible in a single gesture.

FR37: The system must support purpose-based relation weight rendering in real time: in argument exploration mode (supports, contradicts highlighted; inspires, echoes dimmed); in creative mode (inspires, echoes, foreshadows highlighted; supports, contradicts dimmed); in chronological mode (relation strength recalculated by created_at order).

FR38: Custom relation types must be includable in the navigation weight system by specifying a purpose tag.

FR39: The system must support 4-layer indexing: Text index (keyword-based), Semantic index (vector embedding similarity), Structure index (Unit type, state, Context membership, relation graph), Temporal index (creation time, modification time, relation formation order).

FR40: The system must compute a ThoughtRank importance score per Unit, combining: number of referencing Units, number of Assemblies it appears in, diversity of connected Contexts, recency, and hub role.

FR41: Unit card relation/attribute display must be prioritized by three criteria: (1) relevance to current navigation purpose, (2) ThoughtRank of connected Unit, (3) recency. By default, top 3–5 relations are shown; full view accessible via "See more."

FR42: The system must provide a Context Dashboard displaying: total Unit count, incomplete questions, key hub Units, unaddressed counterarguments, unsupported claims, cycle presence, and recommended entry points.

FR43: The system must support natural-language queries in Search View (e.g., "things I claimed about social media").

FR44: The system must support a two-layer Graph View: Layer 1 (Full Global Overview — small dots, thin lines, type-based color, auto-detected clusters) and Layer 2 (Local Card Array — triggered by clicking a hub/Context, loads Units within relation depth N).

FR45: Navigation path must follow: Global View → [click hub] → Local Card Array → [click card] → Unit Detail.

FR46: The system must support Thread View: linear navigation in chronological or derivation order, Units stacked vertically as cards, branch points displaying a fork indicator.

FR47: The system must support Assembly View: drag-and-drop Unit ordering; Assembly Template slots with empty slots visually distinguished.

FR48: The system must support Assembly Diff: side-by-side comparison of two Assemblies with color visualization of Units present in only one side.

FR49: The system must support Context View: filtered display of only Units belonging to a specific Context.

FR50: The system must support Cross-view Coordination: selecting a Unit in any view must synchronize all other views simultaneously.

FR51: When exporting an Assembly, the system must apply format-specific Unit conversion rules per Unit type across output formats (Essay, Presentation, Email, Social).

FR52: The system must auto-generate Bridge Text (logical connecting sentences between Units) during export. Bridge Text must not be stored as a Unit and must not modify the original Unit graph.

FR53: The system must support Partial Export: export only Units meeting specific conditions — specific type only, specific Context membership, specific evidence_domain, or confirmed Units only.

FR54: The system must maintain Export History: recording when and in what state each Assembly was exported, with notification when Units have changed since last export.

FR55: The system must support AI Prompt Auto-generation: selecting relevant Units automatically generates a structured prompt including background, key claims, constraints, and open questions.

FR56: Action Units must preserve their decision-making history via relations. Execution management must be delegatable to external services.

FR57: When an Action Unit is completed, the system must propose creating a result record Unit connected to the original decision-making Units.

FR58: The system must support an Incubation Queue: storing incomplete but valuable Units and periodically surfacing them to the user.

FR59: The system must support Compression: detecting variations of similar claims and proposing extraction of the common core.

FR60: The system must support Thought Versioning: preserving previous versions when a Unit is modified, enabling tracking of thinking evolution.

FR61: The system must support Tension Detection: AI must detect and flag mutually contradictory claims within the same Context.

FR62: The system must support Orphan Unit Recovery: periodically showing the user Units not included in any Assembly.

FR63: A Project must function as a purpose-optimized UI environment with type-specific default views and navigation patterns per project type.

FR64: The system must detect Unit Drift from project purpose using a drift_score (0.0–1.0) and present options when threshold is exceeded.

FR65: MVP must start with pre-defined project templates; later versions must support fully custom layout composition.

FR66: The system must support three types of Domain Templates: System default, Freeform, and User-defined.

FR67: Each Domain Template must include: domain-specific Unit types, domain-specific relation types, Scaffold Units, required context slots, recommended navigation order, available Assembly list, gap detection rules, and AI live guide.

FR68: At project start, the user must be able to select one of three Constraint Levels: Strict, Guided, or Open.

FR69: The system must support Freeform-to-Formal Template Export: AI analyzes existing Units and proposes type mappings.

FR70: The system must provide a Completeness Compass that reports: what has been confirmed, what is still missing, and what outputs can be produced at what completeness percentage.

FR71: In freeform template mode, the Completeness Compass must only provide the list of "Assemblies that can be created now" without completeness conditions.

FR72: The system must provide inline intervention nudges for misuse patterns, triggering once and never repeating after dismissal.

FR73: The system must track full metadata per Unit across 14 categories including Cognitive Classification, Perspective Layer, Status, Temporal, Provenance, Evidence Character, Relations, Context/Membership, AI Analysis, Tags, User-defined fields, Versioning/History, Execution Links, and Assembly Source Map.

FR74: The system must warn the user when a piece of evidence with narrow scope is used to support a claim with broader scope (scope jump warning).

FR75: The system must auto-generate an Assembly Source Map tracking which external resources contributed to an Assembly and at what ratio.

FR76: The system must support Reasoning Chains: explicit structures representing the path from evidence through inference to conclusion.

### NonFunctional Requirements

NFR1: The system must support real-time Chunk computation without perceptible delay — Chunks must change dynamically based on navigation purpose.

NFR2: Graph View relation line thickness, color intensity, and visibility must update in real time based on navigation purpose weight changes without page reload.

NFR3: Cross-view synchronization must be instantaneous from the user's perspective.

NFR4: ThoughtRank scores must be re-calculable per Unit with different weights depending on navigation purpose at query time.

NFR5: The MVP data stack must use PostgreSQL + pgvector. The architecture must allow graph portion migration to Neo4j independently without changes to other layers.

NFR6: Text search via Typesense or Elasticsearch. Vector search via pgvector. Graph queries via PostgreSQL recursive CTEs (later Neo4j). Temporal queries via standard RDBMS.

NFR7: Unit content must be stored globally. Only type, relations, stance, importance, and notes vary per context via the Perspective Layer.

NFR8: AI-generated content (lifecycle: draft) must be architecturally restricted from appearing in Assemblies or Navigators until user confirms.

NFR9: Maximum 3 Units generated per request and maximum 3 consecutive branch generations, enforced at the application layer.

NFR10: When AI-generated ratio in any Context exceeds 40%, the system must trigger a configurable user warning.

NFR11: AI must never replace user judgment. All AI outputs must be presented as proposals requiring user confirmation.

NFR12: Unit content must be globally unique and immutable in identity — modifications reflected in all Assemblies/Navigators automatically.

NFR13: Inline intervention nudges must follow non-interruption principle: once dismissed, never appear again for that user.

NFR14: Completeness Compass must be invocable on-demand and auto-refresh periodically. Must communicate progress as goal-state gaps.

NFR15: Relation Type Glossary must be accessible from within the app at any time.

NFR16: On re-entering a Context, the system must provide a re-entry briefing without user request.

NFR17: Domain Template system must be extensible — users must be able to define and save custom templates.

NFR18: Custom relation type library must be persistent and team-shareable when reusable: true.

NFR19: Context Export API must be format-agnostic and AI-model-agnostic (prompt_package, json, markdown).

NFR20: The system must have a defined data ownership and privacy policy specifying what data is sent to server, local processing options, and AI training usage.

NFR21: The system must support full export/backup of all Units, relations, and Assemblies to user-owned format (JSON, Markdown).

NFR22: Capture Mode must be supported on mobile with voice input, quick text, and home screen widget.

NFR23: The system must support keyboard shortcuts / power user mode for Unit creation, relation connection, and Context switching.

NFR24: The system must implement non-interrupting notification policy for Incubation Queue, Completeness Compass updates, and incomplete question alerts.

### Additional Requirements

- **Starter Template (CRITICAL — Epic 1 Story 1)**: Architecture specifies `pnpm create t3-app@latest flowmind --CI --tailwind --trpc --prisma --appRouter --dbProvider postgresql` as the mandatory initialization command (T3 Stack: TypeScript 5.x strict, Next.js App Router, tRPC v11, Prisma 6.x, Tailwind CSS 4.x, pnpm, Turbopack)
- PostgreSQL 16 + pgvector extension must be provisioned via Supabase (managed PostgreSQL with pgvector pre-installed, PgBouncer connection pooling, real-time capabilities)
- Database must be seeded via `prisma/seed.ts` with domain template defaults (software-design, nonfiction-writing, investment-decision, academic-research) and all 23 system relation types
- Prisma Migrate for migrations: `prisma migrate dev` (development), `prisma migrate deploy` (production in Vercel build step)
- Preview deployments on PR branches require isolated preview databases
- Vercel Blob for Resource Unit file storage (images, PDFs, audio, code files)
- Hosting on Vercel for Next.js deployment (frontend + serverless API functions)
- CI/CD via GitHub Actions: `.github/workflows/ci.yml` (lint + type check + unit tests on PR) and `.github/workflows/e2e.yml` (Playwright E2E on merge to main)
- Auth.js (NextAuth.js) v5 with OAuth providers (Google, GitHub) and email/password with magic links
- LLM Provider abstraction at `server/ai/provider.ts` supporting Anthropic Claude API (primary) and OpenAI (fallback) — no direct API calls from routers
- Embedding generation via OpenAI `text-embedding-3-small` (vector(1536)) — triggered on every Unit creation/update
- Background job processor: Trigger.dev for async AI operations (decomposition, embedding, relation inference, ThoughtRank, context snapshots, drift detection)
- AI generation rate limiting enforced via middleware: max 3 Units/request, 40% AI ratio warning, safety guard at `server/ai/safetyGuard.ts`
- Context Export REST API (not tRPC): `GET /api/context/{contextId}/export` with API key authentication
- tRPC Subscriptions via WebSocket for cross-view synchronization and multi-tab sync
- Vitest for unit tests and Playwright for E2E tests (both require separate configuration beyond T3 starter)
- Test organization: co-located `*.test.ts`, integration tests in `__tests__/integration/`, E2E in `e2e/`, test helpers with DB setup/teardown and factories
- Sentry for error tracking and performance monitoring; Vercel Analytics for web vitals; pino for structured JSON server-side logging
- Security: CSRF protection (Auth.js), rate limiting on AI endpoints, input sanitization (XSS prevention), CSP headers in middleware, API key auth for export endpoint
- Internal event bus (`server/events/eventBus.ts`) for cross-cutting concerns — routers never call other routers directly
- Router → Service → Repository layering is mandatory; AI service isolation (services only, never routers); Prisma as sole DB accessor (except pgvector `$queryRaw`)
- Draft lifecycle enforcement: all operations must check `unit.lifecycle !== "draft"` before creating relations, adding to Assemblies, or confirming
- Feature module isolation: features never import from other features; cross-feature via Zustand stores or event bus only
- Additional packages beyond T3 starter: shadcn/ui, Zustand 5.x, D3.js, dnd-kit, Tiptap 3.x, TanStack Virtual, date-fns, Auth.js v5, Trigger.dev, Sentry SDK, pino, cmdk
- camelCase in TypeScript/API, snake_case in database (Prisma handles mapping); pnpm required (not npm/yarn)

### UX Design Requirements

UX-DR1: Define base color CSS custom properties (--bg-primary, --bg-secondary, --bg-surface, --bg-hover, --text-primary, --text-secondary, --text-tertiary, --border-default, --border-focus, --accent-primary) in tailwind.config.ts with specified hex values.

UX-DR2: Define unit-type color tokens for all 9 unit types (Claim, Question, Evidence, Counterargument, Observation, Idea, Definition, Assumption, Action) with background tint and dark accent pairs.

UX-DR3: Define lifecycle state visual tokens — Draft (dashed border, 80% opacity), Pending (yellow left border, yellow tint), Confirmed (solid border, full opacity).

UX-DR4: Define semantic color tokens (--success: #34C759, --warning: #FF9500, --error: #FF3B30, --info: #5AC8FA).

UX-DR5: Define typography system tokens — three font stacks (primary, heading, mono), 7-step type scale (11px to 39px) with weights, line heights, and letter-spacing rules.

UX-DR6: Define spacing scale tokens based on 4px base unit (10 steps from 4px to 64px).

UX-DR7: Define card elevation system tokens (4 levels: flat, resting, elevated, high) with specific shadow values, border-radius 12px, and hover/selected state styles.

UX-DR8: Define animation duration tokens (300ms view transitions, 250ms sidebar, 150ms focus, 200ms drag snap) with reduced-motion override to 0ms.

UX-DR9: Define responsive breakpoint tokens (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px) in Tailwind config.

UX-DR10: Build UnitCard component with 3 variants (Compact, Standard, Expanded), 6 states (Default, Hover, Selected, Draft, Pending, Confirmed), type-colored left border, metadata row, and full accessibility (role="article", sr-only labels).

UX-DR11: Build GraphCanvas component with two-layer visualization (Global Overview dots → Local Card Array), force-directed layout, pan/zoom, cluster detection, navigation purpose filtering, and keyboard-navigable nodes.

UX-DR12: Build ContextSidebar component with project selector, collapsible context tree, 3 width states (260px expanded, 60px collapsed, 0px hidden), drag-to-reorder, and context menu.

UX-DR13: Build AssemblyBoard component with drag-and-drop slot containers, bridge text zones, preview/edit toggle, and AI auto-mapping of units to template slots.

UX-DR14: Build CompletenessCompass component with radial progress visualization, category breakdown, action suggestions, collapsed indicator and expanded popover states.

UX-DR15: Build DecompositionReview component — the core "defining experience" — with highlighted boundary overlays, type-colored badges, accept/reject per unit, draggable boundary handles, and physics-based card settling animation.

UX-DR16: Build ContextBriefing component with session summary, open questions list, AI suggestions, "Continue where I left off" / "Start fresh" CTAs, shown on Context re-entry.

UX-DR17: Build AILifecycleBadge component with Draft (dashed gray), Pending (yellow), Confirmed (subtle checkmark) states in Small and Medium sizes.

UX-DR18: Wrap @radix-ui/react-dialog with Flowmind styling (Level 3 shadow, 12px radius, Framer Motion 300ms entrance, focus trap, destructive confirmation variant).

UX-DR19: Wrap @radix-ui/react-dropdown-menu with Flowmind styling (type-colored indicators, keyboard shortcut hints, separator lines, Level 2 shadow).

UX-DR20: Wrap @radix-ui/react-tooltip with Flowmind styling (300ms delay, Level 2 shadow, --text-sm size).

UX-DR21: Wrap @radix-ui/react-popover with Flowmind styling (Level 2 shadow, 12px radius).

UX-DR22: Wrap @radix-ui/react-tabs with Flowmind styling (2px accent underline active tab, 300ms cross-fade between panels).

UX-DR23: Wrap @radix-ui/react-scroll-area with Flowmind styling (4px scrollbar, visible on hover/scroll only).

UX-DR24: Wrap @radix-ui/react-context-menu with Flowmind styling (same visual treatment as dropdown).

UX-DR25: Implement Command Palette using cmdk (Cmd+K global trigger, fuzzy search across actions/units/contexts/projects, keyboard navigation, recent actions default, Level 3 shadow).

UX-DR26: Wrap @radix-ui/react-toggle with Flowmind styling (accent-primary active fill, bg-surface inactive).

UX-DR27: Build main app shell layout with title bar (40px), sidebar (260px collapsible), toolbar (48px with breadcrumbs + view switcher), main content (fluid 600-1200px), detail panel (360px slide-in). Three layout modes: Canvas, Focus, Graph.

UX-DR28: Build Graph View screen with full-screen GraphCanvas, floating filter bar, zoom controls, mini-map, and layer indicator.

UX-DR29: Build Thread View screen with vertical UnitCard list, relation connectors between linked cards, ScrollArea integration.

UX-DR30: Build Assembly View screen with AssemblyBoard, left search/browse rail, assembly metadata, and export dialog.

UX-DR31: Build Search View screen with prominent query input, results grouped by type (Units/Contexts/Projects), natural language query support, empty state.

UX-DR32: Build Unit Detail Panel (360px slide-in) with inline-editable content, type selector, lifecycle controls, metadata section, relations list, AI suggestions, tabbed layout (Content|Relations|Metadata|AI).

UX-DR33: Build Project Dashboard screen with project title, Context card grid (with Completeness Compass mini indicators), New Context button, AI suggestions panel.

UX-DR34: Build Onboarding / First-Time Experience with clean single-input "What are you thinking about?" view, first-input decomposition trigger, and 3-step tooltip tour.

UX-DR35: Implement toast notification system (bottom-center, 300ms slide-up, 4s auto-dismiss, success/error/info/warning types, undo action link, queue behavior).

UX-DR36: Implement skeleton loading states for all content areas (CSS pulse animation, no spinners; AI processing dot animation with cancel).

UX-DR37: Implement empty states for all content areas (centered illustration + headline + CTA button).

UX-DR38: Implement inline form validation patterns (error on blur, success checkmark, helper text on focus, accent-primary focus indicator).

UX-DR39: Implement AI suggestion card pattern (dashed border, accept/dismiss per card, modify expansion, batch "Accept All").

UX-DR40: Implement drag-and-drop system via @dnd-kit (6-dot grip handle on hover, 0.8 opacity during drag, dashed accent drop zones, 200ms spring snap, keyboard support).

UX-DR41: Implement undo/redo system (Cmd+Z/Cmd+Shift+Z, toast with action name, confirmation dialog for destructive operations).

UX-DR42: Implement view transition animations (300ms cross-fade, 250ms sidebar, 300ms detail panel, 150ms card hover; disabled under prefers-reduced-motion).

UX-DR43: Implement keyboard shortcut system (Cmd+K palette, Cmd+N capture, Cmd+1-4 views, D/P/C lifecycle, Cmd+/ help overlay, Escape close).

UX-DR44: Implement breadcrumb navigation in toolbar (Project/Context/Unit hierarchy, clickable segments, truncation with tooltips).

UX-DR45: Implement sidebar tree navigation (hierarchical Project→Context tree, active item highlighting, collapse/expand animation, drag reorder, right-click context menu).

UX-DR46: Implement context preservation on navigation (restore scroll position, selection, open panels, filter state, zoom level on return).

UX-DR47: Implement desktop-wide layout (1280px+) — full three-column with non-pushing detail panel.

UX-DR48: Implement desktop-compact layout (1024px–1279px) — collapsed sidebar, overlay detail panel.

UX-DR49: Implement tablet layout (768px–1023px) — hidden sidebar with hamburger, full-screen detail overlay, 48px touch targets.

UX-DR50: Implement text zoom support (200%) — all layouts usable with no horizontal scrolling.

UX-DR51: Implement WCAG 2.1 AA color contrast (4.5:1 body text, 3:1 large text/interactive, high-contrast mode toggle).

UX-DR52: Implement focus indicator system (2px solid accent-primary with 2px offset on all interactive elements).

UX-DR53: Implement focus management for overlays (focus trap, focus return on close, Escape to close).

UX-DR54: Implement ARIA landmarks and semantic HTML (nav, main, aside, article, section, skip-to-content link).

UX-DR55: Implement ARIA live regions for dynamic content (AI suggestions polite, toast assertive/polite, graph changes polite).

UX-DR56: Implement accessible graph navigation (keyboard arrow keys, node announcements, role="application", Thread View as text alternative).

UX-DR57: Target modern evergreen browsers (Chrome, Safari, Firefox, Edge latest 2 versions; test dnd-kit on Safari).

UX-DR58: Use optimistic UI for all data operations (instant local updates, background sync, retry on failure, no "Saving..." indicators).

UX-DR59: Implement Capture Mode (Cmd+N, all chrome hidden except text input, "What are you thinking about?" placeholder, Escape to exit).

UX-DR60: Implement Focus Mode (toggle hides sidebar/detail panel, toolbar minimal, persists in session).

UX-DR61: Implement cross-view unit selection synchronization (selection in any view highlights in all views, detail panel updates).

UX-DR62: Design AI suggestion queue state (pending count badge in sidebar, review queue with bulk accept/reject, AI reasoning visible per item).

### FR Coverage Map

FR1: Epic 2 — Thought Unit data model and CRUD
FR2: Epic 2 — Unit Type system with 9 base types
FR3: Epic 3 — Perspective Layer per-context type/stance/importance
FR4: Epic 2 — Resource Unit support for non-text formats
FR5: Epic 3 — Resource Unit Perspective Layer
FR6: Epic 4 — Dynamic Chunk computation based on navigation purpose
FR7: Epic 3 — Context as named exploration space
FR8: Epic 3 — Hierarchical Context structure (split/merge/cross-reference)
FR9: Epic 3 — Context snapshot summary, unresolved questions, contradictions, re-entry briefing
FR10: Epic 4 — Directed general graph with typed relations
FR11: Epic 4 — All 23 system relation types across 3 categories
FR12: Epic 3 — Relations inside perspective.relations[] per Context
FR13: Epic 4 — Custom relation types with reusable library
FR14: Epic 4 — Graph cycle detection and loopback marking
FR15: Epic 4 — Merge operation for semantically identical Units
FR16: Epic 7 — Assembly as ordered reference list
FR17: Epic 7 — Assembly Templates with slot mapping
FR18: Epic 2 — Multi-type input processing (raw thought, web clip, structured note, audio, code)
FR19: Epic 8 — External knowledge import connection mode selection
FR20: Epic 2 — Provenance tracking (origin_type, source_span)
FR21: Epic 8 — Reverse tracking from Resource Unit to derived Units
FR22: Epic 5 — AI 3-step decomposition process
FR23: Epic 5 — Unit split with relation re-attribution
FR24: Epic 2 — Capture Mode vs Organize Mode
FR25: Epic 5 — Branch Potential Score with AI-suggested directions
FR26: Epic 5 — Four configurable AI intervention intensity levels
FR27: Epic 2 — AI 3-stage lifecycle (Draft→Pending→Confirmed)
FR28: Epic 5 — AI generation limits (3 Units/request, 40% ratio, 3 consecutive branches)
FR29: Epic 5 — Epistemic Humility Mode for controversial topics
FR30: Epic 5 — AI contribution transparency display
FR31: Epic 5 — Refinement (raw→coherent, v1 preserved, v2 proposed)
FR32: Epic 5 — Label-based flow prediction (missing argument structure alerts)
FR33: Epic 5 — Type/Context-aware external knowledge connection
FR34: Epic 10 — Context Export API (REST endpoint)
FR35: Epic 6 — Navigators (user-defined/AI-generated reading paths)
FR36: Epic 6 — Simultaneous vertical and horizontal navigation
FR37: Epic 6 — Purpose-based relation weight rendering
FR38: Epic 6 — Custom relation types in navigation weight system
FR39: Epic 6 — 4-layer indexing (text, semantic, structure, temporal)
FR40: Epic 6 — ThoughtRank importance score computation
FR41: Epic 6 — Prioritized relation/attribute display on Unit cards
FR42: Epic 6 — Context Dashboard with statistics and entry points
FR43: Epic 6 — Natural-language queries in Search View
FR44: Epic 6 — Two-layer Graph View (Global Overview → Local Card Array)
FR45: Epic 6 — Navigation path: Global → hub → Local → card → Detail
FR46: Epic 6 — Thread View with chronological/derivation order
FR47: Epic 7 — Assembly View with drag-and-drop ordering
FR48: Epic 7 — Assembly Diff (side-by-side comparison)
FR49: Epic 3 — Context View (filtered display per Context)
FR50: Epic 6 — Cross-view Coordination (synchronized selection)
FR51: Epic 7 — Format-specific Unit conversion rules for export
FR52: Epic 7 — Bridge Text auto-generation during export
FR53: Epic 7 — Partial Export by conditions
FR54: Epic 7 — Export History with change notification
FR55: Epic 10 — AI Prompt Auto-generation from selected Units
FR56: Epic 10 — Action Unit external service delegation
FR57: Epic 8 — Action Unit completion result record proposal
FR58: Epic 8 — Incubation Queue for incomplete Units
FR59: Epic 8 — Compression (similar claim core extraction)
FR60: Epic 2 — Thought Versioning (previous versions preserved)
FR61: Epic 5 — Tension Detection (contradictory claims flagging)
FR62: Epic 8 — Orphan Unit Recovery
FR63: Epic 9 — Project as purpose-optimized UI environment
FR64: Epic 8 — Unit Drift detection from project purpose
FR65: Epic 9 — Pre-defined project templates (MVP), custom composition (later)
FR66: Epic 9 — Three types of Domain Templates
FR67: Epic 9 — Domain Template contents (types, relations, scaffolds, navigation, gaps, AI guide)
FR68: Epic 9 — Constraint Levels (Strict, Guided, Open)
FR69: Epic 9 — Freeform-to-Formal Template Export
FR70: Epic 9 — Completeness Compass (confirmed, missing, producible outputs)
FR71: Epic 9 — Freeform mode Completeness Compass (assemblies only)
FR72: Epic 5 — Inline intervention nudges for misuse patterns
FR73: Epic 2 — Full metadata system across 14 categories
FR74: Epic 5 — Scope jump warning (narrow evidence → broad claim)
FR75: Epic 7 — Assembly Source Map auto-generation
FR76: Epic 7 — Reasoning Chain support

## Epic List

### Epic 1: Foundation & User Access
Users can register, log in via Google or GitHub OAuth, and access the Flowmind application with a polished, responsive app shell. This epic delivers the complete technical foundation — T3 Stack initialization, Supabase/pgvector database provisioning, Auth.js authentication, design system tokens, base UI component library (Radix wrappers), responsive app shell layout, CI/CD pipeline, testing infrastructure, and monitoring — so that all subsequent epics build on a solid, production-ready platform.
**FRs covered:** Architecture requirements (starter template, auth, infrastructure, CI/CD, testing, monitoring, design system)
**NFRs addressed:** NFR5, NFR6, NFR7, NFR23
**UX-DRs covered:** UX-DR1–9 (design tokens), UX-DR18–26 (Radix component wrappers), UX-DR27 (app shell), UX-DR35 (toast), UX-DR36 (skeletons), UX-DR37 (empty states), UX-DR38 (form validation), UX-DR42 (view transitions), UX-DR47–50 (responsive layouts), UX-DR51–54 (accessibility foundations), UX-DR57 (browser compatibility)

### Epic 2: Thought Capture & Unit Management
Users can capture thoughts freely in Capture Mode, view them as typed Unit cards with full metadata, manage their lifecycle (Draft → Pending → Confirmed), version their thinking, and work with Resource Units for non-text content. This is the core "first experience" — the user types a thought, and Flowmind preserves it as a first-class cognitive unit.
**FRs covered:** FR1, FR2, FR4, FR18, FR20, FR24, FR27, FR60, FR73
**NFRs addressed:** NFR8, NFR12, NFR13
**UX-DRs covered:** UX-DR10 (UnitCard), UX-DR17 (AILifecycleBadge), UX-DR32 (Unit Detail Panel), UX-DR34 (Onboarding), UX-DR39 (AI suggestion cards), UX-DR40 (drag-and-drop), UX-DR41 (undo/redo), UX-DR43 (keyboard shortcuts), UX-DR58 (optimistic UI), UX-DR59 (Capture Mode)

### Epic 3: Context Organization & Perspectives
Users can create Contexts as exploration spaces, assign Units to them, see different perspectives per Context (type, relations, stance, importance), navigate a hierarchical Context tree, and receive a re-entry briefing when returning to a Context. A single thought can live in multiple Contexts with different roles.
**FRs covered:** FR3, FR5, FR7, FR8, FR9, FR12, FR49
**NFRs addressed:** NFR7, NFR16
**UX-DRs covered:** UX-DR12 (ContextSidebar), UX-DR16 (ContextBriefing), UX-DR33 (Project Dashboard), UX-DR44 (breadcrumbs), UX-DR45 (sidebar tree), UX-DR46 (context preservation), UX-DR60 (Focus Mode)

### Epic 4: Relation Graph & Thought Connections
Users can connect Units through 23+ typed relations (argument, creative, structural), visualize connections as an interactive force-directed graph with two-layer zoom (global overview → local card array), detect cycles and loopbacks, create custom reusable relation types, and merge semantically identical Units.
**FRs covered:** FR6, FR10, FR11, FR13, FR14, FR15
**NFRs addressed:** NFR1, NFR2, NFR18
**UX-DRs covered:** UX-DR11 (GraphCanvas), UX-DR28 (Graph View screen), UX-DR56 (accessible graph nav), UX-DR61 (cross-view sync)

### Epic 5: AI-Powered Thinking & Safety
Users can leverage AI to decompose text into Units, suggest types and relations, refine expression, detect argument gaps and contradictions, explore branch potential, and receive epistemic humility prompts — all within a safe 3-stage lifecycle system with generation limits, ratio warnings, and inline intervention nudges for misuse patterns.
**FRs covered:** FR22, FR23, FR25, FR26, FR28, FR29, FR30, FR31, FR32, FR33, FR61, FR72, FR74
**NFRs addressed:** NFR8, NFR9, NFR10, NFR11
**UX-DRs covered:** UX-DR15 (DecompositionReview), UX-DR36 (AI loading states), UX-DR39 (AI suggestion cards), UX-DR62 (AI suggestion queue)

### Epic 6: Navigation, Search & Discovery
Users can explore their thought graph through Thread View (linear reading), purpose-based navigation weights (argument/creative/chronological modes), user-defined Navigators, multi-layer search (text, semantic, structural, temporal), ThoughtRank scoring, natural language queries, Context Dashboard, and cross-view synchronization.
**FRs covered:** FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46, FR50
**NFRs addressed:** NFR1, NFR2, NFR3, NFR4, NFR6, NFR15
**UX-DRs covered:** UX-DR25 (Command Palette), UX-DR29 (Thread View), UX-DR31 (Search View), UX-DR55 (ARIA live regions)

### Epic 7: Assembly, Composition & Export
Users can compose documents by arranging Units into Assembly slots using drag-and-drop, use templates with AI auto-mapping, generate bridge text between Units, compare Assembly diffs side-by-side, export to multiple formats (Essay, Presentation, Email, Social), maintain export history, and auto-generate source maps and reasoning chains.
**FRs covered:** FR16, FR17, FR47, FR48, FR51, FR52, FR53, FR54, FR75, FR76
**NFRs addressed:** NFR12, NFR19
**UX-DRs covered:** UX-DR13 (AssemblyBoard), UX-DR30 (Assembly View screen)

### Epic 8: Feedback Loop & Thought Evolution
Users can evolve their thinking over time through an Incubation Queue (surfacing incomplete thoughts), Compression (extracting common cores from similar claims), Orphan Unit Recovery (finding unused thoughts), external knowledge import with connection mode selection, reverse provenance tracking, Action Unit completion records, unit drift detection from project purpose, and Branch Project creation from drifted thinking.
**FRs covered:** FR19, FR21, FR57, FR58, FR59, FR62, FR64
**NFRs addressed:** NFR13, NFR14, NFR24
**UX-DRs covered:** UX-DR14 (CompletenessCompass)

### Epic 9: Projects & Domain Templates
Users can work within purpose-optimized project environments with domain-specific templates (software design, nonfiction writing, investment decisions, academic research), scaffold units with pre-planted questions, constraint levels (Strict/Guided/Open), gap detection, AI live guide, Completeness Compass, and freeform-to-formal template export.
**FRs covered:** FR63, FR65, FR66, FR67, FR68, FR69, FR70, FR71
**NFRs addressed:** NFR17
**UX-DRs covered:** UX-DR33 (Project Dashboard enhanced)

### Epic 10: External Integration & Context Export API
Users can share their thought structures with external AI tools via the Context Export API (REST endpoint with API key auth, supporting prompt_package/json/markdown formats), auto-generate structured AI prompts from selected Units, and delegate Action Unit execution to external services (Google Calendar, Todoist, Slack, etc.).
**FRs covered:** FR34, FR55, FR56
**NFRs addressed:** NFR19, NFR20, NFR21

---

## Epic 1: Foundation & User Access

**Goal:** Users can register, log in via Google or GitHub OAuth, and access the Flowmind application with a polished, responsive app shell. This epic delivers the complete technical foundation so that all subsequent epics build on a solid, production-ready platform.

**FRs covered:** Architecture requirements (starter template, auth, infrastructure, CI/CD, testing, monitoring, design system)
**NFRs addressed:** NFR5, NFR6, NFR7, NFR23
**UX-DRs covered:** UX-DR1–9, UX-DR18–26, UX-DR27, UX-DR35–38, UX-DR42, UX-DR47–54, UX-DR57

### Story 1.1: T3 Stack Project Initialization & Configuration

As a developer,
I want a fully initialized T3 Stack project with all required tooling configured,
So that all subsequent development builds on a consistent, type-safe foundation.

**Acceptance Criteria:**

**Given** a fresh repository
**When** the project is initialized using `pnpm create t3-app@latest flowmind --CI --tailwind --trpc --prisma --appRouter --dbProvider postgresql`
**Then** the project compiles with zero errors using TypeScript 5.x strict mode
**And** Turbopack dev server starts successfully with `pnpm dev`
**And** ESLint and Prettier are configured and pass on all generated files
**And** the following additional packages are installed: shadcn/ui, Zustand 5.x, D3.js, dnd-kit, Tiptap 3.x, TanStack Virtual, date-fns, Auth.js v5, Trigger.dev SDK, Sentry SDK, pino, cmdk
**And** pnpm is enforced as the package manager (preinstall script rejects npm/yarn)
**And** a basic `src/app/page.tsx` renders a placeholder landing page

### Story 1.2: Supabase Database Provisioning with pgvector

As a developer,
I want PostgreSQL 16 with pgvector provisioned via Supabase and connected through Prisma,
So that the application has a production-ready database with vector search capability from day one.

**Acceptance Criteria:**

**Given** a Supabase project is provisioned
**When** the Prisma schema is configured with the Supabase connection string
**Then** `prisma migrate dev` runs successfully and creates the database
**And** the pgvector extension is enabled (`CREATE EXTENSION IF NOT EXISTS vector`)
**And** PgBouncer connection pooling is configured for the connection URL
**And** a `prisma/seed.ts` file exists with seed data for the 23 system relation types (supports, contradicts, derives_from, expands, references, exemplifies, defines, questions, inspires, echoes, transforms_into, foreshadows, parallels, contextualizes, operationalizes, contains, presupposes, defined_by, grounded_in, instantiates, and 3 structural) and 4 domain template defaults (software-design, nonfiction-writing, investment-decision, academic-research)
**And** `prisma db seed` runs successfully
**And** environment variables for database URLs are documented in `.env.example`
**And** Prisma Client generates with camelCase TypeScript fields mapped to snake_case database columns

### Story 1.3: Authentication with OAuth & Email Magic Links

As a user,
I want to sign in with Google, GitHub, or a magic email link,
So that I can securely access my Flowmind workspace without managing another password.

**Acceptance Criteria:**

**Given** the Auth.js v5 library is integrated
**When** a user clicks "Sign in with Google"
**Then** they are redirected to Google OAuth consent, and upon approval, a session is created and they are redirected to the app dashboard
**And** the same flow works for GitHub OAuth
**When** a user enters their email and clicks "Send magic link"
**Then** they receive an email with a one-time sign-in link that creates a session when clicked
**And** sessions are persisted via secure HTTP-only cookies
**And** CSRF protection is enabled by default via Auth.js
**And** a user record is created in the database on first sign-in with `id`, `email`, `name`, `image`, `created_at`
**And** subsequent sign-ins with the same email (regardless of provider) link to the same user account
**And** unauthenticated users are redirected to the sign-in page when accessing protected routes
**And** a sign-out action clears the session and redirects to the landing page

### Story 1.4: Design System Tokens & Theme Configuration

As a developer,
I want all design tokens (colors, typography, spacing, elevation, animation, breakpoints) defined as CSS custom properties and Tailwind config,
So that every component uses consistent visual language from a single source of truth.

**Acceptance Criteria:**

**Given** the `tailwind.config.ts` file
**When** design tokens are defined
**Then** base color CSS custom properties are set (--bg-primary: #FFFFFF, --bg-secondary: #F5F5F7, --bg-surface: #FAFAFA, --bg-hover: #F0F0F2, --text-primary: #1D1D1F, --text-secondary: #6E6E73, --text-tertiary: #AEAEB2, --border-default: #D2D2D7, --border-focus: #0071E3, --accent-primary: #0071E3) per UX-DR1
**And** unit-type color tokens are defined for all 9 types (Claim, Question, Evidence, Counterargument, Observation, Idea, Definition, Assumption, Action) with background tint and dark accent pairs per UX-DR2
**And** lifecycle state visual tokens are defined — Draft (dashed border, 80% opacity), Pending (yellow left border, yellow tint), Confirmed (solid border, full opacity) per UX-DR3
**And** semantic color tokens are set (--success: #34C759, --warning: #FF9500, --error: #FF3B30, --info: #5AC8FA) per UX-DR4
**And** typography tokens define 3 font stacks (primary, heading, mono), 7-step type scale (11px to 39px) with weights, line heights, and letter-spacing per UX-DR5
**And** spacing scale tokens use a 4px base unit (10 steps from 4px to 64px) per UX-DR6
**And** card elevation tokens define 4 levels (flat, resting, elevated, high) with specific shadow values, 12px border-radius, and hover/selected states per UX-DR7
**And** animation duration tokens are set (300ms view transitions, 250ms sidebar, 150ms focus, 200ms drag snap) with `prefers-reduced-motion` override to 0ms per UX-DR8
**And** responsive breakpoints are configured (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px) per UX-DR9
**And** a visual token reference page (dev-only route `/dev/tokens`) renders all tokens for verification

### Story 1.5: Radix UI Component Library with Flowmind Styling

As a developer,
I want pre-styled Radix UI primitive wrappers that match the Flowmind design system,
So that all UI components share consistent interaction patterns, accessibility, and visual treatment.

**Acceptance Criteria:**

**Given** the design tokens from Story 1.4
**When** Radix UI primitives are wrapped with Flowmind styling
**Then** a `Dialog` component wraps `@radix-ui/react-dialog` with Level 3 shadow, 12px radius, Framer Motion 300ms entrance, focus trap, and destructive confirmation variant per UX-DR18
**And** a `DropdownMenu` wraps `@radix-ui/react-dropdown-menu` with type-colored indicators, keyboard shortcut hints, separator lines, Level 2 shadow per UX-DR19
**And** a `Tooltip` wraps `@radix-ui/react-tooltip` with 300ms delay, Level 2 shadow, --text-sm size per UX-DR20
**And** a `Popover` wraps `@radix-ui/react-popover` with Level 2 shadow, 12px radius per UX-DR21
**And** a `Tabs` wraps `@radix-ui/react-tabs` with 2px accent underline active tab, 300ms cross-fade per UX-DR22
**And** a `ScrollArea` wraps `@radix-ui/react-scroll-area` with 4px scrollbar visible on hover/scroll only per UX-DR23
**And** a `ContextMenu` wraps `@radix-ui/react-context-menu` with matching dropdown visual treatment per UX-DR24
**And** a `CommandPalette` component uses cmdk with Cmd+K global trigger, fuzzy search, keyboard navigation, recent actions, Level 3 shadow per UX-DR25
**And** a `Toggle` wraps `@radix-ui/react-toggle` with accent-primary active fill, bg-surface inactive per UX-DR26
**And** all components are keyboard-accessible and pass axe-core automated accessibility checks
**And** a dev-only route `/dev/components` showcases all wrapped components

### Story 1.6: App Shell Layout with Responsive Breakpoints

As a user,
I want a polished app shell with a sidebar, toolbar, main content area, and detail panel that adapts to my screen size,
So that I can navigate Flowmind comfortably on any device from desktop to tablet.

**Acceptance Criteria:**

**Given** the design tokens and Radix components from Stories 1.4–1.5
**When** the app shell layout is built
**Then** it includes a title bar (40px), sidebar (260px collapsible), toolbar (48px with breadcrumb placeholder + view switcher placeholder), main content area (fluid 600–1200px), and detail panel (360px slide-in) per UX-DR27
**And** three layout modes are supported: Canvas, Focus, Graph (switchable via toolbar)
**And** at desktop-wide (1280px+), the layout shows full three-column with non-pushing detail panel per UX-DR47
**And** at desktop-compact (1024px–1279px), the sidebar is collapsed and the detail panel overlays per UX-DR48
**And** at tablet (768px–1023px), the sidebar is hidden behind a hamburger menu, the detail panel opens as full-screen overlay, and touch targets are 48px per UX-DR49
**And** text zoom to 200% causes no horizontal scrolling per UX-DR50
**And** view transitions use 300ms cross-fade, sidebar uses 250ms slide, detail panel uses 300ms slide per UX-DR42
**And** ARIA landmarks are applied (nav, main, aside, article, section) with a skip-to-content link per UX-DR54
**And** focus indicator system uses 2px solid accent-primary with 2px offset on all interactive elements per UX-DR52
**And** focus management for overlays includes focus trap, focus return on close, and Escape to close per UX-DR53

### Story 1.7: Toast, Skeleton Loading & Empty State Patterns

As a user,
I want consistent feedback when content is loading, when areas are empty, and when actions succeed or fail,
So that the interface always communicates its state clearly and I never wonder what's happening.

**Acceptance Criteria:**

**Given** the app shell from Story 1.6
**When** toast notifications are triggered
**Then** they appear bottom-center with 300ms slide-up animation, auto-dismiss after 4 seconds, support success/error/info/warning types, include an undo action link where applicable, and queue when multiple toasts fire per UX-DR35
**And** skeleton loading states are implemented as CSS pulse animations (no spinners) for all content areas, with AI processing shown as a dot animation with cancel button per UX-DR36
**And** empty states display a centered illustration + headline + CTA button for all major content areas (Units, Contexts, Projects, Search results) per UX-DR37
**And** inline form validation shows error on blur, success checkmark on valid, helper text on focus, and accent-primary focus indicator per UX-DR38
**And** ARIA live regions announce toast content (assertive for errors, polite for info/success) per UX-DR55

### Story 1.8: CI/CD Pipeline, Testing Infrastructure & Monitoring

As a developer,
I want automated CI/CD, testing frameworks, and error monitoring configured,
So that code quality is enforced automatically and production issues are detected immediately.

**Acceptance Criteria:**

**Given** the initialized project
**When** CI/CD and testing are configured
**Then** a `.github/workflows/ci.yml` runs lint + type check + unit tests on every PR
**And** a `.github/workflows/e2e.yml` runs Playwright E2E tests on merge to main
**And** Vitest is configured for unit tests with co-located `*.test.ts` files, integration tests in `__tests__/integration/`, and test helpers with DB setup/teardown and factories
**And** Playwright is configured for E2E tests in `e2e/` directory
**And** Sentry SDK is integrated for error tracking and performance monitoring
**And** Vercel Analytics is configured for web vitals tracking
**And** pino is configured for structured JSON server-side logging
**And** preview deployments on PR branches are enabled via Vercel
**And** at least one example unit test, one integration test, and one E2E test pass successfully in CI

### Story 1.9: Keyboard Shortcuts & Accessibility Foundations

As a user,
I want keyboard shortcuts for common actions and full WCAG 2.1 AA accessibility,
So that I can use Flowmind efficiently regardless of my input method or ability.

**Acceptance Criteria:**

**Given** the app shell and component library
**When** the keyboard shortcut system is implemented
**Then** Cmd+K opens the Command Palette, Cmd+N triggers capture mode (placeholder), Cmd+1–4 switch views (placeholder targets), Escape closes any overlay, and Cmd+/ shows a keyboard shortcut help overlay per UX-DR43
**And** color contrast meets WCAG 2.1 AA (4.5:1 body text, 3:1 large text/interactive) with a high-contrast mode toggle per UX-DR51
**And** all interactive elements have a visible 2px focus indicator per UX-DR52
**And** ARIA landmarks, semantic HTML, and skip-to-content link are in place per UX-DR54
**And** the application targets modern evergreen browsers (Chrome, Safari, Firefox, Edge latest 2 versions) per UX-DR57

---

## Epic 2: Thought Capture & Unit Management

**Goal:** Users can capture thoughts freely in Capture Mode, view them as typed Unit cards with full metadata, manage their lifecycle (Draft → Pending → Confirmed), version their thinking, and work with Resource Units for non-text content. This is the core "first experience."

**FRs covered:** FR1, FR2, FR4, FR18, FR20, FR24, FR27, FR60, FR73
**NFRs addressed:** NFR8, NFR12, NFR13
**UX-DRs covered:** UX-DR10, UX-DR17, UX-DR32, UX-DR34, UX-DR39–41, UX-DR43, UX-DR58, UX-DR59

### Story 2.1: Thought Unit Data Model & CRUD API

As a user,
I want to create, read, update, and delete Thought Units with globally unique IDs and full metadata,
So that my thoughts are persisted as first-class cognitive units in the system.

**Acceptance Criteria:**

**Given** the Prisma schema and database from Epic 1
**When** the Thought Unit model is defined
**Then** each Unit has: `id` (cuid), `content` (text), `created_at`, `updated_at`, `user_id`, `unit_type` (enum: claim, question, evidence, counterargument, observation, idea, definition, assumption, action), `lifecycle` (enum: draft, pending, confirmed), `origin_type` (enum: direct_write, external_excerpt, external_inspiration, external_summary, ai_generated, ai_refined), `source_span` (JSON: parent_input_id, position, excerpt_preview), and `ai_trust_level` (enum: user_authored, ai_confirmed, inferred; default: user_authored) per FR1, FR2, FR20, FR30
**And** tRPC router exposes `unit.create`, `unit.getById`, `unit.list`, `unit.update`, `unit.delete` procedures
**And** the service layer (`server/services/unitService.ts`) handles business logic; routers never access Prisma directly
**And** the repository layer (`server/repositories/unitRepository.ts`) is the sole Prisma accessor
**And** all mutations publish events via the internal event bus (`server/events/eventBus.ts`) per architecture requirement
**And** unit content is globally unique and immutable in identity per NFR12
**And** `prisma migrate dev` creates the migration successfully
**And** unit tests cover all CRUD operations including validation errors

### Story 2.2: Unit Type System with AI-Proposed Types

As a user,
I want each Thought Unit to carry a logical type (Claim, Question, Evidence, etc.) that AI proposes and I confirm,
So that my thoughts are categorized by their cognitive role automatically while I retain full control.

**Acceptance Criteria:**

**Given** a Thought Unit exists
**When** a new Unit is created from user input
**Then** the system assigns a default type based on content heuristics (e.g., ends with "?" → Question, starts with "I think" → Claim) per FR2
**And** the assigned type is set with `lifecycle: "draft"` so the user must confirm it
**And** the user can change the type via a dropdown showing all 9 base types with their type-colored indicators
**And** changing the type updates the Unit immediately with optimistic UI per UX-DR58
**And** each Unit type has a distinct color token (background tint and dark accent) as defined in UX-DR2
**And** the type assignment is per-Unit at the global level (perspective-based type override comes in Epic 3)

### Story 2.3: UnitCard Component with Three Variants

As a user,
I want to see my thoughts as visually rich cards with different detail levels,
So that I can scan quickly or dive deep depending on my current task.

**Acceptance Criteria:**

**Given** Thought Units exist in the database
**When** they are rendered as UnitCard components
**Then** the Compact variant shows type-colored left border, first line of content (truncated), and unit type badge
**And** the Standard variant adds metadata row (created date, lifecycle badge, branch potential placeholder), relation count indicator, and context membership tags
**And** the Expanded variant adds full content, version history link, provenance info, and relation list preview
**And** cards support 6 visual states: Default, Hover (elevation change), Selected (accent border), Draft (dashed border, 80% opacity), Pending (yellow left border, yellow tint), Confirmed (solid border, full opacity) per UX-DR3, UX-DR10
**And** each card has `role="article"` and sr-only labels for accessibility per UX-DR10
**And** hover state shows a 6-dot drag grip handle (placeholder for dnd-kit integration) per UX-DR40

### Story 2.4: Capture Mode — Distraction-Free Thought Input

As a user,
I want a minimal, distraction-free input mode where I can just type my thoughts,
So that I can capture ideas at the speed of thinking without any UI friction.

**Acceptance Criteria:**

**Given** the user is anywhere in the app
**When** they press Cmd+N or click the Capture button
**Then** Capture Mode activates: all chrome hides except a centered text input with the placeholder "What are you thinking about?" per UX-DR59, FR24
**And** pressing Escape exits Capture Mode and returns to the previous view
**And** pressing Enter (or a submit button) creates a new Thought Unit with `lifecycle: "draft"`, `origin_type: "direct_write"`, and `unit_type: "observation"` (default)
**And** the created Unit appears immediately in the UI via optimistic update per UX-DR58
**And** no AI intervention occurs in Capture Mode — the text is stored as-is per FR24
**And** input accepts text of any length without a character limit per FR18
**And** after submission, the input clears and remains open for the next thought (rapid-fire capture)
**And** a mode indicator distinguishes Capture Mode (no AI) from Organize Mode (AI-assisted); the user can toggle between them via a toolbar switch or Cmd+Shift+N per FR24
**And** in Organize Mode, submitted text is immediately routed to the AI decomposition pipeline (Epic 5, Story 5.2) instead of being stored as a single Unit

### Story 2.5: AI Lifecycle System (Draft → Pending → Confirmed)

As a user,
I want AI-generated content to go through a clear visual lifecycle before it becomes part of my knowledge,
So that I always know what's AI-proposed versus what I've approved.

**Acceptance Criteria:**

**Given** a Unit exists with any lifecycle state
**When** the Unit is in `draft` state
**Then** it renders with a dashed border and gray background, cannot be added to Assemblies, cannot create relations, and cannot be used in Navigators per FR27, NFR8
**And** an AILifecycleBadge component shows "Draft" with dashed gray styling in Small (inline) and Medium (card) sizes per UX-DR17
**When** the user clicks "Review" on a draft Unit
**Then** it transitions to `pending` state with yellow border styling and is queued for user review
**When** the user clicks "Confirm" on a pending Unit
**Then** it transitions to `confirmed` state with solid border and full opacity, and gains full functionality (relations, assemblies, navigators)
**And** keyboard shortcuts D, P, C cycle lifecycle states for the selected Unit per UX-DR43
**And** lifecycle transitions use optimistic UI with event bus notification per UX-DR58
**And** undo is available via Cmd+Z for the most recent lifecycle change per UX-DR41

### Story 2.6: Resource Unit Support for Non-Text Content

As a user,
I want to attach images, files, audio, code, and links as first-class Resource Units,
So that non-text content participates equally in my thinking alongside text Units.

**Acceptance Criteria:**

**Given** the Thought Unit model
**When** a Resource Unit model is defined
**Then** it includes: `id` (cuid), `resource_type` (enum: image, table, audio, diagram, link, video, code), `url` (Vercel Blob storage URL or external URL), `mime_type`, `file_size`, `metadata` (JSON for dimensions, duration, etc.), `created_at`, `user_id` per FR4
**And** files are uploaded to Vercel Blob storage and the returned URL is stored in the Resource Unit
**And** a single Resource Unit can be referenced by multiple Thought Units via a many-to-many join table per FR4
**And** tRPC procedures `resource.upload`, `resource.getById`, `resource.list`, `resource.delete` are available
**And** the UnitCard renders Resource Units with a type-specific preview (image thumbnail, code snippet, link preview, audio waveform placeholder)
**And** Resource Units support the same lifecycle states as Thought Units (draft, pending, confirmed)

### Story 2.7: Unit Versioning & History

As a user,
I want to see how my thinking has evolved by viewing previous versions of any Unit,
So that I can track my intellectual development and recover earlier formulations.

**Acceptance Criteria:**

**Given** a confirmed Thought Unit
**When** the user edits its content
**Then** the previous content is preserved as a version entry with: `version_number`, `content`, `changed_at`, `change_reason` (optional user input), `diff_summary` per FR60
**And** the Unit Detail Panel shows a "Version History" tab listing all versions in reverse chronological order
**And** clicking a version shows a diff view highlighting what changed between that version and the current content
**And** the user can restore a previous version, which creates a new version (not destructive) with `change_reason: "Restored from v{N}"`
**And** provenance metadata (`origin_type`, `source_span`) is preserved across versions per FR20
**And** all modifications are automatically reflected in Assemblies and Navigators containing this Unit per NFR12

### Story 2.8: Unit Detail Panel with Tabbed Layout

As a user,
I want a comprehensive detail panel for any Unit where I can edit content, view metadata, manage relations, and see AI suggestions,
So that I have full control over every aspect of my thoughts in one place.

**Acceptance Criteria:**

**Given** a Unit is selected in any view
**When** the Unit Detail Panel opens (360px slide-in from the right)
**Then** it displays 4 tabs: Content, Relations (placeholder), Metadata, AI (placeholder) per UX-DR32
**And** the Content tab shows inline-editable content (using Tiptap 3.x rich text editor), unit type selector dropdown, and lifecycle controls (Draft/Pending/Confirmed buttons)
**And** the Metadata tab shows: creation date, last modified, origin_type, source_span, version count, lifecycle state, and all FR73 metadata fields that are populated
**And** the Relations tab shows a list of connected Units (placeholder — populated in Epic 4)
**And** the AI tab shows AI suggestions (placeholder — populated in Epic 5)
**And** the panel slides in with 300ms animation per UX-DR42
**And** the panel has a close button and responds to Escape key per UX-DR53
**And** at tablet breakpoint (768px–1023px), the panel opens as a full-screen overlay per UX-DR49

### Story 2.9: Onboarding First-Time Experience

As a new user,
I want a guided introduction that shows me the value of Flowmind immediately,
So that I understand the thought-unit paradigm without reading documentation.

**Acceptance Criteria:**

**Given** a user has signed in for the first time (no existing Units)
**When** they land on the app
**Then** they see a clean, single-input view with "What are you thinking about?" as the placeholder — identical to Capture Mode but as the full-screen experience per UX-DR34
**And** after submitting their first thought, a brief 3-step tooltip tour highlights: (1) their newly created Unit card, (2) the sidebar where Contexts will appear, (3) the view switcher in the toolbar
**And** each tooltip has a "Next" and "Skip" option
**And** the tour completion state is stored in user preferences so it doesn't repeat
**And** the first-input decomposition trigger is a placeholder — the actual AI decomposition comes in Epic 5 (Story 5.3 wires it), but a visual hint ("Later, AI will help you break this down into connected ideas") is shown per UX-DR34

### Story 2.10: Drag-and-Drop Foundation & Undo/Redo System

As a user,
I want to drag units to reorder them and undo/redo my actions,
So that I can freely experiment with my thought organization without fear of losing work.

**Acceptance Criteria:**

**Given** UnitCards are rendered in a list
**When** the user hovers over a card
**Then** a 6-dot grip handle appears per UX-DR40
**And** dragging a card shows it at 0.8 opacity with dashed accent drop zones indicating valid targets per UX-DR40
**And** dropping a card snaps it into position with a 200ms spring animation per UX-DR40
**And** keyboard-initiated drag-and-drop is supported (Space to grab, arrows to move, Space to drop) per UX-DR40
**And** Cmd+Z undoes the last action (unit create, edit, delete, reorder, lifecycle change) per UX-DR41
**And** Cmd+Shift+Z redoes the last undone action per UX-DR41
**And** undo triggers a toast showing the action name (e.g., "Unit creation undone") per UX-DR41
**And** destructive operations (delete) show a confirmation dialog before executing per UX-DR41

### Story 2.11: Audio Input & Transcription-Linked Units

As a user,
I want to record audio thoughts and have them transcribed into Thought Units that link back to specific audio timestamps,
So that I can capture ideas verbally when typing is impractical and later navigate between text and the original spoken context.

**Acceptance Criteria:**

**Given** the user is in Capture Mode or any Unit creation context
**When** the user taps the record button (microphone icon in the input toolbar)
**Then** a real-time waveform visualizer appears showing audio levels during recording
**And** the recording state is clearly indicated with a pulsing red dot and elapsed time counter
**And** the user can stop recording via the stop button or by pressing Escape
**Given** a recording has been stopped
**When** the audio is submitted for processing
**Then** a processing state indicator shows "Transcribing…" with a progress animation
**And** the transcribed text is fed through the standard Unit creation pipeline (including AI decomposition if enabled)
**And** the original audio file is stored as a Resource Unit (type: audio) linked to the generated Thought Units
**Given** Units have been created from an audio recording
**When** the user views any such Unit in UnitCard or Unit Detail Panel
**Then** each Unit displays an audio timestamp badge (e.g., "🔊 1:23") indicating the position in the source audio
**And** clicking the timestamp badge opens an inline audio player and plays from that exact position
**And** the audio Resource Unit's detail view shows the full waveform with clickable timestamp markers for each derived Unit

---

## Epic 3: Context Organization & Perspectives

**Goal:** Users can create Contexts as exploration spaces, assign Units to them, see different perspectives per Context, navigate a hierarchical Context tree, and receive a re-entry briefing when returning to a Context. A single thought can live in multiple Contexts with different roles.

**FRs covered:** FR3, FR5, FR7, FR8, FR9, FR12, FR49
**NFRs addressed:** NFR7, NFR16
**UX-DRs covered:** UX-DR12, UX-DR16, UX-DR33, UX-DR44, UX-DR45, UX-DR46, UX-DR60

### Story 3.1: Context Data Model & CRUD API

As a user,
I want to create, rename, and delete Contexts as named exploration spaces,
So that I can organize my thinking into distinct purposes and investigations.

**Acceptance Criteria:**

**Given** the database schema
**When** the Context model is defined
**Then** it includes: `id` (cuid), `name`, `description` (optional), `user_id`, `parent_context_id` (nullable, for hierarchy per FR8), `created_at`, `updated_at`, `snapshot_summary` (text, AI-generated placeholder), `unresolved_questions` (JSON array), `contradictions` (JSON array) per FR7, FR9
**And** a many-to-many join table `unit_context` links Units to Contexts (a Unit can belong to multiple Contexts) per FR7
**And** tRPC procedures `context.create`, `context.getById`, `context.list`, `context.update`, `context.delete`, `context.addUnit`, `context.removeUnit` are available
**And** deleting a Context does not delete its Units — it only removes the membership associations
**And** Contexts support hierarchical nesting via `parent_context_id` per FR8
**And** the service layer enforces that a Context must have a unique name within its parent scope

### Story 3.2: Perspective Layer — Per-Context Unit Views

As a user,
I want a Unit to have different types, importance, stance, and notes depending on which Context I'm viewing it in,
So that the same thought can serve different roles in different investigations.

**Acceptance Criteria:**

**Given** a Unit belongs to multiple Contexts
**When** the Perspective model is defined
**Then** it includes: `id`, `unit_id`, `context_id`, `type_override` (nullable, overrides the global Unit type within this Context), `importance` (0.0–1.0), `stance` (enum: supporting, opposing, neutral, exploring), `notes` (text), `relations` (JSON array — placeholder for Epic 4) per FR3, FR12
**And** the global Unit content is stored once; only perspective fields vary per Context per NFR7
**And** Resource Units also support the Perspective Layer — the same resource can function as "evidence" in one Context and "inspiration" in another per FR5
**And** tRPC procedures `perspective.upsert`, `perspective.getForUnit` are available
**And** when viewing a Context, Unit cards display the perspective-specific type (if overridden), importance, and stance rather than global defaults
**And** editing a perspective field only affects that Context, not others

### Story 3.3: Context Sidebar with Hierarchical Tree Navigation

As a user,
I want a sidebar showing my Contexts in a collapsible tree structure,
So that I can quickly navigate between my exploration spaces.

**Acceptance Criteria:**

**Given** Contexts exist with hierarchical nesting
**When** the ContextSidebar component renders
**Then** it shows a project selector at the top (placeholder for Epic 9, showing "Default Project" for now)
**And** below is a collapsible tree of Contexts with parent-child nesting, expand/collapse chevrons, and active item highlighting per UX-DR12, UX-DR45
**And** the sidebar has 3 width states: 260px expanded, 60px collapsed (icon-only), 0px hidden per UX-DR12
**And** collapse/expand uses 250ms slide animation per UX-DR42
**And** drag-to-reorder Contexts within the tree is supported per UX-DR45
**And** right-click opens a context menu with: Rename, Delete, Add Sub-Context, Move per UX-DR45
**And** a "New Context" button is accessible at the top of the tree
**And** clicking a Context filters the main view to show only Units in that Context per FR49

### Story 3.4: Context View — Filtered Unit Display

As a user,
I want to see only the Units belonging to a specific Context when I select it,
So that I can focus on one exploration at a time without distraction.

**Acceptance Criteria:**

**Given** a Context is selected in the sidebar
**When** the main content area updates
**Then** only Units that are members of the selected Context are displayed per FR49
**And** each Unit card shows its perspective-specific type override (if set), importance, and stance for this Context
**And** the toolbar breadcrumb updates to show the Context name per UX-DR44
**And** Units can be added to the current Context via a dropdown or drag from a global unit list
**And** Units can be removed from the current Context (not deleted globally) via the context menu
**And** the "All Units" view (no Context filter) remains accessible via a sidebar option
**And** the Context's `snapshot_summary` is displayed at the top of the view (placeholder text for now — AI generation in Epic 5)

### Story 3.5: Context Hierarchy — Split, Merge & Cross-Reference

As a user,
I want to split a large Context into sub-Contexts, merge related Contexts, and cross-reference between them,
So that my organizational structure can evolve as my thinking deepens.

**Acceptance Criteria:**

**Given** one or more Contexts exist
**When** the user chooses "Split Context"
**Then** a dialog allows them to name two new sub-Contexts and assign Units to each; the original Context becomes the parent of both per FR8
**And** Units not assigned to either sub-Context remain in the parent Context
**When** the user selects two Contexts and chooses "Merge Contexts"
**Then** a dialog allows them to name the merged Context; all Units from both are combined; perspective data is preserved (conflicts prompt the user to choose which perspective to keep) per FR8
**When** the user adds a cross-reference between two Contexts
**Then** a `context_reference` record links them (bidirectional), and each Context shows the cross-reference in its header per FR8
**And** split, merge, and cross-reference operations are undoable via Cmd+Z

### Story 3.6: Context Briefing & Re-Entry Experience

As a user,
I want a summary of where I left off when I return to a Context,
So that I can quickly re-enter my previous cognitive state without re-reading everything.

**Acceptance Criteria:**

**Given** a user has previously visited a Context and returns to it after a period of absence
**When** the Context loads
**Then** a ContextBriefing component displays: a session summary (last visit date, units added/modified since last visit), a list of open questions (from `unresolved_questions`), and AI suggestions placeholder per UX-DR16, FR9
**And** the briefing offers two CTAs: "Continue where I left off" (scrolls to last-viewed Unit) and "Start fresh" (shows full Context view) per UX-DR16
**And** the briefing appears automatically without user request per NFR16
**And** the user can dismiss the briefing and it collapses to a small indicator in the toolbar
**And** last visit timestamp and last-viewed Unit ID are stored per user per Context

### Story 3.7: Project Dashboard with Context Grid

As a user,
I want a dashboard showing all my Contexts at a glance with their status indicators,
So that I can pick up any thread of thinking and see which areas need attention.

**Acceptance Criteria:**

**Given** the user has created multiple Contexts
**When** they navigate to the Project Dashboard
**Then** a grid of Context cards is displayed, each showing: Context name, Unit count, unresolved question count, last modified date, and a mini Completeness Compass indicator (placeholder circle) per UX-DR33
**And** a "New Context" button is prominently placed per UX-DR33
**And** an AI suggestions panel (placeholder) shows recommended next actions per UX-DR33
**And** Context cards are clickable and navigate to the Context View for that Context
**And** the dashboard is the default landing page after onboarding is complete

### Story 3.8: Breadcrumb Navigation, Focus Mode & Context Preservation

As a user,
I want breadcrumb navigation showing where I am, a Focus mode for deep work, and my view state preserved when I navigate away and back,
So that I never lose my place or context while exploring.

**Acceptance Criteria:**

**Given** the toolbar and app shell from Epic 1
**When** the user navigates into a Context and then into a Unit
**Then** the breadcrumb shows "Project / Context / Unit" with each segment clickable and truncated segments showing full name on hover via Tooltip per UX-DR44
**When** the user toggles Focus Mode
**Then** the sidebar and detail panel hide, the toolbar becomes minimal, and the main content area expands to fill the screen per UX-DR60
**And** Focus Mode persists in the current session (survives view switches) per UX-DR60
**When** the user navigates away from a view and returns
**Then** scroll position, selection state, open panels, filter state, and zoom level are restored per UX-DR46
**And** context preservation state is stored in Zustand per the architecture's feature module isolation requirement

---

## Epic 4: Relation Graph & Thought Connections

**Goal:** Users can connect Units through 23+ typed relations, visualize connections as an interactive force-directed graph with two-layer zoom, explore Contexts as an infinite canvas with free-form spatial positioning, detect cycles and loopbacks, create custom reusable relation types, and merge semantically identical Units.

**FRs covered:** FR6, FR10, FR11, FR13, FR14, FR15
**NFRs addressed:** NFR1, NFR2, NFR18
**UX-DRs covered:** UX-DR11, UX-DR28, UX-DR56, UX-DR61

### Story 4.1: Relation Data Model with 23 System Types

As a user,
I want to create typed, directional relations between Units that carry strength and purpose,
So that my thoughts form a rich knowledge graph with meaningful connections.

**Acceptance Criteria:**

**Given** the database schema and seed data from Epic 1
**When** the Relation model is defined
**Then** it includes: `id`, `source_unit_id`, `target_unit_id`, `relation_type_id` (FK to seeded relation types), `strength` (float 0.0–1.0, default 0.5), `direction` (enum: one_way, bidirectional), `purpose` (JSON array of strings), `created_at`, `context_id` (relations live inside perspectives per FR12) per FR10
**And** all 23 system relation types are available from seed data organized in three groups: Argument-centered (supports, contradicts, derives_from, expands, references, exemplifies, defines, questions), Creative/research/execution-centered (inspires, echoes, transforms_into, foreshadows, parallels, contextualizes, operationalizes), Structure/containment (contains, presupposes, defined_by, grounded_in, instantiates) per FR11
**And** relations reside inside the Perspective Layer — the same two Units can have different relations in different Contexts per FR12
**And** tRPC procedures `relation.create`, `relation.update`, `relation.delete`, `relation.listForUnit`, `relation.listForContext` are available
**And** creating a relation between a draft Unit and any other Unit is blocked (lifecycle enforcement) per NFR8
**And** the event bus emits `relation.created`, `relation.updated`, `relation.deleted` events

### Story 4.2: Relation CRUD UI & Inline Connection

As a user,
I want to create and manage relations between Units directly from the Unit Detail Panel,
So that I can build connections as naturally as I think of them.

**Acceptance Criteria:**

**Given** a Unit is open in the Detail Panel
**When** the user navigates to the Relations tab
**Then** existing relations are listed with: connected Unit title (truncated), relation type badge (color-coded), strength indicator (0.0–1.0 bar), and direction arrow per FR10
**And** relations are grouped by type category (Argument, Creative, Structural)
**And** a "+ Add Relation" button opens a search/select popover where the user can: search for a target Unit by content, select a relation type from the 23 system types, set strength via slider, and set direction per FR10, FR11
**And** relations can be edited (change type, strength, direction) or deleted from the list
**And** by default, top 3–5 relations are shown with a "See more" expansion per FR41
**And** all relation operations use optimistic UI per UX-DR58

### Story 4.3: Custom Relation Types with Reusable Library

As a user,
I want to define my own relation types beyond the 23 system types and save them for reuse,
So that my domain-specific connections are first-class citizens in the graph.

**Acceptance Criteria:**

**Given** the 23 system relation types exist
**When** the user creates a custom relation type
**Then** it includes: `name` (user-defined), `from_unit_id`, `to_unit_id`, `scope` (enum: private, shared), `reusable` (boolean), `purpose_tag` (optional, for navigation weight integration per FR38), `created_by`, `created_at` per FR13
**And** when `reusable: true`, the custom type enters a persistent library accessible from the relation type selector per FR13
**And** the custom type library is browsable and searchable from the "+ Add Relation" flow
**And** custom types with `scope: shared` are visible to all users in the project (future multi-user support) per NFR18
**And** AI can suggest reuse of existing custom types when creating new relations in similar situations (placeholder for Epic 5)

### Story 4.4: Graph Canvas — Global Overview Layer

As a user,
I want to see my entire thought network as an interactive force-directed graph,
So that I can discover clusters, hubs, and gaps in my thinking at a glance.

**Acceptance Criteria:**

**Given** Units and Relations exist in the database
**When** the user switches to Graph View
**Then** a full-screen GraphCanvas renders using D3.js force-directed layout per UX-DR11, UX-DR28
**And** Layer 1 (Global Overview) shows: small dots for Units, thin lines for relations, type-based color coding (each dot colored by its Unit type), and auto-detected clusters (community detection via Louvain or similar) per FR44
**And** a floating filter bar allows filtering by Unit type, lifecycle state, and Context membership per UX-DR28
**And** zoom controls (+/−/reset) and a mini-map are displayed per UX-DR28
**And** a layer indicator shows "Global Overview" vs "Local View" per UX-DR28
**And** pan (click-drag on canvas) and zoom (scroll wheel) are supported
**And** the graph updates relation line thickness, color intensity, and visibility in real time when filters change per NFR2
**And** nodes are keyboard-navigable with arrow keys and announce via screen reader per UX-DR56

### Story 4.5: Graph Canvas — Local Card Array & Navigation

As a user,
I want to click a hub or cluster in the graph to zoom into a local card view of connected Units,
So that I can explore specific areas of my thinking in detail without losing the big picture.

**Acceptance Criteria:**

**Given** the Global Overview is displayed
**When** the user clicks a hub node or cluster
**Then** the view transitions (300ms animation) to Layer 2 (Local Card Array): Units within relation depth N are loaded as UnitCards arranged around the hub per FR44, FR45
**And** clicking a card in the Local Card Array opens the Unit Detail Panel per FR45
**And** the navigation path is: Global View → [click hub] → Local Card Array → [click card] → Unit Detail per FR45
**And** a "Back to Global" button returns to the full overview
**And** the mini-map highlights the currently visible area within the global graph
**And** the graph supports simultaneous vertical (derivation order) and horizontal (semantic jump) navigation — moving from Unit D back to A then to Branch 3 is possible per FR36

### Story 4.6: Cycle Detection & Loopback Marking

As a user,
I want the system to detect circular references in my thought graph and mark them clearly,
So that I don't get lost in infinite loops and can traverse cycles only by conscious choice.

**Acceptance Criteria:**

**Given** a graph of related Units
**When** a cycle is detected (e.g., A → B → C → A)
**Then** the return edge (C → A) is marked as a "loopback" with a distinct visual indicator (dashed line, loop icon) per FR14
**And** the Context Dashboard reports the presence of cycles per FR42
**And** loopback edges are traversable but require an explicit click (not auto-followed during navigation)
**And** cycle detection runs on relation creation/deletion and caches results
**And** the algorithm uses depth-first search on the directed graph within the current Context

### Story 4.7: Unit Merge Operation

As a user,
I want to merge two semantically identical Units into one,
So that my graph stays clean and all connections are unified.

**Acceptance Criteria:**

**Given** two Units exist that the user considers identical
**When** the user selects both Units and chooses "Merge"
**Then** a merge dialog shows both Units side-by-side and lets the user choose: which content to keep (or combine), which type to assign, and which metadata to preserve per FR15
**And** upon confirmation, one Unit is retained and the other is archived (not deleted, preserving audit trail)
**And** all relations pointing to or from the archived Unit are re-attributed to the retained Unit per FR15
**And** all Assembly references to the archived Unit are updated to point to the retained Unit
**And** all Context memberships from both Units are combined on the retained Unit
**And** the merge creates a version entry on the retained Unit noting the merge
**And** the merge is undoable via Cmd+Z

### Story 4.8: Dynamic Chunk Computation

As a developer,
I want Chunks to be computed dynamically based on navigation purpose without being stored,
So that intermediate groupings between Unit and Context adapt in real time.

**Acceptance Criteria:**

**Given** Units exist within a Context with relations
**When** the system computes Chunks for a given navigation purpose
**Then** Chunks are calculated in real time based on: semantic similarity (via embeddings placeholder), relation density, and temporal proximity per FR6
**And** Chunks are not stored in the database — they are ephemeral computation results per FR6
**And** Chunk computation completes without perceptible delay (< 200ms for up to 100 Units) per NFR1
**And** different navigation purposes (argument exploration, creative brainstorming, chronological review) produce different Chunk groupings
**And** a service `server/services/chunkService.ts` encapsulates the computation logic
**And** Chunks are available via tRPC procedure `chunk.computeForContext`

### Story 4.9: Cross-View Selection Synchronization

As a user,
I want selecting a Unit in any view to highlight it in all other views simultaneously,
So that my spatial awareness is maintained across different representations of my thinking.

**Acceptance Criteria:**

**Given** multiple views are available (Context View, Graph View)
**When** the user selects a Unit in Context View
**Then** the same Unit is highlighted in Graph View (node glow effect) and the Detail Panel opens per FR50, UX-DR61
**And** selecting a node in Graph View highlights the corresponding card in Context View
**And** the synchronization is instantaneous from the user's perspective per NFR3
**And** selection state is managed via a Zustand store (`useSelectionStore`) shared across all view components
**And** ARIA live regions announce the selection change politely per UX-DR55

### Story 4.10: Canvas View — Infinite Whiteboard for Context Exploration

As a user,
I want to explore a Context as an infinite canvas where I can freely position Units and draw relations visually,
So that I can think spatially and see my ideas as a living map.

**Acceptance Criteria:**

**Given** a Context with Units and Relations exists
**When** the user toggles to Canvas View via the view switcher (alongside Thread/Graph/List)
**Then** an infinite canvas renders with all Context Units as freely draggable compact cards (type-colored border, title, lifecycle badge) per UX-DR28
**And** Units can be dragged to any position on the canvas, and positions persist per-Unit per-Context via `canvas_position` fields in `unit_perspectives` (debounced tRPC mutation, 300ms)
**And** existing relations between visible Units are rendered as curved colored lines between cards (color by relation category at 60% opacity: blue for argument, purple for creative, gray for structural)
**And** dragging from one card's edge to another card opens a relation type picker popover, allowing the user to create a new relation inline per FR10, FR11
**And** pan (drag background) and zoom (scroll/pinch, range 10%–400%) are supported per UX-DR28
**And** a minimap (160×120px, bottom-right corner) shows all card positions with a viewport rectangle for navigation
**And** an "Auto-layout" button applies force-directed positioning (reusing D3-force from Story 4.4), undoable with Cmd+Z
**And** NavigationPurpose filtering applies to relation line visibility (non-matching lines fade to 15% opacity) per FR38
**And** selecting a card in Canvas View synchronizes with other views via `useSelectionStore` (extends Story 4.9)
**And** all cards are keyboard-navigable (Tab between cards, arrow keys nudge position) with ARIA announcements per UX-DR55, UX-DR56

---

## Epic 5: AI-Powered Thinking & Safety

**Goal:** Users can leverage AI to decompose text into Units, suggest types and relations, refine expression, detect argument gaps and contradictions, explore branch potential, and receive epistemic humility prompts — all within a safe lifecycle system with generation limits, ratio warnings, and inline intervention nudges.

**FRs covered:** FR22, FR23, FR25, FR26, FR28, FR29, FR30, FR31, FR32, FR33, FR61, FR72, FR74
**NFRs addressed:** NFR8, NFR9, NFR10, NFR11
**UX-DRs covered:** UX-DR15, UX-DR36, UX-DR39, UX-DR62

### Story 5.1: LLM Provider Abstraction & AI Service Layer

As a developer,
I want a unified AI service layer that abstracts LLM providers behind a consistent interface,
So that AI features work with Anthropic Claude (primary) and OpenAI (fallback) without router-level coupling.

**Acceptance Criteria:**

**Given** the architecture requires AI provider isolation at `server/ai/provider.ts`
**When** the provider abstraction is built
**Then** an `AIProvider` interface defines: `complete(prompt, options)`, `stream(prompt, options)`, `embed(text)` methods
**And** an `AnthropicProvider` implements the interface using the Anthropic Claude API as the primary provider
**And** an `OpenAIProvider` implements the interface using the OpenAI API as the fallback provider
**And** an `EmbeddingService` wraps OpenAI `text-embedding-3-small` (vector(1536)) for embedding generation per architecture requirement
**And** a configuration determines the active provider (Anthropic primary, OpenAI fallback) via environment variable
**And** AI services are only accessible from the service layer — routers never call AI providers directly per architecture layering
**And** Trigger.dev job definitions exist for async AI operations: decomposition, embedding generation, relation inference per architecture requirement
**And** all AI service calls include error handling, retry logic (max 3 retries with exponential backoff), and structured logging via pino

### Story 5.2: AI Decomposition — 3-Step Text Processing

As a user,
I want to paste a paragraph and have AI propose how to break it into connected thought units,
So that my raw thinking becomes structured knowledge with minimal manual effort.

**Acceptance Criteria:**

**Given** the AI service layer from Story 5.1
**When** the user submits text in Organize Mode (or manually triggers decomposition on existing text)
**Then** the AI follows a 3-step process per FR22:
  Step 1: Understand the user's purpose (infer from Context if available, or ask)
  Step 2: Propose decomposition boundaries using semantic, logical, topical, and structural properties
  Step 3: Propose relations between new Units and existing Units in the active Context
**And** all proposed Units are created with `lifecycle: "draft"` and `origin_type: "ai_generated"` per FR27
**And** proposed relations are stored but marked as draft (not active until both endpoints are confirmed)
**And** the AI processes different input types per FR18: raw thought (propose Unit boundaries), external web clip (create Citation Unit + Resource Unit), structured note (recognize then decompose), audio transcription (transcribe via API, create Unit with link to original audio Resource Unit), code (Unit-ize by code block)
**And** when the user submits text in Organize Mode (toggled from Capture Mode per Story 2.4), the decomposition pipeline triggers automatically per FR24
**And** the AI upgrades the heuristic-based type assignment from Story 2.2 to LLM-based type proposals using the AI service layer per FR2
**And** the decomposition runs as a Trigger.dev background job with progress reporting
**And** AI processing shows a dot animation with cancel button per UX-DR36

### Story 5.3: DecompositionReview UI Component

As a user,
I want to review AI-proposed decomposition with highlighted boundaries, accept/reject per unit, and adjust boundaries by dragging,
So that I shape the AI's proposals into exactly the structure I want.

**Acceptance Criteria:**

**Given** the AI has proposed a decomposition (Story 5.2)
**When** the DecompositionReview component renders
**Then** the original text is shown with highlighted boundary overlays marking where AI proposes to split per UX-DR15
**And** each proposed Unit shows a type-colored badge (claim, question, evidence, etc.) per UX-DR15
**And** each proposed Unit has accept (✓) and reject (✗) buttons for individual approval per UX-DR15
**And** boundary handles are draggable — the user can adjust where one Unit ends and the next begins per UX-DR15
**And** accepted Units transition from draft to pending state with a physics-based card settling animation per UX-DR15
**And** rejected Units are removed from the proposal
**And** an "Accept All" button approves all proposed Units at once
**And** the review panel follows the AI suggestion card pattern: dashed border container, accept/dismiss per item, batch controls per UX-DR39
**And** when triggered from the onboarding first-input flow (Story 2.9), the DecompositionReview provides the "aha moment" — completing the first-input decomposition trigger per UX-DR34

### Story 5.4: Unit Split with Relation Re-Attribution

As a user,
I want to split an existing Unit into two and have the system propose which relations belong to which half,
So that I can refine my thought granularity without losing connections.

**Acceptance Criteria:**

**Given** a confirmed Unit with existing relations
**When** the user chooses "Split Unit"
**Then** a split editor opens showing the Unit content with a draggable split point
**And** the system proposes relation re-attribution: each existing relation is assigned to one of the two resulting Units based on semantic relevance per FR23
**And** the user can override any attribution assignment before confirming
**And** upon confirmation, two new Units are created (inheriting the original's Context memberships) and the original is archived with a version note
**And** all Assembly references to the original Unit prompt the user to choose which replacement Unit to use
**And** the split is undoable via Cmd+Z

### Story 5.5: Branch Potential Score & AI Exploration Suggestions

As a user,
I want each Unit card to show how much potential it has for further exploration,
So that I can identify the most productive threads to pursue.

**Acceptance Criteria:**

**Given** a confirmed Unit
**When** the Branch Potential Score is computed
**Then** the UnitCard metadata row shows a score indicator (e.g., ●●●○ for 3/4) representing derivation potential per FR25
**And** clicking the score reveals AI-suggested explorable directions (e.g., "This claim has no supporting evidence", "Consider a counterargument") per FR25
**And** each suggestion can be expanded into a new draft Unit with one click
**And** the score computation considers: number of existing relations, types of missing relations (based on the Unit's type — claims need evidence, questions need answers), and how many other Units reference it
**And** the score is re-computed when relations change (via event bus listener)

### Story 5.6: AI Intervention Intensity Levels

As a user,
I want to configure how aggressively AI participates in my thinking process,
So that I get the right level of AI assistance for my current working style.

**Acceptance Criteria:**

**Given** the AI service layer
**When** the user accesses AI settings
**Then** four configurable intensity levels are available per FR26:
  Minimal — alerts on clear logical gaps only (e.g., claim with zero evidence)
  Moderate — suggests exploration directions (e.g., "Consider exploring X")
  Exploratory — asks Socratic questions (e.g., "What assumption underlies this claim?")
  Generative — directly generates branch drafts (e.g., creates 3 draft counterarguments)
**And** the active intensity level is stored per user and can be changed at any time
**And** the intensity level affects AI behavior across all features (decomposition suggestions, branch potential, gap detection)
**And** a settings UI allows switching between levels with clear descriptions of what each entails
**And** the default intensity for new users is "Moderate"

### Story 5.7: AI Safety Guards & Generation Limits

As a developer,
I want enforceable generation limits and safety checks on all AI operations,
So that AI assistance amplifies user thinking without overwhelming or replacing it.

**Acceptance Criteria:**

**Given** the AI service layer and safety guard at `server/ai/safetyGuard.ts`
**When** AI generation is requested
**Then** a maximum of 3 Units are generated per request per FR28, NFR9
**And** when the AI-generated ratio in any Context exceeds 40%, a configurable warning is displayed to the user per FR28, NFR10
**And** a maximum of 3 consecutive branch generations is enforced — after 3, the user must create or confirm a Unit manually before AI can generate again per FR28
**And** rate limiting middleware on AI endpoints prevents abuse per architecture requirement
**And** all limits are enforced at the application layer (`server/ai/safetyGuard.ts`) not the LLM layer
**And** the safety guard exposes `checkLimits(contextId, userId)` returning `{ allowed: boolean, reason?: string, stats: { aiRatio, consecutiveGenerations } }`
**And** limit violations produce user-friendly warnings (not errors) — the user can acknowledge and continue

### Story 5.8: Refinement — Raw to Coherent Expression

As a user,
I want AI to refine my rough notes into polished expression while preserving the original,
So that I can improve clarity without losing my authentic voice.

**Acceptance Criteria:**

**Given** a confirmed Unit with raw content
**When** the user selects "Refine" from the Unit actions menu
**Then** the AI proposes a refined version that transforms raw text into logically coherent expression per FR31
**And** the original is preserved as v1; the refined version is proposed as v2 per FR31
**And** a side-by-side diff view shows what changed between original and refined
**And** the user can accept the refinement (v2 becomes current), reject it (v1 stays), or edit the refinement before accepting
**And** the refined Unit carries `origin_type: "ai_refined"` per FR20
**And** the refinement respects the user's AI intervention intensity level

### Story 5.9: Tension Detection & Argument Gap Analysis

As a user,
I want the system to flag contradictions and missing pieces in my argument structure,
So that I can strengthen my thinking by addressing logical gaps and conflicts.

**Acceptance Criteria:**

**Given** multiple confirmed Units exist within a Context
**When** the Tension Detection service runs (triggered on new relation creation or periodically via Trigger.dev)
**Then** mutually contradictory claims within the same Context are detected and flagged with a visual indicator on both Unit cards per FR61
**And** label-based flow prediction alerts on missing argument structure: "This claim has no evidence", "This question has no answer", "This evidence has no claim it supports" per FR32
**And** when a piece of evidence with narrow scope supports a claim with broader scope, a "scope jump warning" is displayed per FR74
**And** all detected tensions and gaps appear in the Context's `contradictions` and `unresolved_questions` arrays per FR9
**And** the system auto-generates and updates the Context `snapshot_summary` (AI-generated summary of the Context's current state) whenever tensions/gaps are recomputed or on-demand via a "Refresh Summary" action per FR9
**And** detection results are available via tRPC procedure `ai.getTensionsForContext`
**And** all alerts are proposals per NFR11 — the user can dismiss any alert and it won't recur for that specific pair per NFR13

### Story 5.10: Epistemic Humility Mode & Controversial Topic Detection

As a user,
I want AI to recognize when I'm exploring a topic without social consensus and shift to asking questions instead of providing answers,
So that AI supports my independent thinking rather than imposing a viewpoint.

**Acceptance Criteria:**

**Given** the AI service layer
**When** a topic without social consensus is detected (via keyword/heuristic analysis of Context content — e.g., political, ethical, philosophical topics)
**Then** Epistemic Humility Mode activates per FR29
**And** AI first confirms the user's exploration purpose (e.g., "I notice this topic involves differing perspectives. What would be most helpful: exploring multiple viewpoints, strengthening your existing position, or finding evidence?")
**And** in this mode, AI asks questions instead of providing answers per FR29
**And** AI-generated Units in this mode carry an additional metadata flag `epistemic_mode: true`
**And** the user can manually activate or deactivate Epistemic Humility Mode for any Context
**And** the detection does not block normal operation — it adds a gentle nudge that the user can dismiss

### Story 5.11: AI Contribution Transparency Display

As a user,
I want to see the ratio of my own writing versus AI-generated content,
So that I maintain awareness of how much of my thinking is authentically mine.

**Acceptance Criteria:**

**Given** a Context with mixed-origin Units
**When** the user views the Context or Project Dashboard
**Then** a transparency indicator shows three ratios: (a) directly written by user, (b) AI-generated then approved (confirmed), (c) AI-generated not yet approved (draft/pending) per FR30
**And** Units with `ai_trust_level: "inferred"` (where AI made assumptions) display an "AI Inference" badge per FR30
**And** the transparency display is available in the Context Dashboard and in the Context header
**And** the ratios update in real time as Units are created, confirmed, or deleted

### Story 5.12: Inline Intervention Nudges for Misuse Patterns

As a user,
I want gentle, one-time nudges when I'm using the system in a way that reduces its effectiveness,
So that I develop good thinking habits without being nagged.

**Acceptance Criteria:**

**Given** the user is interacting with the system
**When** a misuse pattern is detected (e.g., creating many Units without any relations, having all Units as the same type, never confirming draft Units, ignoring decomposition suggestions)
**Then** an inline intervention nudge appears near the relevant UI element per FR72
**And** the nudge follows the non-interruption principle: once dismissed, it never appears again for that user and that pattern per NFR13
**And** nudge dismissal state is stored in user preferences
**And** nudges are visually subtle (info-level toast or inline hint, not modal or blocking)
**And** the system supports at least 5 distinct nudge types at launch
**And** a service `server/services/nudgeService.ts` tracks patterns and dismissed states

### Story 5.13: AI Suggestion Queue & Type/Context-Aware Knowledge Connection

As a user,
I want a queue where I can review all pending AI suggestions at once, and have AI connect external knowledge to relevant Units,
So that I can process AI proposals efficiently and enrich my thinking with outside sources.

**Acceptance Criteria:**

**Given** AI has generated multiple suggestions across different features (decomposition, relation proposals, gap alerts)
**When** the user views the AI suggestion queue
**Then** a sidebar badge shows the pending count per UX-DR62
**And** the review queue lists all pending suggestions with: suggestion type, source feature, AI reasoning visible per item, and individual accept/reject per UX-DR62
**And** bulk "Accept All" and "Reject All" actions are available per UX-DR62
**And** when the user searches for external knowledge, results are saved as Resource Units and attached as references to the relevant Unit per FR33
**And** search results respect the current Context and Unit type for relevance ranking per FR33
**And** ARIA live regions announce new suggestions politely per UX-DR55

### Story 5.14: Knowledge Connection Interaction — "What Does This Mean to You?"

As a user,
I want the system to ask me what role external knowledge plays in my thinking when I import it, and to proactively suggest relevant external knowledge for my existing claims,
So that imported knowledge is personalized to my cognitive context rather than passively stored.

**Acceptance Criteria:**

**Given** the user imports external content (papers, Wikipedia, web clips, book chapters, company manuals)
**When** the import is detected
**Then** the system presents a Knowledge Connection prompt asking "In what context did you bring this?" with three options per PRD Section 9:
  (1) Connect to an actively explored Context — adds as evidence or background to the active Context, AI auto-proposes relations to existing Units
  (2) As the starting point of a new exploration — creates a new Context seeded with this knowledge
  (3) Hold for now (connect later) — places in Incubation Queue with notification when a relevant Context appears
**And** when the user selects option (1), AI automatically proposes relations to existing Units in the current Context, transforming general knowledge into personalized evidence per PRD Section 9
**And** AI also works in reverse: analyzing the user's Context and proactively suggesting "There is external knowledge that could support or refute this claim" per PRD Section 9
**And** the proactive suggestions follow the non-interrupting notification policy per NFR24
**And** proactive suggestions include: the external source, which Unit it relates to, and the proposed relation type
**And** the Knowledge Connection prompt respects the Unit's type and Context for relevance per FR33

### Story 5.15: Proactive External Knowledge Push

As a user,
I want the AI to proactively scan my active Context and suggest relevant external knowledge I haven't asked for,
So that I discover supporting or refuting evidence without manually searching, enriching my thinking with perspectives I might have missed.

**Acceptance Criteria:**

**Given** a Context has 3 or more Units and the user has been actively working in it
**When** the background knowledge scanner detects relevant external knowledge for the user's claims, questions, or assumptions
**Then** a non-interrupting notification appears in the sidebar under an "Insights" section with the label "External knowledge found for this context"
**And** the notification badge shows the count of pending suggestions
**Given** the user clicks the notification
**When** the suggestions panel opens
**Then** each suggestion shows: the external source summary, which existing Unit it relates to, the proposed relation type (supports/refutes/extends), and a relevance confidence score
**And** the user can perform one of three actions per suggestion: (1) "Add" — creates a Resource Unit and proposes a relation to the matched Unit, (2) "View" — opens a preview of the external content without importing, (3) "Dismiss" — removes the suggestion permanently
**Given** a suggestion has been dismissed or added
**When** 24 hours have not yet elapsed since the last suggestion batch for this Context
**Then** the scanner does not generate new suggestions for the same Context (24-hour cooldown)
**And** the cooldown resets when the user adds significant new content (3+ new Units) to the Context
**And** all proactive suggestions follow the AI Intervention Intensity level set by the user per Story 5.6

---

## Epic 6: Navigation, Search & Discovery

**Goal:** Users can explore their thought graph through Thread View (linear reading), purpose-based navigation weights (argument/creative/chronological modes), user-defined Navigators, multi-layer search (text, semantic, structural, temporal), ThoughtRank scoring, natural language queries, Context Dashboard statistics, and cross-view synchronization.

**FRs covered:** FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46, FR50
**NFRs addressed:** NFR1, NFR2, NFR3, NFR4, NFR6, NFR15
**UX-DRs covered:** UX-DR25 (Command Palette), UX-DR29 (Thread View), UX-DR31 (Search View), UX-DR55 (ARIA live regions)

### Story 6.1: Thread View — Linear Reading Mode

As a user,
I want to read my Units in a linear vertical list ordered chronologically or by derivation,
So that I can follow a train of thought from beginning to end like reading a document.

**Acceptance Criteria:**

**Given** Units exist within a Context with relations
**When** the user switches to Thread View
**Then** Units are displayed as a vertical list of UnitCards stacked in chronological or derivation order per FR46, UX-DR29
**And** relation connectors (thin lines with type-colored dots) link related cards between the stacked list per UX-DR29
**And** branch points display a fork indicator showing the number of branches per FR46
**And** clicking a fork indicator reveals branch options and the user can choose which branch to follow
**And** ScrollArea integration provides smooth scrolling with the 4px hover-visible scrollbar per UX-DR23
**And** the user can toggle between chronological order and derivation order via a toolbar toggle
**And** Thread View is accessible as an alternative to Graph View for users who prefer text-based navigation per UX-DR56

### Story 6.2: Purpose-Based Relation Weight Rendering

As a user,
I want relation line thickness, color, and visibility to change dynamically based on my current navigation purpose,
So that I see the most relevant connections for what I'm currently exploring.

**Acceptance Criteria:**

**Given** Units are displayed in Graph View or Thread View with relations
**When** the user selects a navigation purpose mode
**Then** in Argument Exploration mode: supports, contradicts are highlighted (thick lines, full opacity); inspires, echoes are dimmed (thin lines, 30% opacity) per FR37
**And** in Creative mode: inspires, echoes, foreshadows are highlighted; supports, contradicts are dimmed per FR37
**And** in Chronological mode: relation strength is recalculated by created_at order per FR37
**And** custom relation types with a `purpose_tag` are included in the navigation weight system per FR38
**And** weight changes update in real time without page reload per NFR2
**And** a purpose mode selector is accessible from the Graph View floating filter bar and Thread View toolbar
**And** the active purpose mode is persisted in session state

### Story 6.3: Navigators — User-Defined & AI-Generated Reading Paths

As a user,
I want to create named reading paths through my Units for specific purposes,
So that I can share curated journeys through my thinking or revisit them later.

**Acceptance Criteria:**

**Given** Units exist across one or more Contexts
**When** the user creates a Navigator
**Then** they can name it, add an ordered list of Unit references (not copies), and optionally describe its purpose per FR35
**And** multiple Navigators can be created from the same Units per FR35
**And** Navigators do not copy or move Units — they reference them per FR35
**And** the Navigator displays as a sequential card list with "Previous" / "Next" navigation
**And** AI can auto-generate a Navigator based on a stated purpose (e.g., "Create a reading path for my argument about X") using relation graph traversal
**And** Navigators are listed in the sidebar under a "Navigators" section
**And** draft Units (lifecycle: "draft") cannot be added to Navigators per FR27, NFR8
**And** editing a Unit's content is automatically reflected in all Navigators containing it per NFR12

### Story 6.4: 4-Layer Search Index & Search View

As a user,
I want to search my thoughts across text, meaning, structure, and time,
So that I can find any thought regardless of how I remember it.

**Acceptance Criteria:**

**Given** Units exist with content, embeddings, types, relations, and timestamps
**When** the Search View is opened
**Then** a prominent query input is displayed at the top per UX-DR31
**And** the system supports 4-layer indexing per FR39:
  Text index — keyword-based search via full-text PostgreSQL search (Typesense/Elasticsearch in future)
  Semantic index — vector embedding similarity via pgvector `<=>` operator
  Structure index — search by Unit type, lifecycle state, Context membership, relation graph position
  Temporal index — search by creation time, modification time, relation formation order
**And** results are grouped by type (Units, Contexts, Projects) per UX-DR31
**And** the search supports natural-language queries (e.g., "things I claimed about social media") per FR43
**And** an empty state displays suggestions for what to search per UX-DR37
**And** search is also accessible via the Command Palette (Cmd+K) per UX-DR25

### Story 6.5: ThoughtRank Importance Score

As a user,
I want each Unit to have an importance score reflecting its centrality in my knowledge graph,
So that search results and navigation prioritize my most significant thoughts.

**Acceptance Criteria:**

**Given** Units exist with relations, Context memberships, and Assembly references
**When** ThoughtRank is computed for a Unit
**Then** the score combines: number of referencing Units, number of Assemblies it appears in, diversity of connected Contexts, recency, and hub role (high in-degree + high out-degree) per FR40
**And** ThoughtRank is re-calculable per Unit with different weights depending on navigation purpose at query time per NFR4
**And** search results are ranked by ThoughtRank as one of the sorting factors
**And** Unit card relation/attribute display is prioritized by: (1) relevance to current navigation purpose, (2) ThoughtRank of connected Unit, (3) recency per FR41
**And** by default, top 3–5 relations are shown on each card; "See more" expands the full list per FR41
**And** ThoughtRank scores are computed asynchronously via Trigger.dev and cached, recomputed on relation changes

### Story 6.6: Context Dashboard — Statistics & Entry Points

As a user,
I want a dashboard for each Context showing key metrics, gaps, and recommended starting points,
So that I can quickly assess the state of an exploration and decide where to focus.

**Acceptance Criteria:**

**Given** a Context has Units with relations
**When** the user opens the Context Dashboard
**Then** it displays: total Unit count, incomplete/unresolved questions, key hub Units (highest ThoughtRank), unaddressed counterarguments (claims without support), unsupported claims, cycle presence indicator, and recommended entry points per FR42
**And** recommended entry points are the top 3 Units by ThoughtRank within the Context
**And** clicking any metric or hub Unit navigates to that Unit in the active view
**And** the dashboard auto-refreshes when Units or Relations change within the Context
**And** the Relation Type Glossary is accessible from the dashboard via a help icon per NFR15

### Story 6.7: Graph View Navigation Purpose Integration

As a user,
I want the Graph View to adapt its visual emphasis based on my navigation purpose,
So that the graph highlights what matters most for my current exploration mode.

**Acceptance Criteria:**

**Given** the Graph Canvas from Epic 4 is rendered
**When** a navigation purpose is selected (argument, creative, chronological, explore)
**Then** relation line thickness, color intensity, and visibility update in real time per FR37, NFR2
**And** node positions optionally re-cluster based on the active purpose (argument mode clusters by support/contradict chains; creative mode clusters by inspiration chains)
**And** the navigation path supports simultaneous vertical (chronological/derivation) and horizontal (semantic jump) movement per FR36
**And** the layer indicator reflects the current purpose mode
**And** the Global Overview → Local Card Array → Unit Detail navigation path is preserved across all purpose modes per FR44, FR45

### Story 6.8: Cross-View Coordination Enhancement

As a user,
I want all views (Graph, Thread, Context, Search, Dashboard) to stay synchronized when I select or navigate to a Unit,
So that switching between views feels seamless and I never lose my place.

**Acceptance Criteria:**

**Given** multiple views exist (Graph View, Thread View, Context View, Search View)
**When** the user selects a Unit in any view
**Then** all other open views highlight the same Unit simultaneously per FR50
**And** the Detail Panel updates to show the selected Unit
**And** synchronization is instantaneous from the user's perspective per NFR3
**And** tRPC Subscriptions via WebSocket enable multi-tab sync — selecting a Unit in one tab highlights it in another per architecture requirement
**And** ARIA live regions announce view changes politely per UX-DR55
**And** the selection store from Epic 4 (Story 4.9) is extended to support all view types

---

## Epic 7: Assembly, Composition & Export

**Goal:** Users can compose documents by arranging Units into Assembly slots using drag-and-drop, use templates with AI auto-mapping, generate bridge text between Units, compare Assembly diffs side-by-side, export to multiple formats, maintain export history, and auto-generate source maps and reasoning chains.

**FRs covered:** FR16, FR17, FR47, FR48, FR51, FR52, FR53, FR54, FR75, FR76
**NFRs addressed:** NFR12, NFR19
**UX-DRs covered:** UX-DR13 (AssemblyBoard), UX-DR30 (Assembly View screen)

### Story 7.1: Assembly Data Model & CRUD API

As a user,
I want to create Assemblies as ordered lists of Unit references that I can name and manage,
So that I can compose documents from my existing thoughts without duplicating content.

**Acceptance Criteria:**

**Given** the database schema
**When** the Assembly model is defined
**Then** it includes: `id` (cuid), `name`, `description` (optional), `user_id`, `template_id` (nullable FK), `created_at`, `updated_at` per FR16
**And** an `assembly_unit` join table stores ordered references: `assembly_id`, `unit_id`, `position` (integer for ordering), `slot_name` (optional, for template slots)
**And** Assemblies reference Units — they do not copy them. Modifying a Unit is automatically reflected in all Assemblies per FR16, NFR12
**And** tRPC procedures `assembly.create`, `assembly.getById`, `assembly.list`, `assembly.update`, `assembly.delete`, `assembly.addUnit`, `assembly.removeUnit`, `assembly.reorderUnits` are available
**And** an Assembly can contain Units from multiple Contexts
**And** draft Units (lifecycle: "draft") cannot be added to Assemblies per NFR8

### Story 7.2: Assembly View with Drag-and-Drop Ordering

As a user,
I want to arrange Units in an Assembly by dragging and dropping them into the order I want,
So that I can compose my document structure intuitively.

**Acceptance Criteria:**

**Given** an Assembly exists with Units
**When** the user opens Assembly View
**Then** the AssemblyBoard component renders Units as draggable cards in their ordered positions per UX-DR13, FR47
**And** a left search/browse rail allows finding and adding Units to the Assembly per UX-DR30
**And** drag-and-drop uses dnd-kit with 6-dot grip handles, 0.8 opacity during drag, dashed drop zones, and 200ms spring snap per UX-DR40
**And** assembly metadata (name, description, unit count, last modified) is displayed in a header per UX-DR30
**And** a preview/edit toggle switches between editing mode (drag-and-drop) and preview mode (read-only rendered) per UX-DR13
**And** keyboard-based reordering is supported (select card, use arrow keys to move position)
**And** removing a Unit from an Assembly does not delete the Unit globally

### Story 7.3: Assembly Templates with AI Slot Mapping

As a user,
I want to start composing from a template that proposes a structure and automatically maps my existing Units to slots,
So that I get a head start on document structure with AI doing the heavy lifting.

**Acceptance Criteria:**

**Given** the Assembly model supports templates
**When** the user creates an Assembly from a template
**Then** Assembly Templates propose structure based on writing purpose (e.g., "Argumentative Essay" has Introduction, Thesis, Evidence 1–3, Counterargument, Conclusion) per FR17
**And** AI auto-maps existing Units in the active Context to template slots based on Unit type and content relevance per FR17
**And** empty slots are visually distinguished (dashed border, "Drop a Unit here" placeholder) per FR17, UX-DR13
**And** the user can accept, reject, or override any AI slot mapping
**And** at least 4 built-in templates are available: Essay, Report, Decision Brief, Research Summary
**And** users can save a custom Assembly arrangement as a new template

### Story 7.4: Bridge Text Generation

As a user,
I want AI to generate logical connecting sentences between Units in my Assembly,
So that the exported document reads as a coherent narrative rather than disjointed fragments.

**Acceptance Criteria:**

**Given** an Assembly with ordered Units
**When** the user triggers "Generate Bridge Text"
**Then** AI generates connecting sentences between adjacent Units that create logical flow per FR52
**And** bridge text zones are visually displayed between Unit cards in the Assembly View per UX-DR13
**And** bridge text is NOT stored as a Unit and does NOT modify the original Unit graph per FR52
**And** bridge text is stored only within the Assembly as ephemeral connecting content
**And** the user can edit, regenerate, or delete any bridge text segment
**And** bridge text is included in exports but clearly generated (not attributed to the user)

### Story 7.5: Assembly Diff — Side-by-Side Comparison

As a user,
I want to compare two versions or two different Assemblies side by side,
So that I can see what changed or how two compositions differ.

**Acceptance Criteria:**

**Given** two Assemblies exist (or two versions of the same Assembly)
**When** the user selects "Compare Assemblies"
**Then** a side-by-side view renders both Assemblies with color visualization: Units present only in the left Assembly (red), only in the right (green), and in both (neutral) per FR48
**And** shared Units are aligned horizontally where possible
**And** the diff summary shows: units added, removed, reordered, and content changes
**And** clicking a highlighted Unit scrolls both sides to show it in context

### Story 7.6: Multi-Format Export with Unit Conversion Rules

As a user,
I want to export my Assembly to Essay, Presentation, Email, or Social format with appropriate formatting per Unit type,
So that my thoughts become polished outputs ready for their destination.

**Acceptance Criteria:**

**Given** an Assembly with ordered Units and optional bridge text
**When** the user triggers export and selects a format
**Then** format-specific Unit conversion rules are applied per Unit type per FR51:
  Essay — Claims become thesis statements, Evidence becomes supporting paragraphs, Questions become rhetorical questions or section headers
  Presentation — Each Unit becomes a slide bullet or slide; type determines formatting
  Email — Concise format with Claims as key points, Action Units as action items
  Social — Condensed format with character limits respected
**And** an export dialog allows format selection, preview, and download per UX-DR30
**And** the export includes bridge text if generated per FR52

### Story 7.7: Partial Export & Export History

As a user,
I want to export only specific Units from an Assembly and track when and how I exported,
So that I can create targeted outputs and know what's changed since my last export.

**Acceptance Criteria:**

**Given** an Assembly exists
**When** the user configures a Partial Export
**Then** they can filter by: specific Unit type only, specific Context membership, specific evidence_domain, or confirmed Units only per FR53
**And** the export preview updates to show only matching Units
**When** an export completes
**Then** an Export History record is created with: export timestamp, format, Unit IDs included, and a snapshot hash of included Unit content per FR54
**And** when Units have changed since the last export, a notification badge appears on the Assembly with "N units changed since last export" per FR54
**And** the user can view export history and re-export with the same or updated settings

### Story 7.8: Assembly Source Map

As a user,
I want to see which external resources contributed to my Assembly and at what ratio,
So that I can verify the provenance and intellectual composition of my documents.

**Acceptance Criteria:**

**Given** an Assembly contains Units with provenance data (origin_type, source_span)
**When** the user views the Assembly Source Map
**Then** it auto-generates a visualization showing which external resources contributed to the Assembly and at what ratio per FR75
**And** each source entry shows: `resource_unit_id` (or "directly written" for user-authored Units), `contributing_units` list, and `contribution_ratio` per PRD Appendix A-14
**And** source entries are grouped by origin: external resources vs. directly written content
**And** each source shows: resource name/URL, number of Units derived from it, and percentage of Assembly coverage
**And** the source map data is stored as a `source_map[]` array on the Assembly model per PRD Appendix A-14
**And** a reference list is auto-generated when the Assembly is exported
**And** the Source Map is accessible from the Assembly detail view as a dedicated tab or panel

### Story 7.9: Reasoning Chain Visualization

As a user,
I want to trace the explicit reasoning path from evidence through inference to conclusion within a Context,
So that I can evaluate the logical structure of my arguments and identify gaps in reasoning.

**Acceptance Criteria:**

**Given** Units exist within a Context with relation chains connecting evidence to conclusions
**When** the user requests a Reasoning Chain view
**Then** the system constructs a ReasoningChain structure with: `id`, `goal` (the conclusion being reasoned toward), and `steps[]` array per FR76, PRD Appendix B
**And** each step includes: `unit_id`, `role` (foundation / motivation / validation / inference / conclusion), `evidence_domain`, `scope`, and `transition` (logic for moving to the next step) per PRD Appendix B
**And** the chain visualization displays steps sequentially with relation types connecting each step (e.g., Evidence →[supports]→ Claim →[derives_from]→ Conclusion)
**And** gaps in the reasoning chain are highlighted (e.g., "This conclusion has no supporting evidence path", "Scope jump: personal evidence supports domain-general claim")
**And** AI can auto-generate Reasoning Chains by analyzing the relation graph within a Context per Feature Reference
**And** the user can manually create or edit Reasoning Chains by selecting Units and assigning roles
**And** Reasoning Chains are viewable from both Context detail and Assembly detail views

### Story 7.10: Template Auto-Mapping for Assembly Creation

As a user,
I want the AI to automatically propose which of my existing Units fit into each slot when I create an Assembly from a template,
So that I can quickly populate structured documents without manually dragging every Unit into place.

**Acceptance Criteria:**

**Given** the user creates a new Assembly by selecting a template (e.g., Research Paper, Decision Brief, Essay)
**When** the template is applied and the Assembly view loads
**Then** the AI analyzes all Units in the current Context (or user-selected scope) and generates a mapping proposal for each template slot
**And** each slot displays: the slot name/description, the proposed Unit(s) with a match confidence indicator (high/medium/low), and action buttons
**Given** a mapping proposal is shown for a slot
**When** the user reviews it
**Then** the user can perform one of three actions per slot: (1) "Accept" — confirms the proposed Unit mapping, (2) "Swap" — opens a Unit picker to choose a different Unit for this slot, (3) "Skip" — leaves the slot empty for manual filling later
**And** slots with no matching Units are visually flagged as "Empty — no matching Units found" with a prompt to create or search for content
**Given** the user has reviewed all slot proposals
**When** the user confirms the overall mapping (via "Apply Mappings" button)
**Then** all accepted and swapped mappings populate the Assembly with the selected Units in their designated positions
**And** the Assembly enters its normal editing state with all mapped Units in place
**And** the mapping operation is recorded in the undo history so the user can revert to the empty template state

---

## Epic 8: Feedback Loop & Thought Evolution

**Goal:** Users can evolve their thinking over time through an Incubation Queue, Compression, Orphan Unit Recovery, external knowledge import with connection mode selection, reverse provenance tracking, Action Unit completion records, unit drift detection from project purpose, Branch Project creation from drifted thinking, energy-level metacognitive feedback, and Action Unit external service delegation with result record feedback loops.

**FRs covered:** FR19, FR21, FR56, FR57, FR58, FR59, FR62, FR64
**NFRs addressed:** NFR13, NFR14, NFR24
**UX-DRs covered:** UX-DR14 (CompletenessCompass)

### Story 8.1: Incubation Queue for Incomplete Thoughts

As a user,
I want a dedicated queue for thoughts that are incomplete but valuable, with periodic surfacing reminders,
So that no potentially important idea gets lost just because it's not fully formed yet.

**Acceptance Criteria:**

**Given** Units exist in various states of completeness
**When** a Unit is marked as "incubating" (manually or automatically when it has low completeness — e.g., no relations, no Context, single sentence)
**Then** it enters the Incubation Queue per FR58
**And** the Incubation Queue is accessible from the sidebar as a dedicated section
**And** the system periodically surfaces incubating Units to the user (configurable interval: daily, weekly) via non-interrupting notification per FR58, NFR24
**And** surfaced Units show context: when they were created, what they were thinking about at the time
**And** the user can: promote (add to a Context), discard, or snooze each incubating Unit
**And** the notification follows non-interrupting policy — dismissed notifications don't repeat for the same Unit per NFR24

### Story 8.2: Compression — Similar Claim Core Extraction

As a user,
I want the system to detect when I've said similar things multiple times and propose extracting the common core,
So that my knowledge graph stays concise without losing nuance.

**Acceptance Criteria:**

**Given** multiple Units exist with semantically similar content
**When** the Compression service detects variations of similar claims (via embedding similarity threshold)
**Then** it proposes extraction of the common core into a single Unit per FR59
**And** the proposal shows: the similar Units side-by-side, the proposed extracted core Unit, and which variations add unique nuance
**And** the user can accept (creates core Unit, archives variations with relations to core), reject (keeps all as-is), or customize (edit the core before accepting)
**And** accepted compressions preserve all relations from the original Units on the core Unit
**And** the detection runs periodically as a Trigger.dev background job
**And** the user can manually trigger compression detection for a specific Context

### Story 8.3: Orphan Unit Recovery

As a user,
I want to periodically see Units that aren't included in any Assembly or Context,
So that I can decide whether to connect them or consciously let them go.

**Acceptance Criteria:**

**Given** Units exist that have no Context membership and no Assembly references
**When** the Orphan Recovery feature runs (periodically or on-demand)
**Then** orphan Units are listed in a dedicated view showing: Unit content preview, creation date, type, and lifecycle state per FR62
**And** the user can: assign to a Context, add to the Incubation Queue, archive, or delete each orphan
**And** bulk actions (assign all to Context, archive all) are available
**And** orphan detection counts Units with zero Context memberships AND zero Assembly references
**And** the orphan count is displayed as a badge in the sidebar

### Story 8.4: External Knowledge Import with Connection Mode

As a user,
I want to import external knowledge (papers, web clips, book chapters) and choose how it connects to my existing thinking,
So that outside sources enrich my graph in the way I intend.

**Acceptance Criteria:**

**Given** the user imports external content (via paste, URL, or file upload)
**When** the system processes the import
**Then** it creates a Citation Unit (source metadata) + Resource Unit (the content) per FR18
**And** the user is prompted to select a connection mode per FR19:
  (1) Connect to active Context — imported Units are added to the current Context with AI-proposed relations
  (2) Start a new Context — a new Context is created with the imported content as seed
  (3) Hold in Incubation Queue — content is saved but not connected yet
**And** each derived Unit tracks provenance via `origin_type` and `source_span` per FR20
**And** the import preserves the source URL, author, date, and excerpt for citation

### Story 8.5: Reverse Provenance Tracking

As a user,
I want to click an external resource and see all Thought Units derived from it and all Assemblies containing those Units,
So that I can trace the full impact of any source material on my thinking.

**Acceptance Criteria:**

**Given** a Resource Unit derived from external text exists
**When** the user clicks on it
**Then** the system queries and displays: all Thought Units derived from it (via `source_span.parent_input_id`), and all Assemblies containing those derived Units per FR21
**And** the result is shown as a tree: Resource → [derived Unit 1, derived Unit 2, ...] → [Assembly A, Assembly B, ...]
**And** each node in the tree is clickable and navigates to the corresponding Unit or Assembly
**And** the reverse tracking query is available via tRPC procedure `resource.getReverseProvenance`

### Story 8.6: Action Unit Completion & Result Records

As a user,
I want the system to propose creating a result record when I complete an Action Unit,
So that my decision-making history is preserved alongside execution outcomes.

**Acceptance Criteria:**

**Given** an Action Unit (unit_type: "action") exists with related decision-making Units
**When** the user marks the Action Unit as "completed"
**Then** the system proposes creating a result record Unit connected to the original decision-making Units per FR57
**And** the result record Unit is pre-populated with: the Action Unit's content, completion date, and suggested relation to the decision Units (derives_from, references)
**And** the user can edit the result record content before confirming
**And** Action Units preserve their decision-making history via relations per FR56
**And** the result record carries `origin_type: "direct_write"` and `unit_type: "observation"` by default

### Story 8.7: Unit Drift Detection from Project Purpose

As a user,
I want the system to detect when my Units are drifting away from the project's stated purpose,
So that I can stay focused or consciously expand the scope.

**Acceptance Criteria:**

**Given** a Project has a defined purpose (from domain template or user description)
**When** the Drift Detection service analyzes Units in the project
**Then** each Unit receives a `drift_score` (0.0–1.0) measuring semantic distance from the project purpose per FR64
**And** when a Unit's drift_score exceeds a configurable threshold (default 0.7), the user is presented with options: (1) keep in project (mark as intentional expansion), (2) move to a different Context, (3) split into a sub-context (keep connection but create separate exploration space), (4) branch into a new project (see Story 8.8) per FR64, PRD Section 19
**And** the drift detection runs as a Trigger.dev background job on Unit creation/update
**And** the Project Dashboard shows an aggregate drift indicator
**And** the notification follows non-interrupting policy per NFR24

### Story 8.10: Action Unit External Service Delegation & Result Record Flow

As a user,
I want to delegate Action Units to external services (Google Calendar, Todoist, Slack, etc.) and capture result records when actions complete,
So that my thought-driven actions flow into my existing tools and real-world outcomes feed back into my knowledge graph.

**Acceptance Criteria:**

**Given** an Action Unit exists (unit_type: "action") with decision-making provenance relations
**When** the user clicks "Delegate" on the Action Unit
**Then** a DelegationDialog presents execution type categories (Schedule, To-do, Communication, Appointment/visit, Purchase) per PRD Section 17
**And** each category maps to specific services: Schedule → Google Calendar/TIMEMINE, To-do → Todoist/Apple Reminders, Communication → Email/KakaoTalk/Slack, Appointment → Google Maps/KakaoMap, Purchase → Coupang/Amazon per PRD Section 17
**And** the dialog pre-fills relevant fields from the Action Unit's content and AI-extracted metadata (title, date, location, recipient)
**And** on successful delegation, the Unit metadata gains `linked_calendar_event` or `linked_task` per PRD Appendix A-13
**And** a service icon badge appears on the UnitCard and the `action_status` updates to "delegated"
**And** when the user marks the Action Unit as "Complete" (button or `Cmd+Shift+D`)
**Then** a CompletionFlowSheet slides up proposing a result record Unit per PRD Section 17 ("When an Action is completed, Flowmind proposes creating a result record Unit")
**And** the result record is pre-filled by AI with `origin_type: "direct_write"` and `unit_type: "observation"` by default
**And** the result record auto-connects to the original decision-making Units via `derives_from` and `references` relations per FR57
**And** the user can edit result content and connections before saving, or skip (non-blocking per NFR24)
**And** completed Actions with result records display a FeedbackLoopIndicator (loop icon ↩) in Graph View and an indented result card in Thread View
**And** the Context Dashboard shows a "Feedback Loops" metric: "X of Y Action Units have result records"
**And** a DecisionChainPanel is accessible from any Action Unit via "View Decision Chain →", showing the full provenance path from originating thoughts through the action to its result
**And** integration configuration (OAuth tokens, API keys) is managed in Settings → Integrations, not in the delegation dialog
**And** Flowmind tracks delegation but does not manage execution — the external service owns the task lifecycle per PRD design principle

**Technical Notes:**
- OAuth integration uses Supabase's built-in OAuth provider support where possible
- External service APIs are called via edge functions to keep secrets server-side
- Delegation status can be polled or webhook-updated depending on service capability
- The DecisionChainPanel reuses ReasoningChainUI's traversal logic but with action-specific styling
- Result record creation reuses the standard Unit creation tRPC procedure with pre-filled fields

### Story 8.8: Branch Project from Drift Detection

As a user,
I want to branch drifted Units into a new independent project while maintaining a reference relation with the original project,
So that valuable tangential explorations become their own focused workspace without losing the connection to where they originated.

**Acceptance Criteria:**

**Given** a Unit or group of Units has been flagged by Drift Detection with a drift_score above threshold
**When** the user selects the "Branch into new project" option
**Then** a new Project is created with fields: `branched_from` (original project ID), `branch_reason` (user-provided or AI-suggested description of why it branched), and `shared_units[]` (list of Units shared between both projects) per PRD Section 19
**And** the selected drifted Units are moved to the new project's initial Context
**And** a `references` relation is maintained between the original project and the branched project
**And** shared Units appear in both projects simultaneously (not duplicated) per PRD Branch Project structure
**And** the original project's drift indicator updates to reflect the resolved drift
**And** the branched project inherits the original project's template (if any) or can be assigned a different template
**And** a creation dialog allows the user to name the new project, provide a purpose statement, and confirm which Units to include
**And** the Branch Project is accessible from the original project's sidebar with a visual branch indicator

---

## Epic 9: Projects & Domain Templates

**Goal:** Users can work within purpose-optimized project environments with domain-specific templates (software design, nonfiction writing, investment decisions, academic research), scaffold units with pre-planted questions, constraint levels (Strict/Guided/Open), gap detection, AI live guide, Completeness Compass, and freeform-to-formal template export.

**FRs covered:** FR63, FR65, FR66, FR67, FR68, FR69, FR70, FR71
**NFRs addressed:** NFR17
**UX-DRs covered:** UX-DR33 (Project Dashboard enhanced)

### Story 9.1: Project Data Model & Purpose-Optimized Environment

As a user,
I want to create Projects as purpose-optimized workspaces with their own UI configuration,
So that my tools adapt to what I'm trying to accomplish.

**Acceptance Criteria:**

**Given** the database schema
**When** the Project model is defined
**Then** it includes: `id` (cuid), `name`, `description`, `purpose` (text), `user_id`, `template_id` (nullable FK to DomainTemplate), `constraint_level` (enum: strict, guided, open), `created_at`, `updated_at` per FR63
**And** a Project contains Contexts (one-to-many) and determines the UI environment per FR63
**And** type-specific default views are configured per project type (e.g., research projects default to Thread View, decision projects default to Graph View) per FR63
**And** tRPC procedures `project.create`, `project.getById`, `project.list`, `project.update`, `project.delete` are available
**And** the sidebar project selector (placeholder from Epic 3) now shows real projects
**And** MVP starts with pre-defined project templates; custom composition is deferred per FR65

### Story 9.2: Domain Template System — Three Template Types

As a user,
I want to choose from system default, freeform, or user-defined domain templates when creating a project,
So that I get the right level of structure for my thinking purpose.

**Acceptance Criteria:**

**Given** the Project model supports templates
**When** Domain Templates are defined
**Then** three types are supported: System default (pre-built, read-only), Freeform (no constraints, user-driven), and User-defined (saved from existing projects) per FR66
**And** each Domain Template includes: domain-specific Unit types (subsets or extensions of the 9 base types), domain-specific relation types, Scaffold Units (pre-planted questions and prompts), required context slots, recommended navigation order, available Assembly list, gap detection rules, and AI live guide prompts per FR67
**And** 4 system default templates are seeded: software-design, nonfiction-writing, investment-decision, academic-research per architecture requirement
**And** each template is stored as a JSON configuration in the database
**And** the template system is extensible — users can define and save custom templates per NFR17

### Story 9.3: Constraint Levels — Strict, Guided, Open

As a user,
I want to choose how strictly the template guides my workflow when starting a project,
So that I can get strong guidance when I'm new to a domain or work freely when I'm experienced.

**Acceptance Criteria:**

**Given** a Project is being created with a Domain Template
**When** the user selects a constraint level per FR68
**Then** Strict mode: all template slots must be filled before Assemblies can be created; gap detection is enforced; AI live guide actively prompts missing elements
**And** Guided mode: template slots are suggested but not required; gap detection provides recommendations; AI live guide suggests but doesn't block
**And** Open mode: template structure is visible as reference only; no enforcement; AI live guide is passive (available on-demand)
**And** the constraint level can be changed at any time during the project lifecycle
**And** the Project Dashboard visually indicates the active constraint level

### Story 9.4: Scaffold Units & Gap Detection

As a user,
I want my project to start with pre-planted questions that guide my thinking, and have the system detect what's still missing,
So that I have a clear path forward and know what needs attention.

**Acceptance Criteria:**

**Given** a Project is created with a Domain Template
**When** the project initializes
**Then** Scaffold Units (pre-planted questions/prompts from the template) are created as draft Units within the project's default Context per FR67
**And** Scaffold Units have `origin_type: "ai_generated"` and a special `scaffold: true` metadata flag
**And** gap detection rules from the template continuously evaluate: which scaffold questions have been addressed (have confirmed Units connected to them), which remain open, and what structural elements are missing per FR67
**And** gap detection results are shown in the Context Dashboard and Completeness Compass
**And** the AI live guide uses gap detection to suggest next steps (e.g., "Your investment decision is missing a risk assessment — consider adding counterarguments")

### Story 9.5: Completeness Compass

As a user,
I want a radial progress visualization showing what's confirmed, what's missing, and what outputs I can produce at what completeness,
So that I always know where I stand and what's achievable right now.

**Acceptance Criteria:**

**Given** a Project with a Domain Template and gap detection
**When** the Completeness Compass renders
**Then** a radial progress visualization shows category breakdown (e.g., Evidence: 60%, Claims: 80%, Questions Resolved: 40%) per FR70, UX-DR14
**And** each category includes action suggestions (e.g., "Add 2 more evidence Units to reach 80%")
**And** the Compass reports: what has been confirmed, what is still missing, and what outputs (Assemblies) can be produced at the current completeness percentage per FR70
**And** the Compass has two states: collapsed (small indicator in the toolbar) and expanded (popover with full details) per UX-DR14
**And** in freeform template mode, the Compass only provides the list of "Assemblies that can be created now" without completeness conditions per FR71
**And** the Compass auto-refreshes periodically and is invocable on-demand per NFR14
**And** progress updates follow non-interrupting notification policy per NFR24

### Story 9.6: Freeform-to-Formal Template Export

As a user,
I want to retroactively apply structure to a freeform project by having AI analyze my existing Units and propose type mappings,
So that I can start loose and formalize later without losing work.

**Acceptance Criteria:**

**Given** a Project created in freeform mode with existing Units
**When** the user selects "Export to Formal Template"
**Then** AI analyzes the existing Units and proposes: which system template best fits the content, type mappings for each Unit (e.g., this "observation" should be "evidence" in the research template), and suggested structural gaps per FR69
**And** the user reviews and approves/modifies each proposed mapping
**And** upon confirmation, the project's template is updated and Unit types are adjusted per the approved mappings
**And** existing relations are preserved — only types and template metadata change
**And** the operation is undoable via Cmd+Z

### Story 9.7: Project Dashboard Enhancement with Template Integration

As a user,
I want the Project Dashboard to show template-aware information including scaffold progress and AI live guide,
So that my dashboard reflects the full richness of my project's domain template.

**Acceptance Criteria:**

**Given** a Project with an active Domain Template
**When** the enhanced Project Dashboard renders
**Then** it shows: project title, active template name, constraint level badge, Context card grid with Completeness Compass mini indicators per UX-DR33
**And** a scaffold progress section shows: total scaffold questions, answered count, and unanswered list
**And** the AI live guide panel shows context-aware suggestions based on the template, constraint level, and current gaps per FR67
**And** the "New Context" button suggests template-recommended context names per FR67
**And** the recommended navigation order from the template is reflected in Context card ordering per FR67

---

## Epic 10: External Integration & Context Export API

**Goal:** Users can share their thought structures with external AI tools via the Context Export API, auto-generate structured AI prompts from selected Units, and delegate Action Unit execution to external services.

**FRs covered:** FR34, FR55, FR56
**NFRs addressed:** NFR19, NFR20, NFR21

### Story 10.1: Context Export REST API

As a developer or power user,
I want a REST API endpoint that exports a Context's Unit structure in multiple formats,
So that I can integrate my Flowmind knowledge with external AI tools and workflows.

**Acceptance Criteria:**

**Given** the architecture specifies a REST endpoint (not tRPC) at `GET /api/context/{contextId}/export`
**When** the endpoint is called with valid authentication
**Then** it returns the Context's Unit structure in the requested format per FR34:
  `prompt_package` — structured AI prompt format with background, claims, evidence, open questions
  `json` — full Unit graph with relations, types, metadata
  `markdown` — human-readable markdown with Units organized by type and relation
**And** query parameters support: `format` (required), `depth` (relation traversal depth, default 2), `types` (Unit type filter, comma-separated), `status` (lifecycle filter: draft, pending, confirmed) per FR34
**And** authentication uses API key in the `Authorization: Bearer {key}` header per architecture requirement
**And** API keys are manageable from user settings (create, revoke, list)
**And** rate limiting is enforced on the endpoint per architecture requirement
**And** the API is format-agnostic and AI-model-agnostic per NFR19

### Story 10.2: AI Prompt Auto-Generation from Selected Units

As a user,
I want to select Units and have the system generate a structured prompt I can use with any AI tool,
So that I can leverage my organized thinking as context for AI conversations.

**Acceptance Criteria:**

**Given** the user has selected one or more Units
**When** they choose "Generate AI Prompt"
**Then** the system automatically generates a structured prompt including: background (Context summary), key claims (claim-type Units), supporting evidence, constraints (assumption-type Units), and open questions (question-type Units) per FR55
**And** the generated prompt is displayed in a copyable text area
**And** the user can customize which sections to include before copying
**And** the prompt format is optimized for readability by AI models (clear section headers, numbered items)
**And** a "Copy to Clipboard" button copies the prompt with a success toast

### Story 10.3: Action Unit External Service Delegation

As a user,
I want to delegate Action Unit execution to external services like Google Calendar, Todoist, or Slack,
So that my thought-driven action items flow into my existing productivity tools.

**Acceptance Criteria:**

**Given** an Action Unit exists (unit_type: "action")
**When** the user selects "Delegate to External Service"
**Then** a dialog shows available integrations: Google Calendar (create event), Todoist (create task), Slack (send message) per FR56
**And** each integration pre-fills relevant fields from the Action Unit's content and metadata
**And** upon successful delegation, the Action Unit is tagged with the external service reference (URL, ID)
**And** the delegation is logged in the Unit's metadata for traceability
**And** integration configuration (API keys, OAuth tokens) is managed in user settings
**And** execution management is delegatable to external services — Flowmind tracks the delegation but doesn't manage the execution per FR56

### Story 10.4: Data Export & Privacy Controls

As a user,
I want to export all my data and control what information is shared externally,
So that I own my intellectual property and can comply with my own privacy standards.

**Acceptance Criteria:**

**Given** the user's account contains Units, Relations, Assemblies, and Contexts
**When** the user requests a full data export
**Then** the system exports all Units, relations, Assemblies, Contexts, and metadata to user-owned format (JSON and/or Markdown) per NFR21
**And** the export is downloadable as a ZIP archive
**And** a privacy settings page specifies: what data is sent to external AI services (only on explicit export/prompt generation), local processing options (embedding generation can be toggled), and a clear statement that user data is not used for AI training per NFR20
**And** the user can delete their account and all associated data (hard delete)
**And** export and deletion actions require confirmation via the destructive Dialog variant
