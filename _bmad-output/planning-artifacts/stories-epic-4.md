> **⚠️ DEPRECATED**: This file uses an earlier story numbering system that differs from `epics.md`. The authoritative story definitions are in `epics.md` and `implementation-artifacts/story-4.*.md`. This file is retained for historical reference only.

## Epic 4: Relation Graph & Thought Connections

Users can connect Units through 23+ typed relations (argument, creative, structural), visualize connections as an interactive force-directed graph with two-layer zoom (global overview to local card array), detect cycles and loopbacks, create custom reusable relation types, and merge semantically identical Units.

### Story 4.1: Relation Data Model and CRUD API

As a user,
I want to create directed, typed relations between my Thought Units with strength and purpose metadata,
So that I can build a rich graph of connections representing how my thoughts relate to each other.

**Acceptance Criteria:**

**Given** the database has the `relations` table with columns: id (UUID), source_unit_id, target_unit_id, perspective_id, type, strength (0.0-1.0), direction (one_way/bidirectional), purpose (VARCHAR[]), created_at, is_custom, custom_name
**When** a developer runs `prisma migrate dev`
**Then** the `relations` table is created with all specified columns, CHECK constraint on strength range, foreign keys to units and unit_perspectives with ON DELETE CASCADE, and composite index on (source_unit_id, target_unit_id, perspective_id)

**Given** a user has two confirmed Units in the same Context with an existing perspective for each
**When** the user calls `relation.create` with source_unit_id, target_unit_id, perspective_id, type "supports", strength 0.7, direction "one_way", and purpose ["argument"]
**Then** a new relation is created and returned with a generated UUID, the provided fields, and a created_at timestamp
**And** an event `relation.created` is emitted on the event bus

**Given** a user attempts to create a relation where source or target Unit has lifecycle "draft"
**When** the `relation.create` mutation is called
**Then** the request is rejected with error code BAD_REQUEST and message "Cannot create relations with draft Units"

**Given** a user attempts to create a relation with strength outside 0.0-1.0
**When** the `relation.create` mutation is called
**Then** the request is rejected with a Zod validation error specifying the valid range

**Given** an existing relation between two Units in a Context
**When** the user calls `relation.update` with a new strength value of 0.9
**Then** the relation strength is updated and the updated relation is returned
**And** an event `relation.updated` is emitted

**Given** an existing relation
**When** the user calls `relation.delete` with the relation ID
**Then** the relation is removed from the database
**And** an event `relation.deleted` is emitted

**Given** a user wants to see all relations for a Unit within a specific Context
**When** the user calls `relation.listByUnit` with unit_id and context_id
**Then** all relations where the unit is source OR target within that context's perspective are returned, sorted by strength descending

**Given** a user wants to see all relations between two specific Units across all Contexts
**When** the user calls `relation.listBetween` with source_unit_id and target_unit_id
**Then** all relations between those two units across all perspectives are returned, grouped by context_id

---

### Story 4.2: Seed All 23 System Relation Types

As a developer,
I want all 23 system relation types pre-seeded in the database organized by category,
So that users and AI can reference a consistent taxonomy of relation types from day one.

**Acceptance Criteria:**

**Given** the `relation_types` table is created with columns: id (UUID), name (VARCHAR(50) UNIQUE), category (VARCHAR(30)), description (TEXT), is_system (BOOLEAN DEFAULT TRUE), display_order (INT)
**When** a developer runs `prisma migrate dev` followed by `prisma db seed`
**Then** exactly 23 system relation types are inserted into the relation_types table

**Given** the seed has run
**When** querying relation_types with category = 'argument'
**Then** exactly 8 types are returned: supports, contradicts, derives_from, expands, references, exemplifies, defines, questions

**Given** the seed has run
**When** querying relation_types with category = 'creative_research'
**Then** exactly 7 types are returned: inspires, echoes, transforms_into, foreshadows, parallels, contextualizes, operationalizes

**Given** the seed has run
**When** querying relation_types with category = 'structure_containment'
**Then** exactly 5 types are returned: contains, presupposes, defined_by, grounded_in, instantiates

**Given** the seed has run
**When** querying relation_types with category = 'structure_containment'
**Then** the total count is 5, confirming 8 + 7 + 5 = 20 — the remaining 3 types (refutes, specifies, abstracts) belong to their respective categories for a total of 23
**And** each type has a non-empty description explaining its semantic meaning

**Given** the seed script is run on a database that already has the 23 types
**When** the seed script executes again
**Then** no duplicate entries are created (upsert behavior)

**Given** the relation_types table is populated
**When** a tRPC query `relationType.list` is called
**Then** all 23 types are returned grouped by category with display_order preserved

---

### Story 4.3: Graph Canvas — Global Overview Layer

