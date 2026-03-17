---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments: ['docs/flowmind-prd.md', 'docs/ux-design-references.md', '_bmad-output/planning-artifacts/architecture.md']
workflowType: 'ux-design'
project_name: 'flowmind'
user_name: 'Eric'
date: '2026-03-17'
lastStep: 11
status: 'in-progress'
---

# UX Design Specification — Flowmind

**Author:** Eric
**Date:** 2026-03-17

---

## Executive Summary

### Project Vision

Flowmind is a thought-unit-centric personal knowledge management application that replaces the document-first paradigm with a thought-first paradigm. Rather than forcing users to decide "where do I save this thought?", Flowmind captures each fragment of thinking as an atomic **Thought Unit** — independently existing, carrying a logical role (claim, question, evidence, idea, etc.), and connected to other thoughts through a rich directed graph of typed relations.

The core promise is fourfold:
- **Re-entry**: Return to the exact cognitive state you were in before — context is preserved, not reconstructed
- **Non-loss**: No thought is discarded by structure; all fragments are preserved regardless of what compositions are made
- **Multi-purpose Composition**: The same thought is reused infinitely for different purposes via reference, not copy
- **Amplification**: AI elevates the user's cognitive capacity — refining expression, detecting gaps, suggesting connections — without replacing their thinking

### Target Users

**Primary persona: The Deep Thinker**
- Writers, researchers, academics, entrepreneurs, and intellectuals engaged in long-form thinking
- Working on problems that "don't yield immediate answers" — essay writing, research, complex decision-making, startup validation, philosophical inquiry
- Frustrated by document-centric tools that force linear structure on non-linear thinking
- Tech-savvy enough to adopt a new paradigm, but not necessarily developers
- Primarily desktop users (laptop/desktop), with future mobile access secondary

**Key user behaviors:**
- Capture thoughts in bursts, organize later (Capture Mode vs. Organize Mode)
- Need to revisit and build upon previous thinking across days, weeks, months
- Work across multiple intellectual projects simultaneously
- Value provenance — knowing where a thought came from and why it matters
- Want AI assistance that amplifies rather than replaces their own cognition

### Key Design Challenges

1. **Paradigm education**: Users are deeply habituated to document-first workflows. The thought-unit paradigm is genuinely novel and requires careful onboarding that doesn't overwhelm while demonstrating immediate value.

2. **Complexity management through progressive disclosure**: The system has enormous depth (30+ metadata fields per unit, 20+ relation types, multiple view types, Perspective Layer, Domain Templates). The UX must feel simple on the surface while making power accessible on demand.

3. **Graph navigation that feels natural**: Unlike file trees or linear documents, users navigate a directed graph. The transition between global overview (dot-and-line graph), local exploration (card arrays), and linear reading (thread view) must feel spatial and intuitive, not disorienting.

4. **AI trust calibration**: AI proposes unit boundaries, types, relations, and amplifications. The 3-stage lifecycle (Draft → Pending → Confirmed) must be visually clear without adding friction. Users need to feel in control while benefiting from AI assistance.

5. **Cross-view coordination**: Selecting a unit in Graph View must synchronize with Thread View, Assembly View, and Context Dashboard. This interconnection must feel seamless, not jarring.

### Design Opportunities

1. **"Aha moment" through decomposition**: The first time a user pastes a paragraph and sees it decomposed into typed, connected thought units, the paradigm shift becomes visceral. This is the key activation moment to design around.

2. **Graph as thinking mirror**: The Graph View can become a genuinely novel way to see one's own thinking — revealing clusters, gaps, contradictions, and orphan thoughts. No competitor offers this at the thought-unit level.

3. **Completeness Compass as gentle guide**: Rather than a blank page or a rigid wizard, the Compass tells users "here's what you have, here's what's missing, here's what you can produce now." This is a powerful, non-intrusive way to guide complex workflows.

