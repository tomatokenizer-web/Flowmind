# Story 10.2: AI Prompt Auto-Generation from Selected Units

**Status: pending**

## Description
As a user,
I want to select Units and have the system generate a structured prompt I can use with any AI tool,
So that I can leverage my organized thinking as context for AI conversations.

## Acceptance Criteria

**Given** the user has selected one or more Units
**When** they choose "Generate AI Prompt"
**Then** the system automatically generates a structured prompt including: background (Context summary), key claims (claim-type Units), supporting evidence, constraints (assumption-type Units), and open questions (question-type Units) per FR55
**And** the generated prompt is displayed in a copyable text area
**And** the user can customize which sections to include before copying
**And** the prompt format is optimized for readability by AI models (clear section headers, numbered items)
**And** a "Copy to Clipboard" button copies the prompt with a success toast

## Tasks
- [ ] Create `server/services/promptGenerationService.ts` — `generatePrompt(unitIds, options)`: groups selected Units by type, builds sections, assembles final prompt string
- [ ] Add tRPC procedure `prompt.generate` — accepts `unitIds[]` and `sectionOptions` (which sections to include), returns generated prompt string
- [ ] Create `components/prompt/PromptGeneratorDialog.tsx` — dialog triggered from multi-select toolbar or Unit context menu; shows section toggles and generated prompt preview
- [ ] Create `components/prompt/PromptSectionToggle.tsx` — checkboxes for sections: Background, Claims, Evidence, Constraints, Open Questions
- [ ] Create `components/prompt/PromptPreview.tsx` — read-only textarea showing generated prompt with syntax highlighting for section headers
- [ ] Create `components/prompt/CopyPromptButton.tsx` — copies prompt text to clipboard, shows "Copied!" success state for 2 seconds
- [ ] Add "Generate AI Prompt" to multi-select action toolbar (shown when 1+ Units selected)
- [ ] Add "Generate AI Prompt" to single Unit context menu (right-click / kebab menu)
- [ ] Implement prompt format: `# [Context Name]\n\n## Background\n[context description]\n\n## Key Claims\n1. [claim]\n...\n\n## Evidence\n...\n\n## Constraints & Assumptions\n...\n\n## Open Questions\n...`
- [ ] If no Units of a section's type are selected, omit that section from the output
- [ ] Write unit tests for promptGenerationService section assembly
- [ ] Write integration tests for tRPC procedure with various Unit type combinations

## Dev Notes
- Key files: `server/services/promptGenerationService.ts`, `server/api/routers/prompt.ts`, `components/prompt/PromptGeneratorDialog.tsx`
- Dependencies: Story 2.1 (Unit model with unit_type), Story 2.3 (Context model for background section), Story 10.1 (prompt_package formatter is reusable — refactor exportService formatter to a shared utility)
- Technical approach: `promptGenerationService` should reuse the `prompt_package` formatter from `exportService` (Story 10.1). Refactor the formatter into a shared utility `server/utils/promptFormatter.ts` used by both. Section options default to all enabled; user can toggle off. The "Background" section uses the Context's description/name. Prompt is assembled entirely server-side to avoid leaking Unit data client-side unnecessarily.

## References
- Epic 10: External Integration & Context Export API
- FR55: AI Prompt Auto-Generation from selected Units
- Related: Story 10.1 (prompt_package format reused here), Story 10.4 (user controls what is included in exported/shared prompts)
