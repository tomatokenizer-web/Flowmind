import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createContextVisitService } from "@/server/services/contextVisitService";
import { createContextBriefingService } from "@/server/services/contextBriefingService";

export const contextVisitRouter = createTRPCRouter({
  getBriefing: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createContextBriefingService(ctx.db);
      return service.getBriefing(ctx.session.user.id!, input.contextId);
    }),

  recordVisit: protectedProcedure
    .input(
      z.object({
        contextId: z.string().uuid(),
        lastViewedUnitId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createContextVisitService(ctx.db);
      return service.recordVisit({
        userId: ctx.session.user.id!,
        contextId: input.contextId,
        lastViewedUnitId: input.lastViewedUnitId,
      });
    }),

  updateLastViewedUnit: protectedProcedure
    .input(
      z.object({
        contextId: z.string().uuid(),
        unitId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createContextVisitService(ctx.db);
      return service.updateLastViewedUnit(
        ctx.session.user.id!,
        input.contextId,
        input.unitId,
      );
    }),
});