4. **Assembly as cognitive superpower**: Dragging thought units into different arrangements to produce essays, pitches, specs — seeing the same thoughts serve multiple purposes — is a differentiating experience that should feel effortless and even delightful.

5. **Apple-caliber design as trust signal**: For a tool asking users to rethink their entire knowledge workflow, visual polish and interaction quality are not optional — they are trust signals that the product is worth the cognitive investment of learning.

## Core User Experience

### Defining Experience

The core user action in Flowmind is **capturing a thought and watching it become connected**. This is the atomic interaction that everything else builds upon. A user types or pastes text, and the system decomposes it into meaningful thought units, proposes types and relations, and places them within the living graph of their thinking. This moment — raw text becoming structured, connected knowledge — is the beating heart of the product.

The primary interaction loop is:
1. **Capture** — Type freely or paste text (zero friction, no decisions required)
2. **Decompose** — AI proposes unit boundaries and types (user approves/adjusts)
3. **Connect** — AI proposes relations to existing units (user confirms/modifies)
4. **Explore** — Navigate the growing graph to discover patterns, gaps, and insights
5. **Compose** — Assemble units into outputs (essays, specs, pitches) by reference

The secondary loop is **Re-entry**: returning to a previous Context and receiving an AI briefing of "here's where you left off, here's what's still open" — eliminating the reconstruction cost that plagues every other thinking tool.

### Platform Strategy

- **Primary platform**: Web application (desktop browsers, responsive)
- **Input method**: Keyboard-first with mouse/trackpad for graph manipulation and card arrangement
- **Keyboard shortcuts**: Essential for power users — Linear.app-style command palette for all actions
- **Offline**: Not required for MVP; all data persists server-side with optimistic UI updates
- **Future expansion**: Mobile-responsive for reading/quick capture; native apps for offline and push notifications
- **Target browsers**: Modern evergreen browsers (Chrome, Safari, Firefox, Edge)

### Effortless Interactions

These interactions must feel completely natural with zero cognitive overhead:

1. **Thought capture**: Typing into the input area should feel as frictionless as writing in Apple Notes. No modals, no decisions about "where" — just type.
2. **Unit approval**: When AI proposes decomposition, accepting/adjusting should be a single click or keyboard shortcut per unit. The default should almost always be right.
3. **View switching**: Moving between Graph View, Thread View, and Assembly View should feel like rotating a physical object — same data, different angle, smooth transition.
4. **Context switching**: Navigating between projects and contexts should preserve spatial memory (where you were, what was selected).
5. **Search**: Natural language queries ("things I claimed about market size") should just work, returning semantically relevant results instantly.

### Critical Success Moments

1. **First decomposition** (activation moment): When a user pastes their first paragraph and sees it split into typed, connected thought units — this must produce a genuine "aha, this is different" response. If this moment falls flat, the user never returns.

2. **First re-entry** (retention moment): When a user returns to a Context after days away and receives a contextual briefing with open questions highlighted — this demonstrates the core value of preserved cognitive state.

3. **First Assembly** (power moment): When a user drags units into an Assembly and generates a draft document — seeing their scattered thoughts become a coherent output — this is when the tool becomes indispensable.

4. **First Compass check** (guidance moment): When the Completeness Compass shows what's been covered and what's missing, the user sees their thinking mapped as a landscape rather than a list.

5. **First cross-context discovery** (serendipity moment): When a thought from one project is suggested as relevant to another — the system reveals a connection the user hadn't consciously made.

### Experience Principles

1. **Capture first, organize later**: Never interrupt the flow of thinking with organizational decisions. The system absorbs raw thought and proposes structure after the fact. Capture Mode is sacred.

2. **Show the shape of thinking**: The Graph View, Completeness Compass, and Context Dashboard should make the invisible structure of thought visible — not as an abstract visualization, but as an actionable map.

3. **AI proposes, human disposes**: Every AI action is a suggestion with a clear accept/modify/reject affordance. The Draft → Pending → Confirmed lifecycle is the core trust mechanism. The user's intellectual authority is never undermined.

