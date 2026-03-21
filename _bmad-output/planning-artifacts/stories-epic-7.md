## Epic 7: Assembly, Composition & Export

Users can compose documents by arranging Units into Assembly slots using drag-and-drop, use templates with AI auto-mapping, generate bridge text between Units, compare Assembly diffs side-by-side, export to multiple formats (Essay, Presentation, Email, Social), maintain export history, and auto-generate source maps and reasoning chains.

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

**Given** Units are referenced by Assemblies
**When** a Unit is modified
**Then** all Assemblies referencing that Unit automatically reflect the change — content is not copied per FR16, NFR12

**Given** tRPC procedures are defined
**When** a client calls the assembly router
**Then** procedures `assembly.create`, `assembly.getById`, `assembly.list`, `assembly.update`, `assembly.delete`, `assembly.addUnit`, `assembly.removeUnit`, `assembly.reorderUnits` are all available

**Given** an Assembly is being populated
**When** the user attempts to add a draft Unit (lifecycle: "draft")
**Then** the operation is rejected with a validation error per NFR8

**Given** an Assembly exists
**When** the user views it
**Then** Units from multiple Contexts can be present in the same Assembly

---

### Story 7.2: Assembly View with Drag-and-Drop Ordering

As a user,
I want to arrange Units in an Assembly by dragging and dropping them into the order I want,
So that I can compose my document structure intuitively.

**Acceptance Criteria:**

**Given** an Assembly exists with Units
**When** the user opens Assembly View
**Then** the AssemblyBoard component renders Units as draggable cards in their ordered positions per UX-DR13, FR47
**And** a left search/browse rail allows finding and adding Units to the Assembly per UX-DR30

**Given** the user drags a Unit card
**When** they release it over a new position
**Then** drag-and-drop uses dnd-kit with 6-dot grip handles, 0.8 opacity during drag, dashed drop zones, and 200ms spring snap per UX-DR40
**And** the new order is persisted via `assembly.reorderUnits` tRPC call

**Given** the Assembly View is open
**When** the user views the header
**Then** assembly metadata (name, description, unit count, last modified) is displayed per UX-DR30

**Given** the user is in the Assembly View
**When** they click the preview/edit toggle
**Then** editing mode (drag-and-drop) and preview mode (read-only rendered) alternate per UX-DR13

**Given** a Unit card is selected
**When** the user presses arrow keys
**Then** the card moves up or down in position (keyboard-based reordering)

**Given** the user removes a Unit from the Assembly
**When** the removal is confirmed
**Then** the Unit is only removed from the Assembly — the Unit itself is not deleted globally

---

### Story 7.3: Assembly Templates with AI Slot Mapping

As a user,
I want to start composing from a template that proposes a structure and automatically maps my existing Units to slots,
So that I get a head start on document structure with AI doing the heavy lifting.

**Acceptance Criteria:**

**Given** the Assembly model supports templates
**When** the user creates an Assembly from a template
**Then** Assembly Templates propose structure based on writing purpose (e.g., "Argumentative Essay" has Introduction, Thesis, Evidence 1–3, Counterargument, Conclusion) per FR17

**Given** a template is applied to an Assembly
**When** the Assembly view loads
**Then** AI auto-maps existing Units in the active Context to template slots based on Unit type and content relevance per FR17
**And** empty slots are visually distinguished with dashed border and "Drop a Unit here" placeholder per FR17, UX-DR13

**Given** AI slot mapping proposals are shown
**When** the user reviews each slot
**Then** they can accept, reject, or override any AI slot mapping

**Given** the system has built-in templates
**When** listing available templates
**Then** at least 4 are available: Essay, Report, Decision Brief, Research Summary

**Given** a user has an existing Assembly arrangement
**When** they choose "Save as Template"
**Then** the current slot structure is saved as a new user-defined template

---

### Story 7.4: Bridge Text Generation

As a user,
I want AI to generate logical connecting sentences between Units in my Assembly,
So that the exported document reads as a coherent narrative rather than disjointed fragments.

