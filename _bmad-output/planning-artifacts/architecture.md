---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['docs/flowmind-prd.md']
workflowType: 'architecture'
project_name: 'flowmind'
user_name: 'Eric'
date: '2026-03-17'
lastStep: 8
status: 'complete'
completedAt: '2026-03-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

Flowmind is a thought-unit-centric personal knowledge management (PKM) web application that replaces the document-first paradigm with a thought-first paradigm. The system decomposes text into atomic Thought Units, each carrying rich metadata (type, certainty, completeness, provenance, evidence domain, scope), and connects them through a directed general graph of typed relations.

Key functional areas:

1. **Unit Management (Core)** — Create, edit, split, merge, version Thought Units and Resource Units. Each Unit has 30+ metadata fields across cognitive classification, status, temporal, provenance, evidence character, AI analysis, and tags categories.

2. **Perspective Layer** — Units carry context-specific interpretations. The same Unit can have different types, relations, importance, and stance per Context. This is a cross-cutting concern spanning layers 1-3.

3. **Relation Graph** — 20+ system relation types across 3 categories (argument, creative/research, structure/containment), plus user-defined custom relations with reusability. Relations carry strength (0.0-1.0), direction, purpose tags, and timestamps.

4. **Context & Project System** — Contexts as non-exclusive exploration spaces. Hierarchical contexts, AI-managed snapshots, unresolved question tracking, contradiction detection. Projects as purpose-optimized UI environments with drift detection.

5. **AI Collaboration Pipeline** — Text decomposition, type tagging, relation inference, embedding generation, evidence domain detection, scope calculation, drift score, branch potential scoring, gap detection, Completeness Compass, Socratic questioning, epistemic humility mode.

6. **Navigation System** — Navigator paths, ThoughtRank importance scoring, 4-layer search (text, semantic, structural, temporal), navigation-purpose-weighted relation rendering.

7. **Views & Display** — Graph View (2-layer: global overview + local card array), Thread View, Assembly View with diff, Context View, Search View, Context Dashboard — all cross-view coordinated.

8. **Assembly & Output** — Ordered Unit references for document composition, Assembly Templates, Bridge Text generation, format-specific conversion rules, partial export, export history.

9. **Execution Layer** — Action Units linked to external services (Calendar, Todoist, etc.), Context Export API (REST), AI prompt auto-generation.

10. **Domain Templates** — System default, freeform, and user-defined templates. Each provides domain-specific types, relations, scaffold questions, gap detection rules, recommended navigation, Assembly lists, AI live guide.

**Non-Functional Requirements:**

- **Performance**: Real-time view synchronization across 6+ view types; responsive graph rendering with potentially thousands of nodes; sub-second semantic search across vector embeddings; real-time ThoughtRank recalculation.
- **Data Integrity**: Version history for all Units; relation re-attribution on split/merge; no data loss (core value: Non-loss).
- **AI Integration**: Streaming AI responses; draft/pending/confirmed lifecycle; generation limits (max 3 per request, 40% ratio warning); controversial topic detection.
- **Scalability**: PostgreSQL + pgvector for MVP; graph queries via recursive CTE initially, Neo4j migration path; Typesense/Elasticsearch for text search at scale.
- **Privacy & Security**: Handling deeply personal thoughts — data ownership and privacy policy flagged as a product gap. Local processing options mentioned.
- **Accessibility**: Multiple navigation modes (keyboard shortcuts flagged as gap), cross-view coordination for different cognitive styles.

**Scale & Complexity:**

- Primary domain: **Full-stack web application**
- Complexity level: **High** — Rich graph data model, multi-layer AI pipeline, real-time multi-view synchronization, vector search, complex metadata system
- Estimated architectural components: 15-20 major modules

### Technical Constraints & Dependencies

1. **Database**: PRD specifies PostgreSQL + pgvector for MVP. Text search via Typesense or Elasticsearch. Graph queries via recursive CTE with Neo4j migration path.
2. **AI Pipeline**: Requires LLM integration for decomposition, tagging, relation inference, and generation. Must support streaming responses and draft lifecycle.
3. **Vector Embeddings**: pgvector extension for semantic search. Embedding generation required for all Units.
4. **Context Export API**: REST API specified in PRD (`GET /api/context/{context_id}/export`).
5. **External Integrations**: Calendar (Google Calendar), task management (Todoist, Apple Reminders), communication tools, maps services.
6. **Graph Rendering**: Browser-based graph visualization with cluster detection (Louvain algorithm), force-directed layouts, and real-time weight adjustments.

### Cross-Cutting Concerns Identified

1. **Perspective Layer** — Every Unit operation must be perspective-aware; relations, types, and importance vary per context.
2. **AI Safety & Approval** — Draft/Pending/Confirmed lifecycle gates all AI-generated content. Draft Units cannot participate in Assemblies or create relations.
3. **Version History** — All Unit modifications preserve previous versions with change reasons and diff summaries.
4. **ThoughtRank** — Importance scoring affects search results, navigation, relation display priority — recalculated across multiple signals.
5. **Navigation Purpose Weighting** — Relation rendering changes dynamically based on navigation mode (argument, creative, chronological, explore).
6. **Evidence Domain & Scope** — Provenance tracking and scope-jump warnings span the entire data model.
7. **Domain Template System** — Templates modify available types, relations, scaffold questions, gap detection, and navigation across all layers.

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack web application** based on project requirements analysis. Flowmind requires:
- Rich interactive frontend with graph visualization, drag-and-drop, and synchronized multi-view UI
- Server-side API for AI pipeline processing, database operations, and external integrations
- PostgreSQL + pgvector database (PRD-specified)
- Real-time updates across views

### Starter Options Considered

**Option 1: create-t3-app (T3 Stack)**
- Next.js + TypeScript + tRPC + Prisma + Tailwind CSS
- Full-stack type safety end-to-end via tRPC
- Prisma ORM with PostgreSQL support and migration management
- Active maintenance, large community, production-proven
- App Router support, Server Components ready

**Option 2: Next.js standalone (create-next-app)**
- More minimal, requires manual setup of ORM, API layer, styling
- Maximum flexibility but more configuration overhead
- Would need separate REST/GraphQL API layer setup

**Option 3: Remix + Prisma**
- Strong data loading patterns, nested routes
- Less ecosystem support for the specific combination of requirements
- Smaller community for PKM-type applications

### Selected Starter: create-t3-app

**Rationale for Selection:**
- **End-to-end type safety** via tRPC is critical for Flowmind's complex data model (30+ metadata fields per Unit, Perspective arrays, relation objects). Type errors at the API boundary would be extremely costly.
- **Prisma ORM** provides excellent PostgreSQL support, migration management, and type-safe database queries — essential for the complex schema with Units, Relations, Contexts, Assemblies, and version history.
- **Next.js App Router** enables server components for initial page loads (graph data, search results) and client components for interactive views (graph manipulation, drag-and-drop assembly).
- **Tailwind CSS** enables rapid UI development for the 6+ distinct view types without CSS naming conflicts.
- **Production-proven** stack with extensive community support and documentation.

**Initialization Command:**

