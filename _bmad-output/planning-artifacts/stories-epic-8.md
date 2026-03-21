## Epic 8: Feedback Loop & Thought Evolution

Users can evolve their thinking over time through an Incubation Queue (surfacing incomplete thoughts), Compression (extracting common cores from similar claims), Orphan Unit Recovery (finding unused thoughts), external knowledge import with connection mode selection, reverse provenance tracking, Action Unit completion records, unit drift detection from project purpose, and Branch Project creation from drifted thinking.

**FRs covered:** FR19, FR21, FR57, FR58, FR59, FR62, FR64
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
**And** dismissed notifications don't repeat for the same Unit per NFR24

---

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

---

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

---

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

---

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

---

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

---

### Story 8.7: Unit Drift Detection from Project Purpose

As a user,
I want the system to detect when my Units are drifting away from the project's stated purpose,
So that I can stay focused or consciously expand the scope.

**Acceptance Criteria:**

**Given** a Project has a defined purpose (from domain template or user description)
**When** the Drift Detection service analyzes Units in the project
**Then** each Unit receives a `drift_score` (0.0–1.0) measuring semantic distance from the project purpose per FR64
**And** when a Unit's drift_score exceeds a configurable threshold (default 0.7), the user is presented with options: (1) keep in project (mark as intentional expansion), (2) move to a different Context, (3) split into a sub-context, (4) branch into a new project (Story 8.8) per FR64
**And** the drift detection runs as a Trigger.dev background job on Unit creation/update
**And** the Project Dashboard shows an aggregate drift indicator
**And** the notification follows non-interrupting policy per NFR24

---

### Story 8.8: Branch Project from Drift Detection

As a user,
I want to branch drifted Units into a new independent project while maintaining a reference relation with the original project,
So that valuable tangential explorations become their own focused workspace without losing the connection to where they originated.

**Acceptance Criteria:**

**Given** a Unit or group of Units has been flagged by Drift Detection with a drift_score above threshold
**When** the user selects the "Branch into new project" option
**Then** a new Project is created with fields: `branched_from` (original project ID), `branch_reason` (user-provided or AI-suggested), and `shared_units[]` (Units shared between both projects) per PRD Section 19
**And** the selected drifted Units are moved to the new project's initial Context
**And** a `references` relation is maintained between the original project and the branched project
**And** shared Units appear in both projects simultaneously (not duplicated)
**And** the original project's drift indicator updates to reflect the resolved drift
**And** the branched project inherits the original project's template (if any) or can be assigned a different template
**And** a creation dialog allows the user to name the new project, provide a purpose statement, and confirm which Units to include

---

### Story 8.9: Energy-Level Metacognitive Feedback

As a user,
I want to tag my current energy and focus level when capturing thoughts,
So that the system can surface appropriate activities — e.g., low energy suggests reviewing the incubation queue, high energy suggests tackling complex decomposition or compression work.

**Acceptance Criteria:**

**Given** the user is in the thought capture flow
**When** they optionally tag their current energy level (low / medium / high)
**Then** the tag is stored on the capture session and associated with the Units created during that session
**And** the system uses the energy level to suggest appropriate next activities:
  - Low energy → surface Incubation Queue for light review or show Orphan Recovery list
  - Medium energy → suggest Relations editing, Context organization, or Compression review
  - High energy → prompt complex decomposition, Gap Detection review, or Compression detection run
**And** the energy tag is optional and non-blocking — users can dismiss without selecting
**And** energy history is shown as a metadata heatmap in user settings (last 30 days)
**And** the suggestion is non-interrupting and dismissible per NFR24

---

### Story 8.10: Action Unit External Service Delegation & Result Record Flow

As a user,
I want to delegate Action Units to external services (Google Calendar, Todoist, Slack, etc.) and capture result records when actions complete,
So that my thought-driven actions flow into my existing tools and real-world outcomes feed back into my knowledge graph.

**Acceptance Criteria:**

**Given** an Action Unit exists (unit_type: "action") with decision-making provenance relations
**When** the user clicks "Delegate" on the Action Unit
**Then** a DelegationDialog presents execution type categories (Schedule, To-do, Communication, Appointment/visit, Purchase) per PRD Section 17
**And** each category maps to specific services: Schedule → Google Calendar/TIMEMINE, To-do → Todoist/Apple Reminders, Communication → Email/KakaoTalk/Slack, Appointment → Google Maps/KakaoMap, Purchase → Coupang/Amazon
**And** the dialog pre-fills relevant fields from the Action Unit's content and AI-extracted metadata (title, date, location, recipient)
**And** on successful delegation, the Unit metadata gains `linked_calendar_event` or `linked_task` reference
**And** a service icon badge appears on the UnitCard and `action_status` updates to "delegated"
**And** when the user marks the Action Unit as "Complete" a CompletionFlowSheet slides up proposing a result record Unit
**And** the result record is pre-filled by AI with `origin_type: "direct_write"` and `unit_type: "observation"` by default
**And** the result record auto-connects to original decision-making Units via `derives_from` and `references` relations per FR57
**And** the user can edit result content and connections before saving, or skip (non-blocking per NFR24)
**And** completed Actions with result records display a FeedbackLoopIndicator (↩) in Graph View and Thread View
**And** the Context Dashboard shows "X of Y Action Units have result records"
**And** a DecisionChainPanel is accessible from any Action Unit showing full provenance path
**And** integration configuration (OAuth tokens, API keys) is managed in Settings → Integrations
