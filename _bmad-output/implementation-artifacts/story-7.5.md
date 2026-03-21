# Story 7.5: Assembly Diff — Side-by-Side Comparison

**Status: pending**

## Description
As a user,
I want to compare two versions or two different Assemblies side by side,
So that I can see what changed or how two compositions differ.

## Acceptance Criteria

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

## Tasks
- [ ] Create `src/server/services/assemblyDiffService.ts` with function `computeAssemblyDiff(assemblyIdA, assemblyIdB)` that:
  - Fetches both assemblies with their ordered unit lists
  - Computes a diff using the unit IDs: units only in A (removed), only in B (added), in both (shared)
  - For shared units, compares `unit.content` hash to detect content changes
  - Returns a `DiffResult` type: `{ leftUnits: DiffUnit[]; rightUnits: DiffUnit[]; summary: DiffSummary }` where `DiffUnit = { unit; status: 'left-only' | 'right-only' | 'shared' | 'changed'; alignedWithId?: string }`
- [ ] Add tRPC procedure `assembly.computeDiff` to the assembly router: input `{ assemblyIdA: string; assemblyIdB: string }`, returns `DiffResult`
- [ ] Create page route `src/app/(app)/assembly/diff/page.tsx` accepting query params `?a=[id]&b=[id]`; fetches both assemblies and the diff result
- [ ] Create `src/components/assembly/AssemblyDiffView.tsx` — two-panel layout (left/right columns); renders `DiffUnitCard` for each unit in both panels; uses CSS grid for horizontal alignment of shared units
- [ ] Create `src/components/assembly/DiffUnitCard.tsx` — unit card with status-based color coding: left-only = red background (destructive-50), right-only = green background (success-50), shared = neutral, changed = amber background; content preview truncated to 3 lines
- [ ] Implement horizontal alignment: when a shared unit appears at different positions in each list, insert invisible spacer divs above the earlier appearance to vertically align the pair
- [ ] Create `src/components/assembly/DiffSummaryPanel.tsx` — sticky header or sidebar showing: "X added, Y removed, Z reordered, W changed" with colored counts; also renders names/links for both assemblies being compared
- [ ] Add "Compare" button to the Assembly list view (the dashboard) that opens an Assembly picker dialog, then navigates to `/assembly/diff?a=[id]&b=[id]`
- [ ] Implement click-to-scroll: clicking a `DiffUnitCard` fires a `scrollIntoView` call on the corresponding card in the other panel using a `ref` map keyed by unit ID
- [ ] Update `assemblyStore.ts` or create a separate `diffStore.ts` (Zustand) tracking `{ assemblyIdA, assemblyIdB, diffResult, hoveredUnitId }`
- [ ] Write tests: computeAssemblyDiff returns correct left-only/right-only/shared/changed classification, horizontal alignment logic places shared units at matching vertical positions, clicking a unit highlights it in both panels

## Dev Notes
- Key files: `src/server/services/assemblyDiffService.ts`, `src/server/api/routers/assembly.ts`, `src/app/(app)/assembly/diff/page.tsx`, `src/components/assembly/AssemblyDiffView.tsx`, `src/components/assembly/DiffUnitCard.tsx`
- Dependencies: Story 7.1 (assembly data model and router), Story 7.2 (UnitCard base component to extend)
- Technical approach: The diff algorithm is a simple set-based comparison of unit ID arrays — not a text diff. Use a longest-common-subsequence (LCS) algorithm on the unit ID arrays to determine optimal alignment and detect reordering. LCS can be implemented in ~30 lines with DP. For content change detection, compare `unit.content` string hash (SHA-256 first 8 chars) between the two assemblies' unit records. Horizontal alignment is achieved with CSS grid rows: pre-compute a merged row list where each row corresponds to one logical "position" and either panel may have an empty cell.

## References
- Epic 7: Assembly, Composition & Export
- Related: Story 7.1 (Assembly model), Story 7.2 (Unit card components)
- FR48: side-by-side Assembly diff with color visualization