```bash
pnpm create t3-app@latest flowmind --CI --tailwind --trpc --prisma --appRouter --dbProvider postgresql
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript 5.x with strict mode
- Node.js LTS runtime
- pnpm package manager

**Styling Solution:**
- Tailwind CSS 4.x with PostCSS
- CSS Modules available as escape hatch

**Build Tooling:**
- Next.js built-in Turbopack for development
- SWC for production compilation
- Tree-shaking and code-splitting via Next.js

**Testing Framework:**
- Not included by starter — will be configured separately (Vitest + Playwright)

**Code Organization:**
- `src/` directory with App Router structure
- `src/server/` for server-side code (tRPC routers, db)
- `src/app/` for pages and layouts
- `prisma/` for schema and migrations

**Development Experience:**
- Hot Module Replacement via Turbopack
- TypeScript strict mode with path aliases
- Environment variable validation via `@t3-oss/env-nextjs`
- ESLint configuration with Next.js and TypeScript rules

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Database schema design approach for Units, Relations, Perspectives
2. AI provider integration strategy
3. Authentication and authorization
4. State management for multi-view synchronization
5. Graph visualization library

**Important Decisions (Shape Architecture):**
6. Search infrastructure (text + semantic)
7. Real-time update mechanism
8. File storage for Resource Units
9. Background job processing for AI pipeline
10. API design for Context Export

**Deferred Decisions (Post-MVP):**
- Neo4j migration (PRD specifies PostgreSQL CTE first)
- Mobile capture interface
- External service integrations (Calendar, Todoist)
- Notification system
- Business model / pricing tier architecture

### Data Architecture

**Database: PostgreSQL 16 + pgvector extension**
- Rationale: PRD-specified. PostgreSQL provides ACID transactions critical for Unit versioning and relation re-attribution on split/merge. pgvector enables semantic search without a separate vector database.
- Affects: All data operations, search, AI pipeline

**ORM: Prisma 6.x**
- Rationale: Provided by T3 starter. Type-safe schema with automatic TypeScript type generation. Migration management essential for the complex evolving schema.
- Affects: All server-side data access

**Data Modeling Approach: Relational with JSON columns for flexible metadata**
- The Unit table uses typed columns for core fields (id, content, created_at, lifecycle, quality) and a JSONB column for the `perspectives` array and domain-specific metadata.
- Relations are stored in a dedicated `relations` table with foreign keys to source/target Units AND a `context_id` to support per-perspective relations.
- Version history stored in a `unit_versions` table with full snapshots.
- Rationale: Balances query performance for common operations (filter by type, lifecycle) with flexibility for the rich metadata model. JSONB columns allow Perspective Layer queries without excessive joins while keeping graph traversal queries on indexed relational columns.

**Schema Design (Key Tables):**

```
units
  id              UUID PRIMARY KEY
  content         TEXT NOT NULL
  created_at      TIMESTAMPTZ
  modified_at     TIMESTAMPTZ
  last_accessed   TIMESTAMPTZ
  origin_type     VARCHAR(30)  -- direct_write, external_excerpt, ai_generated, etc.
  lifecycle       VARCHAR(20)  -- draft, pending, confirmed, archived, etc.
  quality         VARCHAR(20)  -- raw, refined, verified, published
  source_url      TEXT
  source_title    TEXT
  is_quote        BOOLEAN DEFAULT FALSE
  ai_trust_level  VARCHAR(20)
  embedding       vector(1536) -- pgvector
  project_id      UUID REFERENCES projects(id)
  meta            JSONB        -- flexible metadata (tags, energy_level, etc.)

unit_perspectives
  id              UUID PRIMARY KEY
  unit_id         UUID REFERENCES units(id) ON DELETE CASCADE
  context_id      UUID REFERENCES contexts(id) ON DELETE CASCADE
  type            VARCHAR(50)  -- claim, question, evidence, etc.
  stance          VARCHAR(20)  -- support, oppose, neutral, exploring
  importance      FLOAT        -- ThoughtRank within this context
  note            TEXT
  UNIQUE(unit_id, context_id)

relations
  id              UUID PRIMARY KEY
  source_unit_id  UUID REFERENCES units(id) ON DELETE CASCADE
  target_unit_id  UUID REFERENCES units(id) ON DELETE CASCADE
  perspective_id  UUID REFERENCES unit_perspectives(id) ON DELETE CASCADE
  type            VARCHAR(50)  -- supports, contradicts, inspires, contains, etc.
  strength        FLOAT CHECK (strength >= 0 AND strength <= 1)
  direction       VARCHAR(15)  -- one_way, bidirectional
  purpose         VARCHAR(30)[]  -- {navigation, argument, context, reference}
  created_at      TIMESTAMPTZ
  is_custom       BOOLEAN DEFAULT FALSE
  custom_name     TEXT  -- for user-defined relation types

contexts
  id              UUID PRIMARY KEY
  name            TEXT NOT NULL
  project_id      UUID REFERENCES projects(id)
  parent_id       UUID REFERENCES contexts(id)  -- hierarchical contexts
  snapshot        JSONB  -- AI-managed summary
  open_questions  JSONB  -- unresolved questions list
  contradictions  JSONB  -- internal contradiction list
  created_at      TIMESTAMPTZ

projects
  id              UUID PRIMARY KEY
  name            TEXT NOT NULL
  type            VARCHAR(50)  -- project type for UI optimization
  template_id     UUID REFERENCES domain_templates(id)
  constraint_level VARCHAR(10) -- strict, guided, open
  branched_from   UUID REFERENCES projects(id)
  branch_reason   TEXT

unit_versions
  id              UUID PRIMARY KEY
  unit_id         UUID REFERENCES units(id) ON DELETE CASCADE
  version         INT NOT NULL
  content         TEXT
  meta            JSONB
  change_reason   TEXT
  diff_summary    TEXT  -- AI-generated
  created_at      TIMESTAMPTZ

assemblies
  id              UUID PRIMARY KEY
  name            TEXT NOT NULL
  project_id      UUID REFERENCES projects(id)
  template_type   VARCHAR(50)
  source_map      JSONB
  created_at      TIMESTAMPTZ

assembly_items
  id              UUID PRIMARY KEY
  assembly_id     UUID REFERENCES assemblies(id) ON DELETE CASCADE
  unit_id         UUID REFERENCES units(id)
  position        INT NOT NULL
  bridge_text     TEXT  -- AI-generated connecting text

navigators
  id              UUID PRIMARY KEY
  name            TEXT NOT NULL
  purpose         VARCHAR(30)  -- argument, creative, chronological, explore
  context_id      UUID REFERENCES contexts(id)
  path            UUID[]  -- ordered Unit IDs

domain_templates
  id              UUID PRIMARY KEY
  name            TEXT NOT NULL
  type            VARCHAR(30)  -- system, freeform, user_defined
  config          JSONB  -- types, relations, scaffold_questions, gap_rules, etc.

custom_relation_types
  id              UUID PRIMARY KEY
  name            TEXT NOT NULL
  project_id      UUID REFERENCES projects(id)
  scope           VARCHAR(10)  -- private, shared
  reusable        BOOLEAN DEFAULT FALSE
  created_at      TIMESTAMPTZ
