#!/usr/bin/env bash
set -e

echo "=== FlowMind Startup ==="

# 1. Check if Docker is running, start it if not
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Starting Docker Desktop..."

  # Try common Docker Desktop locations on Windows
  DOCKER_PATH="/c/Program Files/Docker/Docker/Docker Desktop.exe"
  if [ -f "$DOCKER_PATH" ]; then
    start "" "$DOCKER_PATH" 2>/dev/null || cmd.exe /c "start \"\" \"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"" 2>/dev/null
  else
    cmd.exe /c "start \"\" \"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"" 2>/dev/null || {
      echo "ERROR: Could not find Docker Desktop. Please start it manually."
      exit 1
    }
  fi

  echo "Waiting for Docker to start (this may take 30-60 seconds)..."
  for i in {1..120}; do
    if docker info >/dev/null 2>&1; then
      echo "Docker is ready."
      break
    fi
    if [ "$i" -eq 120 ]; then
      echo "ERROR: Docker failed to start after 2 minutes."
      exit 1
    fi
    sleep 1
  done
fi

# 2. Start database container
echo "Starting database..."
docker compose up -d 2>/dev/null || {
  echo "ERROR: Failed to start database container."
  exit 1
}

# Wait for PostgreSQL to accept connections
echo "Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker exec flowmind-db pg_isready -U flowmind -q 2>/dev/null; then
    echo "PostgreSQL is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: PostgreSQL failed to start."
    exit 1
  fi
  sleep 1
done

# 3. Push schema (idempotent — safe to run every time)
echo "Syncing database schema..."
npx prisma db push --skip-generate 2>&1 | tail -1

# 4. Seed if empty
SEED_COUNT=$(docker exec flowmind-db psql -U flowmind -d flowmind -tAc "SELECT COUNT(*) FROM system_relation_types;" 2>/dev/null || echo "0")
if [ "$SEED_COUNT" -eq "0" ] 2>/dev/null; then
  echo "Seeding database..."
  npx prisma db seed 2>&1 | grep -E "✓|✅|Seed"
else
  echo "Seed data OK ($SEED_COUNT relation types)"
fi

# 5. Generate Prisma client (suppressed if already up to date)
npx prisma generate 2>/dev/null || true

echo ""
echo "=== Starting dev server at http://localhost:3000 ==="
echo ""
pnpm dev