4. **Same data, many lenses**: Units don't move between views — views are lenses on the same graph. Switching views should feel like changing perspective on a familiar object, not navigating to a new place.

5. **Progressive revelation, not progressive complexity**: New users see a clean capture interface. Power reveals itself through use — command palette, keyboard shortcuts, advanced metadata, custom relation types — each layer accessible but never imposed.

## Desired Emotional Response

### Primary Emotional Goals

1. **Intellectual empowerment**: Users should feel their thinking capacity is genuinely amplified — not that a machine is thinking for them, but that they can think more clearly, more deeply, and more connectedly than before. The feeling of "I can see my own thinking" is the north-star emotion.

2. **Calm confidence**: The interface should radiate quiet competence. Users should never feel overwhelmed by complexity or anxious about losing something. Every interaction should communicate "your thoughts are safe, organized, and accessible."

3. **Creative momentum**: When capturing thoughts, users should feel a flow state — the tool disappears, and only the thinking remains. When exploring the graph, they should feel the excitement of discovery — "I didn't realize these ideas were connected."

4. **Intellectual ownership**: Despite AI assistance, users should always feel "these are MY thoughts, MY connections, MY arguments." The AI is a lens, not an author. This emotional boundary is critical to product identity.

### Emotional Journey Mapping

| Stage | Desired Emotion | Design Implication |
|-------|----------------|-------------------|
| **Discovery/Landing** | Intrigued curiosity — "This is different from anything I've seen" | Clean, premium design with a compelling demo of decomposition |
| **Onboarding** | Gentle confidence — "I can do this, and it's worth learning" | Guided first experience with immediate payoff (first decomposition) |
| **First capture** | Flow and freedom — "I can just think, no friction" | Minimal UI, no organizational decisions, just a text field |
| **First decomposition** | Aha moment — "It understood my thinking!" | Elegant animation of text splitting into typed, connected units |
| **Daily use** | Productive calm — "Everything is where it should be" | Consistent, predictable patterns; excellent search; Context briefings |
| **Re-entry after absence** | Relief and continuity — "It remembers where I was" | Context snapshot briefing, open questions highlighted |
| **Assembly creation** | Power and delight — "My scattered thoughts became a document" | Smooth drag-and-drop, instant preview, bridge text generation |
| **Error/confusion** | Supported, not stuck — "I can recover from this" | Clear undo, helpful empty states, non-destructive operations |

### Micro-Emotions

**Confidence over confusion**: Every UI element should have a clear purpose. Labels over icons where ambiguity exists. Tooltips for power features. Never leave the user guessing what something does.

**Trust over skepticism**: AI suggestions come with visible reasoning ("I classified this as a 'claim' because..."). The Draft → Confirmed lifecycle makes AI boundaries explicit and safe.

**Accomplishment over frustration**: The Completeness Compass and Context Dashboard provide constant feedback on progress. Users always know what they've achieved and what remains.

**Delight over mere satisfaction**: Micro-animations (unit cards settling into the graph, relation lines drawing themselves, smooth view transitions) elevate functional interactions into moments of pleasure.

**Focus over distraction**: The interface should never compete with the user's thinking. Notifications, suggestions, and system messages are unobtrusive — present when sought, invisible when not.

### Design Implications

| Emotional Goal | UX Design Approach |
|---------------|-------------------|
| Intellectual empowerment | Graph View as "thinking mirror" — make invisible thought structure visible |
| Calm confidence | Generous whitespace, soft shadows, muted colors, predictable layout |
| Creative momentum | Capture Mode removes all chrome except the text field; zero-friction input |
| Intellectual ownership | AI suggestions always appear as proposals (dashed borders, "Suggested" labels) |
| Relief on re-entry | Context briefing panel with summary, open questions, and last position |
| Power through Assembly | Satisfying drag-and-drop physics, instant preview, smooth export |
| Trust through transparency | AI contribution ratio visible, lifecycle badges clear, reasoning accessible |

