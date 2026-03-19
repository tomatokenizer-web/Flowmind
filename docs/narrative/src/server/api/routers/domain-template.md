# Domain Template Router (tRPC Domain Template Operations)

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/api/routers/domain-template.ts`
> **Status**: Active

---

## Context & Purpose

This module provides the API gateway for retrieving domain templates -- predefined blueprints that guide users through structured thinking for specific knowledge domains. When a user creates a new project in FlowMind, they can choose a domain template that pre-configures the project with appropriate unit types, relation types, scaffold questions, gap detection rules, and recommended navigation sequences.

**Business Need**: Different thinking tasks require different cognitive structures. Writing a software design document demands entities, constraints, and interfaces. Academic research needs hypotheses, methodology, and findings. Investment analysis calls for signals, risks, and assumptions. Rather than forcing users to configure these from scratch, domain templates provide "expert scaffolding" (pre-built structures that guide thinking the way a mentor would guide a novice). This router makes those templates accessible so the project creation flow can offer meaningful choices.

**When Used**:
- **list**: Called during project creation to populate a dropdown or card grid showing available templates (Software Design, Nonfiction Writing, Investment Decision, Academic Research)
- **getById**: Called when a project is loaded to retrieve its associated template configuration for gap detection, recommended navigation, or assembly type suggestions
- **getBySlug**: Called when deep-linking to a template or when the system needs to look up a template by its URL-friendly identifier rather than database UUID

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/server/api/trpc.ts`: `createTRPCRouter` and `protectedProcedure` -- provides tRPC infrastructure and **authentication middleware** (a security checkpoint ensuring only logged-in users can browse templates)
- `@prisma/client` (via `ctx.db`): The Prisma database client providing access to the `domainTemplate` table where templates are stored as JSON configurations
- `prisma/seed.ts`: Contains the seed data defining the four system templates with their `unitTypes`, `relationTypes`, `scaffoldQuestions`, `gapDetectionRules`, `recommendedNavOrder`, and `assemblyTypes`

### Dependents (What Needs This)
- `src/server/api/root.ts`: Registers this router under the `domainTemplate` namespace, making endpoints accessible as `api.domainTemplate.list`, `api.domainTemplate.getById`, and `api.domainTemplate.getBySlug`
- `src/server/api/routers/project.ts`: The project router uses `templateId` when creating projects, and includes the template relation to access `scaffoldQuestions` for creating scaffold units via `createScaffoldUnits()`
- Frontend components (planned): Project creation dialog will call `list` to display template options; project settings and dashboard views will use `getById` to show template-derived configuration

### Data Flow

**list Query**:
```
Client requests available templates
  --> protectedProcedure verifies authentication
    --> Prisma queries domainTemplate table (ordered by name)
      --> Returns array of { id, name, slug, type, config }
```

**getById Query**:
```
Client sends template UUID
  --> protectedProcedure verifies authentication
    --> Input validator ensures id is a string
      --> Prisma queries domainTemplate by unique id
        --> Returns template object or throws "Template not found"
```

**getBySlug Query**:
```
Client sends URL-friendly slug (e.g., "software-design")
  --> protectedProcedure verifies authentication
    --> Input validator ensures slug is a string
      --> Prisma queries domainTemplate by unique slug
        --> Returns template object or throws "Template not found"
```

---

## Macroscale: System Integration

### Architectural Layer
This sits in the **API Layer** of FlowMind's architecture:
- **Layer 1**: Client components (project creation dialog, template selection UI)
- **Layer 2**: This router (retrieves template configurations, validates requests) <-- You are here
- **Layer 3**: Database (domain_templates table holding JSON configurations)

### Big Picture Impact
FlowMind's vision is to help users think more clearly by providing structure. Domain templates are the **pre-built thinking frameworks** that make this accessible. This router is the conduit through which those frameworks flow from the database to the user experience.

The four built-in templates address distinct knowledge domains:

1. **Software Design**: Entities, behaviors, constraints, interfaces. Scaffold questions like "What is the core problem this software solves?" and gap rules like "Every Behavior must have a corresponding Interface" guide systematic software specification.

2. **Nonfiction Writing**: Thesis, evidence, counterarguments. Guides authors through argument construction with rules like "Every Thesis must have at least one supporting Evidence."

3. **Investment Decision**: Signals, risks, assumptions, thesis. Structures investment analysis with accountability: "Every Assumption must be explicitly stated."

4. **Academic Research**: Hypotheses, methodology, findings, limitations. Enforces research rigor: "Every Finding must link to supporting Evidence."

**Without this module**:
- Project creation would lack template selection, forcing users to start from a blank slate
- Gap detection features would have no rules to check against
- Scaffold questions could not be auto-generated for new projects
- Assembly type suggestions would not know the domain context
- The "guided thinking" value proposition would collapse into generic note-taking

