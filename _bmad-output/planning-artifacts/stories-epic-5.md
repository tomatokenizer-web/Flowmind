## Epic 5: AI-Powered Thinking & Safety

Users can leverage AI to decompose text into Units, suggest types and relations, refine expression, detect argument gaps and contradictions, explore branch potential, and receive epistemic humility prompts — all within a safe 3-stage lifecycle system with generation limits, ratio warnings, and inline intervention nudges for misuse patterns.

### Story 5.1: AI Provider Abstraction and Safety Guard Middleware

As a developer,
I want an AI provider abstraction layer and safety guard middleware,
So that AI calls are centralized, rate-limited, swappable between providers, and generation limits are enforced consistently.

**Acceptance Criteria:**

**Given** the file `server/ai/provider.ts`
**When** it is implemented
**Then** it exports an `AIProvider` interface with methods: `generateText(prompt, options)`, `generateStructured(prompt, schema, options)`, `generateEmbedding(text)`
**And** two implementations exist: `AnthropicProvider` (primary) and `OpenAIProvider` (fallback)
**And** provider selection is configured via environment variable `AI_PRIMARY_PROVIDER`

**Given** the primary provider (Anthropic) is unavailable or returns a 5xx error
**When** an AI operation is invoked
**Then** the system automatically falls back to the secondary provider (OpenAI)
**And** a warning is logged via pino with the error details and fallback event

**Given** the file `server/ai/safetyGuard.ts`
**When** it is implemented
**Then** it exports middleware that wraps all AI generation calls and enforces: max 3 Units generated per request, max 3 consecutive branch generations per user session, and 40% AI ratio warning per Context

**Given** a user has already generated 3 Units in a single request
**When** the AI attempts to generate a 4th Unit
**Then** the safety guard rejects the generation with error type `AI_GENERATION_LIMIT` and message "Maximum 3 Units per request reached"

**Given** a user has triggered 3 consecutive branch generations without creating any manual Units in between
**When** the user requests a 4th branch generation
**Then** the safety guard rejects with error type `AI_CONSECUTIVE_LIMIT` and message "Please add your own thoughts before generating more branches"

**Given** a Context where AI-generated Units (origin_type = 'ai_generated' or 'ai_refined') exceed 40% of total Units
**When** any new AI generation is requested for that Context
**Then** the safety guard allows the generation but returns a warning flag `ai_ratio_warning: true` with the current ratio percentage
**And** this warning is displayed to the user in the UI (Story 5.11)

**Given** the AI provider abstraction
**When** any tRPC router needs AI functionality
**Then** it calls the AI service layer (never the provider directly) and the service layer calls the provider through the safety guard

**Given** the embedding generation function
**When** a Unit is created or its content is updated
**Then** an embedding is generated via OpenAI `text-embedding-3-small` (vector(1536)) through a Trigger.dev background job
**And** the embedding is stored in the Unit's `embedding` column

---

### Story 5.2: AI Text Decomposition — 3-Step Process

As a user,
I want the AI to decompose my raw text into Thought Units following a 3-step process,
So that my long-form text is intelligently broken into atomic, typed, and connected cognitive units.

**Acceptance Criteria:**

**Given** the user submits raw text (paragraph or longer) in Organize Mode
**When** the AI decomposition is triggered
**Then** Step 1 executes: AI analyzes the text to understand the user's purpose (arguing, brainstorming, researching, defining, etc.) and returns a purpose classification

**Given** Step 1 has determined the user's purpose
**When** Step 2 executes
**Then** AI proposes decomposition boundaries within the text using semantic, logical, topical, and structural properties
**And** each proposed boundary includes: start/end character positions in the original text, proposed Unit content, proposed Unit type (from the 9 base types + any domain template types), and a confidence score (0.0-1.0)

**Given** Step 2 has proposed boundaries
**When** Step 3 executes
**Then** AI proposes relations between the newly created Units AND between new Units and existing Units in the active Context
**And** each proposed relation includes: source_unit (new), target_unit (new or existing), relation_type, strength, and a brief rationale

