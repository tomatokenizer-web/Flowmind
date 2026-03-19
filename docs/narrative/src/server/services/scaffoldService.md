# Scaffold Service

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/services/scaffoldService.ts`
> **Status**: Active

---

## Context & Purpose

The Scaffold Service creates **guided starting points** for new projects based on domain templates. When a user creates a project and selects a template (like "Software Design" or "Academic Research"), this service generates a set of pre-populated draft Units that ask the foundational questions for that domain.

**Business Need**: Starting a new project from a blank slate is intimidating. Users often don't know what questions to ask themselves first. Scaffold units provide domain-specific prompts - "What is the core problem this software solves?" or "What is your primary research question?" - that guide users through the essential groundwork before diving into details.

**Plain English**: Think of scaffolding in construction - temporary support structures that help you build something properly. These scaffold units are the intellectual equivalent: temporary prompts that guide you through establishing your project's foundation before you start adding your own thoughts.

**When Used**:
- When a user creates a new project with a selected domain template
- Automatically triggered during the `project.create` tRPC procedure
- Each template defines its own scaffold questions in configuration JSON

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `@prisma/client`: PrismaClient, UnitType, Lifecycle, OriginType - Database access and enum types
- Template configuration: The `scaffoldQuestions` array from DomainTemplate.config JSON field

**Database Models Accessed:**
- `db.context`: Creates/retrieves the "Main" context as a home for scaffold units
- `db.unit`: Creates draft units with scaffold metadata
- `db.unitContext`: Links scaffold units to the Main context

### Dependents (What Needs This)

- `src/server/api/routers/project.ts`: Calls `createScaffoldUnits()` during project creation when a template is selected
- `src/server/api/routers/project.ts`: The `getProjectGaps` procedure duplicates the gap detection logic (checks scaffold unit completion)

### Data Flow

```
User creates project with template
    |
    v
[project.create procedure] --> db.domainTemplate.findUnique (get config)
    |
    v
[createScaffoldUnits called] --> db.context.findFirst("Main")
                             --> db.context.create (if not exists)
    |
    v
For each scaffoldQuestion in config:
    |
    v
[mapToUnitType] --> Convert domain type ("thesis", "signal") to UnitType enum ("claim", "evidence")
    |
    v
[db.unit.create] --> lifecycle: "draft", originType: "ai_generated"
                 --> meta: { scaffold: true, scaffoldQuestion: "...", placeholder: ... }
    |
    v
[db.unitContext.create] --> Link unit to Main context
    |
    v
Return array of created unit IDs
```

---

## Macroscale: System Integration

### Architectural Layer

This service sits in the **Application Services Layer**, bridging template configuration with unit creation:

```
Layer 1: Client (Project creation modal)
          |
Layer 2: tRPC Router (project.ts - create procedure)
          |
Layer 3: *** This Service (scaffoldService.ts) *** <-- You are here
          |
Layer 4: Prisma ORM (Context, Unit, UnitContext models)
          |
