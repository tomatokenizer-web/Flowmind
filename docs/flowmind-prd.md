Flowmind
Thought Unit Structuring & Optimization Tool — Product Specification v1.2 (Updated)

*"Not a tool for storing thoughts, but a cognitive interface that preserves the flow of thinking itself, amplifies it, and connects it to action."*



Table of Contents

Overview

Part 1: Why This Product Exists
Problem Definition
Paradigm Shift
Core Values

Part 2: The Fundamental Units of the System
Thought Unit
Resource Unit
Chunk
Context
Relations and Branch Graph

Part 3: How Thoughts Enter the System
Text Input and Decomposition
AI Interaction
AI Safety and Approval System

Part 4: How Thoughts Become Richer
Amplification Layer
AI Memory and Context Engineering

Part 5: How Thoughts Are Explored and Combined
Navigator
Search Engine
Views and Display

Part 6: How Thoughts Become Reality
Execution Layer
Feedback Loop

Part 7: How Users Customize the System
Projects and UI Customization
Domain Template
Completeness Compass
Appropriate Usage Patterns and Onboarding Guide

Appendices
A. Metadata Reference
B. Reasoning Chain
C. Feature Reference
D. Technical Architecture
E. Design Principles
F. Competitive Comparison
G. Product Identity
H. Relation Type Glossary
I. Product Gaps



Overview

Flowmind shifts the fundamental unit from documents to Thought Units. Each fragment of thought exists independently, carries a logical role and relationships to other thoughts, and can be recombined in different ways depending on purpose. A document is simply a purposeful arrangement of these thought fragments.

From this shift come four core capabilities: returning to a past state of thinking without reconstruction cost (Re-entry), no thought being discarded by structure (Non-loss), the same thought being reused infinitely for different purposes (Multi-purpose Composition), and AI refining raw thoughts and filling logical gaps (Amplification).

Full System Layer Architecture

Flowmind operates across 5 vertical layers, governed by 3 cross-cutting elements.

┌─────────────────────────────────────────────────┐
│  Layer 5: Output                                  │
│  Assembly · Prompt Export · Document Conversion   │
├─────────────────────────────────────────────────┤
│  Layer 4: AI Collaboration                        │
│  Auto-tagging · Agentic Unit generation · Compass │
├─────────────────────────────────────────────────┤
│  Layer 3: Navigation                              │
│  Navigator · Importance ranking · Graph display   │
├─────────────────────────────────────────────────┤
│  Layer 2: Structure                               │
│  Context · Project · Chunk · Relation graph       │
├─────────────────────────────────────────────────┤
│  Layer 1: Units                                   │
│  Thought Unit · Resource Unit · Action Unit       │
└─────────────────────────────────────────────────┘

Cross-cutting elements (span all layers):
  Domain Template   → Domain-specific optimization across layers 1–5
  Perspective Layer → Context-specific multi-interpretation across layers 1–3
  Safety System     → Draft/Confirmed control across layer 4

Each layer treats the layer below it as raw material. The basic cycle: idea input → Unit creation → structuring → navigation → AI enrichment → output → feedback loop.



Part 1: Why This Product Exists



1. Problem Definition

Tool Discontinuity Destroys Cognitive Continuity

Every tool forces documents as the basic unit. Documents are linear. But real thinking is not. This mismatch creates four specific pains.

Cognitive load: Every time a thought arises, you must decide "where do I save this?"

Reconstruction cost: When retrieving saved thoughts, context must be rebuilt from scratch. The information exists, but the context is gone.

Composition friction: To assemble thoughts from multiple places into writing, you must hunt them down and copy them manually.

Thought loss: The moment you decide on a direction for writing, all thoughts that don't fit that direction are discarded.

The Problem of Knowledge Provenance and Scope

When exploring complex problems like a business idea, the nature of the knowledge involved varies enormously. Externally verifiable facts like market data, internal facts like team capabilities, ten years of personal experience, and hard-to-articulate intuitions all coexist within a single argument. Current tools treat all of these without distinction, so personal conviction carries the same weight as market data, or important internal signals get dismissed as "unverifiable."

The Expression Gap

There is a gap between the depth at which a person actually thinks and the depth at which they can express that thinking in language. No tool systematically bridges this gap.

The Disconnect Between Thinking and Action

No matter how well thoughts are organized, there is no productivity without a connection to actual action.



2. Paradigm Shift

From Document-first to Thought-first

The old paradigm: Documents exist first; thoughts are placed inside them. The document's structure limits the possibilities of thought.

Flowmind's paradigm: Thoughts exist first; a document is simply a purposeful combination of thoughts.

Old:
  Decide what to write → Gather related thoughts → Write linearly
  → Discard thoughts that don't fit the direction

Flowmind:
  Capture each thought as a Unit → Accumulate inventory
  → When writing: combine from inventory by purpose
  → Only add connecting sentences
  → Original inventory remains intact



3. Core Values

Re-entry: Return to the exact state of thinking you were in before. The cost of restoring context in the future is prepaid at the time of saving.

Non-loss: Thoughts are not inherently discardable. Documents make them discardable. All 100 thoughts get captured; no matter what combination you make, the original inventory is never damaged.

Multi-purpose Composition: The same thought is reused infinitely for different purposes. Because it's a reference, not a copy, modifying the original is automatically reflected everywhere it's used.

Amplification: Pull the potential of your thoughts beyond the current limits of your language ability and knowledge. AI does not replace thinking — it only operates to elevate the user's cognitive capacity itself.



Part 2: The Fundamental Units of the System

*These five concepts form the foundation of all of Flowmind. Every other feature operates on top of them.*



4. Thought Unit

Redefining the Basic Unit

A Unit is the minimum meaningful unit that can be cognitively separated. Size criterion: "If I showed this Unit to someone else without any context, could they understand what kind of thought it is?"

Signal that a Unit is too large: it contains two or more independent claims, or separate ideas are connected by conjunctions like "and," "on the other hand."

The minimum unit criterion differs by Domain Template. In a software design template, "one functional behavior" is a Unit; in an argumentative essay template, "one complete claim" is a Unit. The domain defines this criterion in its own language.

Unit Types

Every Unit carries a type reflecting its logical role. Base types are common across all domains; Domain Templates add domain-specific types. Users can also create custom types.

Base types:

Type
Description
Naturally follows
Claim
An assertion that something is true or correct
Evidence, Counterargument, Example, Limitation
Question
An open problem requiring exploration
Answer, Derived question, Direction
Evidence
A fact or data supporting a claim
Interpretation, Counter-evidence, Source
Counterargument
A rebuttal of an existing claim
Rebuttal, Revised claim
Observation
A fact recorded as-is without judgment
Interpretation, Related claim, Pattern
Idea
An unvalidated possibility
Implementation method, Obstacle, Precedent
Definition
Setting clear boundaries for a concept
Example, Counterexample, Related concept
Assumption
An unverified premise
Verification method, Alternative assumption
Action
Something that requires execution
Checklist, Schedule, Result


Types are first proposed by AI and confirmed by the user.

Perspective Layer — Context-specific Multiple Identities

Core design principle: A Unit's content (text) is global. However, type, relations, and importance can differ per-context via the Perspective Layer.

Unit: "In Camus's The Stranger, Meursault suppresses his emotions"

