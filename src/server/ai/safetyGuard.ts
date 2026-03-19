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
}

// ─── Safety Guard Service ─────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<SafetyGuardOptions> = {
  maxUnitsPerRequest: 3,
  maxConsecutiveBranches: 3,
  aiRatioWarningThreshold: 0.4,
};

// In-memory session tracking for consecutive branch generations
// In production, this would be stored in Redis or similar
const sessionBranchCounts = new Map<string, number>();

export function createSafetyGuard(
  db: PrismaClient,
  options: SafetyGuardOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return {
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
     * Check consecutive branch generation limit
     */
    async checkConsecutiveBranchLimit(
      userId: string,
      sessionId: string
    ): Promise<SafetyCheckResult> {
      const key = `${userId}:${sessionId}`;
      const count = sessionBranchCounts.get(key) ?? 0;

      if (count >= config.maxConsecutiveBranches) {
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
     * Increment consecutive branch count for session
     */
    incrementBranchCount(userId: string, sessionId: string): void {
      const key = `${userId}:${sessionId}`;
      const count = sessionBranchCounts.get(key) ?? 0;
      sessionBranchCounts.set(key, count + 1);
    },

    /**
     * Reset branch count when user creates manual content
     */
    resetBranchCount(userId: string, sessionId: string): void {
      const key = `${userId}:${sessionId}`;
      sessionBranchCounts.delete(key);
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
  };
}

export type SafetyGuard = ReturnType<typeof createSafetyGuard>;
