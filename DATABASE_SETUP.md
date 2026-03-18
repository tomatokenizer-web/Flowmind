# Database Setup Guide — Supabase + pgvector

This guide walks you through provisioning Supabase PostgreSQL with pgvector for Flowmind.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose your organization
4. Set a **database password** (save this — you'll need it for connection strings)
5. Select a **region** close to your users (e.g., `us-east-1`, `ap-northeast-2`)
6. Wait for the project to finish provisioning (~2 minutes)

## 2. Enable pgvector Extension

1. In your Supabase dashboard, go to **Database → Extensions**
2. Search for `vector`
3. Enable the **vector** extension
4. Alternatively, run this in the **SQL Editor**:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 3. Get Connection Strings

1. Go to **Settings → Database** in your Supabase dashboard
2. Scroll to **Connection string** section
3. You need two URLs:

### Pooled Connection (for application queries)

- **Mode**: Session (default)
- **Port**: `6543`
- Copy the connection string and append `?pgbouncer=true`

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Direct Connection (for migrations)

- **Port**: `5432`
- Copy the direct connection string (no pgbouncer parameter)

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Replace the placeholder values with your actual connection strings:

```env
DATABASE_URL="postgresql://postgres.abcdefghijk:YourPassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.abcdefghijk:YourPassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

## 5. Run Migrations

```bash
# Generate Prisma Client
pnpm db:generate

# Run database migrations
pnpm db:migrate
```

This will:
- Enable the pgvector extension in PostgreSQL
- Create all tables defined in `prisma/schema.prisma`
- Set up indexes and constraints

## 6. Seed the Database

```bash
pnpm db:seed
```

This seeds:
- **23 system relation types** (supports, contradicts, derives_from, etc.)
- **4 domain templates** (software-design, nonfiction-writing, investment-decision, academic-research)

## 7. Verify Setup

```bash
# Open Prisma Studio to browse your data
pnpm db:studio
```

Check that:
- All tables are created
- `system_relation_types` has 23 rows
- `domain_templates` has 4 rows
- The `vector` extension is listed in `pg_extension`

## Troubleshooting

### "prepared statement already exists" errors
This happens when PgBouncer is in transaction mode. Make sure your `DATABASE_URL` includes `?pgbouncer=true` and uses port `6543`.

### Migration fails with "permission denied"
Ensure `DIRECT_URL` uses the direct connection (port `5432`), not the pooled one.

### pgvector not available
Run `CREATE EXTENSION IF NOT EXISTS vector;` in the Supabase SQL Editor, or enable it from **Database → Extensions**.

### Connection timeout
Check that your IP isn't blocked. Supabase allows all IPs by default, but if you've configured network restrictions, add your IP to the allowlist.
