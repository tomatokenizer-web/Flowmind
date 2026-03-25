import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

// ─── Ownership helpers ──────────────────────────────────────────────

/** Verify a context belongs to the authenticated user (via project.userId). */
async function verifyContextOwnership(db: PrismaClient, contextId: string, userId: string) {
  const ctx = await db.context.findFirst({
    where: { id: contextId, project: { userId } },
    select: { id: true },
  });
  if (!ctx) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
  }
  return ctx;
}

/** Verify a navigator belongs to a context owned by the authenticated user. */
async function verifyNavigatorOwnership(db: PrismaClient, navigatorId: string, userId: string) {
  const nav = await db.navigator.findFirst({
    where: { id: navigatorId, context: { project: { userId } } },
  });
  if (!nav) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });
  }
  return nav;
}

// ─── Router ─────────────────────────────────────────────────────────

export const navigatorRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
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
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
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
      await verifyNavigatorOwnership(ctx.db, input.id, ctx.session.user.id!);
      const { id, ...data } = input;
      return ctx.db.navigator.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyNavigatorOwnership(ctx.db, input.id, ctx.session.user.id!);
      return ctx.db.navigator.delete({ where: { id: input.id } });
    }),

  addUnit: protectedProcedure
    .input(z.object({ navigatorId: z.string().uuid(), unitId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const nav = await verifyNavigatorOwnership(ctx.db, input.navigatorId, ctx.session.user.id!);
      const newPath = [...nav.path, input.unitId];
      return ctx.db.navigator.update({ where: { id: input.navigatorId }, data: { path: newPath } });
    }),

  removeStep: protectedProcedure
    .input(z.object({ navigatorId: z.string().uuid(), stepIndex: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const nav = await verifyNavigatorOwnership(ctx.db, input.navigatorId, ctx.session.user.id!);
      if (input.stepIndex >= nav.path.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Step index out of range" });
      }
      const newPath = nav.path.filter((_: string, i: number) => i !== input.stepIndex);
      return ctx.db.navigator.update({ where: { id: input.navigatorId }, data: { path: newPath } });
    }),
});