perspectives: [
  {
    context_id:  literary_fiction_creation
    type:        inspiration
    relations:   [{ to: protagonist_character, type: inspires }]
    note:        "Will adapt Meursault's emotional suppression for my protagonist"
  },
  {
    context_id:  philosophy_research
    type:        evidence
    relations:   [{ to: existentialism_definition, type: supports }]
  }
]

Full structure:

Unit {
  id, content, created_at, source, version_history  ← global
  perspectives: [
    {
      context_id, type, stance, importance,
      relations: [{ to, type, strength, purpose[], created_at, direction }],
      note
    }
  ]
}

Graph View also renders based on the currently active context's Perspective. The same two Units can have completely different relationships depending on context.

Unit Merge and Contains Relation

When two Units are actually saying the same thing, they are handled via Merge. Merging makes them one Unit and re-attributes existing relations to the new Unit.

However, when A contains B as a component, this is handled not by merging but with a contains relation. B exists independently while also being part of A.

"Lean Startup Methodology" Unit
  → contains → "Build-Measure-Learn Loop" Unit
  → contains → "MVP Concept" Unit

Difference from context membership: contexts are a horizontal grouping sharing the same perspective; contains is a hierarchical relation where a higher concept includes a lower one. A Unit can belong to multiple contexts while simultaneously being contained by another Unit.

Assembly

An Assembly is an ordered list of references to Units. It does not copy Units. The same Unit can be included in multiple Assemblies simultaneously; modifying a Unit is automatically reflected in all Assemblies that include it.

Assembly Template: Proposes structure based on writing purpose and automatically maps existing Units to each slot. Identifies empty slots and can generate drafts if needed.



5. Resource Unit

Beyond Text

Thinking is not composed of text alone. Flowmind treats all formats as first-class citizens called Resource Units.

Thought Unit — Cognitive role (claim, question, evidence, etc.)
Resource Unit — Format role (image, table, audio, diagram, link, video, code)

A single resource can be referenced by multiple Thought Units simultaneously. Two Units viewing the same data with different interpretations can both reference the same table.

Resource Units also have a Perspective Layer. The same image can function as "evidence" in one context and "inspiration" in another.

Design principle: Format is a means of expressing thought, not a container for it.



6. Chunk

When navigating Unit by Unit is too granular, and seeing an entire Context at once is too broad, an intermediate unit is needed. A Chunk is not stored but computed. It changes in real time based on navigation purpose, and a single Unit can belong to multiple Chunks simultaneously.

Navigation hierarchy: Unit (minimum) → Chunk (middle) → Context (maximum)



7. Context

Not a Folder, but an Exploration Space

A Context is an exploration space where thought flows of the same purpose gather. It is not exclusive like a folder. A single Unit can belong to multiple Contexts simultaneously and carry different roles in each.

Distinguishing Context from Perspective:

These two are easy to confuse, but they operate at different layers.

Concept
Layer
Meaning
Context
Space
The exploration flow to which Units belong. Created and named by the user.
Perspective
Interpretation
The type and relations a Unit holds within a specific Context. A slot automatically created when a Unit joins a Context.


When the same Unit belongs to Context A, it has Perspective A (type: evidence, relation: supports). When it belongs to Context B, it has Perspective B (type: inspiration, relation: inspires). The Unit is one; the interpretation differs per Context.

Contexts can have hierarchical structure. When they grow too large, they can be split; related ones can be merged; Units from different Contexts can cross-reference each other.

Each Context automatically manages an AI summary of its current state (snapshot), a list of unresolved questions, and a list of internal contradictions. When re-entering a Context, you receive a briefing: "Last time you got here, and this question is still open."



8. Relations and Branch Graph

Why Not a Tree

Relations between Units are modeled as a Directed General Graph. Instead of "ancestor-descendant" concepts, two questions govern relations:
When did this relation form? (created_at)
For what purpose of navigation is it suited? (purpose)

System Relation Types

Relation types fall into three groups. All types carry strength (0.0–1.0), direction (one-way/bidirectional), and creation timestamp.

Argument-centered:

Type
Meaning
`supports`
Logically backs the other Unit
`contradicts`
Logically conflicts with the other Unit
`derives_from`
Logically derived from the other Unit
`expands`
Develops the other Unit more concretely
`references`
References the other Unit as background material
`exemplifies`
Is a concrete example of the other Unit's claim/principle
`defines`
Clearly defines the key concept of the other Unit
`questions`
Raises doubt about the other Unit


Creative / research / execution-centered:

Type
Meaning
`inspires`
This Unit is the creative spark for the other
`echoes`
Shares the same pattern across different contexts
`transforms_into`
This idea morphs into that form
`foreshadows`
A narrative foreshadowing relation in creative writing
`parallels`
Similar structure but independent
`contextualizes`
Provides background context to aid understanding
`operationalizes`
Converts theory/principle into actual action


Structure / presupposition / containment-centered:

Type
Meaning
`contains`
A contains B as a component (hierarchical inclusion)
`presupposes`
This Unit requires the other Unit as a prerequisite
`defined_by`
The key concept of this Unit is defined by the other
`grounded_in`
The background context of this Unit lies in the other
`instantiates`
This Unit is a concrete instance of the other Unit's principle/theory


Perspective Layer and relations: The same two Units can have different relations depending on context. Relations reside inside perspective.relations[], not a global relations[].

Custom Relation Types

Users can directly name and specify a special relation between two Units that system types cannot express.

CustomRelation {
  name:       "will flip in chapter 3"   ← user input
  from:       Unit A
  to:         Unit B
  scope:      private / shared (project-wide)
  reusable:   false (this pair only) / true (can use elsewhere)
  created_at: timestamp
}

When reusable: true, AI can suggest "Use this relation type here too?" in similar situations. Repeated use builds a custom relation type library. In Graph View, system relations and custom relations are displayed with different colors/icons and can be toggled separately.

Branches and Cycles

When thinking branches out in multiple directions from one Unit, each direction is called a branch. Branches grow independently while maintaining their connection to the common starting point.

When a cycle forms in the graph, visited nodes are tracked, and connections returning to already-visited nodes are marked as "loopbacks" so the user only traverses them by conscious choice.



Part 3: How Thoughts Enter the System



9. Text Input and Decomposition

Scope and Processing of Input

There is no special length limit on text entering Flowmind. Key design premise: a single text input does not necessarily represent a single Context.

Input type
AI processing
Raw thought
Proposes Unit boundaries
External web clip
Creates Citation Unit + Resource Unit in parallel
Structured note
Recognizes existing structure then decomposes
Audio transcription
Maintains connection to original audio
Code
Unit-izes by code block


Knowledge Connection Interaction When Importing External Knowledge

When bringing in external knowledge — papers, Wikipedia, web clips, book chapters, company manuals — the first thing Flowmind does is ask "what does this mean to you?"

This is not asking where to save it, but capturing what role this knowledge plays in the user's flow of thinking.

When pasting a paper on "dopamine variable reward schedules," AI asks:

"In what context did you bring this?

 ① Connect to an actively explored Context
    → Add as evidence or background to
       'Social media addiction mechanism' Context

 ② As the starting point of a new exploration
    → Create a new Context starting from this knowledge

 ③ Hold for now (connect later)
    → Place in Incubation Queue;
       notify when a relevant Context appears"