Layer 5: PostgreSQL (contexts, units, unit_contexts tables)
```

### Big Picture Impact

The Scaffold Service is the **onboarding accelerator** of Flowmind. It transforms domain expertise (codified in templates) into actionable starting points for users:

**Enables:**
- Template-driven project bootstrapping (users get immediate guidance)
- Domain-specific vocabulary (templates use "thesis", "hypothesis", "signal" - mapped to core types)
- Gap detection (track which foundational questions remain unanswered)
- Progressive disclosure (users see 5-6 key questions, not overwhelming blank canvas)

**Part of the "Domain Template" System:**
> Templates define scaffoldQuestions in their config JSON. Each question specifies a type (domain-specific like "hypothesis") and content (the actual prompt). The scaffold service materializes these into actual database units.

**Relationship to Gap Detection:**
The `detectGaps` function checks scaffold unit completion by:
1. Finding all units marked with `meta.scaffold: true`
2. Matching them to original scaffoldQuestions via `meta.scaffoldQuestion`
3. Checking if `lifecycle === "confirmed"` (user has answered and confirmed)
4. Returning completeness percentage and list of unanswered questions

This feeds into project health indicators - "You've completed 3 of 6 scaffold questions."

### Critical Path Analysis

**Importance Level**: Medium

- **If this fails**: Projects created with templates will have no scaffold units. Users get a blank project instead of guided prompts. Not catastrophic, but defeats the purpose of templates.
- **Failure mode**: Users must manually create their foundational units without domain-specific guidance.
- **Backup**: Users can still add units manually. The system works without scaffolds - they're purely a UX enhancement.

---

## Technical Concepts (Plain English)

### Domain Type Mapping (`mapToUnitType`)

**Technical**: A function that translates domain-specific type strings from template configuration to Prisma's `UnitType` enum values using a static lookup table.

**Plain English**: Different fields use different vocabulary. Academics say "hypothesis", investors say "signal", writers say "thesis" - but they're all variations of a "claim" in Flowmind's universal language. This function is the translator.

**Why We Use It**: Templates can use natural vocabulary for their domain without bloating the core type system. The mapping maintains semantic richness in templates while keeping the database schema simple.

**Mapping Examples:**
| Domain Term | Core Type | Domain |
|-------------|-----------|--------|
| thesis | claim | Nonfiction Writing |
| hypothesis | claim | Academic Research |
| signal | evidence | Investment Decision |
| risk | counterargument | Investment Decision |
| methodology | definition | Academic Research |
| entity | claim | Software Design |
| constraint | claim | Software Design |

### Scaffold Metadata Pattern

**Technical**: Units created by this service include `meta: { scaffold: true, scaffoldQuestion: "...", placeholder: boolean }` JSON fields that mark them as scaffold-generated and link back to the original question.

**Plain English**: Like putting a sticky note on something that says "This came from the template - remember to replace me!" The metadata is a permanent record that this unit is a scaffold prompt, not user-created content.

**Why We Use It**: Enables gap detection - the system can query for all `meta.scaffold = true` units and check their completion status. Also useful for UI highlighting (showing scaffold prompts differently than user units).

### Placeholder Flag

**Technical**: A boolean in `scaffoldQuestion` config and `unit.meta` that distinguishes prompts meant to be replaced vs. answered.

**Plain English**: Some scaffold questions are instructions ("Core entities of the system" - placeholder) while others are actual questions to answer ("What is the core problem?" - not placeholder). Placeholders say "replace me entirely" while questions say "answer me".

**Why We Use It**: Affects how the UI presents scaffold units and how gap detection evaluates completion. A placeholder needs replacement content; a question needs a confirmed answer.

### Main Context Creation

**Technical**: The service ensures a root-level `Context` named "Main" exists before attaching scaffold units, creating it if necessary.

**Plain English**: Every project needs a home folder for its units. The "Main" context is that default folder - created automatically so scaffold units have somewhere to live immediately.

**Why We Use It**: Units must belong to at least one Context for organization and filtering. Rather than leaving scaffold units homeless, we give them a sensible default location.

### Lifecycle: Draft

**Technical**: All scaffold units are created with `lifecycle: "draft"` and `originType: "ai_generated"`.

**Plain English**: Scaffold units are clearly marked as "not yet confirmed by you" and "came from the template, not from you". This is honest labeling - the user knows these are prompts to address, not their own confirmed thoughts.

**Why We Use It**: The draft lifecycle integrates with Flowmind's confirmation flow. Users must explicitly confirm scaffold units (converting them to "confirmed") before they can be included in Assemblies. This ensures intentionality.

---

## Change History

### 2026-03-19 - Initial Documentation

- **What Changed**: Created narrative documentation for scaffoldService.ts
- **Why**: Part of Shadow Map documentation initiative
- **Impact**: Enables faster onboarding and system understanding for contributors