### Critical Path Analysis
**Importance Level**: Medium

This router is essential for the **project creation flow with templates** but not for basic functionality. If it fails:
- **list failure**: Project creation dialog cannot show template options -- users could still create "template-less" projects
- **getById/getBySlug failure**: Projects linked to templates would not load their configuration, breaking gap detection and scaffold features for those projects

The templates themselves are seeded at database initialization via `prisma db seed`, so the data source is stable. Runtime failures would most likely be authentication or database connectivity issues affecting all routes equally.

---

## Technical Concepts (Plain English)

### Domain Template
**Technical**: A database record containing a JSON `config` field with arrays of `unitTypes`, `relationTypes`, `scaffoldQuestions`, `gapDetectionRules`, `recommendedNavOrder`, and `assemblyTypes`.
**Plain English**: A blueprint for a thinking project. Like how a building architect provides blueprints that define rooms, walls, and electrical layouts, a domain template defines what types of thoughts you will capture, how they can connect, and what questions you should answer first.
**Why We Use It**: Starting a complex thinking task from scratch is overwhelming. Templates provide expert-designed starting points that guide users toward completeness.

### Scaffold Questions
**Technical**: An array within `config.scaffoldQuestions` where each entry has a `type` (unit type to create) and `content` (the question text), optionally with `placeholder: true` for placeholder units.
**Plain English**: The first questions a mentor would ask you when starting a project. "What is the core problem?" "Who are the users?" These become actual units in your project, waiting to be answered.
**Why We Use It**: Blank pages are intimidating. Scaffold questions give users somewhere to start and ensure critical thinking foundations are not skipped.

### Gap Detection Rules
**Technical**: An array of human-readable strings in `config.gapDetectionRules` describing constraints that should hold between unit types in a complete project.
**Plain English**: Quality checks for your thinking. Rules like "Every Thesis must have at least one supporting Evidence" help catch incomplete arguments before you finalize your work.
**Why We Use It**: It is easy to miss gaps in your own reasoning. These rules serve as an automated peer reviewer, flagging structural weaknesses.

### Slug
**Technical**: A URL-friendly identifier (`slug` column, unique) like "software-design" instead of a UUID.
**Plain English**: A human-readable shortcut. Instead of remembering `a1b2c3d4-...`, you can reference the template as "software-design" in URLs and code.
**Why We Use It**: UUIDs are great for databases but terrible for humans. Slugs make templates addressable in a memorable way.

### System vs User Templates
**Technical**: The `type` field is currently "system" for all seed templates, suggesting a distinction from potential user-created templates.
**Plain English**: Built-in templates (system) versus custom templates a user might create (user). Currently all templates are system-provided, but the schema supports future user customization.
**Why We Use It**: Extensibility. Users may eventually want to create their own thinking frameworks for specialized domains.

### protectedProcedure
**Technical**: A tRPC middleware ensuring the user has a valid session before the handler executes.
**Plain English**: A security checkpoint -- only logged-in users can browse or retrieve templates. Anonymous visitors are rejected.
**Why We Use It**: While templates themselves are not private, the API surface should be consistent in requiring authentication for all operations.

---

## The Four Domain Templates

### Software Design (`software-design`)
**Unit Types**: entity, attribute, behavior, constraint, interface, flow, decision, open_question
**Relation Types**: implements, validates, has_attribute, requires
**Purpose**: Guides systematic software specification from problem definition through technical decisions
**Assembly Types**: PRD, Feature Spec, DB Schema, API Spec, Investor Pitch

### Nonfiction Writing (`nonfiction-writing`)
**Unit Types**: thesis, evidence, counterargument, scene, source
**Relation Types**: supports, contradicts, exemplifies, contextualizes
**Purpose**: Structures argumentative writing with thesis development and evidence organization
**Assembly Types**: Chapter Outline, Argument Structure, Manuscript, Publisher Pitch

### Investment Decision (`investment-decision`)
**Unit Types**: signal, risk, assumption, thesis, action, metric
**Relation Types**: supports, contradicts, presupposes, operationalizes
**Purpose**: Disciplines investment analysis with explicit assumptions and risk assessment
**Assembly Types**: Investment Memo, Risk Analysis, Execution Plan

### Academic Research (`academic-research`)
**Unit Types**: hypothesis, evidence, methodology, finding, limitation, source
**Relation Types**: supports, contradicts, derives_from, references, questions
**Purpose**: Enforces research rigor from hypothesis through findings and limitations
**Assembly Types**: Research Proposal, Literature Review, Paper Structure

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created the domain template router with three query endpoints: `list` for browsing all templates, `getById` for UUID-based retrieval, and `getBySlug` for slug-based retrieval
- **Why**: Project creation flow needs access to domain templates to offer structured starting points for different knowledge domains
- **Impact**: Enables frontend project creation dialog to display template options and configure new projects with domain-specific scaffolding
