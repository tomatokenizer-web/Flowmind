/**
 * Integration tests for unit CRUD operations.
 *
 * These tests run against a real database connection (DATABASE_URL env var).
 * They are skipped automatically when SKIP_INTEGRATION_TESTS=1 is set,
 * which is the default in unit-test-only CI runs.
 *
 * To run locally:
 *   DATABASE_URL=postgres://localhost:5432/flowmind_test pnpm test src/__tests__/integration
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createTestDb,
  cleanupTestDb,
  resetTestData,
  seedUser,
  seedProject,
  seedUnit,
} from "@/__tests__/helpers/test-db";
import { createUnitService } from "@/server/services/unitService";

const SKIP = process.env.SKIP_INTEGRATION_TESTS === "1" || !process.env.DATABASE_URL;

describe.skipIf(SKIP)("integration: unit CRUD", () => {
  let db: PrismaClient;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    db = await createTestDb();
    const user = await seedUser(db);
    userId = user.id;
    const project = await seedProject(db, userId);
    projectId = project.id;
  });

  afterAll(async () => {
    await cleanupTestDb(db);
  });

  afterEach(async () => {
    // Only clean units (not user/project) so seeds persist across tests
    await db.$executeRawUnsafe(`DELETE FROM "UnitVersion"`);
    await db.$executeRawUnsafe(`DELETE FROM "UnitPerspective"`);
    await db.$executeRawUnsafe(`DELETE FROM "UnitContext"`);
    await db.$executeRawUnsafe(`DELETE FROM "Relation"`);
    await db.$executeRawUnsafe(`DELETE FROM "Unit"`);
  });

  describe("unitService.create", () => {
    it("persists a new unit to the database", async () => {
      const service = createUnitService(db);

      const unit = await service.create(
        { content: "A real thought", projectId },
        userId,
      );

      const found = await db.unit.findUnique({ where: { id: unit.id } });
      expect(found).not.toBeNull();
      expect(found!.content).toBe("A real thought");
    });

    it("sets lifecycle=confirmed for user-authored content", async () => {
      const service = createUnitService(db);

      const unit = await service.create(
        { content: "User authored", projectId },
        userId,
      );

      const found = await db.unit.findUnique({ where: { id: unit.id } });
      expect(found!.lifecycle).toBe("confirmed");
    });

    it("sets lifecycle=draft for AI-generated content", async () => {
      const service = createUnitService(db);

      const unit = await service.create(
        { content: "AI generated thought", projectId, originType: "ai_generated" },
        userId,
      );

      const found = await db.unit.findUnique({ where: { id: unit.id } });
      expect(found!.lifecycle).toBe("draft");
    });

    it("rejects duplicate content within the same project", async () => {
      const service = createUnitService(db);
      const content = "Unique thought that will be duplicated";

      await service.create({ content, projectId }, userId);

      await expect(
        service.create({ content, projectId }, userId),
      ).rejects.toThrow("identical content already exists");
    });
  });

  describe("unitService.update", () => {
    it("updates content and creates a version snapshot", async () => {
      const service = createUnitService(db);
      const { id } = await seedUnit(db, userId, projectId, { content: "Original content" });

      await service.update(id, { content: "Updated content" }, userId);

      const versions = await db.unitVersion.findMany({ where: { unitId: id } });
      expect(versions).toHaveLength(1);
      expect(versions[0]!.content).toBe("Original content");

      const updated = await db.unit.findUnique({ where: { id } });
      expect(updated!.content).toBe("Updated content");
    });

    it("does not create a version when only metadata is changed", async () => {
      const service = createUnitService(db);
      const { id } = await seedUnit(db, userId, projectId);

      await service.update(id, { flagged: true }, userId);

      const versions = await db.unitVersion.findMany({ where: { unitId: id } });
      expect(versions).toHaveLength(0);
    });
  });

  describe("unitService.delete", () => {
    it("removes the unit from the database", async () => {
      const service = createUnitService(db);
      const { id } = await seedUnit(db, userId, projectId);

      await service.delete(id, userId);

      const found = await db.unit.findUnique({ where: { id } });
      expect(found).toBeNull();
    });
  });

  describe("unitService.list", () => {
    it("returns only units belonging to the specified project", async () => {
      const service = createUnitService(db);

      // Seed a second project with its own unit
      const otherProject = await seedProject(db, userId, { name: "Other Project" });
      await seedUnit(db, userId, projectId, { content: "My project unit" });
      await seedUnit(db, userId, otherProject.id, { content: "Other project unit" });

      const result = await service.list({ projectId });

      expect(result.items.every((u) => u.projectId === projectId)).toBe(true);
    });

    it("filters by lifecycle when provided", async () => {
      const service = createUnitService(db);
      await seedUnit(db, userId, projectId, { lifecycle: "confirmed" });
      await seedUnit(db, userId, projectId, { lifecycle: "draft" });

      // Need to bypass duplicate detection for the seed — use direct DB inserts
      const result = await service.list({ projectId, lifecycle: "confirmed" });

      expect(result.items.every((u) => u.lifecycle === "confirmed")).toBe(true);
    });

    it("supports cursor-based pagination", async () => {
      const service = createUnitService(db);

      // Create 3 units via direct DB (avoids duplicate check from unitService)
      const ids = ["b1111111-0000-0000-0000-000000000001",
                   "b1111111-0000-0000-0000-000000000002",
                   "b1111111-0000-0000-0000-000000000003"];
      for (const id of ids) {
        await db.unit.create({
          data: {
            id,
            content: `Unit ${id}`,
            userId,
            projectId,
            unitType: "claim",
            originType: "direct_write",
            lifecycle: "confirmed",
            quality: "raw",
            aiTrustLevel: "user_authored",
          },
        });
      }

      const page1 = await service.list({ projectId, limit: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await service.list({ projectId, limit: 2, cursor: page1.nextCursor });
      expect(page2.items).toHaveLength(1);
      expect(page2.nextCursor).toBeUndefined();
    });
  });

  describe("unitService.archive", () => {
    it("sets lifecycle to archived without deleting the unit", async () => {
      const service = createUnitService(db);
      const { id } = await seedUnit(db, userId, projectId);

      await service.archive(id, userId);

      const found = await db.unit.findUnique({ where: { id } });
      expect(found).not.toBeNull();
      expect(found!.lifecycle).toBe("archived");
    });
  });
});
