# Story 3.3: Context Sidebar with Hierarchical Tree Navigation

Status: complete

## Story

As a user,
I want a sidebar showing my Contexts in a collapsible tree structure,
So that I can quickly navigate between my exploration spaces.

## Acceptance Criteria

1. **Given** Contexts exist with hierarchical nesting, **When** the ContextSidebar component renders, **Then** it shows a project selector at the top (placeholder for Epic 9, showing "Default Project" for now)
2. Below is a collapsible tree of Contexts with parent-child nesting, expand/collapse chevrons, and active item highlighting per UX-DR12, UX-DR45
3. The sidebar has 3 width states: 260px expanded, 60px collapsed (icon-only), 0px hidden per UX-DR12
4. Collapse/expand uses 250ms slide animation per UX-DR42
5. Drag-to-reorder Contexts within the tree is supported per UX-DR45
6. Right-click opens a context menu with: Rename, Delete, Add Sub-Context, Move per UX-DR45
7. A "New Context" button is accessible at the top of the tree
8. Clicking a Context filters the main view to show only Units in that Context per FR49

## Tasks / Subtasks

- [ ] Task 1: Create ContextSidebar layout component → `src/components/context/ContextSidebar.tsx` (AC: #1, #3, #4)
  - [ ] Implement 3 width states: 260px expanded, 60px collapsed (icon-only), 0px hidden
  - [ ] Use Framer Motion for 250ms slide animation on collapse/expand
  - [ ] Add collapse toggle button (ChevronLeft/ChevronRight icon from Lucide)
  - [ ] On mobile (< 1024px), sidebar slides in as overlay from left
  - [ ] Store sidebar state in Zustand → `src/stores/sidebar-store.ts`

- [ ] Task 2: Create project selector placeholder (AC: #1)
  - [ ] Add a static "Default Project" dropdown at top of sidebar
  - [ ] Style as a muted selector with chevron-down icon
  - [ ] Mark as placeholder for Epic 9 with `// TODO: Epic 9 — real project selector`

- [ ] Task 3: Create ContextTree component → `src/components/context/ContextTree.tsx` (AC: #2, #8)
  - [ ] Fetch contexts via `trpc.context.list` query
  - [ ] Render hierarchical tree with `ContextTreeNode` recursive component
  - [ ] Each node shows: Context name, unit count badge, expand/collapse chevron (if has children)
  - [ ] Active context highlighted with `bg-[--bg-hover]` and `border-l-2 border-l-[--accent-primary]`
  - [ ] Clicking a context node updates the active context (Zustand store) and filters main view per AC #8
  - [ ] Add "All Units" option at top of tree (no context filter)

- [ ] Task 4: Create ContextTreeNode component → `src/components/context/ContextTreeNode.tsx` (AC: #2)
  - [ ] Recursive rendering for parent-child hierarchy
  - [ ] Visual indentation per nesting level (16px per level)
  - [ ] Expand/collapse chevron rotates 90° on toggle (150ms transition)
  - [ ] Collapsed state hides children with height animation
  - [ ] Keyboard accessible: Enter to select, ArrowRight to expand, ArrowLeft to collapse

- [ ] Task 5: Implement drag-to-reorder within tree (AC: #5)
  - [ ] Use dnd-kit (already installed) with `@dnd-kit/sortable` for tree reordering
  - [ ] Drag indicators show valid drop targets (indentation guides)
  - [ ] Support reordering within same level and moving between parent contexts
  - [ ] Persist new order/parent via `trpc.context.update` mutation
  - [ ] Use optimistic UI for reorder

- [ ] Task 6: Create context menu (right-click) → `src/components/context/ContextTreeMenu.tsx` (AC: #6)
  - [ ] Use Radix UI `ContextMenu` primitive
  - [ ] Menu items: Rename, Delete, Add Sub-Context, Move
  - [ ] "Rename" triggers inline edit mode on the tree node
  - [ ] "Delete" shows confirmation dialog (from Story 2.10 pattern)
  - [ ] "Add Sub-Context" creates a new context with current as parent
  - [ ] "Move" opens a context picker to select new parent

- [ ] Task 7: Create "New Context" button (AC: #7)
  - [ ] Place at top of context tree, below project selector
  - [ ] Plus icon + "New Context" label (hidden in collapsed 60px state, show only icon)
  - [ ] Opens inline name input at top of tree
  - [ ] Enter to confirm, Escape to cancel
  - [ ] Creates root-level context by default

- [ ] Task 8: Create sidebar Zustand store → `src/stores/sidebar-store.ts`
  - [ ] `sidebarWidth`: 260 | 60 | 0
  - [ ] `activeContextId`: string | null (null = "All Units")
  - [ ] `expandedNodes`: Set<string> (which tree nodes are expanded)
  - [ ] Actions: `toggleSidebar`, `setActiveContext`, `toggleNode`

- [ ] Task 9: Write tests
  - [ ] Test sidebar renders in 3 width states
  - [ ] Test sidebar animation on collapse/expand
  - [ ] Test context tree renders hierarchical structure
  - [ ] Test clicking a context updates active context
  - [ ] Test expand/collapse chevron works on tree nodes
  - [ ] Test right-click context menu appears with correct items
  - [ ] Test "New Context" button creates a context
  - [ ] Test drag-to-reorder updates context order
  - [ ] Test keyboard navigation (Enter, ArrowRight, ArrowLeft)

## Dev Notes

- The sidebar is a persistent layout component that lives in the app shell from Epic 1. This story adds the Context-specific tree content inside the existing sidebar structure.
- UX-DR12 specifies 260px expanded / 60px collapsed / 0px hidden. The collapsed state shows only icons — use Lucide `FolderTree` for the context section icon.
- UX-DR45 specifies the tree structure with expand/collapse and drag-to-reorder. Use dnd-kit's tree preset if available, otherwise build custom tree DnD with `@dnd-kit/core`.
- The active context state drives filtering in Story 3.4 — this store is the single source of truth for "which context am I viewing?"
- For the "All Units" option, use `null` as the `activeContextId` to indicate no context filter.

### Architecture References

- [Source: architecture.md] — `features/contexts/` module: ContextList, ContextHierarchy components
- [Source: architecture.md] — Zustand for client state management
- [Source: architecture.md] — dnd-kit for drag-and-drop
- [Source: epics.md#Story 3.3] — Story definition and acceptance criteria

### UX References

- [Source: ux-design-specification.md] — UX-DR12: Context sidebar — 260px expanded, 60px collapsed, 0px hidden, project selector at top, collapsible tree below
- [Source: ux-design-specification.md] — UX-DR45: Context tree — expandable tree nodes, child nesting with indentation, unit count badges, expand/collapse chevrons
- [Source: ux-design-specification.md] — UX-DR42: 250ms slide animation for sidebar collapse/expand
- [Source: project-context.md] — Apple-like design: UI chrome is invisible, content is the hero
