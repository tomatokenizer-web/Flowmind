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

      const startUnit = await ctx.db.unit.findFirst({
        where: { id: input.startUnitId, project: { userId: ctx.session.user.id! } },
        select: { id: true, content: true },
      });
      if (!startUnit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Start unit not found" });
      }

      const relationService = createRelationService(ctx.db);
      const { relations } = await relationService.neighborsByDepth(input.startUnitId, 3, input.contextId);

      if (relations.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No relations found from this unit." });
      }

      const path = buildGreedyPath(input.startUnitId, relations, null);

      const navName = input.name ?? `Flow from "${startUnit.content.slice(0, 30)}${startUnit.content.length > 30 ? "…" : ""}"`;

      return ctx.db.navigator.create({
        data: { name: navName, contextId: input.contextId, purpose: "ai-generated", path },
      });
    }),

  /**
   * Analyze all relations in a context and generate multiple purpose-driven
   * navigation paths. Each path follows a different relation strategy:
   * - Argument chain (supports/contradicts)
   * - Derivation trail (derives_from/expands)
   * - Exploration (all relations, breadth-first)
   * - Debate (contradicts/questions)
   */
  analyzeAndGenerate: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);

      // Get all units in this context
      const contextUnits = await ctx.db.unitContext.findMany({
        where: { contextId: input.contextId },
        select: { unitId: true },
      });
      const unitIds = contextUnits.map((u) => u.unitId);

      if (unitIds.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 units with relations to generate paths." });
      }

      // Fetch all relations between units in this context
      const allRelations = await ctx.db.relation.findMany({
        where: {
          OR: [
            { sourceUnitId: { in: unitIds } },
            { targetUnitId: { in: unitIds } },
          ],
        },
        select: {
          id: true,
          sourceUnitId: true,
          targetUnitId: true,
          type: true,
          strength: true,
          direction: true,
        },
      });

      if (allRelations.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No relations found between units. Create relations first." });
      }

      // Get unit data for naming
      const units = await ctx.db.unit.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, content: true, unitType: true, importance: true },
      });
      const unitMap = new Map(units.map((u) => [u.id, u]));

      // Find the "hub" unit — most connected
      const connectionCount = new Map<string, number>();
      for (const r of allRelations) {
        connectionCount.set(r.sourceUnitId, (connectionCount.get(r.sourceUnitId) ?? 0) + 1);
        connectionCount.set(r.targetUnitId, (connectionCount.get(r.targetUnitId) ?? 0) + 1);
      }
      const hubId = [...connectionCount.entries()]
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? unitIds[0]!;

      // Define path strategies
      const strategies: Array<{
        name: string;
        purpose: string;
        types: string[] | null; // null = all types
        minSteps: number;
      }> = [
        {
          name: "Argument chain",
          purpose: "argument",
          types: ["supports", "contradicts", "questions", "defines"],
          minSteps: 2,
        },
        {
          name: "Derivation trail",
          purpose: "derivation",
          types: ["derives_from", "expands", "elaborates", "transforms_into"],
          minSteps: 2,
        },
        {
          name: "Evidence & examples",
          purpose: "evidence",
          types: ["exemplifies", "references", "grounded_in", "instantiates"],
          minSteps: 2,
        },
        {
          name: "Full exploration",
          purpose: "exploration",
          types: null, // all relation types
          minSteps: 3,
        },
      ];

      // Generate paths for each strategy
      const created: Array<{ id: string; name: string; purpose: string; steps: number }> = [];

      // Delete existing ai-generated navigators for this context to avoid duplicates
      await ctx.db.navigator.deleteMany({
        where: { contextId: input.contextId, purpose: { in: strategies.map((s) => s.purpose) } },
      });

      for (const strategy of strategies) {
        const filtered = strategy.types
          ? allRelations.filter((r) => strategy.types!.includes(r.type))
          : allRelations;

        if (filtered.length === 0) continue;

        // Find best start unit for this strategy (most connections of this type)
        const counts = new Map<string, number>();
        for (const r of filtered) {
          counts.set(r.sourceUnitId, (counts.get(r.sourceUnitId) ?? 0) + 1);
          counts.set(r.targetUnitId, (counts.get(r.targetUnitId) ?? 0) + 1);
        }
        const startId = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? hubId;

        const path = buildGreedyPath(startId, filtered, strategy.types);

        if (path.length < strategy.minSteps) continue;

        // Name using the start unit content
        const startContent = unitMap.get(startId)?.content ?? "Unit";
        const shortContent = startContent.slice(0, 25) + (startContent.length > 25 ? "…" : "");

        const nav = await ctx.db.navigator.create({
          data: {
            name: `${strategy.name}: ${shortContent}`,
            contextId: input.contextId,
            purpose: strategy.purpose,
            path,
          },
        });

        created.push({
          id: nav.id,
          name: nav.name,
          purpose: strategy.purpose ?? "",
          steps: path.length,
        });
      }

      if (created.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough relations to generate meaningful paths. Add more relations between units.",
        });
      }

      return {
        generated: created,
        totalRelationsAnalyzed: allRelations.length,
        totalUnits: unitIds.length,
      };
    }),
});

// ─── Path builder helper ─────────────────────────────────────────────

type RelationEdge = {
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  strength: number;
  direction: string;
};

const TYPE_PRIORITY: Record<string, number> = {
  derives_from: 5, expands: 4, supports: 3, defines: 3,
  exemplifies: 2, references: 2, contradicts: 1, questions: 1,
};

function buildGreedyPath(
  startId: string,
  relations: RelationEdge[],
  allowedTypes: string[] | null,
): string[] {
  type Edge = { target: string; weight: number };
  const adj = new Map<string, Edge[]>();

  for (const r of relations) {
    if (allowedTypes && !allowedTypes.includes(r.type)) continue;

    const typePriority = TYPE_PRIORITY[r.type] ?? 1;
    const weight = typePriority * r.strength;

    if (!adj.has(r.sourceUnitId)) adj.set(r.sourceUnitId, []);
    adj.get(r.sourceUnitId)!.push({ target: r.targetUnitId, weight });

    if (!adj.has(r.targetUnitId)) adj.set(r.targetUnitId, []);
    adj.get(r.targetUnitId)!.push({ target: r.sourceUnitId, weight: weight * 0.6 });
  }

  const path: string[] = [startId];
  const visited = new Set<string>([startId]);
  let current = startId;

  for (let i = 0; i < 30; i++) {
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

  return path;
}