### Emotional Design Principles

1. **Quiet until needed**: The interface should be a calm, white canvas. Color, motion, and alerts appear only when they carry meaning. No decorative elements compete with the user's content.

2. **Earned complexity**: Advanced features reveal themselves through natural exploration, never through menus or tutorials. The user discovers power and feels clever for finding it — not overwhelmed by it.

3. **Always recoverable**: Every action is undoable. No destructive operations happen silently. The user should never feel the anxiety of "what if I break something?" This emotional safety enables experimentation.

4. **Celebrate thinking, not tool usage**: Success metrics, animations, and feedback should celebrate what the user has *thought and created*, not how many features they've used. The product is invisible; the thinking is visible.

5. **Warmth through precision**: Apple-level design quality communicates respect for the user's intellect. Clean typography, perfect alignment, and subtle shadows say "we care about your experience as much as you care about your ideas."

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

#### Linear.app — Modern Project Management
- **What they nail**: Keyboard-first interaction, command palette (Cmd+K), buttery smooth animations, real-time sync without loading states. Every view transition feels instantaneous.
- **Transferable to Flowmind**: Command palette for all actions (create unit, switch context, search, change view). Keyboard shortcuts as the primary power-user interface. The feeling of speed and responsiveness.
- **Key pattern**: Status changes happen inline with satisfying micro-animations — no modals, no page reloads. Apply to unit lifecycle transitions (Draft → Pending → Confirmed).

#### Craft.do — Apple-like Document Editing
- **What they nail**: Typography-forward design, gorgeous card layouts, nested document structure with smooth expand/collapse. The premium feel of every interaction.
- **Transferable to Flowmind**: Card-based unit display with clean typography. The nesting/hierarchy feel for Context → Chunk → Unit navigation. Block-based content editing.
- **Key pattern**: Content blocks that can be rearranged with smooth drag-and-drop animation. Apply to Assembly View.

#### Things 3 — Task Management Perfection
- **What they nail**: Apple Design Award winner for a reason. Extreme polish in transitions, masterful use of whitespace, subtle but meaningful color usage, and the satisfying "completion" animation.
- **Transferable to Flowmind**: The emotional satisfaction of completing/confirming a unit. The hierarchy navigation (Area → Project → Task maps to Project → Context → Unit). Keyboard shortcuts for everything.
- **Key pattern**: Progressive disclosure through clean hierarchy — surface simplicity with depth available on demand.

#### Obsidian Graph View — Knowledge Visualization
- **What they nail**: Real-time force-directed graph of notes and links. Ability to filter, zoom, and navigate spatially. The "aha" moment of seeing your knowledge network.
- **Transferable to Flowmind**: Global Graph View (Layer 1) as an overview of thought structure. But Flowmind should be cleaner — white background, type-colored nodes, less visual noise. More Apple, less developer tool.
- **Key pattern**: Interactive graph with smooth zoom/pan and hover-to-reveal labels.

#### Heptabase — Visual Knowledge Cards
- **What they nail**: Cards on an infinite canvas, spatial arrangement of ideas, clean connecting lines between cards. The feeling of physical manipulation of knowledge.
- **Transferable to Flowmind**: Local Card Array (Layer 2) and Assembly View. Cards that feel physical — subtle shadows, smooth movement, satisfying snap-to-grid.
- **Key pattern**: Whiteboard-style spatial arrangement with zoom levels that reveal/hide detail.

### Transferable UX Patterns

**Navigation Patterns:**
- **Command palette** (Linear): Universal action search — Cmd+K opens a fast, fuzzy-search command palette for all operations. Essential for power users, invisible to beginners.
- **Sidebar + main content + detail panel** (Apple Notes/Linear): Three-column layout that collapses gracefully. Sidebar for navigation, main area for content, slide-in detail panel for metadata.
- **Breadcrumb trail with zoom** (Craft): Shows navigation path (Project → Context → Unit) with clickable segments for quick jumps.

