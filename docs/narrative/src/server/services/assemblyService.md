# Assembly Service

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/services/assemblyService.ts`
> **Status**: Active

---

## Context & Purpose

The Assembly Service manages **ordered collections of Units** that form coherent documents or arguments. Think of Units as individual thought atoms (claims, questions, evidence) and Assemblies as the finished molecules - structured compositions where sequence matters.

**Business Need**: Users capture thoughts as discrete Units, but ultimately need to synthesize them into structured outputs like essays, arguments, or reports. Assemblies bridge the gap between atomic capture and coherent output, preserving the order and transitions between thoughts.

**When Used**:
- When a user creates a new document/argument from selected Units
- When composing an output for export (essay, report, presentation)
- When organizing Units into a specific narrative sequence
- When using templates that pre-define slot positions for content

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `@prisma/client`: PrismaClient, Assembly, AssemblyItem, Unit types - Database access layer
- `@trpc/server`: TRPCError - Standardized error handling for API responses

**Database Models Accessed:**
- `db.project`: Ownership verification before any assembly operation
- `db.assembly`: Core CRUD operations on assembly records
- `db.assemblyItem`: Junction table linking Units to Assemblies with position/bridge data
- `db.unit`: Lifecycle validation (rejects draft units from assemblies)

### Dependents (What Needs This)

**Currently Pending Integration:**
- Future `src/server/api/routers/assembly.ts`: Will expose tRPC procedures for assembly operations
- Future `src/components/assembly/AssemblyView.tsx`: Will render assembly composition UI

**Architecture Reference:**
- Listed in `_bmad-output/planning-artifacts/architecture.md` as part of "Assembly & Output" system layer

### Data Flow

```
User selects Units for composition
    |
    v
[Create Assembly] --> db.project (verify ownership)
                  --> db.assembly.create (persist assembly)
    |
    v
[Add Units] --> db.assembly (verify ownership)
            --> db.unit (verify exists + not draft)
            --> db.assemblyItem (check for duplicates)
            --> Position calculation (auto-increment or insert-shift)
            --> db.assemblyItem.create (persist link)
    |
    v
[Reorder/Bridge] --> db.$transaction (atomic position updates)
                 --> db.assemblyItem.update (bridge text)
    |
    v
[Export/Render] --> db.assembly with items + units (ordered fetch)
```

---

## Macroscale: System Integration

### Architectural Layer

This service sits in the **Application Services Layer** of the Flowmind architecture:

```
Layer 1: Client (AssemblyView, export dialogs)
          |
Layer 2: tRPC Router (assembly.ts - pending)
          |
Layer 3: *** This Service (assemblyService.ts) *** <-- You are here
          |
Layer 4: Prisma ORM (Assembly, AssemblyItem models)
          |
Layer 5: PostgreSQL (assemblies, assembly_items tables)
```

### Big Picture Impact

The Assembly Service is the **output composition engine** of Flowmind. While Units represent raw thoughts and Relations capture connections, Assemblies are how users actually produce deliverables:

**Enables:**
- Document export (essays, reports, arguments)
- Thread View composition (navigating through ordered thoughts)
- Template-based scaffolding (pre-defined slots for evidence, claims, etc.)
- Bridge text generation (connective tissue between Units)
- Export history tracking (via sourceMap)

**Part of the "Assembly & Output" System (Architecture Layer 8):**
> "Ordered Unit references for document composition, Assembly Templates, Bridge Text generation, format-specific conversion rules, partial export, export history."

### Critical Path Analysis

**Importance Level**: Medium-High

- **If this fails**: Users can view and connect Units but cannot compose them into structured outputs. Export functionality breaks. Template-based workflows become impossible.
- **Failure mode**: Units remain as isolated atoms - users would need to manually copy/paste content in order outside the app.
- **Backup**: None currently - this is the only composition mechanism in the system.

---

## Technical Concepts (Plain English)

### Factory Pattern (`createAssemblyService`)

**Technical**: A function that returns an object containing methods, accepting a database client as a dependency injection parameter.

**Plain English**: Like a blueprint factory - you give it a database connection, and it builds you a fully-functional service object with all the assembly operations ready to use. This makes testing easier because you can pass in a mock database.

**Why We Use It**: Allows the service to be instantiated with different database clients (real Prisma in production, mock in tests) without changing any code inside the service.

### Position-Based Ordering

**Technical**: Each AssemblyItem has a `position: Int` field that determines sequence. Insert operations shift existing items with `updateMany({ position: { gte: n } }, { increment: 1 })`.

**Plain English**: Like numbered parking spots - when you insert a car in spot 3, all cars from spot 3 onward move up one spot. When you remove a car, the others shift down to close the gap.

**Why We Use It**: Maintains stable, conflict-free ordering even when multiple items are added, removed, or rearranged. The atomic shift operations prevent position collisions.

### Draft Lifecycle Gate

**Technical**: The `addUnit` method checks `unit.lifecycle === 'draft'` and throws `BAD_REQUEST` if true.

**Plain English**: Like requiring a document to be "finalized" before it can be included in an official report. Draft thoughts are works-in-progress that shouldn't pollute finished compositions.

**Why We Use It**: Ensures Assemblies only contain confirmed, quality-checked Units. Drafts might be incomplete, incorrect, or abandoned - they need explicit user confirmation before becoming part of structured output.

### Bridge Text

**Technical**: A `bridgeText: String?` field on AssemblyItem that stores connective text between Units in the sequence.

**Plain English**: The transitional phrases between paragraphs - "Furthermore...", "However, this raises the question...", "Building on this evidence...". Not part of the Unit itself, but the glue that makes the assembly read as coherent prose.

**Why We Use It**: Units are context-independent atoms. Bridge text is context-dependent - it only makes sense in the specific sequence of a particular assembly. Storing it on the junction table keeps Units reusable across multiple assemblies.

### Template Slots

**Technical**: `createFromTemplate` creates AssemblyItems with `unitId: null` and `bridgeText: '[slotName]'` as placeholder positions.

**Plain English**: Like a form template with blank fields - "Introduction: ____", "Main Argument: ____", "Supporting Evidence: ____". Users fill in the blanks with actual Units.

**Why We Use It**: Domain templates (argument essays, research reports) have conventional structures. Pre-creating slots guides users toward complete, well-structured outputs and enables gap detection ("You haven't filled the Counterargument slot yet").

### Ownership Verification Pattern

**Technical**: Every operation first queries with `project: { userId }` or `{ id, project: { userId } }` to ensure the requesting user owns the project containing the assembly.

**Plain English**: Like checking someone's building pass before letting them access a specific floor. Even if you know the room number (assembly ID), you need permission to be in that building (project ownership).

**Why We Use It**: Multi-tenant security. Prevents users from accessing or modifying assemblies belonging to other users, even if they somehow know the assembly ID.

---

## Change History

### 2026-03-19 - Initial Documentation

- **What Changed**: Created narrative documentation for assemblyService.ts
- **Why**: Part of Shadow Map documentation initiative
- **Impact**: Enables faster onboarding and system understanding for contributors
