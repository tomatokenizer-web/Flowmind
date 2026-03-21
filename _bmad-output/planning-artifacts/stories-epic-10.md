## Epic 10: External Integration & Context Export API

Users can share their thought structures with external AI tools via the Context Export API (REST endpoint with API key auth, supporting prompt_package/json/markdown formats), auto-generate structured AI prompts from selected Units, and delegate Action Unit execution to external services (Google Calendar, Todoist, Slack, etc.).

**FRs covered:** FR34, FR55, FR56
**NFRs addressed:** NFR19, NFR20, NFR21

### Story 10.1: Context Export REST API

As a developer or power user,
I want a REST API endpoint that exports a Context's Unit structure in multiple formats,
So that I can integrate my Flowmind knowledge with external AI tools and workflows.

**Acceptance Criteria:**

**Given** the architecture specifies a REST endpoint at `GET /api/context/{contextId}/export`
**When** the endpoint is called with valid authentication
**Then** it returns the Context's Unit structure in the requested format per FR34:
  `prompt_package` — structured AI prompt format with background, claims, evidence, open questions
  `json` — full Unit graph with relations, types, metadata
  `markdown` — human-readable markdown with Units organized by type and relation
**And** query parameters support: `format` (required), `depth` (relation traversal depth, default 2), `types` (Unit type filter, comma-separated), `status` (lifecycle filter: draft, pending, confirmed) per FR34
**And** authentication uses API key in `Authorization: Bearer {key}` header
**And** API keys are manageable from user settings (create, revoke, list)
**And** rate limiting is enforced on the endpoint
**And** the API is format-agnostic and AI-model-agnostic per NFR19

---

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

---

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
**And** Flowmind tracks the delegation but doesn't manage execution — external service owns the task lifecycle per FR56

---

### Story 10.4: Data Export & Privacy Controls

As a user,
I want to export all my data and control what information is shared externally,
So that I own my intellectual property and can comply with my own privacy standards.

**Acceptance Criteria:**

**Given** the user's account contains Units, Relations, Assemblies, and Contexts
**When** the user requests a full data export
**Then** the system exports all Units, relations, Assemblies, Contexts, and metadata to user-owned format (JSON and/or Markdown) per NFR21
**And** the export is downloadable as a ZIP archive
**And** a privacy settings page specifies: what data is sent to external AI services (only on explicit export/prompt generation), local processing options (embedding generation toggle), and a clear statement that user data is not used for AI training per NFR20
**And** the user can delete their account and all associated data (hard delete)
**And** export and deletion actions require confirmation via the destructive Dialog variant