**Acceptance Criteria:**

**Given** an Assembly with ordered Units
**When** the user triggers "Generate Bridge Text"
**Then** AI generates connecting sentences between adjacent Units that create logical flow per FR52

**Given** bridge text is generated
**When** displayed in the Assembly View
**Then** bridge text zones are visually displayed between Unit cards per UX-DR13

**Given** bridge text is stored
**When** checking the Unit graph
**Then** bridge text is NOT stored as a Unit and does NOT modify the original Unit graph per FR52
**And** bridge text is stored only within the Assembly as ephemeral connecting content

**Given** bridge text exists between two Units
**When** the user interacts with a bridge text zone
**Then** they can edit, regenerate, or delete any bridge text segment individually

**Given** an Assembly is exported
**When** bridge text exists
**Then** it is included in the export output but clearly generated (not attributed to the user)

---

### Story 7.5: Assembly Diff — Side-by-Side Comparison

As a user,
I want to compare two versions or two different Assemblies side by side,
So that I can see what changed or how two compositions differ.

**Acceptance Criteria:**

**Given** two Assemblies exist (or two versions of the same Assembly)
**When** the user selects "Compare Assemblies"
**Then** a side-by-side view renders both Assemblies with color visualization: Units present only in the left Assembly (red), only in the right (green), and in both (neutral) per FR48

**Given** the diff view is rendered
**When** shared Units exist in both Assemblies
**Then** shared Units are aligned horizontally where possible

**Given** the diff view is rendered
**When** the user views the summary panel
**Then** it shows: units added (count), removed (count), reordered (count), and content changes (units whose content differs between the two assemblies)

**Given** the diff view is rendered
**When** the user clicks a highlighted Unit
**Then** both sides scroll to show that Unit in context

---

### Story 7.6: Multi-Format Export with Unit Conversion Rules

As a user,
I want to export my Assembly to Essay, Presentation, Email, or Social format with appropriate formatting per Unit type,
So that my thoughts become polished outputs ready for their destination.

**Acceptance Criteria:**

**Given** an Assembly with ordered Units and optional bridge text
**When** the user triggers export and selects a format
**Then** format-specific Unit conversion rules are applied per Unit type per FR51:
- Essay: Claims become thesis statements, Evidence becomes supporting paragraphs, Questions become rhetorical questions or section headers
- Presentation: Each Unit becomes a slide bullet or slide; type determines formatting
- Email: Concise format with Claims as key points, Action Units as action items
- Social: Condensed format with character limits respected

**Given** the export dialog is open
**When** the user configures the export
**Then** an export dialog allows format selection, preview, and download per UX-DR30

**Given** bridge text was generated
**When** the export is rendered
**Then** bridge text is included in the export output per FR52

---

### Story 7.7: Partial Export & Export History

As a user,
I want to export only specific Units from an Assembly and track when and how I exported,
So that I can create targeted outputs and know what's changed since my last export.

**Acceptance Criteria:**

**Given** an Assembly exists
**When** the user configures a Partial Export
**Then** they can filter by: specific Unit type only, specific Context membership, specific evidence_domain, or confirmed Units only per FR53
**And** the export preview updates to show only matching Units

**Given** an export completes
**When** an Export History record is created
**Then** it contains: export timestamp, format, Unit IDs included, and a snapshot hash of included Unit content per FR54

**Given** Units have changed since the last export
**When** the user views an Assembly
**Then** a notification badge shows "N units changed since last export" per FR54

**Given** export history exists for an Assembly
**When** the user views the history
**Then** they can re-export with the same settings or export with updated settings

---

### Story 7.8: Assembly Source Map

As a user,
I want to see which external resources contributed to my Assembly and at what ratio,
So that I can verify the provenance and intellectual composition of my documents.

**Acceptance Criteria:**

**Given** an Assembly contains Units with provenance data (origin_type, source_span)
**When** the user views the Assembly Source Map
**Then** it auto-generates a visualization showing which external resources contributed to the Assembly and at what ratio per FR75

