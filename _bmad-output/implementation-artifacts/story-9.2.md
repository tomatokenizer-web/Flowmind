# Story 9.2: Domain Template System — Three Template Types

**Status: pending**

## Description
As a user,
I want to choose from system default, freeform, or user-defined domain templates when creating a project,
So that I get the right level of structure for my thinking purpose.

## Acceptance Criteria

**Given** the Project model supports templates
**When** Domain Templates are defined
**Then** three types are supported: System default (pre-built, read-only), Freeform (no constraints), and User-defined (saved from existing projects) per FR66
**And** each Domain Template includes: domain-specific Unit types, domain-specific relation types, Scaffold Units, required context slots, recommended navigation order, available Assembly list, gap detection rules, and AI live guide prompts per FR67
**And** 4 system default templates are seeded: software-design, nonfiction-writing, investment-decision, academic-research
**And** each template is stored as a JSON configuration in the database
**And** the template system is extensible — users can define and save custom templates per NFR17

## Tasks
- [ ] Define `DomainTemplate` Prisma model: `id`, `name`, `slug`, `type` (enum: system, freeform, user_defined), `owner_id` (nullable FK User, null for system templates), `config` (Json — full template configuration), `created_at`, `updated_at`
- [ ] Define template config JSON schema (TypeScript interface): `{ unitTypes[], relationTypes[], scaffoldUnits[], contextSlots[], navigationOrder[], availableAssemblies[], gapDetectionRules[], aiGuidePrompts[] }`
- [ ] Run `prisma migrate dev` for DomainTemplate model
- [ ] Create seed file `prisma/seeds/domainTemplates.ts` with 4 system templates: software-design, nonfiction-writing, investment-decision, academic-research
- [ ] Create `server/repositories/templateRepository.ts` — findAll (system + user), findBySlug, findByUserId, create (user-defined), update, delete
- [ ] Create `server/services/templateService.ts` — template validation, user-defined template creation from project state, template application to project
- [ ] Add tRPC procedures: `template.list`, `template.getById`, `template.createUserDefined`, `template.update`, `template.delete`
- [ ] Create `components/templates/TemplatePicker.tsx` — shown in Project creation wizard; three sections (System / Freeform / My Templates) with template cards
- [ ] Create `components/templates/TemplateCard.tsx` — card showing template name, type badge, description, scaffold unit count, example use case
- [ ] Create `components/templates/TemplateConfigViewer.tsx` — read-only JSON viewer for system templates; editable fields for user-defined
- [ ] Update Project creation flow to include TemplatePicker step
- [ ] Write unit tests for template config validation
- [ ] Write integration tests for user-defined template creation from project

## Dev Notes
- Key files: `prisma/schema.prisma` (DomainTemplate), `prisma/seeds/domainTemplates.ts`, `server/services/templateService.ts`, `server/api/routers/template.ts`, `components/templates/TemplatePicker.tsx`
- Dependencies: Story 9.1 (Project model with template_id FK), Story 9.4 (ScaffoldUnits use template.scaffoldUnits config)
- Technical approach: Template `config` is a typed JSON field. Define a TypeScript interface `DomainTemplateConfig` and use Zod for runtime validation. System templates are seeded via `prisma db seed` and have `owner_id: null` — they cannot be modified or deleted. User-defined templates are created by calling `template.createUserDefined` with a project ID — the service inspects the project's Unit types, relation types used, and Contexts to generate the config. The 4 seeded templates should cover representative scaffolds: software-design (RFC format), nonfiction-writing (chapter structure), investment-decision (thesis/risk/return), academic-research (hypothesis/evidence/conclusion).

## References
- Epic 9: Projects & Domain Templates
- FR66: Three template types (system, freeform, user-defined)
- FR67: Template configuration schema including scaffold units and AI guide prompts
- NFR17: Extensible template system
- Related: Story 9.1 (Project model), Story 9.3 (Constraint Levels apply per template), Story 9.4 (Scaffold Units from template config), Story 9.6 (Freeform-to-Formal export creates user-defined template)
