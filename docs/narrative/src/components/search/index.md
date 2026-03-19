# Search Module Index

> **Last Updated**: 2026-03-19
> **Code Location**: `src/components/search/index.ts`
> **Status**: Active

---

## Context & Purpose

This file serves as the **barrel export** (a central re-export hub) for the search module, consolidating all public search-related components into a single import path. It exists to simplify imports throughout the application and establish a clear public API for the search feature.

**Business Need**: The search module contains multiple components that work together to help users find content in their knowledge base. Rather than requiring consumers to import from specific file paths (which creates tight coupling and makes refactoring difficult), this index file provides a stable, unified entry point.

**When Used**:
- When any other component needs to import search functionality
- When the global keyboard shortcuts system needs to trigger the command palette
- When pages need to render the full-screen search view

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `./SearchView.tsx`: `SearchView` - The full-screen search overlay with multi-layer filtering capabilities
- `./CommandPalette.tsx`: `CommandPalette`, `openCommandPalette` - The quick-access command palette dialog and its programmatic opener function

### Dependents (What Needs This)

- `src/components/shared/global-keyboard-shortcuts.tsx`: Imports `openCommandPalette` to wire the Cmd+K shortcut to the command palette
- Future page layouts and workspace components that need search UI

### Data Flow

```
Consumer imports from "~/components/search"
       |
       v
index.ts re-exports public API
       |
       +-- SearchView: Full search UI component
       |
       +-- CommandPalette: Quick command dialog component
       |
       +-- openCommandPalette: Function to trigger palette programmatically
```

---

## Macroscale: System Integration

### Architectural Layer

This index file sits at the **Module Boundary Layer** of the component architecture:

- **Layer 1**: Individual components (`SearchView.tsx`, `CommandPalette.tsx`)
- **Layer 2**: This index file (public API definition)
- **Layer 3**: Feature consumers (keyboard shortcuts, pages, layouts)

### Big Picture Impact

The barrel export pattern serves several architectural purposes:

**Encapsulation**: Internal implementation details (helper components like `LayerToggle`, `SearchResultItem`, `SearchResultSkeleton`) remain hidden. Only explicitly exported symbols are part of the public API.

**Refactoring Safety**: If internal file structure changes (e.g., splitting `CommandPalette` into smaller files), consumers remain unaffected as long as exports from `index.ts` stay stable.

**Import Simplicity**: Instead of remembering exact file paths, consumers use the intuitive `~/components/search` path.

### What Gets Exported

| Export | Type | Description |
|--------|------|-------------|
| `SearchView` | Component | Full-screen search overlay with text/structural/temporal layer toggles |
| `CommandPalette` | Component | Quick-access command dialog (Cmd+K) showing recent units, contexts, and actions |
| `openCommandPalette` | Function | Programmatic trigger to open the command palette from anywhere |

### What Stays Private

The following internal implementations are NOT exported:

- `LayerToggle` - Internal UI for layer filter buttons
- `SearchResultItem` - Single result rendering
- `SearchResultSkeleton` - Loading state placeholder
- `CommandItem` type - Internal type definition
- `globalOpenFn` - Internal state for programmatic opening

### Critical Path Analysis

**Importance Level**: Medium (structural, not functional)

- **If this file is missing**: Import errors cascade through the app; keyboard shortcuts fail; search becomes inaccessible
- **If exports change**: Downstream components break at compile time (TypeScript catches this)
- **Maintenance burden**: Minimal - only changes when adding/removing public components

---

## Technical Concepts (Plain English)

### Barrel Export Pattern

**Technical**: A design pattern where a directory's `index.ts` file re-exports symbols from internal modules, creating a single import path for external consumers.

**Plain English**: Like a department store with a single entrance. Shoppers (importing files) enter through one door (the index file) and access everything the store offers, rather than needing to know where each product aisle is located.

**Why We Use It**: Clean imports (`~/components/search` instead of `~/components/search/SearchView`), better encapsulation, and easier refactoring.

### Named Exports vs Default Exports

**Technical**: This file uses named exports (`export { SearchView }`) rather than default exports, allowing multiple symbols to be exported and providing explicit naming at both export and import sites.

**Plain English**: Each exported item has a specific name tag. When you import, you use that exact name, making it clear what you're getting. There's no ambiguity about "the default thing from this file."

**Why We Use It**: Named exports provide better IDE autocompletion, clearer error messages, and easier tree-shaking (removing unused code in production builds).

### Re-export Syntax

**Technical**: `export { Symbol } from "./file"` is shorthand for importing and immediately exporting, without creating a local binding in the index module.

**Plain English**: A pass-through that says "whatever `SearchView` is in `SearchView.tsx`, make it available from here too" without actually using it in this file.

**Why We Use It**: Keeps the index file minimal and purely organizational rather than containing any logic.

---

## Relationship to Search System

This index file is the entry point to FlowMind's search subsystem, which includes:

1. **SearchView**: Full-featured search with three layers
   - Text layer (content matching)
   - Structural layer (unit type, lifecycle, connections)
   - Temporal layer (date-based filtering)

2. **CommandPalette**: Quick-access via Cmd+K
   - Recent units
   - Available contexts
   - Quick actions (new thought, view switching)

3. **Backend Integration**: Both components consume `api.search.query` from the search router, which delegates to `searchService` for multi-layer search execution.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created barrel export for search module with SearchView and CommandPalette
- **Why**: Epic 6 search feature requires clean module boundaries
- **Impact**: Establishes public API for search; enables keyboard shortcut integration