**Given** the 3-step process completes
**When** the results are returned to the client
**Then** all proposed Units have lifecycle = "draft" and origin_type = "ai_generated"
**And** the proposals are NOT saved to the database until the user reviews them (Story 5.3)

**Given** the input text is fewer than 20 characters
**When** decomposition is triggered
**Then** the system creates a single Unit with the entire text (no decomposition) and prompts for type assignment only

**Given** the AI generates proposals
**When** the safety guard checks the count
**Then** no more than 3 Units are proposed per request; if the text warrants more, the response includes a "Continue decomposition" action for the next batch

**Given** the decomposition is in progress
**When** the AI is processing
**Then** the UI shows a dot animation loading state (UX-DR36) with a "Cancel" button
**And** cancellation stops the AI call and discards partial results

---

### Story 5.3: DecompositionReview Component

As a user,
I want to review AI-proposed decomposition boundaries with visual overlays and adjust them before accepting,
So that I maintain full control over how my text is broken into Thought Units.

**Acceptance Criteria:**

**Given** the AI has proposed decomposition boundaries (Story 5.2)
**When** the DecompositionReview component renders
**Then** the original text is displayed with highlighted boundary overlays showing where each proposed Unit starts and ends
**And** each proposed Unit section has a type-colored badge (UX-DR2 colors) showing the proposed type

**Given** the boundary overlays are displayed
**When** the user clicks "Accept" on an individual proposed Unit
**Then** that Unit transitions from proposal to draft lifecycle in the database
**And** the accepted section's overlay changes from dashed to solid border
**And** a physics-based card settling animation plays as the Unit "drops" into the confirmed area

**Given** the boundary overlays are displayed
**When** the user clicks "Reject" on a proposed Unit
**Then** that proposal is discarded and the text section returns to unprocessed state
**And** adjacent Units' boundaries are not affected

**Given** a boundary between two proposed Units
**When** the user drags the boundary handle left or right
**Then** the text content of both adjacent Units updates in real time as the boundary moves
**And** the boundary snaps to sentence boundaries by default (with an option to snap to word boundaries)

**Given** the user has finished reviewing all proposals
**When** some are accepted and some rejected
**Then** an "Accept All Remaining" button processes all unreviewed proposals at once
**And** a summary shows: N accepted, M rejected, K modified

**Given** the DecompositionReview is displayed
**When** the user changes a proposed Unit's type via the type badge dropdown
**Then** the badge color updates to match the new type and the proposal is updated

**Given** the physics-based card settling animation
**When** an accepted Unit animates into the confirmed area
**Then** the card drops with a spring easing (200ms per UX-DR8) and slight bounce
**And** if prefers-reduced-motion is enabled, the card simply appears without animation

**Given** the DecompositionReview component
**When** it renders
**Then** all interactive elements are keyboard accessible (Tab through proposals, Enter to accept, Delete to reject, arrow keys to move boundary)
**And** screen readers announce each proposal's content and type

---

### Story 5.4: AI Type and Relation Suggestion for Units

As a user,
I want AI to suggest the type and relations for new and existing Units,
So that I can quickly categorize my thoughts and connect them to relevant existing Units.

**Acceptance Criteria:**

**Given** a user creates a new Unit manually (Capture Mode or direct creation)
**When** the Unit content is saved
**Then** a background Trigger.dev job analyzes the content and proposes a Unit type from the 9 base types
**And** the suggestion appears as a subtle AI suggestion card (UX-DR39) below the Unit with the proposed type and confidence score

**Given** a new Unit is created within an active Context containing other Units
**When** the AI analysis completes
**Then** the AI also proposes up to 3 relations to existing Units in the Context
**And** each proposed relation includes: target Unit (with preview), relation type, estimated strength, and a one-line rationale

**Given** the user receives type and relation suggestions
**When** the user clicks "Accept" on the type suggestion
**Then** the Unit's type is updated to the suggested type within the active Context's perspective
**And** the suggestion card is dismissed

