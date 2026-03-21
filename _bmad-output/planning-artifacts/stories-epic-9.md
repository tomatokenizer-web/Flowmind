## Epic 9: Projects & Domain Templates

Users can work within purpose-optimized project environments with domain-specific templates (software design, nonfiction writing, investment decisions, academic research), scaffold units with pre-planted questions, constraint levels (Strict/Guided/Open), gap detection, AI live guide, Completeness Compass, and freeform-to-formal template export.

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
**And** type-specific default views are configured per project type (research → Thread View, decision → Graph View) per FR63
**And** tRPC procedures `project.create`, `project.getById`, `project.list`, `project.update`, `project.delete` are available
**And** the sidebar project selector (placeholder from Epic 3) now shows real projects
**And** MVP starts with pre-defined project templates; custom composition is deferred

---

### Story 9.2: Domain Template System — Three Template Types

As a user,
I want to choose from system default, freeform, or user-defined domain templates when creating a project,
So that I get the right level of structure for my thinking purpose.

**Acceptance Criteria:**

**Given** the Project model supports templates
**When** Domain Templates are defined
**Then** three types are supported: System default (pre-built, read-only), Freeform (no constraints), and User-defined (saved from existing projects) per FR66
**And** each Domain Template includes: domain-specific Unit types, domain-specific relation types, Scaffold Units, required context slots, recommended navigation order, available Assembly list, gap detection rules, and AI live guide prompts per FR67
**And** 4 system default templates are seeded: software-design, nonfiction-writing, investment-decision, academic-research
**And** each template is stored as a JSON configuration in the database
**And** the template system is extensible — users can define and save custom templates per NFR17

---

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

---

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
**And** the AI live guide uses gap detection to suggest next steps

---

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
**And** in freeform template mode, the Compass only provides "Assemblies that can be created now" without completeness conditions per FR71
**And** the Compass auto-refreshes periodically and is invocable on-demand per NFR14
**And** progress updates follow non-interrupting notification policy per NFR24

---

### Story 9.6: Freeform-to-Formal Template Export

As a user,
I want to retroactively apply structure to a freeform project by having AI analyze my existing Units and propose type mappings,
So that I can start loose and formalize later without losing work.

**Acceptance Criteria:**

**Given** a Project created in freeform mode with existing Units
**When** the user selects "Export to Formal Template"
**Then** AI analyzes the existing Units and proposes: which system template best fits the content, type mappings for each Unit, and suggested structural gaps per FR69
**And** the user reviews and approves/modifies each proposed mapping
**And** upon confirmation, the project's template is updated and Unit types are adjusted per the approved mappings
**And** existing relations are preserved — only types and template metadata change
**And** the operation is undoable via Cmd+Z

---

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
