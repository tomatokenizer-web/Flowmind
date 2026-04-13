import { describe, it, expect, vi } from "vitest";
import { createAccessResolverService } from "@/server/services/accessResolverService";

// ─── Mock DB ─────────────────────────────────────────────────────────

function createMockDb() {
  return {
    project: {
      findUnique: vi.fn(),
    },
    projectShare: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("accessResolverService", () => {
  function setup() {
    const db = createMockDb();
    const svc = createAccessResolverService(db as never);
    return { db, svc };
  }

  // ─── resolve ─────────────────────────────────────────────────────

  describe("resolve", () => {
    it("Case 1: returns owner for project owner", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "user-1" });

      const result = await svc.resolve("user-1", "proj-1");
      expect(result).toEqual({ allowed: true, level: "owner", reason: "Project owner" });
    });

    it("Case 2: returns shared role for explicit share", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "owner-1" });
      db.projectShare.findUnique.mockResolvedValue({ role: "editor" });

      const result = await svc.resolve("user-2", "proj-1");
      expect(result).toEqual({ allowed: true, level: "editor", reason: "Shared as editor" });
    });

    it("Case 2: returns viewer for viewer share", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "owner-1" });
      db.projectShare.findUnique.mockResolvedValue({ role: "viewer" });

      const result = await svc.resolve("user-2", "proj-1");
      expect(result.level).toBe("viewer");
      expect(result.allowed).toBe(true);
    });

    it("Case 3: returns none for unshared user", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "owner-1" });
      db.projectShare.findUnique.mockResolvedValue(null);

      const result = await svc.resolve("stranger", "proj-1");
      expect(result).toEqual({ allowed: false, level: "none", reason: "No access to this project" });
    });

    it("returns none for nonexistent project", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue(null);

      const result = await svc.resolve("user-1", "missing-proj");
      expect(result.allowed).toBe(false);
      expect(result.level).toBe("none");
      expect(result.reason).toBe("Project not found");
    });
  });

  // ─── canRead / canWrite / isOwner ────────────────────────────────

  describe("canRead", () => {
    it("returns true for any allowed user", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "owner" });
      db.projectShare.findUnique.mockResolvedValue({ role: "viewer" });

      expect(await svc.canRead("viewer-user", "proj-1")).toBe(true);
    });

    it("returns false for no access", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "owner" });
      db.projectShare.findUnique.mockResolvedValue(null);

      expect(await svc.canRead("stranger", "proj-1")).toBe(false);
    });
  });

  describe("canWrite", () => {
    it("returns true for editor", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "owner" });
      db.projectShare.findUnique.mockResolvedValue({ role: "editor" });

      expect(await svc.canWrite("editor-user", "proj-1")).toBe(true);
    });

    it("returns true for owner", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "user-1" });

      expect(await svc.canWrite("user-1", "proj-1")).toBe(true);
    });

    it("returns false for viewer", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "owner" });
      db.projectShare.findUnique.mockResolvedValue({ role: "viewer" });

      expect(await svc.canWrite("viewer-user", "proj-1")).toBe(false);
    });
  });

  describe("isOwner", () => {
    it("returns true for owner", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "user-1" });

      expect(await svc.isOwner("user-1", "proj-1")).toBe(true);
    });

    it("returns false for non-owner", async () => {
      const { db, svc } = setup();
      db.project.findUnique.mockResolvedValue({ userId: "owner" });
      db.projectShare.findUnique.mockResolvedValue({ role: "editor" });

      expect(await svc.isOwner("editor", "proj-1")).toBe(false);
    });
  });

  // ─── shareProject (Case 4) ──────────────────────────────────────

  describe("shareProject", () => {
    it("Case 4: upserts share when target user exists", async () => {
      const { db, svc } = setup();
      db.user.findUnique.mockResolvedValue({ id: "target-1" });
      db.projectShare.upsert.mockResolvedValue({});

      const result = await svc.shareProject("proj-1", "target-1", "editor");
      expect(result.shared).toBe(true);
      expect(db.projectShare.upsert).toHaveBeenCalled();
    });

    it("returns false when target user does not exist", async () => {
      const { db, svc } = setup();
      db.user.findUnique.mockResolvedValue(null);

      const result = await svc.shareProject("proj-1", "ghost", "viewer");
      expect(result.shared).toBe(false);
    });
  });

  // ─── shareByEmail ────────────────────────────────────────────────

  describe("shareByEmail", () => {
    it("shares with found user", async () => {
      const { db, svc } = setup();
      db.user.findUnique.mockResolvedValue({ id: "target-1" });
      db.projectShare.upsert.mockResolvedValue({});

      const result = await svc.shareByEmail("proj-1", "target@example.com", "viewer");
      expect(result.shared).toBe(true);
      expect(result.userId).toBe("target-1");
    });

    it("returns false for unknown email", async () => {
      const { db, svc } = setup();
      db.user.findUnique.mockResolvedValue(null);

      const result = await svc.shareByEmail("proj-1", "nobody@example.com", "viewer");
      expect(result.shared).toBe(false);
    });
  });

  // ─── revokeShare (Case 5) ───────────────────────────────────────

  describe("revokeShare", () => {
    it("Case 5: revokes existing share", async () => {
      const { db, svc } = setup();
      db.projectShare.delete.mockResolvedValue({});

      const result = await svc.revokeShare("proj-1", "target-1");
      expect(result.revoked).toBe(true);
    });

    it("returns false when share does not exist", async () => {
      const { db, svc } = setup();
      db.projectShare.delete.mockRejectedValue(new Error("Not found"));

      const result = await svc.revokeShare("proj-1", "ghost");
      expect(result.revoked).toBe(false);
    });
  });

  // ─── listShares ─────────────────────────────────────────────────

  describe("listShares", () => {
    it("returns shares from DB", async () => {
      const { db, svc } = setup();
      const mockShares = [
        { id: "s1", userId: "u1", role: "editor", createdAt: new Date(), user: { name: "Alice", email: "a@b.c", image: null } },
      ];
      db.projectShare.findMany.mockResolvedValue(mockShares);

      const result = await svc.listShares("proj-1");
      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("editor");
    });
  });
});
