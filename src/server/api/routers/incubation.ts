import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// ─── Zod Schemas ───────────────────────────────────────────────────

const unitIdSchema = z.object({
  unitId: z.string().uuid(),
});

const promoteSchema = z.object({
  unitId: z.string().uuid(),
  contextId: z.string().uuid(),
});

// ─── Router ────────────────────────────────────────────────────────

export const incubationRouter = createTRPCRouter({
  /**
   * List all incubating units for the current user, ordered by createdAt desc
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const units = await ctx.db.unit.findMany({
      where: {
        userId: ctx.session.user.id!,
        incubating: true,
      },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });
    return units;
  }),

  /**
   * Promote an incubating unit: add to context and set incubating=false
   */
  promote: protectedProcedure
    .input(promoteSchema)
    .mutation(async ({ ctx, input }) => {
      const { unitId, contextId } = input;

      // Verify unit exists and belongs to user
      const unit = await ctx.db.unit.findFirst({
        where: {
          id: unitId,
          userId: ctx.session.user.id!,
        },
      });

      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }

      // Verify context exists
      const context = await ctx.db.context.findUnique({
        where: { id: contextId },
      });

      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      // Use transaction to add unit to context and update incubating flag
      const [updatedUnit] = await ctx.db.$transaction([
        ctx.db.unit.update({
          where: { id: unitId },
          data: {
            incubating: false,
            lastAccessed: new Date(),
          },
        }),
        ctx.db.unitContext.upsert({
          where: {
            unitId_contextId: { unitId, contextId },
          },
          create: { unitId, contextId },
          update: {},
        }),
      ]);

      return updatedUnit;
    }),

  /**
   * Snooze an incubating unit: set lastAccessed to now so it surfaces again later
   */
  snooze: protectedProcedure
    .input(unitIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { unitId } = input;

      const unit = await ctx.db.unit.findFirst({
        where: {
          id: unitId,
          userId: ctx.session.user.id!,
        },
      });

      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }

      return ctx.db.unit.update({
        where: { id: unitId },
        data: { lastAccessed: new Date() },
      });
    }),

  /**
   * Discard an incubating unit: set lifecycle='archived' and incubating=false
   */
  discard: protectedProcedure
    .input(unitIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { unitId } = input;

      const unit = await ctx.db.unit.findFirst({
        where: {
          id: unitId,
          userId: ctx.session.user.id!,
        },
      });

      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }

      return ctx.db.unit.update({
        where: { id: unitId },
        data: {
          lifecycle: "archived",
          incubating: false,
        },
      });
    }),
});