When the user selects ①, AI automatically proposes relations to existing Units in the current Context. At this moment, general knowledge becomes personalized evidence — evidence_domain: external_public but its role within this Context is fully personalized.

AI also works in reverse: analyzing the user's Context and proactively suggesting "There is external knowledge that could support or refute this claim."

External Text Source Tracking

When decomposing external text into Units, each Unit tracks which part of the original it came from.

origin_type breakdown:

Value
Meaning
`direct_write`
Written from scratch by the user
`external_excerpt`
Taken verbatim from an external text (`is_quote: true`)
`external_inspiration`
Derived by the user after reading external text
`external_summary`
External text's content rephrased in the user's words
`ai_generated`
Created by AI (lifecycle: draft)
`ai_refined`
User's raw text refined by AI


Source Span:

source_span: {
  parent_input_id:  original input ID
  position:         position within the original text
  original_excerpt: preview of the original snippet (≤15 chars)
}

Reverse tracking: Clicking a specific external text Resource Unit queries all Thought Units derived from it and all Assemblies containing those Units.

How Decomposition Boundaries Are Determined

Semantic property: Does it contain a complete claim or question? Does a conjunction signal a shift in meaning?

Logical property: Is it supporting, refuting, or derived from the preceding text?

Topical property: Does the subject shift? Is there a seed for branching into a different Context?

Structural property: Paragraph boundaries, numbered lists, headings, and other structural features of the text itself.

Decomposition is always a proposal; the user can adjust boundaries.

Relation Re-attribution Rules When Splitting a Unit

When splitting Unit X into A and B, existing relations connected to X must be attributed to one of the two new Units.

Before split:  X → supports → Y
               X → contradicts → Z
               W → derives_from → X

AI proposal after split:
  "Based on content analysis:
   A contains content that supports Y
   B contains content that contradicts Z
   W was derived from A (not B)

   Shall I distribute them this way?
   You can modify or connect both."

Relations that clearly belong to neither are proposed for connection to both or the creation of a new relation. All final decisions are made by the user.



10. AI Interaction

Two Modes

Capture Mode: For the moment thoughts burst out. No AI intervention.

Organize Mode: For organizing later. Batch-processes Unit splitting, type assignment, and relation connection in collaboration with AI.

AI Decomposition in 3 Steps

Step 1 — Understand purpose: Whether it's for essay writing, research, or idea exploration determines the decomposition approach.

Step 2 — Propose decomposition: For essays, split into claim-evidence-example units; for research, split into fact-source-interpretation-question units.

Step 3 — Propose relations: Each time a new Unit is created, propose its relations to existing Units.

Branch Potential Score

Each Unit card visually displays a derivation potential score (e.g., ●●●○). Clicking reveals explorable directions.

AI Intervention Intensity

Level
Behavior
Minimal
Alerts only on clear logical gaps
Moderate
Suggests exploration directions
Exploratory
Asks Socratic questions
Generative
Directly generates branch drafts




11. AI Safety and Approval System

3-Stage Lifecycle

State
Meaning
Visual
Restrictions
**Draft**
AI proposal. Not the user's thinking
Dashed border, gray background
Cannot be included in Assembly/Navigator; cannot create relations
**Pending**
Under user review
Yellow border
—
**Confirmed**
User approved
Same as regular Unit
—


Generation Limits

Defaults: max 3 generated per request; warning when AI-generated ratio in a Context exceeds 40%; max 3 consecutive branch generations.

Controversial Topic Detection & Epistemic Humility Mode

When a topic without social consensus is detected, AI first confirms the exploration purpose. On controversial topics, AI asks questions instead of providing answers: "What must you give up to take this position?"

AI Contribution Transparency

The ratio of directly written by user, AI-generated then approved, and AI-generated not yet approved is displayed. Units with ai_trust_level: "inferred" automatically receive an "AI Inference" badge.



Part 4: How Thoughts Become Richer



12. Amplification Layer

Three Directions of Amplification

Refinement: Transforms raw text into logically and formally coherent expression. The original is preserved as v1; the refined version is proposed as v2.

Label-based flow prediction: Looks at the current Unit's type and alerts to what is missing in the argument structure: "This claim has no evidence," "This question has no answer."

External knowledge connection: Unlike general search, this searches knowing the Unit's type and Context. Search results are saved as Resource Units and attached as references to the relevant Unit.



13. AI Memory and Context Engineering

Structured Cognitive Context

As Flowmind's Units accumulate, the user's thought structure itself comes to exist in a machine-readable form. The very act of breaking thoughts into Units and connecting them automatically generates an optimized AI context. Thinking and context engineering become the same act.

Context Export API

An API that exports Flowmind's Unit structure in a standard format readable by any AI tool. Flowmind becomes a personalized context layer for the AI ecosystem without being tied to any specific AI model.

GET /api/context/{context_id}/export
{
  "format": "prompt_package | json | markdown",
  "include": ["units", "relations", "open_questions", "snapshot"],
  "depth": 3,
  "filter": {
    "types": ["claim", "question"],
    "status": ["confirmed", "pending"]
  }
}



Part 5: How Thoughts Are Explored and Combined



14. Navigator

Reading Defined by Path

A Navigator is a path defining the order in which Units should be read for a specific purpose. It does not copy or move Units.

Unit set: A, B, C, D, E, F, G

Navigator 1 (introductory):   A → C → E → G
Navigator 2 (review rebuttals): B → D → F → E
Navigator 3 (quick summary):   A → G

Multiple Navigators can be created from the same Units. AI can auto-generate paths by analyzing the Context, or the user can define them manually.

Simultaneous Vertical-Horizontal Navigation

Vertical axis (depth): Move forward/backward in chronological or derivation order.

Horizontal axis (breadth): Jump to a semantically related Unit from the current one. Relevance is determined by a combination of navigation purpose, ThoughtRank, and Context membership.

Moving from reading Unit D back to starting Unit A and then to Branch 3 should be possible in a single gesture.

Relation Weight Changes Based on Navigation Purpose

Relations themselves do not change. However, the rendering weight of each relation changes in real time depending on navigation purpose.

Same Context, same Units:

Argument exploration mode:
  supports, contradicts → highlighted strongly
  inspires, echoes      → dimmed

Creative inspiration mode:
  inspires, echoes, foreshadows → highlighted strongly
  supports, contradicts         → dimmed

Chronological mode:
  Relation strength recalculated by created_at order
  More recently formed relations appear stronger

Implementation:

NavigationContext {
  purpose: "argument" | "creative" | "chronological" | "explore" | ...

  weights: {
    supports:      purpose == "argument" ? 1.0 : 0.3
    contradicts:   purpose == "argument" ? 1.0 : 0.3
    inspires:      purpose == "creative" ? 1.0 : 0.2
    derives_from:  purpose == "chronological" ? 1.0 : 0.5
    ...
  }
}

In Graph View, relation line thickness, color intensity, and visibility change based on these weights. Argument mode reveals logical structure; creative mode reveals the inspiration network. The user selects the purpose directly, or AI auto-recommends based on current work patterns.

Custom relation types can also be included in this weight system. If the user specifies a purpose tag for a custom relation, it is highlighted in that navigation mode.



