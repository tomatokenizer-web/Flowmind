import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const perspectiveRouter = createTRPCRouter({
  // ---- list perspectives for a unit ----
  list: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { project: { select: { userId: true } } },
      });
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (unit.project.userId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your unit" });

      return ctx.db.unitPerspective.findMany({
        where: { unitId: input.unitId },
        include: {
          context: { select: { id: true, name: true } },
        },
        orderBy: { importance: "desc" },
      });
    }),

  // ---- getByContext ----
  getByContext: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        contextId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { project: { select: { userId: true } } },
      });
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (unit.project.userId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your unit" });

      const perspective = await ctx.db.unitPerspective.findUnique({
        where: { unitId_contextId: { unitId: input.unitId, contextId: input.contextId } },
        include: {
          context: { select: { id: true, name: true } },
          relations: true,
        },
      });

      if (!perspective)
        throw new TRPCError({ code: "NOT_FOUND", message: "Perspective not found" });

      return perspective;
    }),

  // ---- upsert ----
  upsert: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        contextId: z.string().uuid(),
        type: z.string().max(50).optional(),
        stance: z.enum(["support", "oppose", "neutral", "exploring"]).optional(),
        importance: z.number().min(0).max(1).optional(),
        note: z.string().optional(),
        canvasX: z.number().optional(),
        canvasY: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { project: { select: { userId: true } } },
      });
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (unit.project.userId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your unit" });

      const { unitId, contextId, ...data } = input;

      return ctx.db.unitPerspective.upsert({
        where: { unitId_contextId: { unitId, contextId } },
        create: { unitId, contextId, ...data },
        update: data,
      });
    }),

  // ---- delete ----
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const perspective = await ctx.db.unitPerspective.findUnique({
        where: { id: input.id },
        select: { unit: { select: { project: { select: { userId: true } } } } },
      });
      if (!perspective)
        throw new TRPCError({ code: "NOT_FOUND", message: "Perspective not found" });
      if (perspective.unit.project.userId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your perspective" });

      return ctx.db.unitPerspective.delete({ where: { id: input.id } });
    }),
});
