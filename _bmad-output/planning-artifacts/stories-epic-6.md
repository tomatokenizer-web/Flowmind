## Epic 6: Navigation, Search & Discovery

Users can explore their thought graph through Thread View (linear reading), purpose-based navigation weights (argument/creative/chronological modes), user-defined Navigators, multi-layer search (text, semantic, structural, temporal), ThoughtRank scoring, natural language queries, Context Dashboard, and cross-view synchronization.

**FRs covered:** FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46, FR50
**NFRs addressed:** NFR1, NFR2, NFR3, NFR4, NFR6, NFR15
**UX-DRs covered:** UX-DR25 (Command Palette), UX-DR29 (Thread View), UX-DR31 (Search View), UX-DR55 (ARIA live regions)

### Story 6.1: Thread View — Linear Reading Mode

As a user,
I want to read my Units in a linear vertical list ordered chronologically or by derivation,
So that I can follow a train of thought from beginning to end like reading a document.

**Acceptance Criteria:**

**Given** Units exist within a Context with relations
**When** the user switches to Thread View
**Then** Units are displayed as a vertical list of UnitCards stacked in chronological or derivation order per FR46, UX-DR29
**And** relation connectors (thin lines with type-colored dots) link related cards between the stacked list per UX-DR29
**And** branch points display a fork indicator showing the number of branches per FR46
**And** clicking a fork indicator reveals branch options and the user can choose which branch to follow

**Given** the Thread View is rendering
**When** the list is long enough to scroll
**Then** ScrollArea integration provides smooth scrolling with the 4px hover-visible scrollbar per UX-DR23

**Given** Thread View is open
**When** the user interacts with the toolbar
**Then** the user can toggle between chronological order and derivation order via a toolbar toggle
**And** Thread View is accessible as an alternative to Graph View for users who prefer text-based navigation per UX-DR56

---

### Story 6.2: Purpose-Based Relation Weight Rendering

As a user,
I want relation line thickness, color, and visibility to change dynamically based on my current navigation purpose,
So that I see the most relevant connections for what I'm currently exploring.

**Acceptance Criteria:**

**Given** Units are displayed in Graph View or Thread View with relations
**When** the user selects a navigation purpose mode
**Then** in Argument Exploration mode: supports, contradicts are highlighted (thick lines, full opacity); inspires, echoes are dimmed (thin lines, 30% opacity) per FR37
**And** in Creative mode: inspires, echoes, foreshadows are highlighted; supports, contradicts are dimmed per FR37
**And** in Chronological mode: relation strength is recalculated by created_at order per FR37

**Given** custom relation types exist with a `purpose_tag` field
**When** a navigation purpose mode is active
**Then** custom relation types with a matching `purpose_tag` are included in the navigation weight system per FR38
**And** weight changes update in real time without page reload per NFR2

**Given** the Graph View floating filter bar or Thread View toolbar is visible
**When** the user opens the purpose mode selector
**Then** they can select from: Argument, Creative, Chronological, Explore (default)
**And** the active purpose mode is persisted in session state

---

### Story 6.3: Navigators — User-Defined & AI-Generated Reading Paths

As a user,
I want to create named reading paths through my Units for specific purposes,
So that I can share curated journeys through my thinking or revisit them later.

**Acceptance Criteria:**

**Given** Units exist across one or more Contexts
**When** the user creates a Navigator
**Then** they can name it, add an ordered list of Unit references (not copies), and optionally describe its purpose per FR35
**And** multiple Navigators can be created from the same Units per FR35
**And** Navigators do not copy or move Units — they reference them per FR35

**Given** a Navigator exists
**When** the user opens it
**Then** the Navigator displays as a sequential card list with "Previous" / "Next" navigation

**Given** a user states a purpose
**When** AI auto-generates a Navigator
**Then** AI creates a Navigator based on relation graph traversal matching the stated purpose (e.g., "Create a reading path for my argument about X")
**And** Navigators are listed in the sidebar under a "Navigators" section
**And** draft Units (lifecycle: "draft") cannot be added to Navigators per FR27, NFR8

**Given** a Navigator contains a Unit
**When** that Unit's content is edited
**Then** the edit is automatically reflected in all Navigators containing it per NFR12

---

### Story 6.4: 4-Layer Search Index & Search View

As a user,
I want to search my thoughts across text, meaning, structure, and time,
So that I can find any thought regardless of how I remember it.

**Acceptance Criteria:**

**Given** Units exist with content, embeddings, types, relations, and timestamps
**When** the Search View is opened
**Then** a prominent query input is displayed at the top per UX-DR31

**Given** a search query is entered
**When** results are returned
**Then** the system supports 4-layer indexing per FR39:
- Text index — keyword-based search via full-text PostgreSQL search
- Semantic index — vector embedding similarity via pgvector `<=>` operator
- Structure index — search by Unit type, lifecycle state, Context membership, relation graph position
- Temporal index — search by creation time, modification time, relation formation order
**And** results are grouped by type (Units, Contexts, Projects) per UX-DR31
**And** the search supports natural-language queries (e.g., "things I claimed about social media") per FR43

