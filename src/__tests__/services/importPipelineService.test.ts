import { describe, it, expect, vi } from "vitest";
import {
  createImportPipelineService,
  fingerprint,
} from "@/server/services/importPipelineService";
import type { PrismaClient } from "@prisma/client";

const PROJECT_ID = "proj-1";

function createMockDb(existingUnits: Array<{ id: string; content: string }> = []) {
  return {
    unit: {
      findMany: vi.fn().mockResolvedValue(existingUnits),
    },
  } as unknown as PrismaClient;
}

describe("fingerprint", () => {
  it("normalises casing, punctuation, and whitespace", () => {
    expect(fingerprint("Hello, world!")).toBe(fingerprint("  hello   world  "));
    expect(fingerprint("It's raining.")).toBe(fingerprint("it s raining"));
  });

  it("produces different fingerprints for semantically different content", () => {
    expect(fingerprint("cats chase dogs")).not.toBe(fingerprint("dogs chase cats"));
  });
});

describe("importPipelineService", () => {
  describe("phase1Segment", () => {
    it("returns empty on empty input", () => {
      const db = createMockDb();
      const svc = createImportPipelineService(db);
      const result = svc.phase1Segment("");
      expect(result.items).toHaveLength(0);
    });

    it("flags within-batch duplicates and points to canonical index", () => {
      const db = createMockDb();
      const svc = createImportPipelineService(db);
      const text = "First idea. Second idea. First idea.";
      const result = svc.phase1Segment(text, { strategy: "sentence" });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]!.disposition).toBe("new");
      expect(result.items[1]!.disposition).toBe("new");
      expect(result.items[2]!.disposition).toBe("duplicate_in_batch");
      expect(result.items[2]!.canonicalIndex).toBe(0);
    });

    it("respects strategy override", () => {
      const db = createMockDb();
      const svc = createImportPipelineService(db);
      const text = "Para one content.\n\nPara two content.";
      const paraResult = svc.phase1Segment(text, { strategy: "paragraph" });
      expect(paraResult.items).toHaveLength(2);
      const sentResult = svc.phase1Segment(text, { strategy: "sentence" });
      expect(sentResult.items).toHaveLength(2);
    });
  });

  describe("importBatch", () => {
    it("flags cards whose fingerprint already exists in the project", async () => {
      const db = createMockDb([
        { id: "existing-1", content: "Already in project." },
      ]);
      const svc = createImportPipelineService(db);
      const result = await svc.importBatch(
        PROJECT_ID,
        "Already in project. Brand new content here.",
        { strategy: "sentence" },
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.disposition).toBe("duplicate_of_existing");
      expect(result.items[0]!.duplicateOfUnitId).toBe("existing-1");
      expect(result.items[1]!.disposition).toBe("new");
    });

    it("keeps stats aligned with item dispositions", async () => {
      const db = createMockDb([{ id: "e1", content: "alpha beta" }]);
      const svc = createImportPipelineService(db);
      const result = await svc.importBatch(
        PROJECT_ID,
        "Alpha beta. Gamma delta. Alpha beta.",
        { strategy: "sentence" },
      );

      expect(result.stats.totalCards).toBe(3);
      // "Alpha beta" matches existing, but second occurrence is within-batch dup of the first.
      expect(result.stats.duplicateOfExistingCount).toBe(1);
      expect(result.stats.duplicateInBatchCount).toBe(1);
      expect(result.stats.newCount).toBe(1);
    });

    it("returns empty result on empty input", async () => {
      const db = createMockDb();
      const svc = createImportPipelineService(db);
      const result = await svc.importBatch(PROJECT_ID, "");
      expect(result.items).toHaveLength(0);
      expect(result.stats.totalCards).toBe(0);
    });

    it("points duplicate_of_existing at the oldest existing row when the project has dup rows", async () => {
      const db = createMockDb([
        { id: "oldest", content: "Shared sentence text." },
        { id: "newer", content: "Shared sentence text." },
      ]);
      const svc = createImportPipelineService(db);
      const result = await svc.importBatch(
        PROJECT_ID,
        "Shared sentence text.",
        { strategy: "sentence" },
      );
      expect(result.items[0]!.duplicateOfUnitId).toBe("oldest");
    });
  });
});
