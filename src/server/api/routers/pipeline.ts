import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

/**
 * Pipeline router — handles unit lifecycle transitions and batch operations.
 * Kept minimal for now; business logic will be extracted to service layer.
 */
export const pipelineRouter = createTRPCRouter({
  /** Transition a unit through lifecycle stages (draft -> pending -> confirmed) */
  transition: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        to: z.enum([
          "draft",
          "pending",
          "confirmed",
          "deferred",
          "complete",
          "archived",
          "discarded",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, userId: ctx.session.user.id },
        select: { id: true, lifecycle: true, locked: true },
      });

      if (!unit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit not found",
        });
      }

      if (unit.locked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot transition a locked unit",
        });
      }

      const updated = await ctx.db.unit.update({
        where: { id: input.unitId },
        data: {
          lifecycle: input.to,
          ...(input.to === "archived" && { isArchived: true }),
        },
        select: {
          id: true,
          lifecycle: true,
          isArchived: true,
          modifiedAt: true,
        },
      });

      return updated;
    }),

  /** Batch transition multiple units at once */
  batchTransition: protectedProcedure
    .input(
      z.object({
        unitIds: z.array(z.string().uuid()).min(1).max(100),
        to: z.enum([
          "draft",
          "pending",
          "confirmed",
          "deferred",
          "complete",
          "archived",
          "discarded",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.unit.updateMany({
        where: {
          id: { in: input.unitIds },
          userId: ctx.session.user.id,
          locked: false,
        },
        data: {
          lifecycle: input.to,
          ...(input.to === "archived" && { isArchived: true }),
        },
      });

      return { updated: result.count };
    }),

  /** Assign units to a context in batch */
  batchAssignContext: protectedProcedure
    .input(
      z.object({
        unitIds: z.array(z.string().uuid()).min(1).max(100),
        contextId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify context ownership
      const context = await ctx.db.context.findFirst({
        where: {
          id: input.contextId,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true, projectId: true },
      });

      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Context not found",
        });
      }

      // Verify all units belong to user and same project
      const units = await ctx.db.unit.findMany({
        where: {
          id: { in: input.unitIds },
          userId: ctx.session.user.id,
          projectId: context.projectId,
        },
        select: { id: true },
      });

      if (units.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid units found for this project",
        });
      }

      // Use createMany with skipDuplicates to handle already-assigned units
      const result = await ctx.db.unitContext.createMany({
        data: units.map((u) => ({
          unitId: u.id,
          contextId: input.contextId,
        })),
        skipDuplicates: true,
      });

      return { assigned: result.count };
    }),
});
