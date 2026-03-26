import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { createRelationService } from "@/server/services/relationService";

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

  /**
   * Generate a reading path from relation graph starting at a given unit.
   * Uses BFS weighted by relation strength to create an optimal reading order.
   * Creates a new Navigator with the generated path.
   */
  generatePath: protectedProcedure
    .input(z.object({
      startUnitId: z.string().uuid(),
      contextId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);

      // Verify the start unit exists and belongs to user
      const startUnit = await ctx.db.unit.findFirst({
        where: { id: input.startUnitId, project: { userId: ctx.session.user.id! } },
        select: { id: true, content: true },
      });
      if (!startUnit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Start unit not found" });
      }

      // Get the relation subgraph (depth 3) from the start unit
      const relationService = createRelationService(ctx.db);
      const { relations } = await relationService.neighborsByDepth(
        input.startUnitId,
        3,
        input.contextId,
      );

      if (relations.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No relations found from this unit. Add relations first.",
        });
      }

      // Build adjacency list weighted by relation type priority + strength
      const TYPE_PRIORITY: Record<string, number> = {
        derives_from: 5, expands: 4, supports: 3, defines: 3,
        exemplifies: 2, references: 2, contradicts: 1, questions: 1,
      };

      type Edge = { target: string; weight: number };
      const adj = new Map<string, Edge[]>();

      for (const r of relations) {
        const typePriority = TYPE_PRIORITY[r.type] ?? 1;
        const weight = typePriority * r.strength;

        // Forward direction
        if (!adj.has(r.sourceUnitId)) adj.set(r.sourceUnitId, []);
        adj.get(r.sourceUnitId)!.push({ target: r.targetUnitId, weight });

        // Bidirectional or reverse traversal (lower weight)
        if (r.direction === "bidirectional" || true) {
          if (!adj.has(r.targetUnitId)) adj.set(r.targetUnitId, []);
          adj.get(r.targetUnitId)!.push({ target: r.sourceUnitId, weight: weight * 0.6 });
        }
      }

      // Greedy BFS: always pick the highest-weight unvisited neighbor
      const path: string[] = [input.startUnitId];
      const visited = new Set<string>([input.startUnitId]);

      let current = input.startUnitId;
      for (let i = 0; i < 30; i++) { // max 30 steps
        const neighbors = adj.get(current) ?? [];
        const unvisited = neighbors
          .filter((e) => !visited.has(e.target))
          .sort((a, b) => b.weight - a.weight);

        if (unvisited.length === 0) break;

        const next = unvisited[0]!;
        path.push(next.target);
        visited.add(next.target);
        current = next.target;
      }

      // Create navigator with generated path
      const navName = input.name ?? `Flow from "${startUnit.content.slice(0, 30)}${startUnit.content.length > 30 ? "…" : ""}"`;

      return ctx.db.navigator.create({
        data: {
          name: navName,
          contextId: input.contextId,
          purpose: "ai-generated",
          path,
        },
      });
    }),
});
