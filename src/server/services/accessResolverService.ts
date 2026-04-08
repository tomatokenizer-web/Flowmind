import type { PrismaClient } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

export type AccessLevel = "none" | "viewer" | "editor" | "owner";

export type AccessCheck = {
  allowed: boolean;
  level: AccessLevel;
  reason: string;
};

// ─── 6-Case MVP Access Matrix (DEC-004 A.3) ───────────────────────
//
// Case 1: Owner accessing own project           → owner
// Case 2: Shared user with explicit role         → role (viewer/editor/owner)
// Case 3: Unshared user accessing private project → none
// Case 4: Owner sharing project with another user → creates ProjectShare
// Case 5: Owner revoking share                    → deletes ProjectShare
// Case 6: Shared editor creating content          → allowed (editor level)

// ─── Service Factory ───────────────────────────────────────────────

export function createAccessResolverService(db: PrismaClient) {
  /**
   * Resolve the access level a user has on a project.
   * Per DEC-002 §6: single `access.resolve(userId, resourceId)` entry point.
   */
  async function resolve(
    userId: string,
    projectId: string,
  ): Promise<AccessCheck> {
    // Case 1: Check if user is the project owner
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      return { allowed: false, level: "none", reason: "Project not found" };
    }

    if (project.userId === userId) {
      return { allowed: true, level: "owner", reason: "Project owner" };
    }

    // Case 2: Check for explicit share
    const share = await db.projectShare.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

    if (share) {
      return {
        allowed: true,
        level: share.role as AccessLevel,
        reason: `Shared as ${share.role}`,
      };
    }

    // Case 3: No access
    return { allowed: false, level: "none", reason: "No access to this project" };
  }

  /** Check if user can read (viewer+) */
  async function canRead(userId: string, projectId: string): Promise<boolean> {
    const check = await resolve(userId, projectId);
    return check.allowed;
  }

  /** Check if user can write (editor+) */
  async function canWrite(userId: string, projectId: string): Promise<boolean> {
    const check = await resolve(userId, projectId);
    return check.level === "editor" || check.level === "owner";
  }

  /** Check if user is owner */
  async function isOwner(userId: string, projectId: string): Promise<boolean> {
    const check = await resolve(userId, projectId);
    return check.level === "owner";
  }

  /** Case 4: Share a project with another user */
  async function shareProject(
    projectId: string,
    targetUserId: string,
    role: "viewer" | "editor",
  ): Promise<{ shared: boolean }> {
    // Ensure target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!targetUser) return { shared: false };

    await db.projectShare.upsert({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      update: { role },
      create: { projectId, userId: targetUserId, role },
    });

    return { shared: true };
  }

  /** Share by email (finds user by email first) */
  async function shareByEmail(
    projectId: string,
    email: string,
    role: "viewer" | "editor",
  ): Promise<{ shared: boolean; userId?: string }> {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return { shared: false };

    await shareProject(projectId, user.id, role);
    return { shared: true, userId: user.id };
  }

  /** Case 5: Revoke a share */
  async function revokeShare(
    projectId: string,
    targetUserId: string,
  ): Promise<{ revoked: boolean }> {
    try {
      await db.projectShare.delete({
        where: { projectId_userId: { projectId, userId: targetUserId } },
      });
      return { revoked: true };
    } catch {
      return { revoked: false };
    }
  }

  /** List all shares for a project */
  async function listShares(projectId: string) {
    return db.projectShare.findMany({
      where: { projectId },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  return {
    resolve,
    canRead,
    canWrite,
    isOwner,
    shareProject,
    shareByEmail,
    revokeShare,
    listShares,
  };
}

export type AccessResolverService = ReturnType<typeof createAccessResolverService>;
