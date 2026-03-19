# Relation Type Router (System Relation Types)

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/api/routers/relation-type.ts`
> **Status**: Active

---

## Context & Purpose

This module provides a read-only API for retrieving the system's built-in relation types -- the predefined vocabulary of how thought units can be connected to each other in FlowMind. Think of it as the "dictionary of relationship kinds" that ships with the application by default, before any user customization.

**Business Need**: When users create connections between units (claims, evidence, questions, etc.), they need a curated menu of meaningful relationship types to choose from. Rather than forcing users to invent labels from scratch, the system offers a structured catalogue grouped by category. This reduces cognitive load and ensures consistency across projects.

**When Used**: This endpoint is called whenever the UI needs to display the available relation types -- for example, when a user opens a dropdown or palette to link two units together, or when a relation-creation form loads its options. It serves as the foundation that the custom relation type system builds upon.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `src/server/api/trpc.ts`: `createTRPCRouter` and `protectedProcedure` -- the tRPC infrastructure that defines route structure and enforces **authentication middleware** (a checkpoint that verifies the user is logged in before the request proceeds)
- `prisma/schema.prisma`: The `SystemRelationType` model -- defines the database table holding system-provided relation types with fields for name, category, description, and sort order

### Dependents (What Needs This)
- `src/server/api/root.ts`: Registers this router under the `relationType` namespace, making it accessible as `api.relationType.list` throughout the application
- `src/server/api/routers/customRelationType.ts`: While not a direct code dependency, the custom relation type router queries the same `SystemRelationType` table to check for naming conflicts -- ensuring user-created types do not collide with built-in ones

### Data Flow
```
Client requests relation type list
  --> tRPC protectedProcedure verifies authentication
    --> Prisma queries SystemRelationType table (ordered by sortOrder)
      --> Results grouped by category using in-memory reduce
        --> Grouped object returned to client
```

The grouping step is notable: the raw database query returns a flat list of types, but this router transforms it into a **category-keyed dictionary** (an object where each key is a category name and each value is the list of types in that category). This makes it trivial for the frontend to render section headers with their respective type options beneath them.

---

## Macroscale: System Integration

### Architectural Layer
This sits in the **API Layer** of FlowMind's three-tier architecture:
- **Layer 1**: Client components (relation creation UI, type selector dropdowns)
- **Layer 2**: This router (retrieves and organizes relation type data) <-- You are here
- **Layer 3**: PostgreSQL database (system_relation_types table, seeded with default data)

### Big Picture Impact
FlowMind's core value proposition is structured thinking -- helping users organize ideas into interconnected units. Relations are the connective tissue that transforms isolated units into a knowledge graph. This router provides the **taxonomy** (classification system) that gives those connections semantic meaning.

Without this module:
- Users would have no predefined relation types to choose from
- The relation creation flow would lose its guided experience
- The custom relation type system would lose its "base layer" -- it validates new custom types against this system list to prevent duplicates
- Any UI component that displays a categorized picker of relation types would have no data source

### Critical Path Analysis
**Importance Level**: Medium-High

This is not a hard runtime dependency for the core data model (relations store their type as a plain string, not a foreign key to this table). However, it is essential for the **user experience** of creating relations. If this endpoint fails:
- Relation type pickers would render empty
- Users could not easily select meaningful relation types
- The guided relation creation workflow would degrade to free-text entry only

The system relation types table is read-only from the application's perspective -- it is populated via database seeds or migrations, not through user actions. This makes it inherently stable and unlikely to encounter write-related failures.

---

## Technical Concepts (Plain English)

### protectedProcedure
**Technical**: A tRPC middleware chain that enforces authentication by checking for a valid session before executing the handler.
**Plain English**: A security guard at the door -- only logged-in users can ask for the list of relation types. Anonymous visitors get turned away with an "UNAUTHORIZED" error.
**Why We Use It**: Even though this is read-only data, it is part of the authenticated application experience and should not be exposed publicly.

### Category Grouping via Reduce
**Technical**: An in-memory `Array.reduce()` operation that transforms a flat array of relation types into a `Record<string, SystemRelationType[]>` keyed by category.
**Plain English**: Imagine you have a stack of labeled cards. This operation sorts them into separate piles based on their category label -- "logical", "structural", "evidential", etc. -- so the frontend can display each pile under its own heading.
**Why We Use It**: The database stores types in a flat table. Grouping at the API level means the client receives data already organized for display, reducing frontend logic.

### System vs. Custom Relation Types
**Technical**: `SystemRelationType` records are application-seeded, immutable defaults. `CustomRelationType` records are user-created, project-scoped additions.
**Plain English**: System types are like the default apps that come pre-installed on your phone -- always there, same for everyone. Custom types are like apps you download yourself -- personal to your setup (or in this case, your project).
**Why We Use It**: This two-tier approach gives users structure out of the box while preserving the flexibility to define domain-specific relationships.

---

## Change History

### 2026-03-19 - Initial Implementation
- **What Changed**: Created the relation type router with a single `list` procedure that fetches all system relation types grouped by category
- **Why**: Epic 4 relation system requires users to select from predefined relation types when connecting units
- **Impact**: Enables the relation creation UI to display a categorized picker of available connection types
