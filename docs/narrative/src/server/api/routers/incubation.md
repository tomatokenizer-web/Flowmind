# Incubation Router

> **Last Updated**: 2026-03-19
> **Code Location**: `src/server/api/routers/incubation.ts`
> **Status**: Active
> **Epic**: Epic 8 - Feedback Loop & Thought Evolution
> **Story**: 8.1 - Incubation Queue

---

## Context & Purpose

This router manages the **incubation queue** - a holding area for incomplete or developing thoughts that need time to mature before being integrated into the user's knowledge structure. It solves the problem of premature commitment: users often capture fleeting ideas that are not yet ready to be connected to their existing contexts.

**Business Need**: In knowledge management, not every captured thought is immediately actionable or connectable. Users need a way to park half-formed ideas without losing them, then revisit them later when the thought has crystallized or when they have a clearer sense of where it belongs.

**Plain English**: Think of incubation like a mental "holding pen" for ideas. When you jot down a thought but do not know where it fits yet, it goes into incubation. Later, you can either promote it to a proper context (like moving a sticky note from your desk to the right folder), snooze it (push it down the stack to review later), or discard it (decide it was not worth keeping).

**When Used**:
- When viewing the Incubation Queue sidebar panel
- When auto-incubate logic triggers during unit creation (units with no relations and content < 100 chars)
- When users manually send thoughts to incubation
- During periodic review of incomplete thoughts

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/server/api/trpc.ts`: `createTRPCRouter`, `protectedProcedure` - Provides the router factory and authentication middleware (ensures only logged-in users can access their incubating thoughts)
- `@trpc/server`: `TRPCError` - Used for standardized error responses when units or contexts are not found
- `zod`: `z` - Schema validation library for ensuring input parameters are valid UUIDs

### Database Models Used

- `Unit` model: The core entity being managed. Key fields:
  - `incubating` (Boolean): Flag indicating if unit is in the incubation queue
  - `lifecycle` (Lifecycle enum): Status field set to 'archived' on discard
  - `lastAccessed` (DateTime): Timestamp updated on snooze to push unit down the queue
  - `userId`: Ownership verification for security
- `Context` model: Target destination when promoting an incubating unit
- `UnitContext` join table: Created via **upsert** (create-or-update pattern) when promoting, linking a unit to its destination context

### Dependents (What Needs This)

- `src/server/api/root.ts`: Registers this router as `incubation` in the main app router
- `src/components/incubation/IncubationQueue.tsx` (planned): UI component that will consume these procedures
- Sidebar badge count: Will query `incubation.list` to show number of incubating thoughts

### Data Flow

```
User opens Incubation Queue
    |
    v
incubation.list query
    |
    v
Prisma findMany(incubating=true, userId)
    |
    v
Returns units with project info
    |
    +---> User clicks "Promote"
    |         |
    |         v
    |     incubation.promote mutation
    |         |
    |         v
    |     Transaction: update unit + upsert UnitContext
    |         |
    |         v
    |     Unit now appears in target context
    |
    +---> User clicks "Snooze"
    |         |
    |         v
    |     incubation.snooze mutation
    |         |
    |         v
    |     Updates lastAccessed to now()
    |         |
    |         v
    |     Unit moves down in queue (sorted by createdAt, but lastAccessed signals "recently reviewed")
    |
    +---> User clicks "Discard"
              |
              v
          incubation.discard mutation
              |
              v
          Sets lifecycle='archived', incubating=false
              |
              v
          Unit removed from queue, preserved in archive