**Given** the user receives relation suggestions
**When** the user clicks "Accept" on one relation suggestion
**Then** the relation is created with lifecycle = "pending" (not yet confirmed)
**And** the relation appears in the graph with the Pending visual style (yellow border per UX-DR3)

**Given** the user clicks "Dismiss" on a suggestion
**When** the dismissal is processed
**Then** the suggestion card disappears with a fade-out animation
**And** the dismissed suggestion is not shown again for that Unit

**Given** a Unit already has a confirmed type in the active Context
**When** AI analysis runs
**Then** only relation suggestions are generated (type suggestion is skipped)

**Given** the AI returns suggestions
**When** the safety guard checks
**Then** all suggestions carry `ai_trust_level: "inferred"` and display the "AI Inference" badge (FR30)

---

### Story 5.5: Unit Split with Relation Re-Attribution

As a user,
I want to split one Unit into two and have the system propose how existing relations should be redistributed,
So that I can refine my thought granularity without losing any connections.

**Acceptance Criteria:**

**Given** a confirmed Unit with content and 5 existing relations
**When** the user initiates a Split operation
**Then** the Unit content is displayed in an editor with a draggable split point indicator
**And** the user can position the split point to divide the content into two parts

**Given** the user has positioned the split point
**When** the user clicks "Preview Split"
**Then** two preview cards are shown with the divided content
**And** for each of the 5 existing relations, the AI proposes which of the two resulting Units should inherit it
**And** each proposal shows: relation type, connected Unit preview, and which half the AI recommends (Unit A or Unit B) with a brief rationale

**Given** the split preview is displayed
**When** the user overrides an AI relation attribution (moves a relation from Unit A to Unit B)
**Then** the proposal updates to reflect the user's choice
**And** the override is visually distinguished from the AI's original proposal

**Given** the user confirms the split
**When** the split executes
**Then** the original Unit is archived (not deleted) with a reference to both new Units
**And** two new Units are created with the split content, both inheriting the original Unit's Context memberships
**And** relations are attributed according to the final (user-confirmed) assignment
**And** a `unit.split` event is emitted with original_id, new_unit_a_id, new_unit_b_id

**Given** the original Unit appeared in one or more Assemblies
**When** the split executes
**Then** each Assembly item referencing the original Unit is flagged for review
**And** the user is prompted to choose which new Unit replaces it in each Assembly (or both in sequence)

**Given** the original Unit had version history
**When** the split executes
**Then** both new Units reference the original Unit's version history as their provenance
**And** version 1 of each new Unit records the split event

---

### Story 5.6: AI Refinement — Transform Raw Text to Coherent Expression

As a user,
I want to refine a rough Unit into a coherent, well-expressed version while preserving the original,
So that I can improve my expression without losing the raw authenticity of my initial thought.

**Acceptance Criteria:**

**Given** a Unit with raw, unpolished content
**When** the user clicks "Refine" in the Unit Detail Panel
**Then** the AI generates a refined version of the content that improves clarity, grammar, and logical structure
**And** the original content is preserved as version 1 in unit_versions

**Given** the AI has generated a refined version
**When** the result is presented
**Then** a side-by-side diff view shows the original (left) and refined version (right)
**And** changes are highlighted with green (additions) and red (removals)
**And** the refined version has `origin_type: "ai_refined"` and `quality: "refined"`

**Given** the user views the refinement proposal
**When** the user clicks "Accept"
**Then** the Unit content is updated to the refined version
**And** the version history records: version 1 = original, version 2 = refined with change_reason = "AI refinement"

**Given** the user views the refinement proposal
**When** the user clicks "Keep Original"
**Then** the refined version is discarded and the Unit content remains unchanged

**Given** the user views the refinement proposal
**When** the user clicks "Edit"
**Then** the refined version opens in an editable state so the user can further modify it before accepting

**Given** the refinement is accepted
**When** any Assembly or Navigator references this Unit
**Then** the updated content is automatically reflected (NFR12 — Units are references, not copies)

