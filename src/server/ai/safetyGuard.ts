import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { logger } from "../logger";

// ─── Types ────────────────────────────────────────────────────────────────

export interface SafetyCheckResult {
  allowed: boolean;
  error?: {
    type: "AI_GENERATION_LIMIT" | "AI_CONSECUTIVE_LIMIT" | "AI_RATIO_WARNING";
    message: string;
  };
  warning?: {
    type: "AI_RATIO_WARNING";
    message: string;
    ratio: number;
  };
}

export interface SafetyGuardOptions {
  maxUnitsPerRequest?: number;
  maxConsecutiveBranches?: number;
  aiRatioWarningThreshold?: number;
  /** Sessions inactive longer than this (ms) are considered expired. Default: 30 minutes */
  sessionTtlMs?: number;
}

// ─── Safety Guard Service ─────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<SafetyGuardOptions> = {
  maxUnitsPerRequest: 3,
  maxConsecutiveBranches: 3,
  aiRatioWarningThreshold: 0.4,
  sessionTtlMs: 30 * 60 * 1000, // 30 minutes
};

/**
 * Generate a cryptographically random session ID.
 *
 * Previous implementation used `Date.now()` which is predictable and
 * collides when two requests arrive within the same millisecond.
 * crypto.randomUUID() provides 122 bits of randomness (RFC 4122 v4).
 */
export function generateSessionId(): string {
  return randomUUID();
}

