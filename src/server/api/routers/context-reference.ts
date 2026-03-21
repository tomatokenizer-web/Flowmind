import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createContextReferenceService } from "@/server/services/contextReferenceService";

export const contextReferenceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        sourceContextId: z.string().uuid(),
        targetContextId: z.string().uuid(),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createContextReferenceService(ctx.db);
      return service.create({
        sourceContextId: input.sourceContextId,
        targetContextId: input.targetContextId,
        description: input.description,
        createdById: ctx.session.user.id!,
      });
    }),

  listByContext: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createContextReferenceService(ctx.db);
      return service.listByContext(input.contextId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = createContextReferenceService(ctx.db);
      return service.remove(input.id, ctx.session.user.id!);
    }),
});
