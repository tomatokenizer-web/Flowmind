# Story 7.4: Bridge Text Generation

**Status: pending**

## Description
As a user,
I want AI to generate logical connecting sentences between Units in my Assembly,
So that the exported document reads as a coherent narrative rather than disjointed fragments.

## Acceptance Criteria

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

## Tasks
- [ ] Extend `Assembly.bridgeText` JSON field (added in Story 7.1) with typed schema: `BridgeTextMap = Record<string, { text: string; generatedAt: string; isEdited: boolean }>` where the key is `"${unitId_before}__${unitId_after}"`
- [ ] Create `src/server/services/bridgeTextService.ts` with functions: `generateBridgeText(assemblyId, unitIdBefore, unitIdAfter)`, `generateAllBridgeText(assemblyId)`, `updateBridgeText(assemblyId, key, text)`, `deleteBridgeText(assemblyId, key)`
- [ ] In `generateBridgeText`: fetch the content of the two adjacent Units; call the AI service (LLM API) with a prompt: "Write 1–2 sentences connecting [unitA content] to [unitB content] for a smooth narrative flow. Be concise and logical."; return the generated text
- [ ] In `generateAllBridgeText`: iterate all adjacent Unit pairs in the assembly's ordered list; call `generateBridgeText` for each pair; batch-update `Assembly.bridgeText` JSON in a single DB write
- [ ] Add tRPC procedures to the assembly router in `src/server/api/routers/assembly.ts`: `assembly.generateBridgeText` (single pair), `assembly.generateAllBridgeText`, `assembly.updateBridgeText`, `assembly.deleteBridgeText`
- [ ] Create `src/components/assembly/BridgeTextZone.tsx` — rendered between each pair of AssemblyUnitCards in the AssemblyBoard; shows bridge text if present (styled in italic, muted color, "AI-generated" label); shows a dashed placeholder button "Generate bridge" if empty
- [ ] In `BridgeTextZone`: three action buttons on hover — "Edit" (inline textarea), "Regenerate" (calls `generateBridgeText`), "Delete" (clears the entry)
- [ ] Update `AssemblyBoard.tsx` to render `BridgeTextZone` between each consecutive pair of `AssemblyUnitCard` components
- [ ] Update `assemblyStore.ts` (Zustand) to include `bridgeText: BridgeTextMap` in state; actions: `setBridgeText`, `updateBridgeTextEntry`, `deleteBridgeTextEntry`
- [ ] Add a top-level "Generate All Bridge Text" button to `AssemblyHeader.tsx`; on click, calls `trpc.assembly.generateAllBridgeText` with loading state
- [ ] Ensure bridge text is included in export by passing `bridgeText` map to the export service (Story 7.6 reads this field)
- [ ] Write tests: generateBridgeText calls AI service with correct context, bridge text stored in Assembly JSON not as a Unit, edit/delete bridge text updates only the assembly record, generate-all produces entries for all adjacent pairs

## Dev Notes
- Key files: `src/server/services/bridgeTextService.ts`, `src/server/api/routers/assembly.ts`, `src/components/assembly/BridgeTextZone.tsx`, `src/components/assembly/AssemblyBoard.tsx`
- Dependencies: Story 7.1 (Assembly.bridgeText JSON field), Story 7.2 (AssemblyBoard layout), AI service integration (Epic 5)
- Technical approach: Bridge text is stored as a JSON map on the Assembly record — not as Unit records — to preserve the constraint that the Unit graph is not modified. The key format `"unitId1__unitId2"` allows O(1) lookup. When units are reordered or removed, stale bridge text keys should be pruned on the next `generateAllBridgeText` call. The AI prompt should receive the two Unit contents trimmed to ~500 chars each to stay within token limits. Mark generated-but-not-edited entries with `isEdited: false` so exports can label them appropriately.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.1 (bridgeText JSON field on Assembly), Story 7.2 (AssemblyBoard layout), Story 7.6 (bridge text included in export)
- FR52: Bridge text generation; UX-DR13: bridge text zones between Unit cards
