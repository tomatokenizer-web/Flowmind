# FlowMind — Claude Code Project Rules

## Stack
- Next.js 15 (App Router), tRPC v11, Prisma 6 (PostgreSQL + pgvector), Zustand, Tailwind CSS
- AI: Claude API via localhost:42069 proxy (Claude CLI)
- Validation: Zod on ALL tRPC inputs and ALL AI responses

## Commands
- `pnpm dev` — start dev server (port 3000)
- `pnpm build` — production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — `vitest run`
- `pnpm lint` — `next lint`
- `npx prisma db push` — apply schema changes
- `npx prisma generate` — regenerate client after schema change

## Spec Reference
- Obsidian vault `hermes`, folder `FLOWMIND/`
- Rebuild checklists: `FLOWMIND/_Rebuild/00-Master-Plan.md` through `10-Conventions.md`
- **Conventions file**: `FLOWMIND/_Rebuild/10-Conventions.md` — MUST read at session start and reference during implementation
- **IMPORTANT**: Read the relevant spec note BEFORE implementing any feature

## Mandatory Spec Compliance Process

### Pre-Task Note Loading (from 10-Conventions.md — MANDATORY)
Before starting ANY section of a Phase Micro file:
1. Search `FLOWMIND/` in Obsidian for the topic keywords
2. Read the top 3-10 most relevant spec notes via `batch_read_notes`
3. Cross-reference `09-Spec-to-Code-Map` for the section's concepts
4. ONLY THEN start the first micro-task

**NEVER skip when:**
- Starting a new Phase section
- Resuming after `/clear` or session restart
- Touching code in an area you haven't worked on this session
- The task involves AI prompts, Zod schemas, or domain models

### The SPEC Loop (per subtask)
- **S**pecify: What exactly does this do? (from Obsidian note)
- **P**lan: Which files change? What's the test?
- **E**xecute: Implement ONE subtask
- **C**heck: Run build + tests, verify against spec

### Anti-Slop Checklist (run before marking ANY task done)
- [ ] Does this code have a test?
- [ ] Does the test actually test the behavior, not just "no error"?
- [ ] Did I read the spec note before implementing?
- [ ] Is this the simplest implementation that satisfies the spec?
- [ ] Are there any `catch { return default }` blocks?
- [ ] Are there any `any` types?
- [ ] Would I understand this code if I read it with no context?

### Phase Completion Requirements (CRITICAL)
- **NEVER declare a Phase complete without a full gap audit:**
  1. Open the Phase spec checklist (Obsidian)
  2. For EVERY checklist item, verify code exists (grep/read, not memory)
  3. Items with code: verify they match spec behavior, not just exist
  4. Items without code: add to gap list
  5. If >0 items are missing or partial, the Phase is NOT complete
- **"Existing code = done" is WRONG.** Always verify existing code satisfies the spec.
- **70% implemented ≠ complete.** Every checklist item must be verified.

### Drift Detection (Phase-Boundary Only)
Run at these checkpoints:
- End of each Phase (before starting next Phase)
- After any ASK FIRST decision that altered scope
- Before a major commit tagged as "Phase N complete"

## Autonomous Operation Rules

### Workflow Per Task (MANDATORY)
1. Read spec note for the feature (Obsidian `FLOWMIND/` folder)
2. Write a failing test first (tRPC routers, Zod schemas)
3. Implement the minimum code to pass the test
4. Run `pnpm typecheck` — fix any errors
5. Run `pnpm test` — fix any failures
6. Run Anti-Slop Checklist before marking done
7. Move to next task

### Task Granularity
- IMPORTANT: One task = ONE function, ONE endpoint, or ONE component
- Never implement more than one tRPC procedure without testing it
- Never modify more than 3 files without running typecheck
- If a task feels like it touches 5+ files, split it first

### Self-Verification Loop
- After implementing a function: write test + run it
- After 3 failed fix attempts on the same error: STOP and report to user
- After every 5 completed functions: run code-reviewer subagent from clean context
- NEVER mark a task complete if tests are failing

### Scope Boundaries

**ALWAYS (do without asking):**
- Run typecheck after editing .ts/.tsx files
- Run tests after implementing endpoints
- Read existing code before modifying it
- Follow patterns from existing routers/components
- Use Zod schemas for ALL AI responses
- Add `aiGenerated`/`aiAnalyzed` flags to AI endpoints
- Commit after each completed feature (not each function)
- Read `10-Conventions.md` from Obsidian at session start
- Verify spec checklist items against actual code before declaring Phase complete

**ASK FIRST:**
- Changing Prisma schema (migration impact)
- Adding new dependencies
- Deleting existing features or components
- Architecture changes (new routers, new models)
- Any Decision Point flagged in Phase checklists

**NEVER:**
- Return hardcoded fallbacks on AI errors
- Use `any` type or `@ts-ignore`
- Commit .env files or secrets
- Skip tests to save time
- Force push (`git push --force`)
- Modify applied migrations
- Use `catch { return default }` pattern
- Create `docs/narrative/` or shadow documentation files
- Use the documentation-specialist agent
- Declare a Phase complete without verifying EVERY spec checklist item against code
- Assume existing code satisfies a spec item without reading and verifying it
- Skip UI tasks listed in Phase specs (backend + UI must both be complete)

### Error Recovery
- Build fails → read error → fix root cause (not suppress)
- Same error 3x → stop, report full error context to user
- Test was passing, now failing → revert last change first, investigate
- AI call fails → return `{ result: null, aiGenerated: false }`, never fake data

### Session Protocol
- Session start: read `_Rebuild/07-Session-Log.md` + `10-Conventions.md` + active Phase checklist
- Session end: update Session Log, check off completed items
- Use `ultrathink` for architecture decisions only
- `/clear` between unrelated tasks

## Code Style
- Named exports (not default)
- `cn()` for className merging
- Design tokens: `text-text-primary`, `bg-bg-surface`, `border-border`
- Procedures <50 lines, files <500 lines
- One Zustand store per domain, flat state
- Props interface above component declaration

## AI Integration
- Model: anthropicModel via localhost:42069
- Always use `generateObject` with Zod schema
- Schema limits: content max 2000, rationale max 500
- Include length guidance in prompts
- Log errors with console.error
- Flag AI vs non-AI results in return types

## Git
- Format: `<type>: <description>` (feat/fix/refactor/schema/ai/ui/test)
- Commit after each completed feature, not after each file
- Push to origin immediately after each commit (`git push`)
- Never amend published commits
- Never force push