```

**Data Validation Strategy: Zod schemas**
- Zod 3.x for runtime validation at API boundaries (tRPC input schemas)
- Prisma schema for database-level constraints
- Rationale: tRPC + Zod provides end-to-end type safety from client to database. Zod schemas serve as the single source of truth for input validation.

**Migration Approach: Prisma Migrate**
- `prisma migrate dev` for development
- `prisma migrate deploy` for production
- Seed scripts for domain template defaults and system relation types

**Caching Strategy: In-memory + Redis**
- MVP: In-memory caching for ThoughtRank scores and navigation weights (recomputed on Unit/relation changes)
- Scale: Redis for shared cache across server instances, pub/sub for real-time updates
- Rationale: ThoughtRank and navigation weights are compute-intensive but read-heavy. Caching dramatically reduces query time for graph rendering.

### Authentication & Security

**Authentication: Auth.js (NextAuth.js) v5**
- OAuth providers: Google, GitHub (MVP)
- Email/password with magic links (MVP)
- Rationale: Auth.js v5 integrates natively with Next.js App Router, supports edge runtime, and provides session management out of the box.
- Affects: All authenticated routes, API endpoints

**Authorization: Role-based with project-level permissions**
- MVP: Single-user mode (personal PKM). Each user owns their projects and all Units within.
- Future: Shared projects with role-based access (owner, editor, viewer).
- Rationale: Flowmind is primarily a personal thinking tool. Multi-user collaboration is not in the PRD scope.

**Security Middleware:**
- CSRF protection via Auth.js built-in tokens
- Rate limiting on AI generation endpoints (PRD specifies max 3 generated per request)
- Input sanitization for all user-provided content (XSS prevention)
- Content Security Policy headers

**API Security:**
- All tRPC procedures require authentication (except public Context Export API if shared)
- Context Export API uses API key authentication for external tool integration
- Rationale: Context Export API must be accessible from external AI tools per PRD specification.

### API & Communication Patterns

**Primary API: tRPC v11**
- Type-safe RPC for all internal client-server communication
- Procedure types: queries (read), mutations (write), subscriptions (real-time)
- Rationale: End-to-end type safety eliminates API contract drift. tRPC's subscription support enables real-time view synchronization.

**REST API: Next.js Route Handlers for Context Export API**
- `GET /api/context/{context_id}/export` as specified in PRD
- Supports `format`, `include`, `depth`, `filter` parameters
- API key authentication
- Rationale: External tools expect REST. tRPC handles internal communication; REST handles external integration.

**Error Handling Standards:**
- tRPC errors use built-in error codes (NOT_FOUND, UNAUTHORIZED, BAD_REQUEST, etc.)
- All errors include structured `{ code, message, details? }` format
- AI pipeline errors include specific error types: `AI_GENERATION_LIMIT`, `AI_RATIO_EXCEEDED`, `AI_CONTROVERSIAL_DETECTED`
- Client-side error boundaries per view component

**Real-time Updates: tRPC Subscriptions via WebSocket**
- Cross-view synchronization: When a Unit is modified in one view, all other open views reflect the change
- Uses `@trpc/server` WebSocket adapter
- Rationale: tRPC subscriptions provide type-safe real-time events. Essential for the cross-view coordination requirement (Graph View ↔ Thread View ↔ Assembly View).

**Communication Between Modules:**
- Server-side: Direct function calls within tRPC routers (monolithic MVP)
- Event-driven: Internal event bus for cross-cutting concerns (e.g., Unit modification triggers ThoughtRank recalculation, version snapshot, embedding update)
- Rationale: Monolithic architecture for MVP simplicity. Event bus decouples cross-cutting concerns without microservice overhead.

### Frontend Architecture

**State Management: Zustand 5.x**
- Lightweight, TypeScript-first store
- Separate stores for: active context, navigation state, view synchronization, UI preferences
- Rationale: Zustand's simplicity and performance suit the multi-view architecture. Each view subscribes to relevant state slices without unnecessary re-renders. tRPC + React Query handles server state.

**Server State: TanStack Query (via tRPC React hooks)**
- Automatic caching, refetching, optimistic updates
- Stale-while-revalidate for Unit data
- Rationale: Built into tRPC React integration. Handles the complexity of keeping multiple views synchronized with server state.

**Component Architecture: Feature-based organization**
- Shared UI primitives via shadcn/ui (Radix UI + Tailwind)
- Feature modules: `units/`, `contexts/`, `graph/`, `assembly/`, `navigator/`, `search/`, `ai/`
- Each feature module contains: components, hooks, types, utils
- Rationale: Feature-based organization maps directly to PRD functional areas. shadcn/ui provides accessible, customizable primitives without vendor lock-in.

**Graph Visualization: D3.js + custom React wrapper**
- D3-force for force-directed graph layout (Global View)
- Custom card grid for Local Exploration View (not a graph)
- Louvain algorithm for cluster detection (community detection)
- Canvas rendering for Global View (performance with 1000+ nodes), SVG for Local View
- Rationale: D3.js is the most flexible graph rendering library. Canvas rendering handles large node counts. The two-layer Graph View design (global dot view vs. local card array) requires different rendering approaches.

**Drag-and-Drop: dnd-kit**
- Assembly View: Reorder Units within an Assembly
- Unit splitting: Drag to define split boundaries
- Context membership: Drag Units between contexts
- Rationale: dnd-kit is the most performant React DnD library with excellent accessibility and touch support.

**Rich Text Editing: Tiptap 3.x (ProseMirror-based)**
- Unit content editing with inline formatting
- Markdown support for import/export
- Custom extensions for Unit references, relation markers
- Rationale: Tiptap provides the extensibility needed for custom Unit-aware editing features while maintaining a clean API.

**Routing Strategy: Next.js App Router**
- Route groups for main sections: `(app)/`, `(auth)/`
- Dynamic routes: `/context/[contextId]`, `/unit/[unitId]`, `/assembly/[assemblyId]`
- Parallel routes for multi-pane layouts (Graph + Thread side-by-side)
- Rationale: App Router's parallel routes and layouts directly support the multi-view synchronized UI pattern.

**Performance Optimization:**
- React Server Components for initial data loading (context snapshot, unit list)
- Client components for interactive views (graph manipulation, drag-drop)
- Virtual scrolling for Thread View and long unit lists (TanStack Virtual)
- Lazy loading for graph visualization libraries
- Image optimization via Next.js Image component for Resource Units

### Infrastructure & Deployment

**Hosting: Vercel (Frontend + API) + Supabase (PostgreSQL + pgvector)**
- Vercel for Next.js deployment with edge functions
- Supabase for managed PostgreSQL with pgvector extension pre-installed
- Rationale: Vercel is the native deployment platform for Next.js. Supabase provides managed PostgreSQL with pgvector, connection pooling (PgBouncer), and real-time capabilities. Zero infrastructure management for MVP.

**Alternative for self-hosted:** Railway or Fly.io with Docker

**CI/CD: GitHub Actions**
- Lint + type check + unit tests on PR
- E2E tests on merge to main
- Automatic Vercel preview deployments on PR
- Database migration on production deploy

**Environment Configuration:**
- `@t3-oss/env-nextjs` for validated environment variables
- `.env.local` for local development
- Vercel environment variables for staging/production
- Separate environment configs: development, staging, production

**Monitoring and Logging:**
- Vercel Analytics for web vitals and performance
- Sentry for error tracking and performance monitoring
- Structured logging via `pino` for server-side operations
- AI pipeline logging: Track generation counts, ratios, response times
- Rationale: MVP-appropriate monitoring stack. Sentry provides actionable error reports. Pino is fast and JSON-structured.

**Scaling Strategy:**
- MVP: Single Vercel deployment + single Supabase instance
- Scale Phase 1: Vercel serverless scaling (automatic) + Supabase connection pooling
- Scale Phase 2: Redis for shared caching + background job queue (BullMQ)
- Scale Phase 3: Dedicated search via Typesense + Neo4j for graph queries (PRD migration path)

**Background Job Processing: Trigger.dev (MVP) → BullMQ (Scale)**
- AI pipeline operations: decomposition, embedding generation, relation inference
- ThoughtRank recalculation (batch)
- Context snapshot updates
- Rationale: Trigger.dev provides serverless background jobs compatible with Vercel. Migrate to BullMQ + Redis when self-hosting for more control.

**File Storage: Vercel Blob (MVP) → S3-compatible (Scale)**
- Resource Unit files: images, PDFs, audio, code files
- Rationale: Vercel Blob integrates natively. S3-compatible storage for self-hosted deployments.

### Decision Impact Analysis

**Implementation Sequence:**
1. T3 app initialization + Prisma schema + database provisioning
2. Auth.js setup + basic user/project CRUD
3. Unit CRUD + version history + Perspective Layer
4. Relation system + graph queries (recursive CTE)
5. AI pipeline integration (LLM + embedding generation)
6. Navigation system + ThoughtRank
7. Views: Thread View → Assembly View → Graph View → Search → Dashboard
8. Domain Template system
9. Context Export API
10. Assembly output + Bridge Text generation

**Cross-Component Dependencies:**
- Perspective Layer affects ALL data queries — must be established early
- AI pipeline depends on Unit schema being stable
- Graph View depends on relation system + ThoughtRank
- Assembly View depends on Unit system + drag-and-drop
- Search depends on text index + vector embeddings + structural data
- Domain Templates affect type system, relation types, gap detection — configurable layer on top of core

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 28 areas where AI agents could make different choices, organized into 5 categories below.

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural (`units`, `relations`, `contexts`, `assemblies`, `unit_perspectives`, `unit_versions`, `assembly_items`, `custom_relation_types`, `domain_templates`)
- Columns: `snake_case` (`unit_id`, `context_id`, `created_at`, `source_url`, `ai_trust_level`)
- Foreign keys: `{referenced_table_singular}_id` (`unit_id`, `context_id`, `project_id`, `template_id`)
- Indexes: `idx_{table}_{column(s)}` (`idx_units_project_id`, `idx_relations_source_target`, `idx_unit_perspectives_unit_context`)
- Constraints: `{table}_{column}_{type}` (`relations_strength_check`, `units_lifecycle_check`)
- Enums: `snake_case` values (`direct_write`, `ai_generated`, `one_way`)

**API Naming Conventions:**
- tRPC routers: `camelCase` (`unitRouter`, `contextRouter`, `relationRouter`, `assemblyRouter`)
- tRPC procedures: `camelCase` verb-first (`getUnit`, `createUnit`, `updateUnit`, `deleteUnit`, `listUnits`, `searchUnits`)
- REST endpoints (Context Export API only): kebab-case paths, plural nouns (`/api/context/{contextId}/export`)
- Query parameters: `camelCase` (`contextId`, `includeRelations`, `maxDepth`)

**Code Naming Conventions:**
- Components: `PascalCase` (`UnitCard`, `GraphView`, `AssemblyEditor`, `ContextDashboard`)
- Component files: `PascalCase.tsx` (`UnitCard.tsx`, `GraphView.tsx`)
- Hooks: `camelCase` with `use` prefix (`useUnit`, `useGraphLayout`, `useNavigationPurpose`)
- Hook files: `camelCase.ts` (`useUnit.ts`, `useGraphLayout.ts`)
- Utility functions: `camelCase` (`calculateThoughtRank`, `detectClusters`, `parseUnitContent`)
- Utility files: `camelCase.ts` (`thoughtRank.ts`, `clusterDetection.ts`)
- Types/Interfaces: `PascalCase` with no prefix (`Unit`, `Relation`, `Context`, `Perspective` — NOT `IUnit` or `TUnit`)
- Type files: `types.ts` within feature module
- Constants: `UPPER_SNAKE_CASE` (`MAX_AI_GENERATIONS`, `DRIFT_THRESHOLD`, `DEFAULT_RELATION_STRENGTH`)
- Constant files: `constants.ts` within feature module
- Zod schemas: `camelCase` with `Schema` suffix (`createUnitSchema`, `updateRelationSchema`)
- tRPC routers: `camelCase` with `Router` suffix (`unitRouter`, `contextRouter`)
- Server services: `camelCase` with `Service` suffix (`aiService`, `searchService`, `embeddingService`)
- Event names: `camelCase` dot-separated (`unit.created`, `unit.updated`, `relation.created`, `context.snapshotUpdated`)

### Structure Patterns

**Project Organization: Feature-based with shared core**

```
src/
  app/           # Next.js App Router pages and layouts
  components/    # Shared UI components (shadcn/ui based)
  features/      # Feature modules (see below)
  server/        # Server-side code
  lib/           # Shared utilities
  types/         # Global type definitions
  hooks/         # Global hooks
  stores/        # Zustand stores
