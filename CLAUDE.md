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
- IMPORTANT: Read the relevant spec note BEFORE implementing any feature

## Autonomous Operation Rules

### Workflow Per Task (MANDATORY)
1. Read spec note for the feature (Obsidian `FLOWMIND/` folder)
2. Write a failing test first (tRPC routers, Zod schemas)
3. Implement the minimum code to pass the test
4. Run `pnpm typecheck` — fix any errors
5. Run `pnpm test` — fix any failures
6. Move to next task

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

### Error Recovery
- Build fails → read error → fix root cause (not suppress)
- Same error 3x → stop, report full error context to user
- Test was passing, now failing → revert last change first, investigate
- AI call fails → return `{ result: null, aiGenerated: false }`, never fake data

### Session Protocol
- Session start: read `_Rebuild/07-Session-Log.md` + active Phase checklist
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
