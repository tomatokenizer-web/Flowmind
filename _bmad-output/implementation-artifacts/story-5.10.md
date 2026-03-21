# Story 5.10: Epistemic Humility Mode for Controversial Topics

**Status: pending**

## Description
As a user,
I want the AI to detect controversial or unsettled topics and shift to a questioning mode,
So that I am guided to think critically rather than being given potentially biased answers.

## Acceptance Criteria

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

## Tasks
- [ ] Implement controversy classifier as an inline step in the `generateStructured` call: add a `controversyCheck` field to the structured output schema returning `{ isControversial: boolean, classification: string | null }`
- [ ] Add controversy classification types to a shared enum: `political | ethical | contested_science | religious | other_controversial`
- [ ] Store controversy flag in the Unit's metadata: `unit_metadata.controversy_classification` (JSONB or nullable string column)
- [ ] Create `components/ai/EpistemicHumilityCard.tsx` (UX-DR39 style) displaying the purpose-selection message with three options (a/b/c)
- [ ] Show the EpistemicHumilityCard as a non-blocking overlay when a controversial Unit is created — do not block the user from working
- [ ] Store user's exploration purpose selection in `unit_metadata.epistemic_purpose`: `all_sides | own_position | analyze_arguments`
- [ ] Modify AI suggestion prompts (type suggestion, relation suggestion, exploration directions) to check `isControversial` and switch to question-mode when true
- [ ] In question-mode prompts: rephrase outputs as questions or hypotheses rather than assertions; prefer "Question" and "Assumption" type proposals
- [ ] Suppress high-certainty Claim type proposals when `isControversial = true` (confidence threshold: do not propose Claim if confidence > 0.7 in controversial context)
- [ ] Add "Epistemic Humility" badge to all AI suggestion cards rendered for controversial-flagged Units
- [ ] Add a mode indicator to the Context toolbar when any Unit in the Context is in Epistemic Humility Mode
- [ ] On mode indicator dismiss: store `epistemic_humility_dismissed: true` in project/context settings, resume normal AI behavior
- [ ] Show the one-time exit nudge ("AI suggestions on contested topics may reflect particular viewpoints") on first dismissal only; record in user preferences
- [ ] Write tests verifying that high-certainty Claim proposals are suppressed for controversial content

## Dev Notes
- The controversy classifier runs inside the same `generateStructured` call as the main AI operation — add a `controversyCheck` field to the output schema so it costs no extra API call
- False positives are acceptable per the AC — when in doubt, flag as controversial
- The EpistemicHumilityCard should store the user's purpose selection and pass it as context to subsequent AI prompts for that Unit/Context
- The "Epistemic Humility" badge should be visually distinct from the "AI Inference" badge (Story 5.11) — consider using a different icon (e.g., a balance scale)
- This feature interacts with Story 5.9 intensity levels: even at "Generative" intensity, Epistemic Humility Mode overrides draft Unit generation for controversial topics

## References
- Epic 5: AI-Powered Thinking & Safety
- Story 5.1: AI provider abstraction — controversy classifier runs within provider calls
- Story 5.4: Type suggestion prompts modified for Epistemic Humility Mode
- Story 5.9: Epistemic Humility Mode overrides generative behavior for controversial topics
- Story 5.11: "Epistemic Humility" badge distinct from "AI Inference" badge