export function createSafetyGuard(
  db: PrismaClient,
  options: SafetyGuardOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return {
    /**
     * Create a new safety guard session in the database.
     * Returns the session ID for subsequent requests.
     *
     * Clients should call this once (e.g., when entering a context view)
     * and reuse the returned sessionId for all AI requests in that editing
     * session. This enables accurate consecutive-branch tracking.
     */
    async createSession(userId: string): Promise<string> {
      const session = await db.safetyGuardSession.create({
        data: { userId },
      });
      return session.id;
    },

    /**
     * Check if a unit generation request is allowed
     */
    async checkGenerationLimit(
      userId: string,
      requestUnitCount: number
    ): Promise<SafetyCheckResult> {
      if (requestUnitCount > config.maxUnitsPerRequest) {
        return {
          allowed: false,
          error: {
            type: "AI_GENERATION_LIMIT",
            message: `Maximum ${config.maxUnitsPerRequest} Units per request reached`,
          },
        };
      }
      return { allowed: true };
    },

    /**
     * Check consecutive branch generation limit.
     *
     * Uses the DB-backed SafetyGuardSession table so that the counter
     * persists across serverless cold starts and horizontal scaling.
     */
    async checkConsecutiveBranchLimit(
      userId: string,
      sessionId: string
    ): Promise<SafetyCheckResult> {
      const session = await db.safetyGuardSession.findUnique({
        where: { id: sessionId },
      });

      // If no session found (expired or invalid), allow but log
      if (!session) {
        logger.warn(
          { userId, sessionId },
          "Safety guard session not found; allowing request"
        );
        return { allowed: true };
      }

      // Check if session belongs to this user
      if (session.userId !== userId) {
        logger.warn(
          { userId, sessionId, sessionUserId: session.userId },
          "Safety guard session userId mismatch"
        );
        return { allowed: true };
      }

      // Check if session has expired (stale sessions should not block)
      const elapsed = Date.now() - session.lastActivityAt.getTime();
      if (elapsed > config.sessionTtlMs) {
        // Expired session - reset counter instead of blocking
        await db.safetyGuardSession.update({
          where: { id: sessionId },
          data: { consecutiveBranches: 0, lastActivityAt: new Date() },
        });
        return { allowed: true };
      }

      if (session.consecutiveBranches >= config.maxConsecutiveBranches) {
        return {
          allowed: false,
          error: {
            type: "AI_CONSECUTIVE_LIMIT",
            message:
              "Please add your own thoughts before generating more branches",
          },
        };
      }
      return { allowed: true };
    },

    /**
     * Increment consecutive branch count for session (DB-backed)
     */
    async incrementBranchCount(
      userId: string,
      sessionId: string
    ): Promise<void> {
      try {
        await db.safetyGuardSession.update({
          where: { id: sessionId },
          data: {
            consecutiveBranches: { increment: 1 },
            lastActivityAt: new Date(),
          },
        });
      } catch (error) {
        // Session may not exist (e.g., legacy client without session creation).
        // Log and continue; do not block the user.
        logger.warn(
          { userId, sessionId, error },
          "Failed to increment branch count - session may not exist"
        );
      }
    },

    /**
     * Reset branch count when user creates manual content (DB-backed)
     */
    async resetBranchCount(
      userId: string,
      sessionId: string
    ): Promise<void> {
      try {
        await db.safetyGuardSession.update({
          where: { id: sessionId },
          data: {
            consecutiveBranches: 0,
            lastActivityAt: new Date(),
          },
        });
      } catch (error) {
        logger.warn(
          { userId, sessionId, error },
          "Failed to reset branch count - session may not exist"
        );
      }
    },

    /**
     * Check AI contribution ratio for a context
     */
    async checkAIRatio(contextId: string): Promise<SafetyCheckResult> {
      const [totalCount, aiCount] = await Promise.all([
        db.unitContext.count({ where: { contextId } }),
        db.unitContext.count({
          where: {
            contextId,
            unit: {
              originType: { in: ["ai_generated", "ai_refined"] },
            },
          },
        }),
      ]);

      if (totalCount === 0) {
        return { allowed: true };
      }

      const ratio = aiCount / totalCount;

      if (ratio > config.aiRatioWarningThreshold) {
        logger.info(
          { contextId, ratio, threshold: config.aiRatioWarningThreshold },
          "AI ratio warning triggered"
        );

        return {
          allowed: true,
          warning: {
            type: "AI_RATIO_WARNING",
            message: `AI contributions exceed ${Math.round(config.aiRatioWarningThreshold * 100)}% of this Context. Consider adding more of your own thoughts.`,
            ratio: Math.round(ratio * 100),
          },
        };
      }

      return { allowed: true };
    },

    /**
     * Run all safety checks before AI generation
     */
    async runAllChecks(params: {
      userId: string;
      sessionId: string;
      requestUnitCount: number;
      contextId?: string;
      isBranchGeneration?: boolean;
    }): Promise<SafetyCheckResult> {
      const {
        userId,
        sessionId,
        requestUnitCount,
        contextId,
        isBranchGeneration,
      } = params;

      // Check generation limit
      const genLimit = await this.checkGenerationLimit(
        userId,
        requestUnitCount
      );
      if (!genLimit.allowed) {
        return genLimit;
      }

      // Check consecutive branch limit
      if (isBranchGeneration) {
        const branchLimit = await this.checkConsecutiveBranchLimit(
          userId,
          sessionId
        );
        if (!branchLimit.allowed) {
          return branchLimit;
        }
      }

      // Check AI ratio (returns warning, not block)
      if (contextId) {
        const ratioCheck = await this.checkAIRatio(contextId);
        if (ratioCheck.warning) {
          return { allowed: true, warning: ratioCheck.warning };
        }
      }

      return { allowed: true };
    },

    /**
     * Clean up expired sessions. Call periodically (e.g., via cron) to
     * prevent unbounded table growth.
     */
    async cleanupExpiredSessions(): Promise<number> {
      const cutoff = new Date(Date.now() - config.sessionTtlMs);
      const result = await db.safetyGuardSession.deleteMany({
        where: { lastActivityAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        logger.info(
          { deletedCount: result.count },
          "Cleaned up expired safety guard sessions"
        );
      }
      return result.count;
    },
  };
}

export type SafetyGuard = ReturnType<typeof createSafetyGuard>;