**Interaction Patterns:**
- **Inline editing** (Notion/Craft): Click any text to edit in place. No separate edit mode. Unit content is always directly editable.
- **Drag-and-drop with snap** (Things 3): Smooth card rearrangement with satisfying haptic-feel snap positions. For Assembly View and card arrangement.
- **Swipe/gesture actions** (Things 3): Quick actions on cards — swipe to approve, dismiss, or tag. For mobile and trackpad users.
- **Keyboard-driven lifecycle** (Linear): Single-key shortcuts for status changes. For unit lifecycle: D(raft) → P(ending) → C(onfirmed).

**Visual Patterns:**
- **Muted type-colored accents** (Notion tags): Small colored dots or left borders indicating unit type. Never garish — pastel, subtle, informational.
- **Gentle elevation through shadow** (Apple): Cards lift slightly on hover (transform: scale(1.02), box-shadow increase). Creates depth without heavy borders.
- **White canvas with content-first hierarchy** (Craft/Apple): Near-white background, content is the hero, UI chrome is minimal and gray.

### Anti-Patterns to Avoid

1. **Feature-stuffed toolbars** (Notion's page header): Flowmind's metadata is vast, but it should never result in a toolbar with 20 icons. Progressive disclosure — show 3-5 contextually relevant actions, hide the rest behind "..." or command palette.

2. **Modal fatigue** (many apps): Never use a modal for something that can be done inline. AI suggestions should appear as inline cards or popovers, not blocking modals.

3. **Dashboard overwhelm** (Jira/Confluence): The Context Dashboard must be a concise briefing, not a statistics dump. Show 3-5 key insights, not 15 metrics.

4. **Graph-as-screensaver** (early Obsidian): The graph must be functional, not decorative. Every node click leads somewhere useful. Default zoom level shows meaningful clusters, not an indecipherable hairball.

5. **AI-as-magic-wand** (many AI tools): AI suggestions that appear without context or reasoning erode trust. Every AI action in Flowmind must have a visible "why" and a clear "reject" path.

6. **Save/sync anxiety** (older tools): Never show a "saving..." indicator that could cause anxiety. All operations should feel instant with optimistic UI and background sync.

### Design Inspiration Strategy

**Adopt directly:**
- Command palette (Cmd+K) from Linear — universal action search
- Three-column layout from Apple Notes — sidebar, content, detail panel
- Card elevation system from Apple — subtle shadows, hover lift
- Keyboard-first design from Linear — shortcuts for all frequent actions

**Adapt for Flowmind:**
- Obsidian's graph view — make it cleaner, whiter, type-colored; add two-layer (global/local) navigation
- Craft's block editing — adapt for thought units with type indicators and relation badges
- Things 3's completion animations — adapt for unit lifecycle transitions (Draft → Confirmed)
- Heptabase's card canvas — adapt for Assembly View with Domain Template layout awareness

**Avoid entirely:**
- Dense toolbars and crowded headers — use command palette instead
- Modal dialogs for routine actions — use inline interactions
- Statistics-heavy dashboards — use narrative briefings (Context snapshot)
- Decorative graphs — every visual element must be functional
- Auto-saving anxiety patterns — use optimistic UI everywhere

## Design System Foundation

### Design System Choice

**Approach: Custom Design System with Tailwind CSS + Radix UI Primitives**

Flowmind requires a custom design system built on utility-first CSS (Tailwind) with headless, accessible component primitives (Radix UI). This is neither a pure custom build nor an opinionated component library — it's a carefully chosen middle ground that maximizes both visual uniqueness and development velocity.

### Rationale for Selection

1. **Visual uniqueness is non-negotiable**: Flowmind's Apple-like, minimalist aesthetic cannot be achieved with Material Design or Ant Design's opinionated styling. The product must feel premium and distinctive to build trust for a paradigm-shifting tool.

2. **Accessibility for free**: Radix UI provides headless, fully accessible primitives (dialogs, dropdowns, tooltips, popovers, tabs) that handle keyboard navigation, focus management, and ARIA attributes — without imposing visual style. This saves months of accessibility engineering.

3. **Tailwind enables design-token-driven theming**: Design tokens (colors, spacing, typography, shadows, border-radius) are defined as Tailwind config values, creating a single source of truth that maps directly to the UX design specification.

4. **React ecosystem alignment**: The architecture document specifies React 19 + Next.js 15. Tailwind and Radix are the industry-standard pairing for custom React design systems.

5. **Speed without compromise**: Tailwind's utility classes enable rapid prototyping while maintaining pixel-perfect control. No fighting against a component library's opinions.

### Implementation Approach

- **Design tokens**: Defined in `tailwind.config.ts` — colors, spacing scale, typography scale, shadows, border-radius, animation durations
- **Component primitives**: Radix UI for interactive elements (Dialog, DropdownMenu, Tooltip, Popover, Tabs, ScrollArea, ContextMenu, Command)
- **Custom components**: Built on top of Radix primitives with Tailwind styling — UnitCard, GraphNode, ContextSidebar, AssemblySlot, CompassWidget
- **Animation**: Framer Motion for view transitions, graph animations, and micro-interactions
- **Icons**: Lucide React — clean, consistent, Apple-style line icons

### Customization Strategy

The design system is organized in three layers:
1. **Token layer** — Design tokens in Tailwind config (colors, spacing, type scale) — changes here cascade everywhere
2. **Primitive layer** — Radix UI components wrapped with Flowmind-specific styling and behavior
3. **Composite layer** — Product-specific components (UnitCard, GraphView, AssemblyBoard) built from primitives

Theme switching (light/dark mode, future custom themes) operates at the token layer only.

## Defining Core Experience

### The Defining Experience

**"Paste text, see your thinking come alive."**

Like Instagram made sharing photos with filters its defining moment, Flowmind's defining experience is **AI-assisted thought decomposition** — the user pastes or types text, and the system decomposes it into typed, connected thought units in real time. This is the interaction users will describe to friends: "I pasted my messy notes and it showed me the structure of my thinking."

### User Mental Model

Users arrive with a **document-first mental model**: text goes into a page, pages go into folders. Flowmind must gently rewrite this model without disorienting the user.

**Bridge metaphors:**
- **Text input feels like a note app** — familiar, no learning curve for the entry point
- **Decomposition feels like an editor** — AI suggests improvements, like Grammarly suggests grammar fixes, but for thought structure
- **The graph feels like a mind map** — spatial, visual, explorable — but dynamic and AI-powered
- **Assembly feels like a presentation builder** — drag items into slots, get a document out

**Mental model progression:**
1. Week 1: "It's like a smart note app that organizes my thoughts"
2. Month 1: "It's a thinking tool — I can see how my ideas connect"
3. Month 3: "It's a cognitive amplifier — I think better with it than without it"

### Success Criteria

| Criteria | Metric | Target |
|----------|--------|--------|
| First decomposition | Time from paste to seeing units | < 3 seconds |
| Decomposition accuracy | User accepts AI-proposed unit boundaries | > 80% without modification |
| Type accuracy | User accepts AI-proposed unit types | > 70% without modification |
| View transition smoothness | Animation frame rate | 60fps consistently |
| Re-entry effectiveness | Time to resume work after absence | < 30 seconds (with Context briefing) |
| Assembly speed | Time from units to draft document | < 5 minutes for simple documents |

### Novel UX Patterns

Flowmind introduces several genuinely novel interaction patterns that require careful design:

1. **Decomposition review flow**: No existing product does this. The pattern of "AI proposes unit boundaries → user adjusts → AI proposes types → user confirms" is novel. Must feel like a collaborative conversation, not a wizard.

2. **Perspective switching**: Same unit, different type/relations per Context. The UX must make this feel natural, not confusing. Mental model: "looking at the same object from different angles."

3. **Graph-to-card transition**: Clicking a node in the global graph smoothly transitions to a card array view. This zoom-in is a novel navigation pattern that must feel spatial and reversible.

4. **Completeness Compass**: A novel ambient progress indicator that shows thought-landscape completeness. Must feel like a compass, not a progress bar.

### Experience Mechanics

**1. Initiation — Capture**
- User sees a clean, minimal text field (center of main content area or Cmd+N)
- Placeholder text: "What are you thinking about?" (warm, inviting)
- Two modes available: Capture Mode (just type, no AI) and Organize Mode (AI assists)
- No decisions about project/context required upfront — can be assigned later

**2. Interaction — Decomposition**
- User finishes typing or pastes text and triggers Organize Mode
- AI analyzes text and proposes unit boundaries with smooth highlight animation
- Each proposed unit gets a subtle type-colored accent (claim = blue, question = amber, etc.)
- User can adjust boundaries by dragging handles between units
- Single click to accept each unit; bulk "Accept All" for confident users
- Relations to existing units proposed as subtle connecting lines

**3. Feedback — Visual Confirmation**
- Accepted units smoothly animate into their card form
- Cards settle into the graph with a satisfying physics-based animation
- Type badge and key metadata appear on the card
- Relation lines draw themselves to connected units
- Completeness Compass updates to reflect new additions

**4. Completion — Integration**
- New units appear in the current Context's view
- Context Dashboard updates with new statistics
- AI may suggest: "This claim has no supporting evidence — would you like to add some?"
- Units are immediately available for Assembly, search, and cross-context reference

## Visual Design Foundation

### Color System

**Base Palette — Modernistic, Clean, Apple-like**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FFFFFF` | Main background |
| `--bg-secondary` | `#FAFAF8` | Subtle warm gray for alternate surfaces |
| `--bg-surface` | `#F5F5F5` | Cards, panels, elevated surfaces |
| `--bg-hover` | `#F0F0EE` | Hover state for interactive elements |
| `--text-primary` | `#1D1D1F` | Primary text (near-black) |
| `--text-secondary` | `#86868B` | Secondary text, labels, metadata |
| `--text-tertiary` | `#AEAEB2` | Placeholder text, disabled states |
| `--border-default` | `#E5E5E5` | Ultra-subtle borders |
| `--border-focus` | `#007AFF` | Focus rings, active states |
| `--accent-primary` | `#007AFF` | Primary actions, links, active items |

**Unit Type Colors — Muted Pastels**

| Unit Type | Accent Color | Hex | Usage |
|-----------|-------------|-----|-------|
| Claim | Soft blue | `#E3F2FD` / `#1976D2` | Left border accent, type badge |
| Question | Soft amber | `#FFF8E1` / `#F57F17` | Left border accent, type badge |
| Evidence | Soft green | `#E8F5E9` / `#388E3C` | Left border accent, type badge |
| Counterargument | Soft red | `#FFEBEE` / `#D32F2F` | Left border accent, type badge |
| Observation | Soft purple | `#F3E5F5` / `#7B1FA2` | Left border accent, type badge |
| Idea | Soft orange | `#FFF3E0` / `#E65100` | Left border accent, type badge |
| Definition | Soft teal | `#E0F2F1` / `#00695C` | Left border accent, type badge |
| Assumption | Soft gray-blue | `#ECEFF1` / `#546E7A` | Left border accent, type badge |
| Action | Soft indigo | `#E8EAF6` / `#283593` | Left border accent, type badge |

**Lifecycle State Colors**

| State | Visual Treatment |
|-------|-----------------|
| Draft | Dashed border (`border-dashed`), `--bg-secondary` background, 80% opacity |
| Pending | Yellow-tinted left border (`#FFC107`), subtle yellow background tint |
| Confirmed | Solid border, full opacity, standard card styling |

**Semantic Colors**

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#34C759` | Confirmation, completion |
| `--warning` | `#FF9500` | Alerts, attention needed |
| `--error` | `#FF3B30` | Errors, destructive actions |
| `--info` | `#5AC8FA` | Informational messages |

### Typography System

**Font Stack:**
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif;
--font-heading: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
--font-mono: 'SF Mono', 'JetBrains Mono', 'Fira Code', monospace;
```

**Type Scale (based on 16px base, 1.25 ratio):**

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-xs` | 11px | 400 | 1.4 | Metadata labels, timestamps |
| `--text-sm` | 13px | 400 | 1.5 | Secondary text, badges, tooltips |
| `--text-base` | 16px | 400 | 1.6 | Body text, unit content |
| `--text-lg` | 20px | 500 | 1.5 | Section headers, card titles |
| `--text-xl` | 25px | 600 | 1.3 | Page titles, context names |
| `--text-2xl` | 31px | 600 | 1.2 | Project titles, hero text |
| `--text-3xl` | 39px | 700 | 1.1 | Landing page headings |

**Typography principles:**
- Headings use semi-bold (600) with generous letter-spacing (-0.02em for large sizes)
- Body text uses regular (400) with comfortable 1.6 line-height for readability
- Monospace for code units, API references, and technical metadata
- Maximum content width: 720px for reading comfort

### Spacing & Layout Foundation

**Spacing Scale (4px base unit):**

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing, icon padding |
| `--space-2` | 8px | Default inline spacing, badge padding |
| `--space-3` | 12px | Default card padding, button padding |
| `--space-4` | 16px | Section spacing, card gap |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section gap |
| `--space-8` | 32px | Major section spacing |
| `--space-10` | 40px | Page margins |
| `--space-12` | 48px | Large section dividers |
| `--space-16` | 64px | Page-level spacing |

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────┐
│  Title Bar (40px, minimal, macOS-style)                  │
├──────────┬──────────────────────────────────────────────┤
│          │  Toolbar (48px, minimal icons + search)       │
│ Sidebar  ├──────────────────────────────────────────────┤
│ (260px)  │                                              │
│          │  Main Content Area                           │
│ Collap-  │  (flexible, min 600px)                       │
│ sible    │                                              │
│          │  Graph / Thread / Assembly / Search            │
│ Projects │                                              │
│ Contexts │                                              │
│ Nav      │                                              │
│          ├──────────────────────────────────────────────┤
│          │  Detail Panel (360px, slide-in from right)   │
│          │  Unit detail, relations, metadata             │
└──────────┴──────────────────────────────────────────────┘
```

**Card System:**

| Property | Value |
|----------|-------|
| Border radius | 12px |
| Shadow (rest) | `0 1px 3px rgba(0,0,0,0.08)` |
| Shadow (hover) | `0 4px 12px rgba(0,0,0,0.12)` |
| Shadow (active/selected) | `0 0 0 2px var(--accent-primary)` |
| Padding | 16px (compact) / 20px (standard) |
| Gap between cards | 12px |

**Elevation system:**
- Level 0: Flat (sidebar, main background)
- Level 1: Subtle shadow (cards, floating elements)
- Level 2: Elevated shadow (popovers, dropdowns)
- Level 3: High shadow (modals, command palette)

### Accessibility Considerations

- **Contrast ratios**: All text/background combinations meet WCAG 2.1 AA minimum (4.5:1 for body text, 3:1 for large text)
- **Focus indicators**: 2px solid `--accent-primary` outline with 2px offset — visible on all interactive elements
- **Color independence**: Unit types are never indicated by color alone — always paired with text label or icon
- **Keyboard navigation**: Full keyboard access for all actions; visible focus ring; logical tab order
- **Reduced motion**: `prefers-reduced-motion` media query disables animations; transitions become instant
- **Screen reader**: All interactive elements have proper ARIA labels; live regions for dynamic updates (graph changes, AI suggestions)
- **Font scaling**: Layout accommodates up to 200% text zoom without horizontal scrolling
