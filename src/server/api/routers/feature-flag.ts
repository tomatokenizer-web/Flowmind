import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { createFeatureFlagService } from "@/server/services/featureFlagService";

export const featureFlagRouter = createTRPCRouter({
  /** Check if a specific flag is enabled (resolves project → user → global → default) */
  isEnabled: protectedProcedure
    .input(z.object({
      key: z.string(),
      projectId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const svc = createFeatureFlagService(ctx.db);
      const enabled = await svc.isEnabled(input.key, {
        userId: ctx.session.user.id!,
        projectId: input.projectId,
      });
      return { key: input.key, enabled };
    }),

  /** Get all flags with resolved state */
  getAll: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const svc = createFeatureFlagService(ctx.db);
      return svc.getAllFlags({
        userId: ctx.session.user.id!,
        projectId: input?.projectId,
      });
    }),

  /** Set a feature flag value */
  set: protectedProcedure
    .input(z.object({
      key: z.string(),
      enabled: z.boolean(),
      scope: z.enum(["global", "user", "project"]).default("user"),
      scopeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = createFeatureFlagService(ctx.db);
      const resolvedScopeId = input.scope === "user"
        ? ctx.session.user.id!
        : input.scopeId;
      await svc.setFlag(input.key, input.enabled, input.scope, resolvedScopeId);
      return { success: true };
    }),

  /** Seed default flags (idempotent) */
  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const svc = createFeatureFlagService(ctx.db);
    return svc.seedDefaults();
  }),

  /** List all default flag definitions */
  defaults: protectedProcedure.query(() => {
    const svc = createFeatureFlagService(null as never);
    return svc.getDefaultFlags();
  }),
});