```

**Feature Module Structure:**
Each feature module follows this internal structure:

```
features/{feature}/
  components/     # Feature-specific React components
  hooks/          # Feature-specific hooks
  types.ts        # Feature-specific types
  constants.ts    # Feature-specific constants
  utils.ts        # Feature-specific utilities
  schemas.ts      # Zod validation schemas for this feature
  index.ts        # Public exports (barrel file)
```

**Test Organization: Co-located unit tests + separate E2E**
- Unit tests: `*.test.ts` or `*.test.tsx` co-located next to source files
- Integration tests: `__tests__/integration/` at project root
- E2E tests: `e2e/` at project root
- Test utilities: `__tests__/helpers/` at project root
- Rationale: Co-located tests are easier to maintain and discover. E2E tests are separate because they test full user flows, not individual modules.

**Server-side Organization:**

```
server/
  api/
    routers/       # tRPC router definitions
    middleware/     # tRPC middleware (auth, logging, rate limiting)
    trpc.ts        # tRPC initialization
    root.ts        # Root router merging all sub-routers
  services/        # Business logic services
  repositories/    # Data access layer (Prisma queries)
  events/          # Internal event bus
  ai/              # AI pipeline modules
  jobs/            # Background job definitions
```

### Format Patterns

**API Response Formats (tRPC):**
- Success: Return data directly (tRPC handles wrapping)
- Errors: Use `TRPCError` with appropriate code
- Pagination: `{ items: T[], nextCursor?: string, totalCount: number }`
- Lists with filters: `{ items: T[], filters: AppliedFilters, totalCount: number }`

```typescript
// Pagination pattern
type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
};

// Unit list response
type UnitListResponse = PaginatedResponse<UnitSummary>;
```

**REST API Response Format (Context Export API only):**

```json
{
  "data": { ... },
  "meta": {
    "format": "prompt_package",
    "exportedAt": "2026-03-17T10:00:00Z",
    "unitCount": 42,
    "contextId": "uuid"
  }
}
```

**Error Response Format:**

```typescript
// tRPC errors
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Unit not found",
  cause: { unitId: "..." }
});

// REST API errors
{
  "error": {
    "code": "CONTEXT_NOT_FOUND",
    "message": "Context with the specified ID does not exist",
    "details": { "contextId": "..." }
  }
}
```

**Date/Time Format:**
- Database: `TIMESTAMPTZ` (PostgreSQL stores UTC)
- API transport: ISO 8601 strings (`"2026-03-17T10:00:00.000Z"`)
- Client display: Formatted via `date-fns` with user locale
- Temporal context field: Free-text string (`"as of Q1 2026"`)

**JSON Field Naming:**
- API payloads: `camelCase` (`unitId`, `contextId`, `createdAt`, `aiTrustLevel`)
- Database JSONB columns: `snake_case` (matches database convention)
- Prisma handles the mapping between database snake_case and TypeScript camelCase

### Communication Patterns

**Internal Event Bus:**
- Event names: `{entity}.{action}` format (`unit.created`, `unit.updated`, `unit.split`, `relation.created`, `context.entered`)
- Event payload: Always includes `{ entityId, userId, timestamp, ...data }`
- Async processing: Events trigger background jobs for expensive operations (embedding generation, ThoughtRank recalculation)

```typescript
// Event definition pattern
type UnitCreatedEvent = {
  entityId: string;   // unit ID
  userId: string;
  timestamp: Date;
  contextId: string;
  perspectiveId: string;
};
```

**State Management Patterns (Zustand):**

```typescript
// Store naming: use{Feature}Store
// Example: useNavigationStore
const useNavigationStore = create<NavigationState>()((set, get) => ({
  activeContextId: null,
  navigationPurpose: "explore",
  selectedUnitId: null,

  // Actions: verb-first camelCase
  setActiveContext: (contextId: string) => set({ activeContextId: contextId }),
  selectUnit: (unitId: string) => set({ selectedUnitId: unitId }),
}));
```

- Store files: `stores/{storeName}.ts` (`stores/navigationStore.ts`)
- Never mutate state directly — always use `set()`
- Derived state via Zustand selectors, not computed in components
- Cross-store communication via event bus, not direct store imports

**View Synchronization Pattern:**
- When a Unit is selected in any view → dispatch `unit.selected` event → all views with `useSelectedUnit()` hook update
- When a Unit is modified → tRPC mutation → invalidate React Query cache → all views re-render with fresh data
- WebSocket subscription for multi-tab synchronization

### Process Patterns

**Error Handling Patterns:**

```typescript
// Server-side: Always use TRPCError
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Cannot create relation: source Unit is in draft lifecycle",
});

// Client-side: Error boundary per view
<ErrorBoundary fallback={<ViewErrorFallback />}>
  <GraphView />
</ErrorBoundary>

// AI-specific errors
throw new TRPCError({
  code: "TOO_MANY_REQUESTS",
  message: "AI generation limit reached (max 3 per request)",
  cause: { type: "AI_GENERATION_LIMIT", currentCount: 3, maxCount: 3 }
});
```

- Global error boundary at app layout level catches unhandled errors
- Per-view error boundaries allow individual views to fail gracefully
- AI pipeline errors are non-fatal — always show user the error and allow manual action
- Never silently swallow errors — log to Sentry and show user-facing message

**Loading State Patterns:**

```typescript
// Use React Query / tRPC loading states
const { data, isLoading, error } = api.unit.getUnit.useQuery({ id });

// Skeleton loading for initial page load
if (isLoading) return <UnitCardSkeleton />;

// Optimistic updates for mutations
const mutation = api.unit.updateUnit.useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["unit", id] });
    // Snapshot previous value
    const previous = queryClient.getQueryData(["unit", id]);
    // Optimistically update
    queryClient.setQueryData(["unit", id], newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(["unit", id], context?.previous);
  },
});
```

- Every data-fetching component must handle: loading, error, empty, and loaded states
- Use skeleton components matching the final layout (not generic spinners)
- Optimistic updates for Unit content edits and relation strength changes
- Disable submit buttons during mutation, re-enable on settle

**AI Pipeline Processing Pattern:**

```typescript
// 1. User triggers AI action
// 2. Create background job
// 3. Return immediately with job ID
// 4. Client polls or subscribes for completion
// 5. Result arrives as Draft lifecycle Units

// AI response always returns:
type AIResult = {
  jobId: string;
  status: "processing" | "completed" | "failed";
  results?: {
    units: DraftUnit[];     // lifecycle: "draft"
    relations: DraftRelation[];
    suggestions: AISuggestion[];
  };
  error?: string;
};
```

**Validation Pattern:**
- Input validation at tRPC procedure level (Zod schemas)
- Business rule validation in service layer (e.g., "Draft Units cannot be added to Assemblies")
- Database constraints as last-resort validation (unique constraints, foreign keys, check constraints)
- Never rely solely on client-side validation

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow the naming conventions exactly as specified — no exceptions for "personal preference"
2. Place new files in the correct feature module directory
3. Use Zod schemas for all tRPC procedure inputs
4. Handle all 4 states (loading, error, empty, loaded) for data-fetching components
5. Use `TRPCError` for all server-side errors — never throw raw `Error`
6. Add `*.test.ts` files co-located with new source files
7. Use the event bus for cross-cutting side effects — never call other routers directly from a mutation
8. Always check Unit `lifecycle` before allowing operations (Draft restrictions)
9. Use `camelCase` in TypeScript/API, `snake_case` in database
10. Include `userId` and `timestamp` in all event payloads

**Pattern Enforcement:**
- ESLint rules enforce naming conventions and import patterns
- Prisma schema enforces database naming
- tRPC middleware enforces authentication and rate limiting
- Code review checklist includes pattern compliance verification
- TypeScript strict mode catches type inconsistencies

### Pattern Examples

**Good Examples:**

```typescript
// Correct: Feature module structure
// src/features/units/components/UnitCard.tsx
// src/features/units/hooks/useUnit.ts
// src/features/units/types.ts
// src/features/units/schemas.ts