15. Search Engine

4-Layer Indexing

Text index: Keyword-based search.

Semantic index: Meaning-based similarity search using vector embeddings.

Structure index: Indexes Unit type, state, Context membership, and relation graph.

Temporal index: Indexes creation time, modification time, and relation formation order.

ThoughtRank

A Unit's importance is calculated by combining the number of referencing Units, number of Assemblies it appears in, diversity of connected Contexts, recency, and hub role. Weights differ based on navigation purpose.

Relation and Attribute Display Priority

A Unit card can have many relations and attributes. Showing all of them causes information overload. Priority is calculated by combining three criteria:

① Relevance to current navigation purpose
   Argument exploration: supports/contradicts ranked higher
   Creative work: inspires/foreshadows ranked higher

② ThoughtRank of the connected Unit
   Relations with higher-importance Units ranked higher

③ Recency
   More recently formed relations likely more relevant

By default, top 3–5 relations shown on the card; "See more" for full view. Relations defined in the current Context's Perspective are ranked above global relations.

Same for attributes: at most 10 directly exposed to the user; only those most relevant to the current work state shown by default; rest accessible via "Details."

Context Dashboard

Displays total Unit count, incomplete questions, key hub Units, unaddressed counterarguments, unsupported claims, presence of cycles, and recommended entry points.



16. Views and Display

Design Principle

The same Units must appear differently based on purpose. Grasping the overall distribution and deeply exploring around a specific Unit require completely different interfaces. Views are interconnected. A selection in one view is immediately reflected in others.

Graph View — Two Layers

Layer 1: Full Overview (Global View)

Small dots and thin lines only. The purpose is to read the overall distribution without aesthetic overload.

Nodes: small dots, type-based color (2–3 hues)
Edges: thin lines, no weight or sizing
Clusters: auto-detected via Louvain algorithm; same-cluster nodes grouped spatially

Analyzable: isolated Contexts, bridge Units connecting multiple clusters, cross-Context connection/divergence states, orphan Unit distribution.

Layer 2: Local Exploration View (Card Array)

Triggered by clicking a hub node or Context in the global view. Not a graph — a contextual card board.

Loads only Units within relation depth N of the selected node (N set by user). Arranged as cards following the Domain Template's layout. A software design template shows Entity → Behavior → Constraint flow; an argumentative essay template shows a Claim → Evidence → Counterargument vertical stack.

Key attributes (type, certainty, evidence_domain) are directly displayed on cards. Navigation purpose relation weights apply in the card array too.

Global View → [click hub] → Local Card Array → [click card] → Unit Detail

Thread View

Linear navigation in chronological or derivation order. Each Unit is stacked vertically as a card. Branch points display a fork indicator; a branch-switch button jumps to another flow. Chunk boundaries are marked with visual dividers.

Assembly View

Drag Units to arrange their order; that arrangement becomes the structure of the output document. Assembly Template pre-defines slots, and empty slots are visually distinguished.

Assembly Diff

Side-by-side comparison of two Assemblies. Units present in only one side and Units in different order are color-visualized.

Context View

Filters to show only Units belonging to a specific Context.

Search View

4-layer search interface. Natural-language queries like "things I claimed about social media" are possible.

Context Dashboard

Displays total Unit count, incomplete questions, key hub Units, unaddressed counterarguments, unsupported claims, cycle presence, and recommended entry points.

Cross-view Coordination

Selecting a Unit in any view synchronizes the others.

Click Unit in Graph View → scroll to that Unit in Thread View
Select Unit in Thread View → highlight corresponding node in Graph View
Click Unit in Assembly View → highlight connected nodes in Graph View
Click "hub Unit" in Context Dashboard → switch to Local Card Array



Part 6: How Thoughts Become Reality



17. Execution Layer

Design Principle

There must be no discontinuity between thinking and action. Execution is a natural extension of thought. At the same time, if Flowmind degrades into a task tool, its core value is diluted. All features in this section deal with "execution arising from thinking"; execution management itself is delegated to dedicated tools (TIMEMINE, Todoist, etc.).

Format-specific Unit Conversion Rules

When exporting an Assembly, conversion rules apply per Unit type and format.

Unit Type
Essay
Presentation
Email
Social
Claim
Core sentence of body paragraph
Slide headline
First sentence
Impact one-liner
Evidence
Footnote or citation block
Data slide
Supporting paragraph
Highlighted stat
Question
Section heading or exploratory question
Discussion slide
Clarifying question
Open question
Counterargument
"However" paragraph
Counterargument slide
Concern
Debate point
Assumption
Explicit premise note
Premise slide
Conditional paragraph
—
Observation
Background paragraph
Context slide
Situation description
Shared observation


Bridge Text

Units in an Assembly are listed without connecting sentences. When exporting, AI auto-generates logical connecting sentences between Units. Bridge Text is not a Unit. It is glue that exists only within the exported Assembly and does not contaminate the original Unit graph.

Users can accept/modify/delete Bridge Text. There is also an option to confirm Bridge Text and save it as a new Unit.

Partial Export

Export only Units meeting specific conditions, not the entire Assembly.

Specific type only: "Extract only Claim Units from this Assembly to create a summary"
Specific Context membership: "Only Units belonging to the marketing Context"
Specific evidence_domain: "Version including only external_public evidence"
Confirmed Units only: "Version excluding unreviewed AI-generated content"

Export History

Tracks when and in what state each Assembly was exported.

Export History:
  2026-03-15  PRD v1  →  Google Docs
  2026-03-17  PRD v2  →  Notion
               "3 Units have changed since the last export.
                Export an updated version?"

AI Prompt Auto-generation

Selecting relevant Units automatically generates a structured prompt including background, key claims, constraints, and open questions. Can be directly injected into external AI tools like Claude Code via Context Export API.

Action Unit

The one thing that distinguishes Flowmind's Action Unit from a task in a regular to-do app: the decision-making history of what thinking led to this action is preserved as relations. "Why do I need to do this?" never needs to be reconstructed.

Execution management itself is delegated to dedicated tools.

Execution type
Integrated services
Schedule
Google Calendar, TIMEMINE
To-do
Todoist, Apple Reminders
Communication
Email, KakaoTalk, Slack
Appointment/visit
Google Maps, KakaoMap
Purchase
Coupang, Amazon


When an Action is completed, Flowmind proposes creating a result record Unit. This result connects to the original decision-making Units, becoming a reference for the next similar decision. This is the path through which real-world experience re-enters Flowmind.



18. Feedback Loop

When an action is completed, creation of a result record Unit is proposed. This result Unit connects to the original decision-making Units and becomes a reference for the next decision.

Incubation Queue: Stores incomplete but valuable Units and periodically surfaces them.

Compression: Detects variations of similar claims and proposes extracting the common core.

Thought Versioning: Preserves previous versions when a Unit is modified, enabling tracking of how thinking has evolved over time.

Tension Detection: AI detects mutually contradictory claims within the same Context.

Orphan Unit Recovery: Periodically shows Units not included in any Assembly: "These thoughts haven't been used yet."



Part 7: How Users Customize the System



19. Projects and UI Customization

Purpose-optimized UI Environments

A project is not just a folder but a UI environment optimized for a specific purpose.