```

---

## Macroscale: System Integration

### Architectural Layer

This sits in the **Application Logic Layer** of the tRPC API architecture:

- **Layer 1**: Client Components (IncubationQueue.tsx, sidebar UI)
- **Layer 2**: tRPC Router (this module - validates, authorizes, orchestrates)
- **Layer 3**: Prisma ORM (database queries and transactions)
- **Layer 4**: PostgreSQL Database (Unit, Context, UnitContext tables)

### Epic 8: Feedback Loop & Thought Evolution

This router is the first component of **Epic 8**, which focuses on helping thoughts evolve over time. The incubation system is the entry point for this evolution:

1. **Story 8.1 (This Router)**: Incubation Queue - parking lot for incomplete thoughts
2. **Story 8.2**: Compression - detecting and merging similar claims
3. **Story 8.3**: Orphan Recovery - finding units with no connections
4. **Story 8.4**: External Import - bringing in knowledge from URLs/paste
5. **Story 8.5**: Reverse Provenance - tracking where ideas came from
6. **Story 8.6**: Action Completion - closing the loop on action items

### Big Picture Impact

The incubation system enables **non-linear thinking** in Flowmind. Without it, users would be forced to immediately categorize every thought they capture, which creates friction and often leads to:
- Abandoned captures (too much effort to file properly)
- Poor categorization (forced into wrong context under time pressure)
- Lost ideas (never captured because user knew they did not have time to organize)

**With incubation**, the workflow becomes: Capture quickly, incubate freely, organize thoughtfully.

### Critical Path Analysis

**Importance Level**: Medium-High

- **If this fails**: Users can still capture thoughts directly to contexts, but the friction increases. Quick capture becomes harder because every thought needs immediate placement.
- **Failure mode**: Incubating thoughts become invisible (query fails) or stuck (cannot promote/discard). Users lose track of their developing ideas.
- **Backup**: Manual database queries or direct unit editing via unit router, though this bypasses the incubation workflow entirely.
- **Recovery**: All state is in the database. Restarting the router restores functionality immediately.

### Security Model

All four procedures use `protectedProcedure`, which means:
- User must be authenticated (has valid session)
- All queries include `userId: ctx.session.user.id!` filtering
- Users can only see/modify their own incubating units
- Ownership is verified before any mutation executes

---

## Technical Concepts (Plain English)

### Protected Procedure

**Technical**: Middleware-wrapped tRPC procedure that validates the user's session before allowing the request to proceed. Throws UNAUTHORIZED error if no valid session exists.

**Plain English**: Like a bouncer checking IDs at a club entrance. If you do not have valid credentials (session token), you cannot access any of these endpoints. Every request is checked before it runs.

**Why We Use It**: Prevents unauthorized access to user data. Without this, anyone could read or modify any user's incubating thoughts.

### Database Transaction

**Technical**: An ACID-compliant operation that groups multiple database writes into a single atomic unit. Either all writes succeed, or all are rolled back.

**Plain English**: Like a bank transfer that moves money between accounts. Either both accounts update (source debits, destination credits) or neither does. You never end up with money disappearing or appearing out of nowhere.

**Why We Use It**: The `promote` mutation needs to update the unit AND create a UnitContext record. If one succeeds and one fails, the data becomes inconsistent. The transaction ensures both happen together or neither does.

### Upsert Operation

**Technical**: A database operation that creates a record if it does not exist, or updates it if it does. Combines "UPDATE" and "INSERT" logic.

**Plain English**: Like adding a contact to your phone. If the person already exists, you update their info. If they are new, you create a fresh entry. You do not end up with duplicates.

**Why We Use It**: When promoting a unit to a context, we use upsert on UnitContext to handle the case where the unit might already be linked to that context (idempotency). Pressing "promote" twice does not create duplicate links.

### Order By (Sorting)

**Technical**: SQL clause that determines the sequence of returned records. `orderBy: { createdAt: "desc" }` returns newest first.

**Plain English**: Like sorting your email inbox. "Newest first" means the most recent thoughts appear at the top of the incubation queue.

**Why We Use It**: Users naturally want to see their most recent captures first, as these are most likely to still be relevant and top-of-mind.

---

## API Reference

### incubation.list

**Purpose**: Retrieve all incubating thoughts for the current user

**Input**: None (uses session for userId)

**Output**: Array of Unit objects with embedded project info

**Query Pattern**: `findMany` with ownership filter, descending creation order

### incubation.promote

**Purpose**: Graduate a thought from incubation into a proper context

**Input**: `{ unitId: uuid, contextId: uuid }`

**Output**: Updated Unit object

**Side Effects**:
- Sets `incubating = false`
- Updates `lastAccessed` to now
- Creates/updates UnitContext link

### incubation.snooze

**Purpose**: Push a thought down the queue for later review

**Input**: `{ unitId: uuid }`

**Output**: Updated Unit object

**Side Effects**: Updates `lastAccessed` to now (signals "recently touched, not ready yet")

### incubation.discard

**Purpose**: Remove a thought from incubation without deleting it

**Input**: `{ unitId: uuid }`

**Output**: Updated Unit object

**Side Effects**:
- Sets `lifecycle = 'archived'`
- Sets `incubating = false`

---

## Change History

### 2026-03-19 - Initial Implementation (Epic 8, Story 8.1)

- **What Changed**: Created incubation router with list, promote, snooze, and discard procedures
- **Why**: Users needed a way to hold incomplete thoughts without immediately organizing them
- **Impact**: Enables the incubation queue UI and auto-incubate capture logic