// Correct: tRPC procedure with Zod validation
export const unitRouter = createTRPCRouter({
  getUnit: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.unit.findUniqueOrThrow({ where: { id: input.id } });
    }),

  createUnit: protectedProcedure
    .input(createUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.create({ data: { ...input, userId: ctx.session.user.id } });
      await eventBus.emit("unit.created", { entityId: unit.id, userId: ctx.session.user.id, timestamp: new Date() });
      return unit;
    }),
});

// Correct: Zustand store
const useContextStore = create<ContextState>()((set) => ({
  activeContextId: null,
  setActiveContext: (id: string | null) => set({ activeContextId: id }),
}));
```

**Anti-Patterns:**

```typescript
// WRONG: PascalCase database table
// CREATE TABLE Units (...)  ← should be "units"

// WRONG: Hungarian notation on types
// interface IUnit { ... }  ← should be "Unit"

// WRONG: Calling another router directly
// In unitRouter mutation:
//   await ctx.api.relation.createRelation(...)  ← use event bus instead

// WRONG: Missing lifecycle check
// const assembly = await addToAssembly(unit)  ← must check unit.lifecycle !== "draft"

// WRONG: No error handling states
// return <div>{data.content}</div>  ← must handle loading/error/empty

// WRONG: Raw Error thrown from server
// throw new Error("Not found")  ← use TRPCError({ code: "NOT_FOUND", ... })
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
flowmind/
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
├── .env.local                    # Local dev environment (git-ignored)
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── components.json               # shadcn/ui configuration
│
├── .github/
│   └── workflows/
│       ├── ci.yml                # Lint + type check + unit tests
│       └── e2e.yml               # E2E tests on merge to main
│
├── prisma/
│   ├── schema.prisma             # Database schema definition
│   ├── migrations/               # Auto-generated migration files
│   └── seed.ts                   # Seed: domain templates, system relation types, demo data
│
├── public/
│   ├── favicon.ico
│   └── assets/
│       └── icons/                # Relation type icons, unit type icons
│
├── e2e/                          # Playwright E2E tests
│   ├── playwright.config.ts
│   ├── fixtures/
│   │   └── auth.fixture.ts       # Authenticated test helper
│   ├── unit-crud.spec.ts
│   ├── graph-view.spec.ts
│   ├── assembly-editor.spec.ts
│   └── context-export.spec.ts
│
├── __tests__/
│   ├── helpers/
│   │   ├── db.ts                 # Test database setup/teardown
│   │   ├── factories.ts          # Unit, Relation, Context factories
│   │   └── mocks.ts              # AI service mocks
│   └── integration/
│       ├── unit-lifecycle.test.ts
│       ├── relation-graph.test.ts
│       ├── perspective-layer.test.ts
│       └── ai-pipeline.test.ts
│
└── src/
    ├── env.ts                    # @t3-oss/env-nextjs validated env vars
    ├── middleware.ts              # Next.js middleware (auth redirect, CSP headers)
    │
    ├── app/                      # Next.js App Router
    │   ├── globals.css           # Tailwind base + custom design tokens
    │   ├── layout.tsx            # Root layout (providers, auth, global state)
    │   ├── page.tsx              # Landing / dashboard page
    │   │
    │   ├── (auth)/               # Auth route group (unauthenticated)
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   └── signup/
    │   │       └── page.tsx
    │   │
    │   ├── (app)/                # Main app route group (authenticated)
    │   │   ├── layout.tsx        # App shell (sidebar, navigation, view panels)
    │   │   │
    │   │   ├── project/
    │   │   │   ├── page.tsx                    # Project list
    │   │   │   └── [projectId]/
    │   │   │       ├── layout.tsx              # Project layout (context sidebar)
    │   │   │       ├── page.tsx                # Project dashboard
    │   │   │       │
    │   │   │       ├── context/
    │   │   │       │   └── [contextId]/
    │   │   │       │       ├── layout.tsx      # Context layout (multi-view panels)
    │   │   │       │       ├── page.tsx        # Context dashboard view
    │   │   │       │       ├── graph/
    │   │   │       │       │   └── page.tsx    # Graph View (global + local)
    │   │   │       │       ├── thread/
    │   │   │       │       │   └── page.tsx    # Thread View
    │   │   │       │       └── search/
    │   │   │       │           └── page.tsx    # Search View
    │   │   │       │
    │   │   │       ├── assembly/
    │   │   │       │   ├── page.tsx            # Assembly list
    │   │   │       │   └── [assemblyId]/
    │   │   │       │       ├── page.tsx        # Assembly Editor
    │   │   │       │       └── diff/
    │   │   │       │           └── page.tsx    # Assembly Diff View
    │   │   │       │
    │   │   │       ├── navigator/
    │   │   │       │   └── [navigatorId]/
    │   │   │       │       └── page.tsx        # Navigator path view
    │   │   │       │
    │   │   │       ├── unit/
    │   │   │       │   └── [unitId]/
    │   │   │       │       └── page.tsx        # Unit detail view
    │   │   │       │
    │   │   │       └── settings/
    │   │   │           └── page.tsx            # Project settings (template, constraints)
    │   │   │
    │   │   └── settings/
    │   │       └── page.tsx                    # User settings
    │   │
    │   └── api/                  # REST API routes (Context Export only)
    │       └── context/
    │           └── [contextId]/
    │               └── export/
    │                   └── route.ts            # GET /api/context/{contextId}/export
    │
    ├── components/               # Shared UI components
    │   ├── ui/                   # shadcn/ui primitives (Button, Dialog, Card, etc.)
    │   ├── layout/
    │   │   ├── AppShell.tsx      # Main app layout with resizable panels
    │   │   ├── Sidebar.tsx       # Project/context navigation sidebar
    │   │   └── ViewPanel.tsx     # Resizable view panel container
    │   ├── common/
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── LoadingSkeleton.tsx
    │   │   ├── EmptyState.tsx
    │   │   └── ConfirmDialog.tsx
    │   └── providers/
    │       ├── TRPCProvider.tsx   # tRPC + React Query provider
    │       ├── AuthProvider.tsx   # Auth.js session provider
    │       └── ThemeProvider.tsx  # Dark/light mode
    │
    ├── features/                 # Feature modules
    │   ├── units/
    │   │   ├── components/
    │   │   │   ├── UnitCard.tsx           # Base unit card display
    │   │   │   ├── UnitEditor.tsx         # Tiptap-based content editor
    │   │   │   ├── UnitSplitter.tsx       # Split unit UI with boundary drag
    │   │   │   ├── UnitMerger.tsx         # Merge units UI
    │   │   │   ├── UnitMetadataPanel.tsx  # Metadata display/edit sidebar
    │   │   │   ├── UnitTypeSelector.tsx   # Type picker (base + domain types)
    │   │   │   ├── UnitLifecycleBadge.tsx # Draft/Pending/Confirmed badge
    │   │   │   └── UnitVersionHistory.tsx # Version diff viewer
    │   │   ├── hooks/
    │   │   │   ├── useUnit.ts
    │   │   │   ├── useUnitMutation.ts
    │   │   │   └── useUnitVersions.ts
    │   │   ├── types.ts
    │   │   ├── schemas.ts
    │   │   ├── constants.ts               # Unit types, lifecycle states
    │   │   ├── utils.ts
    │   │   └── index.ts
    │   │
    │   ├── perspectives/
    │   │   ├── components/
    │   │   │   ├── PerspectiveSelector.tsx # Switch between context perspectives
    │   │   │   └── PerspectiveEditor.tsx  # Edit type/stance/importance per context
    │   │   ├── hooks/
    │   │   │   └── usePerspective.ts
    │   │   ├── types.ts
    │   │   └── index.ts
    │   │
    │   ├── relations/
    │   │   ├── components/
    │   │   │   ├── RelationCreator.tsx     # Create relation between units
    │   │   │   ├── RelationList.tsx        # List relations for a unit
    │   │   │   ├── RelationTypeSelector.tsx # System + custom type picker
    │   │   │   ├── RelationStrengthSlider.tsx
    │   │   │   └── CustomRelationManager.tsx # Custom relation type library
    │   │   ├── hooks/
    │   │   │   ├── useRelations.ts
    │   │   │   └── useRelationGraph.ts
    │   │   ├── types.ts
    │   │   ├── schemas.ts
    │   │   ├── constants.ts               # System relation types by category
    │   │   └── index.ts
    │   │
    │   ├── contexts/
    │   │   ├── components/
    │   │   │   ├── ContextList.tsx
    │   │   │   ├── ContextDashboard.tsx    # Stats, open questions, hub units
    │   │   │   ├── ContextSnapshot.tsx     # AI-managed summary display
    │   │   │   └── ContextHierarchy.tsx    # Nested context tree
    │   │   ├── hooks/
    │   │   │   ├── useContext.ts
    │   │   │   └── useContextDashboard.ts
    │   │   ├── types.ts
    │   │   ├── schemas.ts
    │   │   └── index.ts
    │   │
    │   ├── graph/
    │   │   ├── components/
    │   │   │   ├── GraphGlobalView.tsx     # D3 Canvas: dot + line overview
    │   │   │   ├── GraphLocalView.tsx      # Card array for local exploration
    │   │   │   ├── GraphControls.tsx       # Zoom, filter, navigation purpose toggle
    │   │   │   └── GraphNode.tsx           # Individual node rendering
    │   │   ├── hooks/
    │   │   │   ├── useGraphLayout.ts       # D3-force simulation
    │   │   │   ├── useClusterDetection.ts  # Louvain algorithm
    │   │   │   └── useNavigationWeights.ts # Purpose-based weight calculation
    │   │   ├── types.ts
    │   │   ├── utils.ts                   # Graph algorithms, layout helpers
    │   │   └── index.ts
    │   │
    │   ├── thread/
    │   │   ├── components/
    │   │   │   ├── ThreadView.tsx          # Vertical unit card stack
    │   │   │   ├── ThreadBranchIndicator.tsx # Fork point display
    │   │   │   └── ChunkDivider.tsx        # Chunk boundary visual
    │   │   ├── hooks/
    │   │   │   └── useThreadNavigation.ts
    │   │   ├── types.ts
    │   │   └── index.ts
    │   │
    │   ├── assembly/
    │   │   ├── components/
    │   │   │   ├── AssemblyEditor.tsx      # Drag-and-drop unit ordering
    │   │   │   ├── AssemblyTemplate.tsx    # Template slot visualization
    │   │   │   ├── AssemblyDiff.tsx        # Side-by-side comparison
    │   │   │   ├── BridgeTextEditor.tsx    # AI-generated connecting text
    │   │   │   └── ExportDialog.tsx        # Export format selection
    │   │   ├── hooks/
    │   │   │   ├── useAssembly.ts
    │   │   │   └── useAssemblyExport.ts
    │   │   ├── types.ts
    │   │   ├── schemas.ts
    │   │   └── index.ts
    │   │
    │   ├── navigator/
    │   │   ├── components/
    │   │   │   ├── NavigatorView.tsx       # Path-based reading view
    │   │   │   ├── NavigatorPurposeToggle.tsx # Argument/creative/chrono mode
    │   │   │   └── NavigatorBuilder.tsx    # Manual path creation
    │   │   ├── hooks/
    │   │   │   └── useNavigator.ts
    │   │   ├── types.ts
    │   │   └── index.ts
    │   │
    │   ├── search/
    │   │   ├── components/
    │   │   │   ├── SearchView.tsx          # 4-layer search interface
    │   │   │   ├── SearchFilters.tsx       # Type, context, date, lifecycle filters
    │   │   │   └── SearchResults.tsx       # Ranked result list
    │   │   ├── hooks/
    │   │   │   └── useSearch.ts
    │   │   ├── types.ts
    │   │   └── index.ts
    │   │
    │   ├── ai/
    │   │   ├── components/
    │   │   │   ├── AIDecompositionPanel.tsx    # Text decomposition UI
    │   │   │   ├── AIRelationSuggestion.tsx    # Suggested relations display
    │   │   │   ├── AISafetyIndicator.tsx       # Draft/Pending/Confirmed display
    │   │   │   ├── AIGenerationLimits.tsx      # Generation count/ratio display
    │   │   │   ├── CompletenessCompass.tsx     # Gap analysis visualization
    │   │   │   └── EpistemicHumilityBanner.tsx # Controversial topic alert
    │   │   ├── hooks/
    │   │   │   ├── useAIDecomposition.ts
    │   │   │   ├── useAIRelationInference.ts
    │   │   │   └── useCompletenessCompass.ts
    │   │   ├── types.ts
    │   │   ├── constants.ts               # MAX_GENERATIONS, AI_RATIO_THRESHOLD
    │   │   └── index.ts
    │   │
    │   ├── templates/
    │   │   ├── components/
    │   │   │   ├── TemplateSelector.tsx    # Domain template picker
    │   │   │   ├── TemplateEditor.tsx      # User-defined template creation
    │   │   │   └── ScaffoldQuestions.tsx   # Initial scaffold question display
    │   │   ├── hooks/
    │   │   │   └── useTemplate.ts
    │   │   ├── types.ts
    │   │   ├── defaults/                  # System default template definitions
    │   │   │   ├── software-design.ts
    │   │   │   ├── nonfiction-writing.ts
    │   │   │   ├── investment-decision.ts
    │   │   │   └── academic-research.ts
    │   │   └── index.ts
    │   │
    │   └── projects/
    │       ├── components/
    │       │   ├── ProjectList.tsx
    │       │   ├── ProjectSettings.tsx
    │       │   └── DriftDetectionAlert.tsx # Branch project proposal
    │       ├── hooks/
    │       │   └── useProject.ts
    │       ├── types.ts
    │       ├── schemas.ts
    │       └── index.ts
    │
    ├── server/
    │   ├── api/
    │   │   ├── trpc.ts               # tRPC context, middleware, procedure builders
    │   │   ├── root.ts               # Root router merging all sub-routers
    │   │   ├── routers/
    │   │   │   ├── unit.ts           # Unit CRUD, split, merge, version
    │   │   │   ├── relation.ts       # Relation CRUD, graph traversal queries
    │   │   │   ├── perspective.ts    # Perspective CRUD per context
    │   │   │   ├── context.ts        # Context CRUD, snapshot, hierarchy
    │   │   │   ├── assembly.ts       # Assembly CRUD, ordering, export
    │   │   │   ├── navigator.ts      # Navigator CRUD, path generation
    │   │   │   ├── search.ts         # Multi-layer search queries
    │   │   │   ├── ai.ts             # AI decomposition, relation inference, generation
    │   │   │   ├── template.ts       # Domain template CRUD
    │   │   │   ├── project.ts        # Project CRUD, drift detection
    │   │   │   └── user.ts           # User settings, preferences
    │   │   └── middleware/
    │   │       ├── auth.ts           # Authentication middleware
    │   │       ├── rateLimit.ts      # AI generation rate limiting
    │   │       └── logging.ts        # Request logging via pino
    │   │
    │   ├── services/
    │   │   ├── unitService.ts        # Unit business logic
    │   │   ├── relationService.ts    # Relation business logic, graph queries
    │   │   ├── perspectiveService.ts # Perspective management
    │   │   ├── searchService.ts      # Multi-layer search orchestration
    │   │   ├── thoughtRankService.ts # ThoughtRank calculation
    │   │   ├── versionService.ts     # Unit version management
    │   │   └── exportService.ts      # Context export, Assembly export
    │   │
    │   ├── ai/
    │   │   ├── provider.ts           # LLM provider abstraction (Claude/OpenAI)
    │   │   ├── decomposer.ts         # Text decomposition pipeline
    │   │   ├── tagger.ts             # Type tagging, evidence domain detection
    │   │   ├── relationInferencer.ts  # Relation suggestion engine
    │   │   ├── embedder.ts           # Embedding generation (vector)
    │   │   ├── compass.ts            # Completeness Compass logic
    │   │   ├── bridgeText.ts         # Bridge text generation for Assembly export
    │   │   ├── safetyGuard.ts        # Generation limits, ratio checks, controversial detection
    │   │   └── promptBuilder.ts      # Context-aware prompt construction
    │   │
    │   ├── events/
    │   │   ├── eventBus.ts           # Internal event bus implementation
    │   │   ├── handlers/
    │   │   │   ├── onUnitCreated.ts  # Trigger embedding, ThoughtRank update
    │   │   │   ├── onUnitUpdated.ts  # Version snapshot, re-embed, re-rank
    │   │   │   ├── onRelationCreated.ts # ThoughtRank recalculation
    │   │   │   └── onContextEntered.ts  # Snapshot refresh
    │   │   └── types.ts              # Event type definitions
    │   │
    │   ├── jobs/
    │   │   ├── embeddingJob.ts       # Batch embedding generation
    │   │   ├── thoughtRankJob.ts     # Batch ThoughtRank recalculation
    │   │   ├── snapshotJob.ts        # Context snapshot updates
    │   │   └── driftDetectionJob.ts  # Project drift score calculation
    │   │
    │   ├── db.ts                     # Prisma client singleton
    │   └── auth.ts                   # Auth.js configuration
    │
    ├── lib/                          # Shared utilities
    │   ├── utils.ts                  # General utilities (cn, formatDate, etc.)
    │   ├── constants.ts              # App-wide constants
    │   └── validators.ts             # Shared Zod schemas (UUID, pagination, etc.)
    │
    ├── stores/                       # Zustand stores
    │   ├── navigationStore.ts        # Active context, selected unit, nav purpose
    │   ├── viewSyncStore.ts          # Cross-view synchronization state
    │   ├── uiPreferencesStore.ts     # Theme, layout, panel sizes
    │   └── captureStore.ts           # Capture mode state
    │
    ├── hooks/                        # Global hooks
    │   ├── useEventBus.ts            # Client-side event subscription
    │   ├── useKeyboardShortcuts.ts   # Global keyboard shortcut handler
    │   └── useViewSync.ts            # Cross-view selection synchronization
    │
    └── types/                        # Global type definitions
        ├── database.ts               # Prisma-generated types re-exports
        ├── api.ts                    # API request/response types
        └── events.ts                 # Client-side event types