Project type
Default view
Navigation pattern
Literary work version comparison
Diff View
Version-by-version parallel
Pros/cons debate
Two-column
Claim→Counterargument→Rebuttal
Historical causation
Timeline + Causal Graph
Chronological + causal
Business problem solving
Problem Tree
Problem→Cause→Solution
Personal daily record
Journal View
Date order
Philosophy/religion exploration
Deep Dive View
Depth-first exploration
Poetry/song lyrics
Flow View
Inspiration flow order


MVP starts with selecting pre-defined templates; later evolves to composing fully custom layouts by combining view blocks (Timeline, Graph, Diff, Column, Tree).

Drift Detection & Branch Project

As Units keep being created, a flow that departs from the original project purpose can emerge.

Unit {
  drift_score:  0.0–1.0  ← semantic distance from current project purpose
  drift_from:   project/context ID
}

When Drift Score exceeds the threshold, AI proposes three options:

"The Units being created are drifting from [original project]'s
 purpose. What would you like to do?

 ① Split into sub-context
    Keep connection but create separate exploration space

 ② Branch into new project (Branch Project)
    Create independent project. Reference
    relation with original project maintained.

 ③ Ignore and continue"

Branch Project structure:

Project {
  branched_from:    original project ID
  branch_reason:    why it branched
  shared_units[]:   list of Units shared between both projects
}



20. Domain Template

Concept

A Domain Template is a fully pre-designed operational guide based on the project's purpose domain. When a user selects a domain, the full frame suited to that domain is activated. It is a cross-cutting element spanning layers 1–5, operating not just as an initial setup but as a continuous guide throughout the entire project lifecycle.

Three Types of Domain Templates

System default templates: Pre-designed domain packages provided by Flowmind. Software design, nonfiction writing, investment decision-making, academic research, etc. Includes types/relations/scaffold questions/gap detection rules/Assembly list.

Freeform template: Unconstrained. Only base types (claim/question/evidence...) are active; the rest the user builds up. Used when purpose is unclear or in exploratory stage.

User-defined templates: Saved patterns from freeform work, or existing templates modified and saved. Reusable for teams or repeating tasks.

Constraint Level Selection

Choose one of three at project start:

Strict   → Only types/relations defined in template are allowed
           Warning when creating Units outside template
           Goal consistency is the top priority

Guided   → Base types/relations + additions allowed (default)
           Detects deviations and alerts but does not block

Open     → No constraints
           Only AI suggestions, no enforcement
           Suitable for exploration stage or freeform

Components of a Domain Template

Domain-specific Unit types: Software design: Entity/Attribute/Behavior/Constraint/Interface/Flow/Decision/OpenQuestion. Nonfiction writing: Thesis/Evidence/Counterargument/Scene/Source. These types are added on top of the base types.

Domain-specific relation types: In software design, relations in domain language like implements (interface implements a feature), validates (test validates a feature).

Scaffold Units: Key questions pre-planted in the graph from the start. Enables starting by answering questions instead of facing a blank screen.

Scaffold questions for software design template:
  [OpenQuestion] What is the core problem this software solves?
  [OpenQuestion] Who are the primary users?
  [OpenQuestion] Why are existing solutions insufficient?
  [Entity_Placeholder] Core entities of the system
  [Constraint_Placeholder] Non-negotiable constraints
  [Decision_Placeholder] Most important technical decisions

Required context slots: Categories of background knowledge that must be present to produce good outputs in this domain. Pre-created as Resource Unit slots.

Recommended navigation order: For software design, "understand problem → define user → decide core features → technical decisions → detailed spec" is the natural order. This flow is pre-set as the recommended Navigator.

Available Assembly list: Outputs that can be produced in this domain and the slot structure of each Assembly.

Software design template Assembly list:
  PRD          → Problem + UserStories + Requirements + Metrics
  Feature Spec → Overview + UserStories + FunctionalReq + EdgeCases
  DB Schema    → Entities + Attributes + Relations
  API Spec     → Endpoints + RequestResponse + AuthRules
  Investor Pitch → Problem + Solution + Market + Team

Gap detection rules: Conditions that indicate a complete graph in this domain.

Software design gap detection rules:
  - Every Behavior Unit must have a corresponding Interface Unit
  - Every Entity must have at least one Attribute
  - Every OpenQuestion must be answered or explicitly deferred
  - Every constraint must have a verification method linked

AI live guide: A companion guide that tells you, based on the current graph state, what to do next.

Current graph state:
  3 Entity Units
  0 Behavior Units
  No connected relations

Recommended next step:
  "Define what the entities can do."

Key questions still unanswered:
  - Primary users have not been defined
  - Core tech stack decision is missing

Freeform → Formal Template Export

You can export from a freeform template to a formal template.

AI analyzes existing Units and proposes type mapping: "This Unit looks like a Behavior; that one looks like an Entity." Once the user reviews and confirms, relations and attributes are also converted to corresponding formats. Not fully automatic — user confirmation is required.

Domain Template Examples

Software design     → PRD, Feature Spec, DB Schema, API Spec
Nonfiction writing  → Chapter outline, Argument structure, Manuscript, Publisher pitch
Investment decision → Investment memo, Risk analysis, Execution plan
Academic research   → Research proposal, Literature review, Paper structure
Legal argument prep → Case analysis, Argument structure, Legal brief
Policy/social proposal → Policy analysis, Stakeholder analysis, Proposal
Film/novel development → Synopsis, Character arc, Plot structure



21. Completeness Compass

Concept

The Completeness Compass is a feature where AI analyzes the current graph state and tells you how far you are from the destination. It can be explicitly invoked when the user wants it, or auto-refreshes periodically.

It provides three specific pieces of information, not just a simple progress percentage.

Three Pieces of Information

What has been confirmed so far:
Problem definition ✓ (Confirmed Unit exists)
Core user definition ✓
3 major features ✓

What is still missing (the key):
→ Constraint conditions for each feature are missing
→ Tech stack decision is missing
→ Competitive product analysis is missing
→ No Interface Unit corresponding to "authentication feature"
→ No Attributes defined for Entity "user"

What outputs can be produced with the current state:
PRD draft         → 70% (technical section empty)
Investor pitch    → Sufficient
Feature Spec      → Still lacking (constraint conditions needed)
DB Schema         → Still lacking (Entity definition incomplete)

Why It Matters

Because the user can know when to stop. If the goal is an investor pitch, the current state is sufficient; if the goal is a PRD, more constraint conditions need to be filled. The system tells you this without forcing or interrupting — it only acts as a compass.

Relationship with Domain Template

The judgment criteria of Completeness Compass come from the Domain Template's gap detection rules. The template defines "conditions for a complete graph in this domain," and the Compass compares the current graph against those conditions. In freeform template, the Compass only provides the list of "Assemblies that can be created now" without completeness conditions.



22. Appropriate Usage Patterns and Onboarding Guide

Conditions Where Flowmind Creates Real Value

Flowmind is not a tool for managing all information. Real value only emerges in purposes involving thought derivation, argument structure, long-term exploration, and re-entry.

Core use cases:
Essay/argumentative writing / Research-based writing / Book preparation
Complex decision-making exploration / Personal philosophical/intellectual inquiry / Startup idea validation
Connecting book/lecture content to personal thinking / Deep long-term exploration of complex topics
Paper/literature-based research
Exploring important personal decisions (career change, direction, etc.)