---

### Story 5.7: Branch Potential Score and AI-Suggested Exploration Directions

As a user,
I want to see a Branch Potential Score on each Unit and explore AI-suggested directions,
So that I know which thoughts are ripe for further development and what directions I might take.

**Acceptance Criteria:**

**Given** a confirmed Unit in a Context
**When** the UnitCard renders
**Then** a Branch Potential Score is displayed as a dot indicator (e.g., 3 of 4 dots filled) representing derivation potential

**Given** the Branch Potential Score is computed
**When** the calculation runs
**Then** the score considers: number of existing outgoing relations (fewer = more potential), type of Unit (Questions and Ideas score higher), recency, and whether common follow-up types are missing (e.g., a Claim without Evidence)

**Given** a Unit with a high Branch Potential Score (3+ dots)
**When** the user clicks the score indicator
**Then** a popover shows 2-3 AI-suggested exploration directions
**And** each direction includes: a question or prompt to explore, the expected Unit type of the result, and which existing Units it might connect to

**Given** the user clicks on one of the suggested exploration directions
**When** the action triggers
**Then** a new draft Unit is created with the suggested prompt as placeholder content
**And** a proposed relation from the original Unit to the new Unit is created
**And** the new Unit opens in the editor for the user to write their response

**Given** the safety guard
**When** a user clicks exploration directions 3 times consecutively without creating manual Units in between
**Then** the 4th click shows a message: "Consider adding your own thoughts before exploring more AI suggestions"
**And** the exploration is blocked until the user creates a manual Unit

**Given** a Context has Units with varying scores
**When** the Context Dashboard (Story 6.9) is viewed
**Then** the top 5 highest Branch Potential Units are listed as "Recommended exploration points"

---

### Story 5.8: Label-Based Flow Prediction — Missing Argument Structure Alerts

As a user,
I want the AI to alert me when my argument structure has gaps,
So that I can strengthen my reasoning by addressing missing evidence, counterarguments, or answers.

**Acceptance Criteria:**

**Given** a Unit of type "Claim" in a Context
**When** the flow prediction analysis runs (triggered on relation changes)
**Then** if the Claim has no "supports" or "exemplifies" relation from an Evidence or Observation Unit, an alert is generated: "This claim has no supporting evidence"

**Given** a Unit of type "Question"
**When** flow prediction runs
**Then** if the Question has no outgoing "derives_from" or incoming "supports" relation to a Claim, Observation, or Evidence Unit, an alert is generated: "This question has no answer or exploration yet"

**Given** a Unit of type "Evidence"
**When** flow prediction runs
**Then** if the Evidence has no outgoing "supports" relation, an alert is generated: "This evidence is not connected to any claim"

**Given** a Claim with supporting Evidence but no Counterargument
**When** flow prediction runs
**Then** a softer suggestion (not alert) is generated: "Consider: are there counterarguments to this claim?"

**Given** flow prediction alerts are generated
**When** they are displayed on the UnitCard
**Then** they appear as subtle inline indicators (small warning icon + text) below the card content
**And** clicking the indicator opens a suggestion to create the missing Unit type

**Given** the user dismisses a flow prediction alert
**When** the dismissal is recorded
**Then** the alert does not reappear for that Unit unless the Unit's relations change (NFR13)

**Given** a Context with many Units
**When** flow prediction runs
**Then** the analysis completes as a background Trigger.dev job and results are cached
**And** alerts are prioritized by: Units with high ThoughtRank first, then by severity of the gap

---

### Story 5.9: AI Intervention Intensity Levels

As a user,
I want to configure how aggressively the AI intervenes in my thinking process,
So that I can choose minimal assistance for focused work or generative help for brainstorming.

**Acceptance Criteria:**

**Given** the user opens AI settings (accessible from the toolbar or project settings)
**When** the settings panel renders
**Then** four intervention intensity levels are displayed: Minimal, Moderate, Exploratory, Generative
**And** each level has a clear description of what it does