```

### Architectural Boundaries

**API Boundaries:**
- **tRPC boundary**: All client-server communication goes through tRPC routers. No direct database access from client components.
- **REST boundary**: Only `/api/context/{contextId}/export` is exposed as REST. Authenticated via API key header.
- **AI provider boundary**: All LLM calls go through `server/ai/provider.ts` abstraction. No direct API calls from routers or services.

**Component Boundaries:**
- **Feature modules are independent**: Features import from `components/ui/` (shared) and `lib/` (shared) but never directly from other feature modules. Cross-feature communication goes through Zustand stores or the event bus.
- **Server/Client boundary**: Server components in `app/` pages load data via React Server Components. Interactive features use client components from `features/`.
- **View isolation**: Each view (Graph, Thread, Assembly, Search) is independently error-bounded. One view crashing doesn't affect others.

**Service Boundaries:**
- **Router → Service → Repository pattern**: tRPC routers call services for business logic. Services call Prisma for data access. Routers never contain business logic directly.
- **AI service isolation**: AI modules (`server/ai/`) are called from services but never from routers directly. AI results always go through the safety guard.
- **Event handlers**: Background processing triggered by events is decoupled from the request/response cycle.

**Data Boundaries:**
- **Prisma is the sole database accessor**: No raw SQL outside of Prisma (except for pgvector-specific queries which use `$queryRaw`).
- **JSONB access**: Perspective arrays and flexible metadata are accessed through Prisma JSON filters. Complex graph queries use recursive CTEs via `$queryRaw`.
- **Embedding boundary**: Vector operations (similarity search, embedding storage) use pgvector extension via Prisma raw queries.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**

| PRD Section | Feature Module | Server Router | Key Components |
|---|---|---|---|
| 4. Thought Unit | `features/units/` | `server/api/routers/unit.ts` | UnitCard, UnitEditor, UnitSplitter |
| 4. Perspective Layer | `features/perspectives/` | `server/api/routers/perspective.ts` | PerspectiveSelector, PerspectiveEditor |
| 5. Resource Unit | `features/units/` (shared) | `server/api/routers/unit.ts` | UnitCard (resource variant) |
| 7. Context | `features/contexts/` | `server/api/routers/context.ts` | ContextDashboard, ContextHierarchy |
| 8. Relations | `features/relations/` | `server/api/routers/relation.ts` | RelationCreator, RelationList |
| 9-10. AI Interaction | `features/ai/` | `server/api/routers/ai.ts` | AIDecompositionPanel, AISafetyIndicator |
| 12. Amplification | `features/ai/` | `server/ai/` | CompletenessCompass |
| 14. Navigator | `features/navigator/` | `server/api/routers/navigator.ts` | NavigatorView, NavigatorBuilder |
| 15. Search | `features/search/` | `server/api/routers/search.ts` | SearchView, SearchFilters |
| 16. Graph View | `features/graph/` | (uses relation router) | GraphGlobalView, GraphLocalView |
| 16. Thread View | `features/thread/` | (uses unit router) | ThreadView |
| 17. Assembly | `features/assembly/` | `server/api/routers/assembly.ts` | AssemblyEditor, ExportDialog |
| 19. Projects | `features/projects/` | `server/api/routers/project.ts` | ProjectList, DriftDetectionAlert |
| 20. Domain Templates | `features/templates/` | `server/api/routers/template.ts` | TemplateSelector, TemplateEditor |
| 21. Completeness Compass | `features/ai/` | `server/ai/compass.ts` | CompletenessCompass |

**Cross-Cutting Concerns Mapping:**

| Concern | Location | Implementation |
|---|---|---|
| Authentication | `server/auth.ts`, `server/api/middleware/auth.ts` | Auth.js config, tRPC middleware |
| AI Safety (Draft lifecycle) | `server/ai/safetyGuard.ts`, `features/ai/` | Safety checks in AI service, UI badges |
| Version History | `server/services/versionService.ts` | Auto-snapshot on unit mutation |
| ThoughtRank | `server/services/thoughtRankService.ts`, `server/jobs/` | Event-triggered recalculation |
| Navigation Purpose Weighting | `features/graph/hooks/useNavigationWeights.ts` | Client-side weight calculation |
| Event Bus | `server/events/eventBus.ts` | Decouples side effects |

### Integration Points

**Internal Communication:**
- Client → Server: tRPC procedures (queries, mutations, subscriptions)
- Server modules: Direct function calls (services call repositories) + event bus for side effects
- Views → Views: Zustand store subscriptions + client-side event bus for selection sync

**External Integrations:**
- **LLM Provider**: Anthropic Claude API (primary) / OpenAI (fallback) via `server/ai/provider.ts`
- **Embedding Model**: OpenAI text-embedding-3-small or Anthropic equivalent via `server/ai/embedder.ts`
- **Context Export API**: REST endpoint for external AI tools
- **OAuth Providers**: Google, GitHub via Auth.js
- **File Storage**: Vercel Blob for Resource Unit files
- **Background Jobs**: Trigger.dev for async AI processing

**Data Flow:**

```
User Input → Capture Engine (client)
  → tRPC mutation (unit.create)
    → unitService (validation, business rules)
      → Prisma (database write)
      → eventBus.emit("unit.created")
        → onUnitCreated handler
          → embeddingJob (generate vector)
          → thoughtRankJob (recalculate)
    ← Return Unit to client
  → tRPC subscription (unit.updated)
    → All views receive update via React Query invalidation
