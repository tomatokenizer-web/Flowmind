# Story 7.10: Template Auto-Mapping for Assembly Creation

**Status: pending**

## Description
As a user,
I want the AI to automatically propose which of my existing Units fit into each slot when I create an Assembly from a template,
So that I can quickly populate structured documents without manually dragging every Unit into place.

## Acceptance Criteria

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

## Tasks
- [ ] Create `src/server/services/autoMappingService.ts` extending the `proposeSlotMappings` service from Story 7.3 with enhanced logic:
  - `generateMappingProposal(templateId, scopeUnitIds, userId)` — returns `SlotProposal[]`
  - `SlotProposal` type: `{ slot: TemplateSlot; proposedUnit: Unit | null; confidence: 'high' | 'medium' | 'low' | 'none'; alternativeUnits: Unit[] }` — include top-3 alternatives for Swap UI
  - Confidence thresholds: high ≥ 0.8, medium ≥ 0.5, low ≥ 0.3, none < 0.3
- [ ] Add tRPC procedure `assembly.generateMappingProposal`: input `{ templateId, contextId, assemblyId? }` — returns `SlotProposal[]`; if `assemblyId` is provided, scopes Units to those already in the assembly; otherwise uses all Units in the context
- [ ] Add tRPC mutation `assembly.applyMappings`: input `{ assemblyId, mappings: { slotName: string; unitId: string | null }[] }` — batch-inserts `AssemblyUnit` records in a single transaction; records the operation in undo history
- [ ] Implement undo history for mapping: store a snapshot of `assemblyUnits` before the batch-insert in an `AssemblyUndoHistory` JSON column on the Assembly model (or in a lightweight in-memory store keyed by assemblyId with TTL); add tRPC mutation `assembly.undoLastMapping` that restores the snapshot
- [ ] Create `src/components/assembly/AutoMappingFlow.tsx` — multi-step wizard component:
  - Step 1: Scope selector — "Map from current Context" or "Choose a different Context" (dropdown); shows unit count in scope
  - Step 2: Proposal review — renders `SlotProposalCard` for each slot; "Apply Mappings" CTA button; "Skip All" button
  - Step 3: Confirmation — summary of accepted/swapped/skipped counts; animated transition to normal Assembly Board
- [ ] Create `src/components/assembly/SlotProposalCard.tsx` — card for a single slot proposal:
  - Slot header: slot name, slot description (from template)
  - Proposed unit preview (first 2 lines of content, unit_type badge)
  - Confidence badge: green "High match", yellow "Medium match", orange "Low match", red "No match"
  - Three action buttons: "Accept" (green checkmark), "Swap" (swap icon → opens UnitPickerDialog), "Skip" (×)
  - If confidence === 'none': show "Empty — no matching Units found" state with "Create new Unit" and "Search" links
- [ ] Create `src/components/assembly/UnitPickerDialog.tsx` (reusable) — modal with search input and unit list; on select, calls a callback with the chosen unit; used for both Swap action here and slot filling in Story 7.3
- [ ] Integrate `AutoMappingFlow` into the Assembly creation flow: after `TemplatePickerDialog` (Story 7.3) creates the assembly and navigates to `/assembly/[id]`, detect that the assembly was just created from a template and has no units yet; auto-launch the `AutoMappingFlow` wizard
- [ ] Animate accepted slot cards into the Assembly Board on "Apply Mappings": use Framer Motion `AnimatePresence` to fly cards from their proposal positions into the board column
- [ ] Write tests: generateMappingProposal returns one proposal per template slot, confidence thresholds correctly bucketed, applyMappings batch-inserts correct AssemblyUnit records with positions matching slot order, undoLastMapping restores empty assembly state, empty-slot state renders when no unit matches

## Dev Notes
- Key files: `src/server/services/autoMappingService.ts`, `src/server/api/routers/assembly.ts`, `src/components/assembly/AutoMappingFlow.tsx`, `src/components/assembly/SlotProposalCard.tsx`, `src/components/assembly/UnitPickerDialog.tsx`
- Dependencies: Story 7.1 (Assembly + AssemblyUnit model), Story 7.3 (AssemblyTemplate model and proposeSlotMappings base logic), Story 7.2 (AssemblyBoard to enter after mapping)
- Technical approach: `autoMappingService` is a thin extension of `assemblyTemplateService.proposeSlotMappings` — it adds the `alternativeUnits` list (top-3 after the primary candidate) and maps confidence scores to the enum buckets. The undo history can be a simple JSON column `undoState Json?` on Assembly storing the previous `AssemblyUnit[]` snapshot — a full undo stack is deferred; only one-level undo is needed here. `UnitPickerDialog` should be fully generic (callback-based) since it will be reused across multiple stories.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.3 (AssemblyTemplate model and base slot mapping service), Story 7.1 (Assembly/AssemblyUnit model), Story 7.2 (AssemblyBoard editing state)
- FR17: AI auto-mapping of Units to template slots; PRD AC for Story 7.10: three-action per slot (Accept/Swap/Skip), undo history, empty-slot flagging