**Given** the user selects "Minimal" intensity
**When** they work in the active Context
**Then** AI only alerts on clear logical gaps (Story 5.8 alerts for missing evidence, unanswered questions)
**And** no proactive suggestions, no type proposals, no relation suggestions are generated

**Given** the user selects "Moderate" intensity
**When** they work in the active Context
**Then** AI suggests exploration directions (Story 5.7) on high-potential Units
**And** AI proposes types for new Units (Story 5.4)
**And** no Socratic questions or draft generation occurs

**Given** the user selects "Exploratory" intensity
**When** they work in the active Context
**Then** all Moderate features are active PLUS AI asks Socratic questions (e.g., "What assumption underlies this claim?", "What would disprove this?")
**And** Socratic questions appear as suggestion cards (UX-DR39) that can be dismissed

**Given** the user selects "Generative" intensity
**When** they work in the active Context
**Then** all Exploratory features are active PLUS AI directly generates branch draft Units
**And** generated drafts appear with dashed border / gray background (Draft lifecycle per UX-DR3)
**And** safety guard limits (max 3 per request, 3 consecutive) still apply

**Given** the intensity level is set
**When** it is stored
**Then** it persists per-project (not global) so different projects can have different levels
**And** the active level is shown as a subtle indicator in the toolbar

---

### Story 5.10: Epistemic Humility Mode for Controversial Topics

As a user,
I want the AI to detect controversial or unsettled topics and shift to a questioning mode,
So that I am guided to think critically rather than being given potentially biased answers.

**Acceptance Criteria:**

**Given** the user creates or decomposes content about a topic that lacks social consensus (political, ethical, deeply contested scientific topics)
**When** the AI analyzes the content
**Then** it flags the topic as potentially controversial with a classification (e.g., "political", "ethical", "contested_science")

**Given** a topic is flagged as controversial
**When** the Epistemic Humility Mode activates
**Then** the AI first confirms the user's exploration purpose: "This topic has multiple valid perspectives. What is your exploration goal? (a) Understand all sides, (b) Develop my own position, (c) Analyze specific arguments"
**And** the confirmation appears as a non-blocking card (UX-DR39 pattern)

**Given** the user has confirmed their exploration purpose
**When** the AI generates subsequent suggestions
**Then** AI asks questions instead of providing answers (e.g., "What evidence supports this position?" instead of "This position is supported by...")
**And** all AI outputs in this mode carry a visible "Epistemic Humility" badge

**Given** the AI is in Epistemic Humility Mode
**When** it proposes Unit types
**Then** it favors "Question" and "Assumption" types over "Claim" or "Evidence"
**And** it never generates Claim Units with high certainty in controversial contexts

**Given** the user wants to exit Epistemic Humility Mode for a topic
**When** they dismiss the mode indicator
**Then** normal AI behavior resumes for that topic
**And** a single non-repeating nudge says "AI suggestions on contested topics may reflect particular viewpoints"

**Given** the Epistemic Humility detection
**When** it runs
**Then** it operates as a classifier within the AI provider (not a separate API call) to minimize latency
**And** false positives (flagging non-controversial topics) are preferable to false negatives

---

### Story 5.11: AI Contribution Transparency Display and Ratio Warnings

As a user,
I want to see the ratio of my own writing versus AI contributions in each Context,
So that I maintain awareness of how much of my thinking is genuinely mine versus AI-assisted.

**Acceptance Criteria:**

**Given** a Context with a mix of user-written and AI-generated Units
**When** the Context Dashboard or sidebar is viewed
**Then** a contribution transparency bar is displayed showing three segments: (a) directly written by user (green), (b) AI-generated then approved (blue), (c) AI-generated not yet approved (gray)
**And** percentage labels are shown for each segment

**Given** the contribution display is rendered
**When** the ratios are calculated
**Then** the calculation uses `origin_type` field: "direct_write" for user, "ai_generated"/"ai_refined" for AI, and lifecycle state for approval status