**Given** the source map is rendered
**When** the user inspects a source entry
**Then** each source entry shows: `resource_unit_id` (or "directly written" for user-authored Units), `contributing_units` list, and `contribution_ratio` per PRD Appendix A-14
**And** source entries are grouped by origin: external resources vs. directly written content
**And** each source shows: resource name/URL, number of Units derived from it, and percentage of Assembly coverage

**Given** the source map is computed
**When** the data is stored
**Then** a `source_map[]` array is stored on the Assembly model per PRD Appendix A-14

**Given** an Assembly is exported
**When** the export format is Essay
**Then** a reference list is auto-generated and appended to the export

**Given** the Assembly detail view is open
**When** the user looks for the Source Map
**Then** it is accessible as a dedicated tab or panel in the Assembly detail view

---

### Story 7.9: Reasoning Chain Visualization

As a user,
I want to trace the explicit reasoning path from evidence through inference to conclusion within a Context,
So that I can evaluate the logical structure of my arguments and identify gaps in reasoning.

**Acceptance Criteria:**

**Given** Units exist within a Context with relation chains connecting evidence to conclusions
**When** the user requests a Reasoning Chain view
**Then** the system constructs a ReasoningChain structure with: `id`, `goal` (the conclusion being reasoned toward), and `steps[]` array per FR76, PRD Appendix B

**Given** a ReasoningChain is constructed
**When** the steps are rendered
**Then** each step includes: `unit_id`, `role` (foundation / motivation / validation / inference / conclusion), `evidence_domain`, `scope`, and `transition` (logic for moving to the next step) per PRD Appendix B
**And** the chain visualization displays steps sequentially with relation types connecting each step (e.g., Evidence →[supports]→ Claim →[derives_from]→ Conclusion)

**Given** gaps exist in the reasoning chain
**When** the chain is analyzed
**Then** gaps are highlighted: "This conclusion has no supporting evidence path" or "Scope jump: personal evidence supports domain-general claim"

**Given** the user wants AI-assisted chain construction
**When** they trigger AI auto-generate
**Then** AI analyzes the relation graph within a Context and auto-generates Reasoning Chains per Feature Reference

**Given** the user wants to manually build a chain
**When** they select Units and assign roles
**Then** they can create or edit Reasoning Chains by selecting Units and assigning roles

**Given** Reasoning Chains exist
**When** the user navigates
**Then** they are viewable from both Context detail and Assembly detail views

---

### Story 7.10: Template Auto-Mapping for Assembly Creation

As a user,
I want the AI to automatically propose which of my existing Units fit into each slot when I create an Assembly from a template,
So that I can quickly populate structured documents without manually dragging every Unit into place.

**Acceptance Criteria:**

**Given** the user creates a new Assembly by selecting a template (e.g., Research Paper, Decision Brief, Essay)
**When** the template is applied and the Assembly view loads
**Then** the AI analyzes all Units in the current Context (or user-selected scope) and generates a mapping proposal for each template slot

**Given** a mapping proposal is shown for a slot
**When** the user reviews it
**Then** each slot displays: the slot name/description, the proposed Unit(s) with a match confidence indicator (high/medium/low), and action buttons
**And** the user can perform one of three actions per slot: (1) "Accept" — confirms the proposed Unit mapping, (2) "Swap" — opens a Unit picker to choose a different Unit for this slot, (3) "Skip" — leaves the slot empty for manual filling later

**Given** a slot has no matching Units
**When** the proposal is displayed
**Then** the slot is visually flagged as "Empty — no matching Units found" with a prompt to create or search for content

**Given** the user has reviewed all slot proposals
**When** the user confirms the overall mapping via "Apply Mappings" button
**Then** all accepted and swapped mappings populate the Assembly with the selected Units in their designated positions
**And** the Assembly enters its normal editing state with all mapped Units in place

**Given** the mapping operation is applied
**When** the user wants to undo
**Then** the mapping operation is recorded in the undo history so the user can revert to the empty template state
