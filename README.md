# FlowMind

A thought-unit management system for capturing, organizing, and evolving ideas through AI-assisted workflows.

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Zustand, Framer Motion
- **Backend**: tRPC v11, Prisma 6, PostgreSQL + pgvector
- **AI**: Claude API (via Claude CLI with OAuth or API key)
- **Auth**: NextAuth.js v5 (Google, GitHub, magic link)
- **Monitoring**: Sentry

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (with pgvector extension)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment file and fill in values
cp .env.example .env

# Push database schema
npx prisma db push

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### AI Setup

FlowMind uses Claude for AI features (classification, decomposition, suggestions). Two options:

1. **Claude CLI (recommended for development)**: Install Claude CLI, authenticate with `claude login`. Set `ANTHROPIC_BASE_URL=http://localhost:42069` in `.env`.
2. **API key**: Set `ANTHROPIC_API_KEY` in `.env`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check (`tsc --noEmit`) |
| `pnpm test` | Run tests (Vitest) |
| `pnpm lint` | ESLint check |
| `npx prisma db push` | Apply schema changes |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma studio` | Open database GUI |

## Architecture

```
src/
  app/              # Next.js App Router pages
  components/       # React components (organized by domain)
  hooks/            # Custom React hooks
  stores/           # Zustand state stores
  server/
    api/routers/    # tRPC route handlers (41 routers)
    ai/             # AI provider + service modules
    services/       # Domain services
    events/         # Event bus for cross-module communication
  lib/              # Shared utilities
  trpc/             # tRPC client setup
prisma/
  schema.prisma     # Database schema
```

### Key Concepts

- **Unit**: Atomic thought unit (observation, claim, question, idea, etc.)
- **Context**: A workspace grouping related units
- **Perspective**: A unit's lens within a context
- **Relation**: Typed link between units (supports, contradicts, derives, etc.)
- **Assembly**: Curated sequence of units for export/presentation
- **Proposal**: AI-generated suggestions awaiting user review

## Environment Variables

See [.env.example](.env.example) for all required variables with setup instructions.

## License

Private.