**Given** the AI-generated ratio in a Context exceeds 40%
**When** the threshold is crossed (checked after each AI generation)
**Then** a warning toast is shown: "AI contributions exceed 40% of this Context. Consider adding more of your own thoughts."
**And** the transparency bar's AI segment turns amber/warning color

**Given** a Unit with `ai_trust_level: "inferred"`
**When** it is displayed anywhere in the application
**Then** it shows an "AI Inference" badge (small, non-intrusive) next to the type indicator

**Given** the transparency display
**When** the user clicks on it
**Then** a detailed breakdown popover shows: total Unit count, user-written count, AI-generated approved count, AI-generated pending count, AI-refined count

**Given** the ratio warning has been shown
**When** the user dismisses it
**Then** the warning does not reappear until the ratio changes by more than 5 percentage points (avoids repeated interruption)

---

### Story 5.12: Tension Detection — Flag Contradictory Claims

As a user,
I want the AI to detect and flag contradictory claims within the same Context,
So that I can resolve or consciously maintain tensions in my thinking.

**Acceptance Criteria:**

**Given** a Context contains two or more Claim Units
**When** the tension detection background job runs (triggered on Unit creation/update within Context)
**Then** the AI compares Claim pairs using semantic similarity and logical analysis
**And** pairs with contradictory content are flagged as "tensions"

**Given** a tension is detected between Claim A and Claim B
**When** the tension flag is stored
**Then** it includes: the two Unit IDs, a confidence score (0.0-1.0), a brief description of the contradiction, and a timestamp

**Given** tensions exist in a Context
**When** the Context Dashboard (Story 6.9) is viewed
**Then** tensions are listed in a "Contradictions" section with links to both Units
**And** each tension shows the AI's description of the contradiction

**Given** a tension is flagged
**When** the user views either of the contradicting Units
**Then** a subtle indicator (red dot or tension icon) appears on the UnitCard
**And** clicking reveals the contradicting Unit and the AI's explanation

**Given** the user resolves a tension (by modifying one Unit, creating a reconciliation Unit, or explicitly dismissing)
**When** the resolution action is taken
**Then** the tension flag is removed or marked as "resolved"
**And** if dismissed, the same tension is not re-flagged unless Unit content changes

**Given** a Context with 100+ Claims
**When** tension detection runs
**Then** it executes as a Trigger.dev background job with results cached
**And** only new/modified Claims are compared against existing Claims (incremental, not full O(n^2) every time)

---

### Story 5.13: Scope Jump Warning and Inline Intervention Nudges

As a user,
I want to be warned when I use narrow evidence to support broad claims, and receive non-intrusive nudges for misuse patterns,
So that I maintain intellectual rigor and learn to use the system effectively.

**Acceptance Criteria:**

**Given** an Evidence Unit with a narrow scope (e.g., specific case study, single data point) is connected via "supports" relation to a Claim Unit with broad scope (e.g., general statement about a category)
**When** the scope analysis runs (triggered on relation creation)
**Then** a scope jump warning is generated: "This evidence has a narrow scope but supports a broad claim. Consider: is this evidence representative?"

**Given** the scope jump warning is generated
**When** it is displayed
**Then** it appears as an inline indicator on the relation line in Graph View (small warning icon)
**And** in the Unit Detail Panel's Relations tab, the relation row shows an amber warning icon with the message

**Given** the user dismisses a scope jump warning
**When** the dismissal is recorded
**Then** the warning never reappears for that specific relation (NFR13 — one-time nudge)

**Given** the system detects a misuse pattern (e.g., creating many Units without any relations, using only one Unit type, never reviewing AI suggestions)
**When** the pattern threshold is met (configurable, e.g., 10 unconnected Units in a row)
**Then** an inline intervention nudge appears: a subtle, non-blocking card with a helpful tip
**And** the nudge fires exactly once per pattern type per user — never repeats after dismissal

**Given** an intervention nudge is displayed
**When** the user clicks "Dismiss" or "Got it"
**Then** the nudge disappears and is permanently suppressed for that pattern
**And** the dismissal is recorded in user preferences