As a user,
I want to see all my Units as a force-directed graph with type-colored nodes and cluster detection,
So that I can visually understand the overall structure and clusters of my thinking.

**Acceptance Criteria:**

**Given** a Context with 10+ Units and relations between them
**When** the user opens Graph View for that Context
**Then** a full-screen canvas renders all Units as small colored dots using D3-force layout
**And** relations are rendered as thin lines between dots
**And** each dot is colored according to its Unit type (using UX-DR2 type color tokens)

**Given** the Global Overview is rendered
**When** the force simulation stabilizes
**Then** densely connected Units form visible clusters (Louvain community detection)
**And** clusters are visually distinguishable through spatial proximity

**Given** the Global Overview is rendered
**When** the user scrolls the mouse wheel or pinch-zooms on trackpad
**Then** the canvas zooms in/out smoothly centered on the cursor position
**And** minimum zoom shows all nodes; maximum zoom transitions to Local Card Array (Story 4.4)

**Given** the Global Overview is rendered
**When** the user clicks and drags on empty canvas space
**Then** the entire graph pans in the drag direction

**Given** a graph with 500+ nodes
**When** the Global Overview renders
**Then** Canvas (not SVG) rendering is used for performance
**And** the frame rate remains above 30fps during pan/zoom operations

**Given** the Global Overview is rendered
**When** the user hovers over a node
**Then** a tooltip displays the Unit's truncated content (first 50 chars), type, and lifecycle state

**Given** the graph has loaded
**When** the user's viewport changes
**Then** the mini-map in the corner updates to show the current viewport position relative to the full graph

---

### Story 4.4: Graph Canvas — Local Card Array Layer

As a user,
I want to click a hub or cluster in the Global Overview and transition to a card-based local view,
So that I can read and interact with individual Units and their immediate connections.

**Acceptance Criteria:**

**Given** the user is in Global Overview (Story 4.3)
**When** the user clicks on a hub node or cluster
**Then** the view smoothly transitions (300ms animation per UX-DR8) to Local Card Array
**And** the clicked node and all nodes within relation depth N (default N=2) are loaded as UnitCards (UX-DR10 Standard variant)

**Given** the Local Card Array is displayed
**When** cards are arranged
**Then** cards are positioned in a grid-like layout with relation lines drawn between connected cards
**And** SVG rendering is used for the Local Card Array (not Canvas)

**Given** the Local Card Array is displayed
**When** the user clicks on a UnitCard
**Then** the Unit Detail Panel (UX-DR32) slides in from the right showing full Unit content, relations, metadata, and AI tabs

**Given** the user is in Local Card Array
**When** the user clicks the "Back to Global" button or presses Escape
**Then** the view smoothly transitions back to the Global Overview at the previous zoom/pan position

**Given** the Local Card Array shows cards with relations
**When** a relation line is rendered
**Then** the line thickness reflects the relation strength (0.0-1.0 mapped to 1px-4px)
**And** the line color reflects the relation category (argument: blue, creative: purple, structure: gray)

**Given** the Local Card Array is displayed with a hub node
**When** the user adjusts the depth slider (1-3)
**Then** the card array dynamically expands or contracts to show units within the new depth
**And** cards animate in/out with 200ms spring transition

**Given** the navigation path Global View -> click hub -> Local Card Array -> click card -> Unit Detail
**When** the user follows this entire path
**Then** each transition is smooth and the breadcrumb updates to show the full navigation path (UX-DR44)

---

### Story 4.5: Graph View Screen with Floating Controls

As a user,
I want the Graph View to have floating controls for filters, zoom, mini-map, and layer indication,
So that I can efficiently control the graph visualization without leaving the view.

**Acceptance Criteria:**

**Given** the user opens Graph View
**When** the screen renders
**Then** the graph canvas fills the entire main content area
**And** floating controls are overlaid: filter bar (top), zoom controls (bottom-right), mini-map (bottom-left), layer indicator (top-right)

**Given** the floating filter bar is visible
**When** the user clicks a Unit type toggle (e.g., "Claim", "Evidence")
**Then** nodes of that type are shown/hidden on the graph with a 150ms fade animation
**And** the filter state persists within the session

**Given** the floating filter bar is visible
**When** the user adjusts a relation type filter
**Then** only relations of the selected types are rendered
**And** disconnected nodes (no visible relations) are dimmed to 30% opacity

**Given** the zoom controls are visible
**When** the user clicks the + button
**Then** the graph zooms in by one step centered on the viewport center
**And** the - button zooms out by one step

**Given** the zoom controls are visible
**When** the user clicks the "Fit all" button
**Then** the graph zooms and pans to fit all visible nodes within the viewport with 10% padding

**Given** the mini-map is visible
**When** the user drags the viewport rectangle within the mini-map
**Then** the main graph canvas pans to the corresponding position

