import { describe, it, expect, vi } from "vitest";
import { createDecisionJournalService } from "@/server/services/decisionJournalService";

// ─── Mock DB ─────────────────────────────────────────────────────────

function makeMockEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "dj-1",
    title: "Use tRPC or REST?",
    context: "Building a new API layer",
    options: [
      { label: "tRPC", description: "End-to-end typesafe", pros: ["type safety"], cons: ["vendor lock"] },
      { label: "REST", description: "Standard HTTP", pros: ["universality"], cons: ["no type safety"] },
    ],
    chosen: null,
    rationale: null,
    outcome: null,
    unitIds: [],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function createMockDb() {
  const store: Record<string, ReturnType<typeof makeMockEntry>> = {};
  let counter = 0;
  return {
    decisionJournal: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const entry = makeMockEntry({
          id: `dj-${++counter}`,
          title: data.title,
          context: data.context,
          options: data.options,
          unitIds: data.unitIds ?? [],
        });
        store[entry.id] = entry;
        return entry;
      }),
      findMany: vi.fn(async () => Object.values(store)),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => store[where.id] ?? null),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const entry = store[where.id];
        if (!entry) throw new Error("Not found");
        return entry;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const entry = store[where.id];
        if (!entry) throw new Error("Not found");
        Object.assign(entry, data, { updatedAt: new Date() });
        return entry;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        delete store[where.id];
      }),
    },
    _store: store,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("decisionJournalService", () => {
  function setup() {
    const db = createMockDb();
    const svc = createDecisionJournalService(db as never);
    return { db, svc };
  }

  describe("create", () => {
    it("creates entry with title, context, and options", async () => {
      const { svc } = setup();
      const entry = await svc.create({
        title: "Use tRPC or REST?",
        context: "Building API",
        options: [
          { label: "tRPC", description: "Typesafe", pros: ["types"], cons: ["lock-in"] },
        ],
        userId: "user-1",
        projectId: "proj-1",
      });

      expect(entry.title).toBe("Use tRPC or REST?");
      expect(entry.context).toBe("Building API");
      expect(entry.options).toHaveLength(1);
      expect(entry.chosen).toBeNull();
      expect(entry.unitIds).toEqual([]);
    });

    it("accepts optional unitIds", async () => {
      const { svc } = setup();
      const entry = await svc.create({
        title: "Test",
        context: "ctx",
        options: [],
        userId: "u",
        projectId: "p",
        unitIds: ["unit-1", "unit-2"],
      });
      expect(entry.unitIds).toEqual(["unit-1", "unit-2"]);
    });
  });

  describe("listByProject", () => {
    it("returns entries from store", async () => {
      const { svc } = setup();
      await svc.create({ title: "A", context: "", options: [], userId: "u", projectId: "p" });
      await svc.create({ title: "B", context: "", options: [], userId: "u", projectId: "p" });
      const list = await svc.listByProject("p");
      expect(list).toHaveLength(2);
    });
  });

  describe("getById", () => {
    it("returns null for missing entry", async () => {
      const { svc } = setup();
      expect(await svc.getById("nonexistent")).toBeNull();
    });
  });

  describe("recordDecision", () => {
    it("updates chosen and rationale", async () => {
      const { db, svc } = setup();
      db._store["dj-1"] = makeMockEntry();
      const result = await svc.recordDecision("dj-1", "tRPC", "Better DX");
      expect(result.chosen).toBe("tRPC");
      expect(result.rationale).toBe("Better DX");
    });
  });

  describe("recordOutcome", () => {
    it("updates outcome text", async () => {
      const { db, svc } = setup();
      db._store["dj-1"] = makeMockEntry({ chosen: "tRPC" });
      const result = await svc.recordOutcome("dj-1", "Worked great");
      expect(result.outcome).toBe("Worked great");
    });
  });

  describe("linkUnits", () => {
    it("merges new unit IDs with existing", async () => {
      const { db, svc } = setup();
      db._store["dj-1"] = makeMockEntry({ unitIds: ["u-1"] });
      const result = await svc.linkUnits("dj-1", ["u-2", "u-3"]);
      expect(result.unitIds).toContain("u-1");
      expect(result.unitIds).toContain("u-2");
      expect(result.unitIds).toContain("u-3");
    });

    it("deduplicates unit IDs", async () => {
      const { db, svc } = setup();
      db._store["dj-1"] = makeMockEntry({ unitIds: ["u-1", "u-2"] });
      const result = await svc.linkUnits("dj-1", ["u-1", "u-3"]);
      expect(result.unitIds).toHaveLength(3);
    });
  });

  describe("remove", () => {
    it("calls delete on the DB", async () => {
      const { db, svc } = setup();
      db._store["dj-1"] = makeMockEntry();
      await svc.remove("dj-1");
      expect(db.decisionJournal.delete).toHaveBeenCalledWith({ where: { id: "dj-1" } });
    });
  });
});