**Given** the nudge system
**When** multiple nudges would fire simultaneously
**Then** only the highest-priority nudge is shown (queue behavior, one at a time)
**And** remaining nudges are queued and shown only if still relevant when the user completes the first

---

### Story 5.14: AI Suggestion Queue with Pending Review and Bulk Actions

As a user,
I want a centralized queue of all pending AI suggestions with bulk accept/reject,
So that I can efficiently manage AI proposals without hunting through individual Units.

**Acceptance Criteria:**

**Given** multiple AI suggestions exist across the active Context (type proposals, relation proposals, refinement proposals, tension alerts)
**When** the sidebar renders
**Then** a badge shows the count of pending suggestions (e.g., "AI: 7")

**Given** the user clicks the AI suggestion badge
**When** the suggestion queue panel opens
**Then** all pending suggestions are listed, grouped by type: "Type Suggestions", "Relation Suggestions", "Refinement Suggestions", "Alerts"
**And** each item shows: the affected Unit preview (first 50 chars), the suggestion detail, and AI reasoning

**Given** the suggestion queue is open
**When** the user clicks "Accept" on an individual suggestion
**Then** the suggestion is applied (type set, relation created, refinement accepted) and removed from the queue
**And** the badge count decrements

**Given** the suggestion queue is open
**When** the user clicks "Reject" on an individual suggestion
**Then** the suggestion is discarded and removed from the queue
**And** the badge count decrements

**Given** the suggestion queue has 5+ items of the same type
**When** the user clicks "Accept All [Type Suggestions]"
**Then** all suggestions in that group are applied at once
**And** a toast confirms "Accepted N type suggestions"
**And** an undo option is available for 4 seconds (UX-DR35)

**Given** the suggestion queue has items
**When** the user clicks "Reject All"
**Then** a confirmation dialog asks "Dismiss all N suggestions? This cannot be undone."
**And** confirmed dismissal clears the queue

**Given** the suggestion queue panel
**When** it renders
**Then** suggestions are sorted by: relevance to current navigation purpose first, then by creation time (newest first)
**And** each suggestion's AI reasoning is expandable (collapsed by default)

---

### Story 5.15: Type/Context-Aware External Knowledge Connection via AI Search

As a user,
I want the AI to search for and suggest relevant external knowledge based on my Unit's type and Context,
So that I can enrich my thinking with curated external references without leaving the application.

**Acceptance Criteria:**

**Given** a confirmed Unit in an active Context
**When** the user clicks "Find related knowledge" in the Unit Detail Panel
**Then** the AI formulates a search query based on the Unit's content, type, and the Context's topic/purpose
**And** a loading indicator shows while the search executes

**Given** the AI has formulated a search query
**When** search results are returned
**Then** results are displayed as a list of external sources: title, URL, snippet, relevance score
**And** results are filtered/ranked based on the Unit's type (e.g., Evidence Units get academic sources higher, Idea Units get creative/design sources higher)

**Given** the user selects a search result
**When** they click "Connect"
**Then** a new Resource Unit is created with the external source's metadata (URL, title, snippet)
**And** a "references" relation is created from the original Thought Unit to the new Resource Unit
**And** the Resource Unit has `origin_type: "external_excerpt"` and tracks the source URL

**Given** the user selects a search result
**When** they click "Save for later"
**Then** the source is saved to an "Unconnected Resources" area within the Context for later review

**Given** the Context has a specific topic (e.g., "social media effects on mental health")
**When** the AI formulates the search query
**Then** the Context topic is included as a contextual filter to improve relevance
**And** the search avoids returning sources already referenced in the Context

**Given** the external knowledge search
**When** it runs
**Then** the AI provider (Story 5.1) handles the search through its API
**And** results are cached for 24 hours to avoid redundant API calls for the same Unit

**Given** no relevant results are found
**When** the search completes with zero results
**Then** an empty state is shown: "No relevant external sources found. Try refining the Unit content or broadening the Context."
