import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const navigatorRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.navigator.findMany({
        where: { contextId: input.contextId },
        orderBy: { name: "asc" },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      contextId: z.string().uuid(),
      purpose: z.string().max(30).optional(),
      path: z.array(z.string().uuid()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.navigator.create({
        data: {
          name: input.name,
          contextId: input.contextId,
          purpose: input.purpose,
          path: input.path,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      path: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.navigator.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.navigator.delete({ where: { id: input.id } });
    }),

  addUnit: protectedProcedure
    .input(z.object({ navigatorId: z.string().uuid(), unitId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const nav = await ctx.db.navigator.findUnique({ where: { id: input.navigatorId } });
      if (!nav) throw new TRPCError({ code: "NOT_FOUND" });
      const newPath = [...nav.path, input.unitId];
      return ctx.db.navigator.update({ where: { id: input.navigatorId }, data: { path: newPath } });
    }),
});
