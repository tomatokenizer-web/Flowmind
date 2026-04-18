import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createCompressionService } from "@/server/services/compressionService";
import { createOrphanService } from "@/server/services/orphanService";
import { createDriftService } from "@/server/services/driftService";
import { getAIProvider, generateReflectionPrompts, enforceRateLimit } from "@/server/ai";

export const feedbackRouter = createTRPCRouter({
  // ─── Compression (8.2) ───────────────────────────────────────────
  findSimilarClaims: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createCompressionService(ctx.db);
      return service.findSimilarClaims(input.contextId);
    }),

  compressClaims: protectedProcedure
    .input(z.object({
      unitIds: z.array(z.string().uuid()).min(2),
      coreContent: z.string().min(1),
      contextId: z.string().uuid().optional(),
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve contextId: use provided or look up first context of any source unit
      let resolvedContextId = input.contextId;
      if (!resolvedContextId) {
        const firstUnitContext = await ctx.db.unitContext.findFirst({
          where: { unitId: { in: input.unitIds } },
          select: { contextId: true },
        });
        resolvedContextId = firstUnitContext?.contextId;
      }
      if (!resolvedContextId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No context found for these units" });
      }
      const service = createCompressionService(ctx.db);
      return service.compressClaims(
        input.unitIds,
        input.coreContent,
        ctx.session.user.id!,
        input.projectId,
        resolvedContextId,
      );
    }),

  // ─── Orphan Recovery (8.3) ───────────────────────────────────────
  findOrphans: protectedProcedure.query(async ({ ctx }) => {
    const service = createOrphanService(ctx.db);
    return service.findOrphans(ctx.session.user.id!);
  }),

  recoverOrphan: protectedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      action: z.enum(["context", "incubate", "archive", "delete"]),
      contextId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // IDOR fix: verify unit ownership before recovery action
      const owned = await ctx.db.unit.findFirst({
        where: { id: input.unitId, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      const service = createOrphanService(ctx.db);
      return service.recoverOrphan(input.unitId, input.action, input.contextId);
    }),

  // ─── Action Completion (8.6) ──────────────────────────────────────
  completeAction: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // IDOR fix: verify unit ownership
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, project: { userId: ctx.session.user.id! } },
        select: { id: true, unitType: true, lifecycle: true },
      });
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (unit.unitType !== "action") throw new TRPCError({ code: "BAD_REQUEST", message: "Unit is not an action" });

      await ctx.db.unit.update({
        where: { id: input.unitId },
        data: { lifecycle: "complete" },
      });

      // Get related decision units
      const relations = await ctx.db.relation.findMany({
        where: {
          targetUnitId: input.unitId,
          type: { in: ["derives_from", "references", "supports"] },
        },
        include: { sourceUnit: { select: { id: true, content: true, unitType: true } } },
        take: 5,
      });

      return { unitId: input.unitId, relatedUnits: relations.map((r) => r.sourceUnit) };
    }),

  // ─── Drift Detection (8.7) ────────────────────────────────────────
  getDriftUnits: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), threshold: z.number().min(0).max(1).optional() }))
    .query(async ({ ctx, input }) => {
      // IDOR fix: verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const service = createDriftService(ctx.db);
      return service.getHighDriftUnits(input.projectId, input.threshold);
    }),

  resolveDrift: protectedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      action: z.enum(["keep", "move", "branch"]),
      contextId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // IDOR fix: verify unit ownership
      const owned = await ctx.db.unit.findFirst({
        where: { id: input.unitId, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (input.action === "keep") {
        await ctx.db.unit.update({ where: { id: input.unitId }, data: { driftScore: 0 } });
      } else if (input.action === "move" && input.contextId) {
        await ctx.db.unitContext.upsert({
          where: { unitId_contextId: { unitId: input.unitId, contextId: input.contextId } },
          create: { unitId: input.unitId, contextId: input.contextId },
          update: {},
        });
      }
      return { unitId: input.unitId, action: input.action };
    }),

  // ─── Branch Project (8.8) ────────────────────────────────────────
  branchProject: protectedProcedure
    .input(z.object({
      sourceProjectId: z.string().uuid(),
      unitIds: z.array(z.string().uuid()).min(1),
      name: z.string().min(1).max(200),
      purpose: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Create new project
      const newProject = await ctx.db.project.create({
        data: {
          name: input.name,
          userId,
          branchedFrom: input.sourceProjectId,
          branchReason: input.purpose ?? "Branched from drift detection",
          constraintLevel: "guided",
        },
      });

      // Create initial context
      const newContext = await ctx.db.context.create({
        data: {
          name: "Main",
          projectId: newProject.id,
        },
      });

      // Add units to new context
      await ctx.db.$transaction(async (tx) => {
        for (const unitId of input.unitIds) {
          await tx.unitContext.upsert({
            where: { unitId_contextId: { unitId, contextId: newContext.id } },
            create: { unitId, contextId: newContext.id },
            update: {},
          });
          // Reset drift score
          await tx.unit.update({ where: { id: unitId }, data: { driftScore: 0 } });
        }
      });

      return { newProject, newContext };
    }),

  // ─── Reverse Provenance (8.5) ────────────────────────────────────
  getReverseProvenance: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Find units that reference this unit as their source
      const derivedUnits = await ctx.db.unit.findMany({
        where: {
          parentInputId: input.unitId,
          userId: ctx.session.user.id!,
        },
        select: { id: true, content: true, unitType: true, sourceSpan: true },
        take: 50,
      });

      // Find assemblies containing derived units
      const derivedUnitIds = derivedUnits.map((u) => u.id);
      const assemblies = derivedUnitIds.length > 0
        ? await ctx.db.assembly.findMany({
            where: { items: { some: { unitId: { in: derivedUnitIds } } } },
            select: { id: true, name: true },
          })
        : [];

      return { derivedUnits, assemblies };
    }),

  // ─── Provenance chain (8.5 — relation-based) ─────────────────────
  getProvenance: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const PROVENANCE_TYPES = ["derives_from", "responds_to", "supports", "references"];
      const MAX_DEPTH = 5;

      type ChainNode = {
        id: string;
        content: string;
        unitType: string;
        relation: string;
        depth: number;
      };

      const chain: ChainNode[] = [];
      const visited = new Set<string>();
      let frontier: { unitId: string; depth: number; relation: string }[] = [
        { unitId: input.unitId, depth: 0, relation: "" },
      ];

      while (frontier.length > 0 && chain.length < 50) {
        const next: typeof frontier = [];
        for (const node of frontier) {
          if (visited.has(node.unitId)) continue;
          visited.add(node.unitId);

          if (node.depth > 0) {
            const unit = await ctx.db.unit.findUnique({
              where: { id: node.unitId },
              select: { id: true, content: true, unitType: true },
            });
            if (unit) {
              chain.push({ ...unit, relation: node.relation, depth: node.depth });
            }
          }

          if (node.depth < MAX_DEPTH) {
            const parentRelations = await ctx.db.relation.findMany({
              where: {
                targetUnitId: node.unitId,
                type: { in: PROVENANCE_TYPES },
              },
              select: { sourceUnitId: true, type: true },
              take: 10,
            });
            for (const rel of parentRelations) {
              if (!visited.has(rel.sourceUnitId)) {
                next.push({ unitId: rel.sourceUnitId, depth: node.depth + 1, relation: rel.type });
              }
            }
          }
        }
        frontier = next;
      }

      return { chain };
    }),

  // ─── Similar units by project (8.2) ──────────────────────────────
  detectSimilarUnits: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const units = await ctx.db.unit.findMany({
        where: {
          projectId: input.projectId,
          userId: ctx.session.user.id!,
          lifecycle: { notIn: ["archived", "discarded"] },
        },
        select: { id: true, content: true, unitType: true },
        take: 200,
      });

      function wordSet(text: string): Set<string> {
        return new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
      }

      function similarity(a: string, b: string): number {
        const setA = wordSet(a);
        const setB = wordSet(b);
        const intersection = new Set([...setA].filter((w) => setB.has(w)));
        const union = new Set([...setA, ...setB]);
        return union.size === 0 ? 0 : intersection.size / union.size;
      }

      type UnitPair = {
        unitA: { id: string; content: string };
        unitB: { id: string; content: string };
        similarity: number;
      };

      const pairs: UnitPair[] = [];
      const used = new Set<string>();

      for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
          const a = units[i]!;
          const b = units[j]!;
          if (a.unitType !== b.unitType) continue;
          if (used.has(`${a.id}:${b.id}`)) continue;
          const score = similarity(a.content, b.content);
          if (score >= 0.7) {
            pairs.push({
              unitA: { id: a.id, content: a.content },
              unitB: { id: b.id, content: b.content },
              similarity: score,
            });
            used.add(`${a.id}:${b.id}`);
          }
        }
      }

      return { pairs: pairs.sort((a, b) => b.similarity - a.similarity).slice(0, 50) };
    }),

  // ─── Orphan units by project (8.3) ───────────────────────────────
  getOrphanUnits: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const units = await ctx.db.unit.findMany({
        where: {
          projectId: input.projectId,
          userId: ctx.session.user.id!,
          lifecycle: { notIn: ["archived", "discarded"] },
          incubating: false,
          unitContexts: { none: {} },
          assemblyItems: { none: {} },
        },
        select: {
          id: true,
          content: true,
          unitType: true,
          lifecycle: true,
          createdAt: true,
          relationsAsSource: { select: { id: true }, take: 1 },
          relationsAsTarget: { select: { id: true }, take: 1 },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      const now = Date.now();
      return units.map((u) => ({
        id: u.id,
        content: u.content,
        unitType: u.unitType,
        lifecycle: u.lifecycle,
        createdAt: u.createdAt,
        isolationScore: u.relationsAsSource.length === 0 && u.relationsAsTarget.length === 0 ? 1 : 0.5,
        ageMs: now - u.createdAt.getTime(),
      }));
    }),

  // ─── Reflection Prompts (8.4) ──────────────────────────────────
  getReflectionPrompts: protectedProcedure
    .input(z.object({
      contextId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Rate-limit AI calls
      await enforceRateLimit(ctx.db, userId, "feedback.getReflectionPrompts");

      // Get the context for its name
      const context = await ctx.db.context.findUnique({
        where: { id: input.contextId },
        select: { name: true, projectId: true },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      // Get units in this context
      const unitContexts = await ctx.db.unitContext.findMany({
        where: { contextId: input.contextId },
        include: {
          unit: {
            select: {
              id: true,
              content: true,
              unitType: true,
              userId: true,
            },
          },
        },
        take: 30,
      });

      const units = unitContexts
        .map((uc) => uc.unit)
        .filter((u) => u.userId === userId);

      if (units.length === 0) {
        return [];
      }

      const provider = getAIProvider();
      return generateReflectionPrompts(
        provider,
        units.map((u) => ({ id: u.id, content: u.content, unitType: u.unitType })),
        context.name,
      );
    }),
});
