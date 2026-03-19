# Assembly Router

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/api/routers/assembly.ts`
> **Status**: Active

---

## Context & Purpose

The Assembly Router provides the API layer for managing **Assemblies** -- ordered collections of Units that represent a composed argument, narrative, or structured document. Think of an Assembly as a playlist of thoughts: individual Units (ideas, claims, evidence) can exist independently, but an Assembly arranges them into a meaningful sequence with optional "bridge text" that explains transitions between pieces.

**Business Need**: Users need a way to compose their fragmented thoughts (Units) into coherent, linear outputs. While the knowledge graph structure in FlowMind allows non-linear exploration, real-world outputs (essays, presentations, reports) require linear organization. Assemblies provide this publishing-ready structure without destroying the underlying graph relationships.

**When Used**:
- When a user creates a new document/argument composition from the UI
- When adding, removing, or reordering Units within a composition
- When inserting transition text ("bridge text") between Units to create narrative flow
- When creating templated structures (e.g., "thesis-evidence-conclusion" patterns) with pre-defined slots

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/server/api/trpc.ts`: createTRPCRouter(), protectedProcedure
  - Provides the router factory and authentication middleware (ensures only logged-in users can access these endpoints)

- `src/server/services/assemblyService.ts`: createAssemblyService()
  - Contains all database operations; the router delegates business logic here, keeping the router thin

- `zod`: z (schema validation library)
  - Validates all incoming request payloads before they reach business logic

- `@trpc/server`: TRPCError
  - Standardized error responses (NOT_FOUND, BAD_REQUEST, CONFLICT)

### Dependents (What Needs This)

- `src/server/api/root.ts`: Registers this router under `api.assembly.*` namespace
  - Makes all assembly procedures available to the frontend via tRPC client

- Frontend components (to be implemented):
  - Assembly composer/editor views
  - Document export features
  - Template-based document creation wizards

### Data Flow

```
Client Request (e.g., addUnit)
    |
    v
[Zod Schema Validation] -- validates assemblyId, unitId, position
    |
    v
[protectedProcedure] -- checks authentication, injects ctx.session.user.id
    |
    v
[assemblyRouter.addUnit] -- thin orchestration layer
    |
    v
[assemblyService.addUnit] -- business logic:
    |   - Verify assembly ownership
    |   - Verify unit exists and lifecycle != 'draft'
    |   - Check for duplicates
    |   - Calculate position
    |   - Shift existing items if needed
    |
    v
[Prisma/Database] -- INSERT into assembly_items
    |
    v
Response to Client
```

---

## Macroscale: System Integration

### Architectural Layer

This router sits in the **API Layer** of FlowMind's three-tier architecture:

- **Layer 1**: Client (React components, tRPC hooks)
- **Layer 2 (This Module)**: API Router (request handling, validation, authorization)
- **Layer 3**: Services + Database (business logic, Prisma, PostgreSQL)

Within the API layer, the Assembly Router is one of 17 domain-specific routers aggregated by `root.ts` into the unified `appRouter`.

### Big Picture Impact

Assemblies represent FlowMind's **output/publishing capability**. While the core value proposition is capturing and connecting thoughts (Units, Relations, Contexts), the real utility comes from being able to transform that knowledge into deliverables. This router enables:

1. **Document Composition**: Turning scattered ideas into structured arguments
2. **Reusability**: The same Unit can appear in multiple Assemblies (a claim might support different arguments)
3. **Draft Protection**: Units must be "confirmed" before assembly (prevents publishing half-formed thoughts)
4. **Template-Based Workflows**: Pre-defined structures (MECE analysis, thesis papers) guide users toward complete arguments

### Critical Path Analysis

**Importance Level**: Medium-High

- **If this fails**: Users cannot compose their thoughts into outputs. The knowledge stays fragmented in the graph with no way to linearize it for external use.
- **Failure mode**: Core capture and linking features continue to work; only composition/export is blocked.
- **Backup**: Users could manually copy-paste Unit content in order, but lose bridge text, ordering persistence, and template support.

### Relationship to Other Routers

| Router | Relationship to Assembly |
|--------|-------------------------|
| `unitRouter` | Units are the building blocks placed into Assemblies |
| `projectRouter` | Every Assembly belongs to exactly one Project |
| `captureRouter` | Quick captures eventually become Units that feed Assemblies |
| `contextRouter` | Contexts group Units conceptually; Assemblies order them linearly |

---

## Technical Concepts (Plain English)

### tRPC Protected Procedure

**Technical**: A procedure wrapper that validates the user session JWT, rejects unauthenticated requests with 401, and injects `ctx.session.user` into the handler context.

**Plain English**: Like a bouncer at a club entrance who checks your ID before letting you in. Every assembly operation requires proof that you are logged in.

**Why We Use It**: Assemblies contain user content. Without authentication, anyone could read or modify another user's documents.

### Zod Schema Validation

**Technical**: Declarative runtime type validation using Zod schemas. Input is parsed against the schema before the procedure handler runs; invalid input triggers a BAD_REQUEST error.

**Plain English**: Like a form that refuses to submit if you entered an email in the phone number field. The schemas define exactly what shape of data is acceptable, and reject anything else.

**Why We Use It**: Prevents malformed or malicious data from reaching business logic. Guarantees that if code runs, the input has the expected structure.

### Bridge Text

**Technical**: Optional string field on `AssemblyItem` that stores transitional content between Units, up to 5000 characters.

**Plain English**: The "glue" sentences between paragraphs. When you arrange Units in an Assembly, bridge text explains how one idea flows into the next -- like "Building on this evidence..." or "A counterpoint to consider...".

**Why We Use It**: Units are standalone thoughts. Bridge text transforms a list of units into a cohesive narrative without modifying the original Units.

### Template Slots

**Technical**: Pre-defined named positions in an Assembly created via `createFromTemplate`, represented as AssemblyItems with `unitId: null` and descriptive `bridgeText` like `[Thesis]` or `[Evidence 1]`.

**Plain English**: Like a fill-in-the-blank form. A template creates empty slots ("Put your thesis here", "Insert evidence here"), and users fill them with Units later.

**Why We Use It**: Guides users toward complete arguments. A "5-paragraph essay" template ensures they have an intro, three body paragraphs, and conclusion before calling the document complete.

### Lifecycle Gate (Draft Rejection)

**Technical**: The `addUnit` procedure rejects any Unit where `unit.lifecycle === 'draft'` with a BAD_REQUEST error.

**Plain English**: Like a manuscript editor who refuses to include chapters marked "rough draft" in the final book. You must confirm a thought before it can be assembled into a publishable document.

**Why We Use It**: Prevents accidental publication of half-formed thoughts. Forces users to consciously promote content from "draft" to "confirmed" before it can appear in outputs.

---

## Change History

### 2026-03-19 - Initial Documentation
- **What Changed**: Created narrative documentation for the assembly router
- **Why**: Establish Shadow Map coverage for the composition/assembly feature
- **Impact**: Enables onboarding and maintenance clarity for this feature area