Common thread: all are "problems that don't yield immediate answers."

Inappropriate Usage Patterns

The following types do not align with Flowmind's design purpose. Onboarding and inline nudges help users recognize this.

Misuse as information storage:
Pasting entire news articles, papers, or blog posts → Store as Resource Units only; create Thought Units when thinking derives from them. Bookmarking only → Pocket or Readwise is more appropriate.

Misuse as task management:
Managing entire to-do lists as Action Units → TIMEMINE or Todoist is more appropriate. Project management, kanban → Notion is more appropriate.

Attribute-listing type information:
When only parallel information is listed without thought derivation, Graph View becomes meaningless and relation recommendations become forced. In this case, store as Resource Unit; create Thought Units when thinking derives from them.

Turning taste questions into arguments:
Attempting to make preference questions (blue vs. red) into matters of right and wrong → AI switches to question mode in Epistemic Humility Mode.

Inline Intervention Guide

Intervention principle: do not interrupt. Once rejected, it never appears again.

Detected pattern
Intervention
Large external text pasted in bulk
"Is there any thinking of yours derived from this text? Just creating a Unit for that part is enough."
AI-generated ratio exceeds 40%
"There's more AI-created content than your own thinking right now. Want to check what you directly wrote?"
Attribute listing detected
"These pieces of information seem to have more of a parallel relationship than a derivational one. How about saving as a Reference?"
Taste question becoming an argument
"This might be more of a preference issue than a matter of right or wrong."
Unverifiable claims keep accumulating evidence
"There are multiple Units with ai_trust_level: uncertain. It would be good to verify the sources directly."




Appendices



A. Metadata Reference

A-1. Cognitive Classification

Field
Values
Set by
`type`
claim/question/evidence/counterargument/observation/idea/definition/assumption/action + domain types + custom types
AI suggests → user confirms
`certainty`
certain/probable/hypothesis/uncertain
AI suggests → user
`completeness`
complete/needs_evidence/unaddressed_counterarg/exploring/fragment
AI suggests
`abstraction_level`
principle/concept/case/detail
AI suggests
`perspective`
text-based perspective description
User
`stance`
support/oppose/neutral/exploring
AI suggests → user


A-2. Perspective Layer

Unit's type and relations are managed not as global fields but as a perspectives array. Different types and relations can exist per context.

perspectives: [
  {
    context_id:   context ID
    type:         type in this context
    stance:       stance in this context
    importance:   importance in this context
    relations:    list of relations in this context
    note:         user's per-context memo
  }
]

A-3. Status

Field
Values
Set by
`lifecycle`
**draft / pending / confirmed** / deferred / complete / archived / discarded
AI + user
`quality`
raw/refined/verified/published
AI + user
`action_required`
true/false
AI suggests
`flagged`
true/false
User
`pinned`
true/false
User
`incubating`
true/false
User/AI
`locked`
true/false
User


A-4. Temporal

Field
Description
`created_at`
First creation timestamp
`modified_at`
Most recent modification timestamp
`last_accessed`
Last time it was opened
`captured_at`
Original creation time of external input
`valid_until`
Expiration date
`temporal_context`
Contextual era validity like "as of Q1 2026"
`recurrence`
Incubation re-surfacing interval


A-5. Provenance

Field
Description
`origin_type`
direct_write / external_excerpt / external_inspiration / external_summary / ai_generated / ai_refined
`source_url`
External source URL
`source_title`
Source title
`author`
Original author of the thought
`is_quote`
Whether this quotes someone else
`ai_trust_level`
**verified / inferred / uncertain**
`conversation_id`
Link to original conversation if derived from AI chat
`parent_input_id`
Which original text was this decomposed from
`source_span`
Position within original text (position + original_excerpt)


A-6. Evidence Character

evidence_domain — where this Unit came from:

Value
Meaning
`external_public`
Externally verifiable public fact
`external_private`
External but non-public fact (team capabilities, internal data)
`personal_event`
Event I personally experienced
`personal_belief`
My values, beliefs, motivation
`personal_intuition`
Hard-to-articulate internal signal
`reasoned_inference`
Reasoning combining the above domains


scope — how far this Unit applies:

Value
Meaning
`universal`
Applies to anyone, any era
`domain_general`
Applies across an entire field
`domain_specific`
Applies only in specific conditions
`situational`
Applies only at a specific time/context
`interpersonal`
Applies to a specific relationship or group
`personal`
Applies only to me


Scope jump warning: If a personal scope piece of evidence supports a universal scope claim, AI warns.

A-7. Relations

Relations reside inside each perspective.relations[]. Attributes of each relation object:

Attribute
Description
`to`
Target Unit ID
`type`
See full relation type list below
`strength`
0.0–1.0
`purpose[]`
navigation/argument/context/reference
`created_at`
Relation creation timestamp
`direction`
one-way/bidirectional


Full system relation types:

Argument-centered:
  supports, contradicts, derives_from, expands,
  references, exemplifies, defines, questions

Creative/research/execution-centered:
  inspires, echoes, transforms_into, foreshadows,
  parallels, contextualizes, operationalizes

Structure/presupposition/containment-centered:
  contains, presupposes, defined_by,
  grounded_in, instantiates

Custom relations (CustomRelation): name, from, to, scope (private/shared), reusable (false/true), created_at. When reusable=true, it becomes a library.

chunk_memberships[] — which Chunks it belongs to; differs per navigation purpose.

A-8. Context and Membership

Field
Description
`contexts[]`
Belonging contexts. Multiple allowed
`primary_context`
Most representative context
`assemblies[]`
Assemblies this Unit is included in
`navigators[]`
Navigators this Unit is included in
`project`
Belonging project
`depth_in_branch`
Depth within branch. Root=0
`drift_score`
Semantic distance from current project purpose (0.0–1.0)
`drift_from`
Which project/context is this drifting from


A-9. AI Analysis

Field
Description
`embedding`
Vector for semantic search
`importance`
ThoughtRank score
`branch_potential`
Derivation potential. Displayed as ●●●○ in UI
`tension_flags[]`
Contradiction detection results
`suggested_next_types[]`
Recommended types for what should come next
`similar_units[]`
Semantically similar Units
`orphan`
Not included in any Assembly
`gap_detection`
What is missing in the argument structure
`readability_score`
Refinement level score
`language`
Auto-detected text language
`controversial_flag`
Is this a topic without social consensus
`loop_score`
Argument cycle detection score
`scope_jump_flag`
Is the evidence's scope narrower than the claim's scope
`navigation_weight`
Real-time rendering weight based on current navigation purpose


A-10. Tags

semantic_tags:   ["existentialism", "character", "1950s"]
functional_tags: ["to_borrow", "needs_verification", "key_evidence"]
status_tags:     ["incomplete", "provisionally_set", "considering_discard"]
relation_tags:   ["hub", "orphan", "branch_point"]

A-11. User-defined

domain, energy_level (high/neutral/low), mood, color, icon, note, alias[]

As energy_level accumulates, AI can provide metacognitive feedback: "You tend to write uncertain observations when energy is low."

A-12. Versioning and History

