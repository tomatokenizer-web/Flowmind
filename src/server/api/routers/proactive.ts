import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  createProactiveSchedulerService,
  DEFAULT_DAILY_BUDGET,
  PROPOSAL_COST,
  KIND_BASE_PRIORITY,
  type CaptureMode,
} from "@/server/services/proactiveSchedulerService";
import { createRuleProposalBridgeService } from "@/server/services/ruleProposalBridgeService";
import { createFeatureFlagService } from "@/server/services/featureFlagService";

const CAPTURE_MODE_FLAG_KEY = "proposal.auto_apply";

/**
 * Resolve the user's captureMode preference from the featureFlag service.
 * auto_apply is an opt-in: flag absent or disabled → review_queue.
 */
async function resolveCaptureMode(
  db: Parameters<typeof createFeatureFlagService>[0],
  userId: string,
): Promise<CaptureMode> {
  const flags = createFeatureFlagService(db);
  const enabled = await flags.isEnabled(CAPTURE_MODE_FLAG_KEY, { userId });
  return enabled ? "auto_apply" : "review_queue";
}

// ─── Zod Schemas ────────────────────────────────────────────────────

const proposalKindEnum = z.enum([
  "reframe", "counter", "maturation", "rule_action",
  "import_merge", "compounding", "type_suggest", "relation_suggest",
]);

const candidateSchema = z.object({
  kind: proposalKindEnum,
  targetUnitId: z.string().uuid().optional(),
  contextId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  rationale: z.string().max(500).optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

const unitForScanSchema = z.object({
  id: z.string(),
  unitType: z.string(),
  content: z.string().max(4000),
});

const relationForScanSchema = z.object({
  subtype: z.string(),
  sourceId: z.string().optional(),
  targetId: z.string().optional(),
});

// ─── Router ─────────────────────────────────────────────────────────

/**
 * Proactive Surfacing router per DEC-2026-002 §8.
 * Single entry point for any subsystem that wants to create proposals
 * through the daily-budgeted scheduler.
 */
export const proactiveRouter = createTRPCRouter({
  /**
   * Get the user's current budget status for today.
   */
  getBudgetStatus: protectedProcedure
    .input(
      z.object({
        dailyBudget: z.number().int().min(1).max(50).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const scheduler = createProactiveSchedulerService(ctx.db);
      return scheduler.getBudgetStatus(
        ctx.session.user.id!,
        input?.dailyBudget ?? DEFAULT_DAILY_BUDGET,
      );
    }),

  /**
   * Surface a batch of candidate proposals through the scheduler.
   * Writes up to dailyBudget cost units of candidates; defers the rest.
   */
  schedule: protectedProcedure
    .input(
      z.object({
        candidates: z.array(candidateSchema).min(1).max(50),
        dailyBudget: z.number().int().min(1).max(50).optional(),
        /** Override the user's default captureMode for this batch. */
        captureMode: z.enum(["review_queue", "auto_apply"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scheduler = createProactiveSchedulerService(ctx.db);
      const captureMode =
        input.captureMode ?? (await resolveCaptureMode(ctx.db, ctx.session.user.id!));
      return scheduler.schedule(
        ctx.session.user.id!,
        input.candidates,
        { dailyBudget: input.dailyBudget, captureMode },
      );
    }),

  /**
   * Get the current captureMode preference for the signed-in user.
   */
  getCaptureMode: protectedProcedure.query(async ({ ctx }) => {
    const captureMode = await resolveCaptureMode(ctx.db, ctx.session.user.id!);
    return { captureMode };
  }),

  /**
   * Set the captureMode preference for the signed-in user.
   */
  setCaptureMode: protectedProcedure
    .input(z.object({ captureMode: z.enum(["review_queue", "auto_apply"]) }))
    .mutation(async ({ ctx, input }) => {
      const flags = createFeatureFlagService(ctx.db);
      await flags.setFlag(
        CAPTURE_MODE_FLAG_KEY,
        input.captureMode === "auto_apply",
        "user",
        ctx.session.user.id!,
      );
      return { captureMode: input.captureMode };
    }),

  /**
   * Preview scheduling without writing any proposals.
   */
  preview: protectedProcedure
    .input(
      z.object({
        candidates: z.array(candidateSchema).min(1).max(50),
        dailyBudget: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scheduler = createProactiveSchedulerService(ctx.db);
      return scheduler.preview(
        ctx.session.user.id!,
        input.candidates,
        { dailyBudget: input.dailyBudget },
      );
    }),

  /**
   * Run the Rules Engine over a set of units+relations and surface any
   * actionable violations as `rule_action` proposals.
   */
  scanRules: protectedProcedure
    .input(
      z.object({
        units: z.array(unitForScanSchema).min(1).max(200),
        relations: z.array(relationForScanSchema).max(500).default([]),
        contextId: z.string().uuid().optional(),
        dailyBudget: z.number().int().min(1).max(50).optional(),
        dryRun: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bridge = createRuleProposalBridgeService(ctx.db);
      return bridge.scanAndPropose(
        ctx.session.user.id!,
        input.units,
        input.relations,
        {
          contextId: input.contextId,
          dailyBudget: input.dailyBudget,
          dryRun: input.dryRun,
        },
      );
    }),

  /**
   * Static config used by the UI to display cost/priority hints.
   */
  getConfig: protectedProcedure.query(() => ({
    defaultDailyBudget: DEFAULT_DAILY_BUDGET,
    proposalCost: PROPOSAL_COST,
    kindBasePriority: KIND_BASE_PRIORITY,
  })),
});