```

### Development Workflow Integration

**Development Server:**
- `pnpm dev` — Next.js dev server with Turbopack
- `pnpm db:push` — Push Prisma schema to dev database
- `pnpm db:studio` — Prisma Studio for database browsing
- `pnpm db:seed` — Seed development data

**Build Process:**
- `pnpm build` — Next.js production build
- `pnpm lint` — ESLint check
- `pnpm typecheck` — TypeScript compilation check
- `pnpm test` — Vitest unit tests
- `pnpm test:e2e` — Playwright E2E tests

**Deployment:**
- Push to `main` → GitHub Actions CI → Vercel auto-deploy
- Database migrations run via `prisma migrate deploy` in Vercel build step
- Preview deployments on PR branches with isolated preview databases

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
All technology choices are verified compatible:
- Next.js App Router + tRPC v11 + Prisma 6.x: Native T3 stack integration, tested and maintained together
- PostgreSQL 16 + pgvector: pgvector is a first-class PostgreSQL extension, fully compatible
- Zustand 5.x + TanStack Query (via tRPC): Complementary — Zustand for client state, TanStack Query for server state. No overlap or conflict.
- Auth.js v5 + Next.js App Router: Native integration, designed for App Router
- D3.js + React: Well-established pattern with custom wrapper approach (no conflicting DOM manipulation)
- Tiptap 3.x + React: First-class React support via `@tiptap/react`
- dnd-kit + React: Built specifically for React, no conflicts with other libraries
- Trigger.dev + Vercel: Compatible serverless background jobs platform

No contradictory decisions found.

**Pattern Consistency:**
- Naming conventions are consistent: `snake_case` in database, `camelCase` in TypeScript/API, `PascalCase` for components/types
- Feature-based organization consistently applied across all 12 feature modules
- Router → Service → Repository layering consistently defined for all server modules
- Event bus pattern consistently applied for all cross-cutting side effects
- Error handling pattern (TRPCError) consistently specified for all server operations

**Structure Alignment:**
- Project structure directly supports all architectural decisions
- Feature modules map 1:1 to PRD functional areas
- Server directory structure supports the Router → Service pattern
- Test organization (co-located + E2E) aligns with Vitest + Playwright choices
- App Router structure supports parallel routes for multi-view layouts

### Requirements Coverage Validation

**Functional Requirements Coverage:**

| PRD Feature | Architectural Support | Status |
|---|---|---|
| Thought Unit (CRUD, split, merge, version) | `features/units/` + `server/api/routers/unit.ts` + `server/services/unitService.ts` + `unit_versions` table | Covered |
| Resource Unit | Shared with units feature + Vercel Blob storage | Covered |
| Perspective Layer | `features/perspectives/` + `unit_perspectives` table + per-context queries | Covered |
| Relations & Graph | `features/relations/` + `relations` table + recursive CTE + `custom_relation_types` | Covered |
| Context system | `features/contexts/` + `contexts` table with hierarchy + snapshot JSONB | Covered |
| AI Decomposition | `features/ai/` + `server/ai/decomposer.ts` + background jobs | Covered |
| AI Safety (Draft lifecycle) | `server/ai/safetyGuard.ts` + `lifecycle` column + UI badges | Covered |
| Navigation system | `features/navigator/` + `navigators` table + purpose-based weights | Covered |
| 4-layer Search | `features/search/` + `server/services/searchService.ts` + pgvector + text index | Covered |
| Graph View (2-layer) | `features/graph/` + D3.js Canvas (global) + Card array (local) | Covered |
| Thread View | `features/thread/` + vertical card stack + branch indicators | Covered |
| Assembly & Export | `features/assembly/` + `assemblies`/`assembly_items` tables + bridge text | Covered |
| Domain Templates | `features/templates/` + `domain_templates` table + defaults/ configs | Covered |
| Completeness Compass | `features/ai/` + `server/ai/compass.ts` | Covered |
| Context Export API | `app/api/context/[contextId]/export/route.ts` + REST with API key auth | Covered |
| Projects & Drift Detection | `features/projects/` + `drift_score` in units meta + `driftDetectionJob.ts` | Covered |
| Execution Layer (Action Units) | Unit type "action" + `action_status`/`linked_task` in meta JSONB | Covered |
| Incubation Queue | `incubating` flag in unit status + periodic surfacing job | Covered |
| ThoughtRank | `server/services/thoughtRankService.ts` + `server/jobs/thoughtRankJob.ts` | Covered |

**Non-Functional Requirements Coverage:**

| NFR | Architectural Support | Status |
|---|---|---|
| Real-time view sync | tRPC subscriptions via WebSocket + React Query invalidation | Covered |
| Graph performance (1000+ nodes) | Canvas rendering for Global View + virtual scrolling | Covered |
| Semantic search | pgvector extension + embedding generation pipeline | Covered |
| Version history / Non-loss | `unit_versions` table + auto-snapshot on mutation via event bus | Covered |
| AI generation limits | `server/ai/safetyGuard.ts` + rate limiting middleware | Covered |
| Data integrity (split/merge) | Transactional operations in unitService + relation re-attribution | Covered |
| Scalability path | PostgreSQL CTE → Neo4j, in-memory → Redis, Trigger.dev → BullMQ | Covered |
| Error resilience | Per-view error boundaries + global error boundary + Sentry | Covered |
| Security | Auth.js + CSRF + CSP + input sanitization + API key for export | Covered |

### Implementation Readiness Validation

**Decision Completeness:**
- All critical decisions documented with specific technology versions
- 28 conflict points identified with explicit resolution patterns
- Concrete code examples provided for all major patterns (tRPC procedures, Zustand stores, error handling, event bus)
- Database schema fully specified with all tables, columns, types, and constraints

**Structure Completeness:**
- 150+ files and directories explicitly defined in the project tree
- All feature modules have complete internal structure (components, hooks, types, schemas)
- Server modules fully specified (routers, services, AI modules, events, jobs)
- Test infrastructure defined (co-located unit tests, integration tests, E2E tests)

**Pattern Completeness:**
- Naming conventions cover: database, API, code (components, hooks, utils, types, constants, events)
- Format patterns cover: API responses, errors, dates, JSON field naming
- Communication patterns cover: event bus, state management, view synchronization
- Process patterns cover: error handling, loading states, AI pipeline, validation

### Gap Analysis Results

**No Critical Gaps** — All implementation-blocking decisions are made.

**Important Gaps (addressable during implementation):**
1. **Keyboard shortcuts mapping** — PRD flags this as a product gap. Architecture supports it via `useKeyboardShortcuts.ts` hook, but specific shortcut bindings are a UX decision.
2. **Mobile capture** — PRD flags as gap. Current architecture is web-first. Mobile would require React Native or PWA extension.
3. **Notification policy** — PRD flags as gap. Architecture supports it via event bus + background jobs, but timing/channel decisions are product decisions.
4. **Import from other tools** — PRD flags as gap. Architecture supports it via unit creation APIs, but parser implementations for Obsidian/Notion/Roam are future work.
5. **Full export/backup** — Architecture supports via export service, but format specification (JSON/Markdown bundle) is a product decision.

**Nice-to-Have Gaps:**
- Detailed Typesense/Elasticsearch configuration for Scale Phase 3
- Neo4j migration strategy details
- Redis caching patterns for Scale Phase 2
- Performance benchmarks and targets for graph rendering

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (HIGH — 15-20 modules)
- [x] Technical constraints identified (PostgreSQL + pgvector, AI pipeline, graph rendering)
- [x] Cross-cutting concerns mapped (7 concerns identified)

**Architectural Decisions**

- [x] Critical decisions documented with versions (10 critical + important decisions)
- [x] Technology stack fully specified (T3 + PostgreSQL + pgvector + D3.js + Tiptap + dnd-kit)
- [x] Integration patterns defined (tRPC internal, REST external, event bus side effects)
- [x] Performance considerations addressed (Canvas rendering, virtual scrolling, caching, background jobs)

**Implementation Patterns**

- [x] Naming conventions established (database, API, code — 15+ categories)
- [x] Structure patterns defined (feature-based modules, server layering)
- [x] Communication patterns specified (event bus, Zustand stores, view sync)
- [x] Process patterns documented (error handling, loading states, AI pipeline, validation)

**Project Structure**

- [x] Complete directory structure defined (150+ files)
- [x] Component boundaries established (feature isolation, server/client, API)
- [x] Integration points mapped (internal + 6 external integrations)
- [x] Requirements to structure mapping complete (16 PRD sections → feature modules)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH — based on comprehensive validation across all dimensions

**Key Strengths:**
1. End-to-end type safety from database to UI via Prisma + tRPC + Zod
2. Feature-based organization maps directly to PRD sections — clear implementation boundaries
3. Perspective Layer design (separate table with context-specific interpretation) cleanly supports the PRD's core innovation
4. Event-driven side effects decouple cross-cutting concerns without microservice complexity
5. Clear scaling path from MVP (PostgreSQL-only monolith) to scale (Redis + Typesense + Neo4j)
6. AI pipeline isolation with safety guards matches PRD's Draft/Pending/Confirmed lifecycle exactly

**Areas for Future Enhancement:**
- Graph query optimization as data grows (recursive CTE → Neo4j migration)
- Search infrastructure scaling (PostgreSQL text search → Typesense/Elasticsearch)
- Real-time collaboration if multi-user is added post-MVP
- Mobile capture interface (PWA or React Native)
- Performance profiling and optimization for large graph rendering

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries — place files in correct feature modules
- Refer to this document for all architectural questions
- Never create relations from Draft lifecycle Units
- Always emit events for cross-cutting side effects
- Use TRPCError for all server-side errors

**First Implementation Priority:**

```bash
pnpm create t3-app@latest flowmind --CI --tailwind --trpc --prisma --appRouter --dbProvider postgresql
```

Then: Prisma schema → Auth.js → Unit CRUD → Perspective Layer → Relations → AI pipeline