version, version_history[], change_reason, branched_from, diff_summary (AI auto-generated)

A-13. Execution Links

action_status, linked_calendar_event, linked_task, deadline, decision_log

A-14. Assembly Source Map

Specifies at the Assembly level what combination of sources the Assembly is composed of.

Assembly {
  source_map: [
    {
      resource_unit_id:   Resource Unit ID of external text A
      contributing_units: [Unit #3, Unit #7]
      contribution_ratio: 0.4
    },
    {
      origin:             "directly written"
      contributing_units: [Unit #1, Unit #2]
      contribution_ratio: 0.35
    }
  ]
}

A reference list is auto-generated when the Assembly is exported.



B. Reasoning Chain

A structure that explicitly represents the path through which Units with different evidence_domain and scope values connect to reach a final conclusion.

ReasoningChain {
  id:    chain ID
  goal:  the conclusion this reasoning aims toward
  steps: [
    {
      unit_id:         Unit ID
      role:            foundation / motivation / validation /
                       inference / conclusion
      evidence_domain: domain of this step
      scope:           scope of this step
      transition:      logic for moving to the next step
    }
  ]
}

Example — business idea:

[personal_event / personal]
"I have experienced this problem for 10 years"  →  role: foundation

[personal_belief / personal]
"This problem is worth solving"  →  role: motivation

[external_public / domain_general]
"This market is worth $5 billion annually"  →  role: validation

[reasoned_inference / domain_specific]
"Solving this problem creates a meaningful business"  →  role: inference

[claim / situational]
"I should start this business now"  →  role: conclusion



C. Feature Reference

Editing
Content modification (auto version save), splitting (drag to specify boundary + relation re-attribution proposal), merging, refinement request (original preserved), translation (original preserved), compression (original preserved), expansion, tone conversion.

Relations
Add relation (select system type or custom), auto-suggest relation, delete relation, adjust relation strength, query reverse relations, create branch, view branch recommendations, manage custom relation type library.

Context and Membership
Add/remove context, auto-suggest context, add to Assembly, add to Navigator, move to project, check Chunk.

AI Utilization
Argument gap analysis, counterargument generation (Draft state), evidence search, similar Unit search, contradiction check, branch draft generation, prompt packaging, external knowledge connection, type reclassification suggestion, Epistemic question generation, scope jump warning, evidence_domain analysis, Reasoning Chain generation, Completeness Compass query, AI live guide invocation.

Exploration and Query
View full relation graph (per Perspective + per navigation purpose weight), view version history, Assembly reuse history, auto-generate Navigator, view Context Snapshot, view Assembly Source Map, reverse source tracking.

Execution Links
Convert to action, calendar registration, to-do creation, export to document (with references), checklist generation.

Management
Duplicate (relations not copied), archive, discard, lock, share, register to Incubation, pin importance.



D. Technical Architecture

Data Storage

Text search:    Typesense or Elasticsearch
Vector search:  pgvector (PostgreSQL extension)
Graph query:    PostgreSQL recursive CTE → later Neo4j
Temporal query: standard RDBMS

MVP uses PostgreSQL + pgvector for integrated processing. When scale grows, only the graph portion is separated to Neo4j.

Full System Flow

Input (text, audio, image, external clip)
        ↓
Capture Engine
(format detection, basic segmentation, source_span generation)
        ↓
Knowledge Connection Prompt
(for external knowledge input: "In what context did you bring this?")
        ↓
AI Processing Layer
(decomposition proposal, type tagging, relation inference, embedding generation,
 evidence_domain detection, scope calculation, drift_score calculation)
        ↓
Storage Layer
(PostgreSQL + pgvector + graph)
        ↓
Query Layer
(ThoughtRank, multi-layer search, navigation weight calculation)
        ↓
View Layer
(Thread / Graph (per Perspective + weight) / Assembly /
 Context / Dashboard)
        ↓
Execution Layer
(document generation + source_map, Calendar API, prompt generation,
 external service bridge)
        ↓
Feedback Loop
(results → new Unit proposals)



E. Design Principles

Thoughts first, documents second. A document is simply a purposeful combination of thoughts.
Format is a means of expression, not a container.
AI amplifies but does not replace. Selection and judgment always belong to the user.
Prepay the context restoration cost at save time.
No thought is discarded by structure.
Thinking and context engineering are the same act.
Execution is an extension of thinking.
Auto-tags are suggestions. AI can be wrong; the user knows the context better.
Decomposition boundaries depend on purpose. There is no single correct answer.
This tool proves its own necessity.
AI-generated content is raw material for the user's thinking, not the thinking itself.
AI cannot complete thinking. On controversial topics, AI draws the map; it does not set the destination.
A Unit's content is global. Its interpretation differs by context.
The provenance and scope of knowledge must be made explicit.
General knowledge becomes raw material for thinking only when connected to personal context. Connection, not storage, personalizes knowledge.



F. Competitive Comparison

Tool
Strength
Argument types
Re-entry
AI context
Execution
Perspective
Domain Template
Obsidian
Local, links
✗
✗
Plugin
✗
✗
✗
Tana
Type tagging
Partial
✗
✗
✗
✗
✗
Heptabase
Visual exploration
✗
✗
Developing
✗
✗
✗
Kialo
Argument visualization
✓
✗
✗
✗
✗
✗
**Flowmind**
**Full cognitive cycle**
**✓**
**✓**
**✓**
**✓**
**✓**
**✓**




G. Product Identity

Core Values

Re-entry — Return to the exact state of thinking you were in before.
>
Non-loss — No thought is discarded by structure.
>
Multi-purpose Composition — The same thought is reused infinitely for different purposes.
>
Amplification — Pull the potential of your thoughts beyond the current limits of your ability.

In One Sentence

Flowmind is not a tool for storing thoughts. It is a cognitive interface that preserves the flow of thinking itself, amplifies it, and connects it to action.



H. Relation Type Glossary

A reference dictionary users consult when deciding the relation between two Units. Accessible from within the app at any time.

Argument-centered

supports
Definition: This Unit logically backs the other Unit's claim or judgment
When: When evidence directly supports a claim
Example: "Research showing coffee improves concentration" → supports → "Caffeine helps cognitive ability"
Watch out for: exemplifies (an example is a more concrete instance than support)

contradicts
Definition: This Unit logically conflicts with the other
When: When pointing in the opposite direction on the same topic
Example: "Caffeine causes anxiety" → contradicts → "Caffeine helps concentration"
Watch out for: questions (questioning is exploration, not refutation)

derives_from
Definition: This Unit is logically derived from the other
When: Reading A led to thinking B
Example: "Therefore we must lower prices" → derives_from → "Competitors are taking market share"

exemplifies
Definition: This Unit is a concrete instance of the other Unit's principle/claim
When: Attaching a real-world case to an abstract claim
Example: "The iPhone popularized touchscreens in 2007" → exemplifies → "Technological innovation is a new combination of existing concepts"

questions
Definition: This Unit raises doubt about the other
When: Keeping the premise or logic of a claim open for exploration
Example: "But did this study only measure short-term effects?" → questions → "Caffeine helps concentration"

defines
Definition: This Unit clearly defines a key concept of the other
When: Specifying terminology
Watch out for: defined_by (direction is reversed — this Unit is defined by the other)

references
Definition: This Unit references the other as background material
When: Not directly supporting but connecting as related material

expands
Definition: This Unit develops the other more concretely
When: Digging deeper in the same direction



Creative / Research / Execution-centered

inspires
Definition: This Unit is the creative spark for the other
When: Not a direct logical connection, but it was the seed of an idea
Example: "Meursault's emotional suppression" → inspires → "My novel protagonist's sense of disconnection"

echoes
Definition: Shares the same pattern or structure across different contexts
When: The same principle operates even in different domains
Example: "Natural selection in biological evolution" → echoes → "Product selection mechanism in the market"

transforms_into
Definition: This idea morphs into that form
When: A concept developed and evolved into a different form

foreshadows
Definition: In creative writing, this Unit is a foreshadowing of the other
When: In narrative structures like novels and screenplays

parallels
Definition: Similar structure but independent
When: Comparing but no causal connection
Watch out for: echoes (echoes shares the same pattern; parallels has similar structure but is independent)

contextualizes
Definition: This Unit provides background context needed to understand the other
When: Not direct support or refutation, but provides a frame of understanding
Watch out for: grounded_in (direction reversed — this Unit is grounded in the other)

operationalizes
Definition: This Unit converts the other's theory/principle into actual action
When: Going from research or observation to action



Structure / Presupposition / Containment-centered

contains
Definition: A contains B as a component (hierarchical inclusion)
When: A higher concept has lower concepts as its components
Example: "Lean Startup Methodology" → contains → "Build-Measure-Learn Loop"
Watch out for: Different from context membership. contains is hierarchical; contexts are horizontal groupings

presupposes
Definition: This Unit requires the other Unit as a prerequisite
When: A must be true for B to have meaning
Example: "This business is profitable" → presupposes → "The market is large enough"

defined_by
Definition: The key concept of this Unit is defined by the other
When: There is a separate definition Unit for the concept

grounded_in
Definition: The background context of this Unit lies in the other
When: Specifying what background this thought arose from
Watch out for: presupposes (presupposes is logical prerequisite; grounded_in is contextual background)

instantiates
Definition: This Unit is a concrete instance of the other's principle/theory
When: Connecting a principle Unit to a Unit that is its real-world implementation
Watch out for: exemplifies (exemplifies is an example of a claim; instantiates is an implementation of a principle)



Domain Template Relation Patterns

Software design:
Entity → has_attribute → Attribute
Behavior → implements → Interface
Behavior → requires → Constraint
Decision → operationalizes → Behavior
Interface → validates → Behavior

Argumentative essay:
Claim → supports ← Evidence
Claim ← contradicts ← Counterargument
Counterargument ← contradicts ← Rebuttal
Claim → exemplifies ← Example

Investment decision-making:
Signal → supports → Thesis
Risk → contradicts → Thesis
Assumption → presupposes → Thesis
Thesis → operationalizes → Action



I. Product Gaps

Features not yet designed for the complete product. Prioritization requires discussion.

Onboarding flow
The first-5-minutes experience is not designed. An experience flow starting from "Just write down one thought in your head right now" through first Unit → first relation → first Context. The Strict/Guided/Open selection should also be naturally guided at this stage.

Mobile Capture
Thoughts burst out while on the move. Capture Mode is half-complete without voice input, quick text, and a home screen widget.

Global search UI
The 4-layer search engine is designed, but the UX for how to actually search is absent. A natural language search interface and filter combination UI are needed.

Import from other tools
How to migrate notes from Obsidian, Notion, or Roam to Flowmind. Essential for acquiring existing PKM users.

Data ownership and privacy policy
It is not specified what data goes to the server, whether local processing options exist, or whether data is used for AI training. Essential for building trust, as this tool handles the most personal thoughts.

Full export/backup
Exporting all Units, relations, and Assemblies to a user-owned format (JSON, Markdown). Essential for acquiring users who reject tool lock-in.

Keyboard shortcuts / power user mode
An interface for creating Units, connecting relations, and switching Contexts using only the keyboard. Work speed directly affects productivity.

Notification policy
How and when to send Incubation Queue re-surfacing, Completeness Compass updates, and incomplete question alerts. A policy for notifying at the right moment without interrupting is needed.

Business model
Whether it's individual subscription, B2B via Context Export API, or a Domain Template marketplace has not been decided. What to build first depends on this.



Changelog

v1.2 (Early March 2026)
Added Perspective Layer, 7 new relation types (creative/execution-centered), external text source tracking system, Drift Detection & Branch Project, appropriate usage pattern onboarding guide, evidence_domain + scope fields, Reasoning Chain, 4-dimension tag expansion, Assembly Source Map, 2 additional design principles.

v1.2 Update (March 2026)

Overview: Added 5-layer architecture diagram.

Section 4 (Thought Unit): Added principle that minimum unit criteria differ by Domain Template. Clarified distinction between Unit merge and contains relation.

Section 7 (Context): Fixed "Context is a Perspective" wording → changed to "exploration space." Clarified conceptual distinction between Context and Perspective (different layers, directions, and creation methods).

Section 8 (Relations and Branch): Added 5 structure/presupposition/containment relation types (contains, presupposes, defined_by, grounded_in, instantiates). Added custom relation type (CustomRelation) feature.

Section 9 (Text Input and Decomposition): Added knowledge connection interaction for external knowledge input ("what does this mean to you?" — the key interaction). Added relation re-attribution rules when splitting a Unit.

Section 14 (Navigator): Added relation weight changes based on navigation purpose. Relation line rendering changes in real time based on argument/creative/chronological mode.

Section 15 (Search Engine): Added relation/attribute display priority rules. Combination of navigation purpose + ThoughtRank + recency.

Section 16 (Views and Display): Full expansion. Graph View split into 2 layers: full overview (Obsidian style) and local exploration (card array). Thread View detailed description added. Cross-view Coordination added. Design principle intro added.

Section 17 (Execution Layer): Full expansion. Format-specific Unit conversion rule table added (essay/presentation/email/social). Bridge Text concept added. Partial export added. Export History added. Action Unit description simplified. Design principle intro added.

Section 20 new (Domain Template): 3 template types, 3 constraint levels, full components (scaffold Units, gap detection rules, AI live guide, Assembly list), freeform → formal export, domain list.

Section 21 new (Completeness Compass): Measuring goal-achievement distance of current graph. Provides 3 pieces of information: what is confirmed / what is still missing / what outputs can be produced now.

Former Section 20 → moved to Section 22.

Appendix A-7: Full relation type list consolidated. Custom relation type structure added.

Appendix A-9: navigation_weight field added.

Appendix E: Design principle 15 added ("General knowledge becomes raw material for thinking only when connected to personal context").

Appendix F: Domain Template column added to competitive comparison table.

Appendix H new (Relation Type Glossary): Definitions, when to use, examples, and confusion-prone type comparisons for all system relation types. Domain Template relation patterns added (software design / argumentative essay / investment decision-making).

Appendix I new (Product Gaps): 9 items: onboarding flow, mobile Capture, global search UI, Import, data ownership/privacy, full export/backup, keyboard shortcuts, notification policy, business model.



*Flowmind Product Specification v1.2 Updated — March 2026*
*Square Liquid LLC*