**Given** the layer indicator shows "Global Overview"
**When** the user clicks a hub and transitions to Local Card Array
**Then** the layer indicator updates to "Local: [Hub Unit title]"
**And** a back arrow appears next to the indicator for returning to Global

**Given** the user has prefers-reduced-motion enabled
**When** any graph transition or animation fires
**Then** all animations are replaced with instant transitions (0ms duration per UX-DR8)

---

### Story 4.6: Custom Relation Types with Reusable Library

As a user,
I want to create my own relation types and save them to a reusable library,
So that I can express connections that go beyond the 23 system types and reuse them across my projects.

**Acceptance Criteria:**

**Given** the `custom_relation_types` table exists with columns: id, name, description, project_id, scope (private/shared), reusable (BOOLEAN), purpose_tag (VARCHAR(30)), created_by, created_at
**When** a user calls `customRelationType.create` with name "builds_upon", description, scope "private", reusable true, and purpose_tag "argument"
**Then** a new custom relation type is created and returned with a generated UUID
**And** the type appears in the relation type selector dropdown alongside system types

**Given** a custom relation type with reusable = true exists
**When** the user creates a new relation in any Context within the same project
**Then** the custom type appears in the type dropdown under a "Custom" section separated from system types

**Given** a custom relation type with scope = "private"
**When** another user in a shared project tries to list relation types
**Then** the private custom type is not visible to them

**Given** a custom relation type with reusable = true and purpose_tag = "argument"
**When** the navigation purpose is set to "argument" mode (Story 6.5)
**Then** relations using this custom type are included in the purpose-weighted rendering

**Given** the user opens the relation type library
**When** the library panel renders
**Then** all system types (23) are shown as read-only with descriptions
**And** all user-created custom types are shown with edit/delete controls
**And** types are grouped by category/purpose_tag

**Given** the user attempts to create a custom type with a name identical to an existing system type
**When** the `customRelationType.create` mutation is called
**Then** the request is rejected with error "Name conflicts with system relation type"

**Given** a custom relation type is in use by existing relations
**When** the user attempts to delete it
**Then** a confirmation dialog warns "This type is used by N relations. Deleting will set those relations to type 'untyped'."

---

### Story 4.7: Dynamic Chunk Computation Based on Navigation Purpose

As a user,
I want Units to be dynamically grouped into Chunks based on my current navigation purpose,
So that I see meaningful intermediate groupings that change depending on whether I am exploring arguments, creative connections, or chronological flow.

**Acceptance Criteria:**

**Given** a Context with 20+ Units and various relations
**When** the user is in "argument" navigation purpose
**Then** Chunks are computed by grouping Units connected by argument-category relations (supports, contradicts, derives_from, expands, references, exemplifies, defines, questions) with strength >= 0.3
**And** each Chunk contains at least 2 Units

**Given** the same Context
**When** the user switches to "creative" navigation purpose
**Then** Chunks are recomputed using creative-category relations (inspires, echoes, transforms_into, foreshadows, parallels, contextualizes, operationalizes)
**And** the resulting Chunks differ from the argument-purpose Chunks

**Given** the same Context
**When** the user switches to "chronological" navigation purpose
**Then** Chunks are computed by grouping Units within temporal windows (e.g., same day or session)
**And** Chunks are ordered by their earliest created_at timestamp

**Given** Chunks are computed
**When** the result is returned
**Then** Chunks are NOT stored in the database — they are computed on demand and returned as transient data
**And** the computation completes within 200ms for Contexts with up to 500 Units (NFR1)

**Given** a Chunk is displayed in Graph View
**When** the user hovers on a Chunk boundary
**Then** a tooltip shows the Chunk's computed label (derived from the dominant Unit types within it) and Unit count

**Given** a Context with fewer than 4 Units
**When** Chunk computation is triggered
**Then** a single Chunk containing all Units is returned (no subdivision)

---

### Story 4.8: Cycle Detection, Loopback Marking, and Unit Merge

As a user,
I want the system to detect cycles in my thought graph and let me merge duplicate Units,
So that I can navigate loops consciously and consolidate redundant thoughts without losing connections.

**Acceptance Criteria:**

**Given** a Context where Unit A -> Unit B -> Unit C -> Unit A forms a cycle
**When** the graph is analyzed (triggered on relation creation/update)
**Then** the system detects the cycle and marks the edge C -> A as a "loopback"
**And** the loopback relation is stored with a `is_loopback: true` flag

**Given** a loopback relation exists in the graph
**When** the Graph View renders
**Then** the loopback edge is displayed with a dashed line and a loop icon indicator
**And** navigating the graph in Thread View skips loopback edges by default

