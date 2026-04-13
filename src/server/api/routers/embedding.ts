import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { createEmbeddingDualReadService } from "@/server/services/embeddingDualReadService";

// ─── DEC-2026-002 §13: Embedding Dual-Read Router ─────────────────

export const embeddingRouter = createTRPCRouter({
  /**
   * Full dual-read status snapshot: active models + their unit
   * counts + pending re-embed count. Read-only, safe for any
   * authenticated user.
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    const svc = createEmbeddingDualReadService(ctx.db);
    return svc.getStatus();
  }),

  /**
   * Register a new embedding model into the dual-read registry.
   * Admin-gated — affects global embedding infrastructure.
   */
  registerModel: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        provider: z.string().min(1).max(100),
        dimension: z.number().int().min(1).max(10000),
        scope: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const svc = createEmbeddingDualReadService(ctx.db);
      return svc.registerNewModel(input);
    }),

  /**
   * Deactivate an embedding model. After this, the read path
   * stops merging vectors from that model.
   * Admin-gated — affects global embedding infrastructure.
   */
  deactivateModel: adminProcedure
    .input(z.object({ modelName: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const svc = createEmbeddingDualReadService(ctx.db);
      return svc.deactivateModel(input.modelName);
    }),

  /**
   * Mark all units embedded with a given model for re-embedding.
   * Nulls their embeddingModel field so the embed worker picks them up.
   * Admin-gated — bulk operation affecting many units.
   */
  markForReembed: adminProcedure
    .input(z.object({ fromModel: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const svc = createEmbeddingDualReadService(ctx.db);
      return svc.markForReembed(input.fromModel);
    }),
});