**Given** the Search View is empty
**When** no query has been entered
**Then** an empty state displays suggestions for what to search per UX-DR37

**Given** the Command Palette is open (Cmd+K)
**When** the user types a search query
**Then** search is also accessible and returns results inline per UX-DR25

---

### Story 6.5: ThoughtRank Importance Score

As a user,
I want each Unit to have an importance score reflecting its centrality in my knowledge graph,
So that search results and navigation prioritize my most significant thoughts.

**Acceptance Criteria:**

**Given** Units exist with relations, Context memberships, and Assembly references
**When** ThoughtRank is computed for a Unit
**Then** the score combines: number of referencing Units, number of Assemblies it appears in, diversity of connected Contexts, recency, and hub role (high in-degree + high out-degree) per FR40

**Given** a navigation purpose is active
**When** ThoughtRank is queried
**Then** ThoughtRank is re-calculable per Unit with different weights depending on navigation purpose at query time per NFR4

**Given** ThoughtRank scores exist
**When** search results are returned
**Then** search results are ranked by ThoughtRank as one of the sorting factors

**Given** a UnitCard is rendered
**When** it has relations
**Then** Unit card relation/attribute display is prioritized by: (1) relevance to current navigation purpose, (2) ThoughtRank of connected Unit, (3) recency per FR41
**And** by default, top 3–5 relations are shown on each card; "See more" expands the full list per FR41

**Given** Units or relations change
**When** the change is persisted
**Then** ThoughtRank scores are recomputed asynchronously via a background job and cached; the cache is invalidated on relation changes

---

### Story 6.6: Context Dashboard — Statistics & Entry Points

As a user,
I want a dashboard for each Context showing key metrics, gaps, and recommended starting points,
So that I can quickly assess the state of an exploration and decide where to focus.

**Acceptance Criteria:**

**Given** a Context has Units with relations
**When** the user opens the Context Dashboard
**Then** it displays: total Unit count, incomplete/unresolved questions, key hub Units (highest ThoughtRank), unaddressed counterarguments (claims without support), unsupported claims, cycle presence indicator, and recommended entry points per FR42

**Given** the dashboard is showing metrics
**When** ThoughtRank is available
**Then** recommended entry points are the top 3 Units by ThoughtRank within the Context

**Given** a metric or hub Unit is displayed
**When** the user clicks it
**Then** clicking any metric or hub Unit navigates to that Unit in the active view

**Given** Units or Relations change within the Context
**When** the change is persisted
**Then** the dashboard auto-refreshes when Units or Relations change within the Context

**Given** the dashboard is open
**When** the user clicks the help icon
**Then** the Relation Type Glossary is accessible from the dashboard via a help icon per NFR15

---

### Story 6.7: Graph View Navigation Purpose Integration

As a user,
I want the Graph View to adapt its visual emphasis based on my navigation purpose,
So that the graph highlights what matters most for my current exploration mode.

**Acceptance Criteria:**

**Given** the Graph Canvas from Epic 4 is rendered
**When** a navigation purpose is selected (argument, creative, chronological, explore)
**Then** relation line thickness, color intensity, and visibility update in real time per FR37, NFR2

**Given** a navigation purpose is active
**When** the graph re-renders
**Then** node positions optionally re-cluster based on the active purpose (argument mode clusters by support/contradict chains; creative mode clusters by inspiration chains)
**And** the navigation path supports simultaneous vertical (chronological/derivation) and horizontal (semantic jump) movement per FR36

**Given** any navigation purpose mode is active
**When** the layer indicator is visible
**Then** the layer indicator reflects the current purpose mode

**Given** any navigation purpose mode is active
**When** navigating through the graph
**Then** the Global Overview → Local Card Array → Unit Detail navigation path is preserved across all purpose modes per FR44, FR45

---

### Story 6.8: Cross-View Coordination Enhancement

As a user,
I want all views (Graph, Thread, Context, Search, Dashboard) to stay synchronized when I select or navigate to a Unit,
So that switching between views feels seamless and I never lose my place.

**Acceptance Criteria:**

**Given** multiple views exist (Graph View, Thread View, Context View, Search View)
**When** the user selects a Unit in any view
**Then** all other open views highlight the same Unit simultaneously per FR50
**And** the Detail Panel updates to show the selected Unit

**Given** a Unit is selected
**When** synchronization propagates
**Then** synchronization is instantaneous from the user's perspective per NFR3

**Given** the user has multiple tabs open
**When** they select a Unit in one tab
**Then** tRPC Subscriptions via WebSocket enable multi-tab sync — selecting a Unit in one tab highlights it in another per architecture requirement

**Given** a view change occurs
**When** ARIA live regions are present
**Then** ARIA live regions announce view changes politely per UX-DR55

**Given** the selection store from Epic 4 (Story 4.9) exists
**When** it is extended for Epic 6
**Then** the selection store is extended to support all view types including Thread View, Search View, and Context Dashboard
