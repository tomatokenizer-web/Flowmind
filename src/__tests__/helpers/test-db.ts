/**
 * Integration test database helper.
 *
 * Usage pattern:
 *   import { createTestDb, cleanupTestDb } from "@/__tests__/helpers/test-db";
 *
 *   let db: PrismaClient;
 *
 *   beforeAll(async () => { db = await createTestDb(); });
 *   afterAll(async () => { await cleanupTestDb(db); });
 *   afterEach(async () => { await resetTestData(db); });
 *
 * NOTE: Integration tests require a real (test-scoped) database.
 * Set DATABASE_URL to a dedicated test database before running.
 * These tests are skipped in unit-test-only runs via the
 * SKIP_INTEGRATION_TESTS environment variable.
 */

import { PrismaClient } from "@prisma/client";

/**
 * Creates a Prisma client pointed at the test database.
 * Throws if DATABASE_URL is not set, preventing accidental
 * use against a production database.
 */
export async function createTestDb(): Promise<PrismaClient> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set to run integration tests. " +
        "Set it to a dedicated test database (e.g. postgres://localhost:5432/flowmind_test).",
    );
  }

  const db = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.PRISMA_LOG === "1" ? ["query", "error"] : ["error"],
  });

  await db.$connect();
  return db;
}

/**
 * Disconnects the test database client.
 * Call in afterAll to close the connection pool.
 */
export async function cleanupTestDb(db: PrismaClient): Promise<void> {
  await db.$disconnect();
}

/**
 * Deletes all data from the tables used in tests.
 * Call in afterEach to ensure test isolation.
 *
 * Order respects foreign-key constraints (children before parents).
 */
export async function resetTestData(db: PrismaClient): Promise<void> {
  // Relations must go before units/contexts
  await db.$executeRawUnsafe(`DELETE FROM "Relation"`);
  await db.$executeRawUnsafe(`DELETE FROM "UnitPerspective"`);
  await db.$executeRawUnsafe(`DELETE FROM "UnitContext"`);
  await db.$executeRawUnsafe(`DELETE FROM "UnitVersion"`);
  await db.$executeRawUnsafe(`DELETE FROM "Unit"`);
  await db.$executeRawUnsafe(`DELETE FROM "Context"`);
  await db.$executeRawUnsafe(`DELETE FROM "Project"`);
  await db.$executeRawUnsafe(`DELETE FROM "User"`);
}

// ─── Seed Helpers ───────────────────────────────────────────────────

export interface SeedUserResult {
  id: string;
  email: string;
}

export async function seedUser(
  db: PrismaClient,
  overrides: Partial<{ id: string; email: string; name: string }> = {},
): Promise<SeedUserResult> {
  const user = await db.user.create({
    data: {
      id: overrides.id ?? crypto.randomUUID(),
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      name: overrides.name ?? "Test User",
    },
  });
  return { id: user.id, email: user.email! };
}

export interface SeedProjectResult {
  id: string;
  name: string;
}

export async function seedProject(
  db: PrismaClient,
  userId: string,
  overrides: Partial<{ id: string; name: string }> = {},
): Promise<SeedProjectResult> {
  const project = await db.project.create({
    data: {
      id: overrides.id ?? crypto.randomUUID(),
      name: overrides.name ?? "Test Project",
      userId,
    },
  });
  return { id: project.id, name: project.name };
}

export interface SeedUnitResult {
  id: string;
  content: string;
}

export async function seedUnit(
  db: PrismaClient,
  userId: string,
  projectId: string,
  overrides: Partial<{
    id: string;
    content: string;
    lifecycle: string;
    unitType: string;
  }> = {},
): Promise<SeedUnitResult> {
  const unit = await db.unit.create({
    data: {
      id: overrides.id ?? crypto.randomUUID(),
      content: overrides.content ?? "A test unit",
      userId,
      projectId,
      unitType: (overrides.unitType as "claim") ?? "claim",
      originType: "direct_write",
      lifecycle: (overrides.lifecycle as "confirmed") ?? "confirmed",
      quality: "raw",
      aiTrustLevel: "user_authored",
    },
  });
  return { id: unit.id, content: unit.content };
}