**Given** the user is in Thread View and encounters a loopback
**When** the loopback indicator is displayed
**Then** a "Follow loop" button is shown allowing conscious choice to traverse the cycle
**And** clicking it navigates to the loopback target Unit

**Given** two Units (A and B) are identified as semantically identical
**When** the user initiates a Merge operation selecting Unit A as the target
**Then** a merge preview is shown listing: all relations of Unit B that will be re-attributed to Unit A, all Assemblies containing Unit B that will be updated, all Contexts where Unit B has perspectives

**Given** the user confirms the merge of Unit B into Unit A
**When** the merge executes
**Then** Unit A retains its content (user can choose A or B content)
**And** all relations previously pointing to/from Unit B now point to/from Unit A
**And** all Assembly items referencing Unit B now reference Unit A
**And** all perspectives of Unit B are transferred to Unit A (if Unit A lacks a perspective in that Context)
**And** Unit B is soft-deleted (archived) with a reference to Unit A
**And** a `unit.merged` event is emitted

**Given** merging would create a duplicate relation (A already has a "supports" relation to Unit C, and B also had a "supports" relation to Unit C)
**When** the merge executes
**Then** the duplicate relation is not created; the existing relation on Unit A is kept with the higher strength value

**Given** no cycles exist in the graph
**When** cycle detection runs
**Then** no loopback flags are set and the operation completes without error

---

### Story 4.9: Cross-View Unit Selection Synchronization

As a user,
I want selecting a Unit in any view to highlight it in all other open views,
So that I can maintain spatial awareness of the same Unit across Graph, Thread, and other views.

**Acceptance Criteria:**

**Given** the user has Graph View and Thread View open (via parallel routes or split pane)
**When** the user clicks a Unit node in Graph View
**Then** the corresponding UnitCard in Thread View scrolls into view and receives the "Selected" state (UX-DR10)
**And** the Unit Detail Panel updates to show the selected Unit

**Given** the user selects a Unit in Thread View
**When** the selection event fires
**Then** the corresponding node in Graph View receives a highlight ring animation (150ms)
**And** the Zustand selection store updates with the selected unit_id

**Given** the user has multiple browser tabs open with the same Context
**When** the user selects a Unit in one tab
**Then** the selection is synchronized to other tabs via tRPC WebSocket subscription
**And** the other tabs highlight the same Unit within 100ms

**Given** the user selects a Unit that is not currently visible in a view (e.g., scrolled off-screen in Thread View or outside viewport in Graph View)
**When** the cross-view sync triggers
**Then** the receiving view scrolls/pans to bring the selected Unit into the viewport
**And** a subtle pulse animation (150ms) draws attention to the newly visible Unit

**Given** the user clears selection (clicks empty space or presses Escape)
**When** the deselection event fires
**Then** all views remove their selection highlights simultaneously
**And** the Unit Detail Panel collapses or shows an empty state

**Given** the selection synchronization system
**When** measuring the latency from click to highlight in a secondary view
**Then** the synchronization completes within the same animation frame for local views (NFR3)

---

### Story 4.10: Accessible Graph Navigation with Keyboard Support

As a user who relies on keyboard navigation,
I want to navigate the graph using arrow keys with screen reader announcements,
So that I can explore my thought connections without requiring a mouse.

**Acceptance Criteria:**

**Given** the Graph View is focused
**When** the user presses Tab to enter the graph
**Then** focus moves to the first node (ordered by ThoughtRank or creation date)
**And** the node receives a visible focus indicator (2px solid accent-primary with 2px offset per UX-DR52)
**And** a screen reader announces "[Unit type]: [first 50 chars of content], [N] connections"

**Given** a graph node is focused
**When** the user presses Arrow Right
**Then** focus moves to the next connected node following the strongest outgoing relation
**And** the screen reader announces the relation type traversed and the target node details

**Given** a graph node is focused
**When** the user presses Arrow Left
**Then** focus moves back to the previously focused node (traversal history)

**Given** a graph node is focused
**When** the user presses Arrow Down
**Then** focus cycles through all outgoing relations of the current node
**And** each press announces the relation type and target Unit summary

**Given** a graph node is focused
**When** the user presses Arrow Up
**Then** focus cycles through all incoming relations to the current node

**Given** a graph node is focused
**When** the user presses Enter
**Then** the Unit Detail Panel opens for the focused node (equivalent to click)

**Given** the Graph View component
**When** it renders
**Then** the graph container has `role="application"` and `aria-label="Thought connection graph"`
**And** an sr-only description states "Use arrow keys to navigate between connected thoughts. Press Enter to view details."

**Given** a user who cannot use the Graph View
**When** they access the same Context
**Then** Thread View (Story 6.1) is available as a fully accessible text-based alternative for exploring the same connections
**And** a link "Switch to text-based Thread View" is provided within the graph's ARIA description
