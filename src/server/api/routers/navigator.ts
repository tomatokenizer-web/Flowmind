import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { PrismaClient, PathType } from "@prisma/client";
import { createRelationService } from "@/server/services/relationService";
import { createNavigatorService } from "@/server/services/navigatorService";
import { PathProposalSchema } from "@/server/ai/schemas";

const PATH_TYPE_VALUES: [string, ...string[]] = [
  "argument", "trace_back", "contradiction_map", "synthesis_first", "toulmin_validation",
  "discovery", "question_anchored", "branch_explorer", "socratic", "gap_focused",
  "causal_chain", "evidence_gradient", "uncertainty_gradient", "conceptual_depth",
  "stakeholder_perspective", "problem_solution",
  "cross_context", "historical_evolution", "analogy_bridge", "serendipity",
];

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

/** Verify a project belongs to the authenticated user. */
async function verifyProjectOwnership(db: PrismaClient, projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return project;
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
    .input(z.object({
      contextId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.projectId) {
        await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);
        return ctx.db.navigator.findMany({
          where: { context: { projectId: input.projectId } },
          orderBy: { name: "asc" },
        });
      }
      if (input.contextId) {
        await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
        return ctx.db.navigator.findMany({
          where: { contextId: input.contextId },
          orderBy: { name: "asc" },
        });
      }
      throw new TRPCError({ code: "BAD_REQUEST", message: "Either projectId or contextId is required" });
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      contextId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      purpose: z.string().max(30).optional(),
      pathType: z.enum(PATH_TYPE_VALUES).optional(),
      path: z.array(z.string().uuid()).default([]),
      aiGenerated: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      let contextId = input.contextId;

      if (!contextId && input.projectId) {
        // Auto-pick the first context in the project
        await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);
        const firstContext = await ctx.db.context.findFirst({
          where: { projectId: input.projectId },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });
        if (!firstContext) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Project has no contexts. Create a context first." });
        }
        contextId = firstContext.id;
      }

      if (!contextId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Either projectId or contextId is required" });
      }

      await verifyContextOwnership(ctx.db, contextId, ctx.session.user.id!);
      return ctx.db.navigator.create({
        data: {
          name: input.name,
          description: input.description,
          contextId,
          purpose: input.purpose,
          pathType: input.pathType as PathType | undefined,
          path: input.path,
          aiGenerated: input.aiGenerated,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).nullish(),
      pathType: z.enum(PATH_TYPE_VALUES).nullish(),
      path: z.array(z.string().uuid()).optional(),
      steps: z.array(z.object({
        unitId: z.string().uuid(),
        position: z.number().int().min(0),
        annotation: z.string().max(500).optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyNavigatorOwnership(ctx.db, input.id, ctx.session.user.id!);
      const { id, pathType, steps, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (pathType !== undefined) data.pathType = pathType as PathType | null;
      if (steps !== undefined) data.steps = steps;
      return ctx.db.navigator.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyNavigatorOwnership(ctx.db, input.id, ctx.session.user.id!);
      return ctx.db.navigator.delete({ where: { id: input.id } });
    }),

  /**
   * List all navigators whose path contains a given unit.
   */
  listByUnit: protectedProcedure
    .input(z.object({ unitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.navigator.findMany({
        where: {
          context: { project: { userId: ctx.session.user.id! } },
          path: { has: input.unitId },
        },
        select: {
          id: true,
          name: true,
          purpose: true,
          contextId: true,
          path: true,
        },
      });
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
    .input(z.object({
      contextId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let resolvedContextId = input.contextId;

      // When project-scoped, gather units from ALL contexts in the project
      let unitIds: string[];
      if (input.projectId) {
        await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);
        // Get all units in the project
        const projectUnits = await ctx.db.unit.findMany({
          where: { projectId: input.projectId },
          select: { id: true },
        });
        unitIds = projectUnits.map((u) => u.id);

        // Pick a context for storing generated navigators
        if (!resolvedContextId) {
          const firstContext = await ctx.db.context.findFirst({
            where: { projectId: input.projectId },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          });
          if (!firstContext) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Project has no contexts." });
          }
          resolvedContextId = firstContext.id;
        }
      } else if (input.contextId) {
        await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
        const contextUnits = await ctx.db.unitContext.findMany({
          where: { contextId: input.contextId },
          select: { unitId: true },
        });
        unitIds = contextUnits.map((u) => u.unitId);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Either projectId or contextId is required" });
      }

      if (unitIds.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 units to generate paths." });
      }

      // Get unit data for naming AND for auto-relation creation
      const units = await ctx.db.unit.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, content: true, unitType: true, importance: true },
      });
      const unitMap = new Map(units.map((u) => [u.id, u]));

      // Fetch existing relations between units in this context
      let allRelations = await ctx.db.relation.findMany({
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

      // ─── Auto-create relations if insufficient ───────────────────────
      // We need enough relations to build meaningful paths (at least unitCount - 1 edges)
      const minRelationsNeeded = Math.max(unitIds.length - 1, 5);
      let autoCreatedCount = 0;

      if (allRelations.length < minRelationsNeeded) {
        const existingPairs = new Set(
          allRelations.map((r) => `${r.sourceUnitId}|${r.targetUnitId}`),
        );
        autoCreatedCount = await autoCreateRelations(ctx.db, units, existingPairs);

        // Re-fetch all relations after auto-creation
        allRelations = await ctx.db.relation.findMany({
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
      }

      if (allRelations.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not find or create relations between units. Units may be too dissimilar." });
      }

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
          minSteps: 5,
        },
        {
          name: "Derivation trail",
          purpose: "derivation",
          types: ["derives_from", "expands", "elaborates", "transforms_into"],
          minSteps: 5,
        },
        {
          name: "Evidence & examples",
          purpose: "evidence",
          types: ["exemplifies", "references", "grounded_in", "instantiates"],
          minSteps: 5,
        },
        {
          name: "Full exploration",
          purpose: "exploration",
          types: null, // all relation types
          minSteps: 5,
        },
      ];

      // Generate paths for each strategy
      const created: Array<{ id: string; name: string; purpose: string; steps: number }> = [];

      // Delete existing ai-generated navigators for this context to avoid duplicates
      await ctx.db.navigator.deleteMany({
        where: { contextId: resolvedContextId, purpose: { in: strategies.map((s) => s.purpose) } },
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
            contextId: resolvedContextId!,
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
        autoCreatedRelations: autoCreatedCount,
        totalUnits: unitIds.length,
      };
    }),

  /**
   * Propose navigation paths with AI-generated descriptions for user approval.
   * Same path-building logic as analyzeAndGenerate but returns proposals
   * instead of immediately creating navigators.
   */
  proposeAndGenerate: protectedProcedure
    .input(z.object({
      contextId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let resolvedContextId = input.contextId;
      let unitIds: string[];

      if (input.projectId) {
        await verifyProjectOwnership(ctx.db, input.projectId, ctx.session.user.id!);
        const projectUnits = await ctx.db.unit.findMany({
          where: { projectId: input.projectId },
          select: { id: true },
        });
        unitIds = projectUnits.map((u) => u.id);

        if (!resolvedContextId) {
          const firstContext = await ctx.db.context.findFirst({
            where: { projectId: input.projectId },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          });
          if (!firstContext) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Project has no contexts." });
          }
          resolvedContextId = firstContext.id;
        }
      } else if (input.contextId) {
        await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
        const contextUnits = await ctx.db.unitContext.findMany({
          where: { contextId: input.contextId },
          select: { unitId: true },
        });
        unitIds = contextUnits.map((u) => u.unitId);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Either projectId or contextId is required" });
      }

      if (unitIds.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 units to generate paths." });
      }

      const units = await ctx.db.unit.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, content: true, unitType: true, importance: true },
      });
      const unitMap = new Map(units.map((u) => [u.id, u]));

      let allRelations = await ctx.db.relation.findMany({
        where: {
          OR: [
            { sourceUnitId: { in: unitIds } },
            { targetUnitId: { in: unitIds } },
          ],
        },
        select: {
          id: true, sourceUnitId: true, targetUnitId: true,
          type: true, strength: true, direction: true,
        },
      });

      const minRelationsNeeded = Math.max(unitIds.length - 1, 5);
      let autoCreatedCount = 0;
      if (allRelations.length < minRelationsNeeded) {
        const existingPairs = new Set(
          allRelations.map((r) => `${r.sourceUnitId}|${r.targetUnitId}`),
        );
        autoCreatedCount = await autoCreateRelations(ctx.db, units, existingPairs);
        allRelations = await ctx.db.relation.findMany({
          where: {
            OR: [
              { sourceUnitId: { in: unitIds } },
              { targetUnitId: { in: unitIds } },
            ],
          },
          select: {
            id: true, sourceUnitId: true, targetUnitId: true,
            type: true, strength: true, direction: true,
          },
        });
      }

      if (allRelations.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not find or create relations between units." });
      }

      const strategies: Array<{
        name: string;
        purpose: string;
        types: string[] | null;
        minSteps: number;
      }> = [
        { name: "Argument chain", purpose: "argument", types: ["supports", "contradicts", "questions", "defines"], minSteps: 5 },
        { name: "Derivation trail", purpose: "derivation", types: ["derives_from", "expands", "elaborates", "transforms_into"], minSteps: 5 },
        { name: "Evidence & examples", purpose: "evidence", types: ["exemplifies", "references", "grounded_in", "instantiates"], minSteps: 5 },
        { name: "Full exploration", purpose: "exploration", types: null, minSteps: 5 },
      ];

      // Build proposals without creating navigators
      const proposals: Array<{
        name: string;
        purpose: string;
        description: string | null;
        reasoning: string | null;
        path: string[];
        contextId: string;
        unitPreviews: Array<{ id: string; content: string; unitType: string }>;
      }> = [];

      // Try to load AI provider once for all proposals
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      let aiProvider: Awaited<ReturnType<typeof import("@/server/ai/provider").getAIProvider>> | null = null;
      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        aiProvider = getAIProvider();
      } catch {
        // AI unavailable — descriptions will be null
      }

      for (const strategy of strategies) {
        const filtered = strategy.types
          ? allRelations.filter((r) => strategy.types!.includes(r.type))
          : allRelations;

        if (filtered.length === 0) continue;

        const counts = new Map<string, number>();
        for (const r of filtered) {
          counts.set(r.sourceUnitId, (counts.get(r.sourceUnitId) ?? 0) + 1);
          counts.set(r.targetUnitId, (counts.get(r.targetUnitId) ?? 0) + 1);
        }
        const hubId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? unitIds[0]!;
        const path = buildGreedyPath(hubId, filtered, strategy.types);

        if (path.length < strategy.minSteps) continue;

        const unitPreviews = path.map((id) => {
          const u = unitMap.get(id);
          return {
            id,
            content: u ? u.content.slice(0, 80) + (u.content.length > 80 ? "…" : "") : "Unknown unit",
            unitType: u?.unitType ?? "observation",
          };
        });

        // AI: reorder path for natural reading flow + generate description
        let description: string | null = null;
        let reasoning: string | null = null;
        let finalPath = path;

        if (aiProvider) {
          try {
            // Use full content (up to 200 chars) for better AI understanding
            const fullPreviews = path.map((id) => {
              const u = unitMap.get(id);
              return {
                id,
                content: u ? u.content.slice(0, 200) : "Unknown unit",
                unitType: u?.unitType ?? "observation",
              };
            });

            const stepsDescription = fullPreviews
              .map((u, i) => `${i}. [ID:${u.id}] [${u.unitType}] ${u.content}`)
              .join("\n");

            const result = await aiProvider.generateStructured<{
              name: string;
              description: string;
              reasoning: string;
              orderedUnitIds?: string[];
            }>(
              `You are organizing a reading path through a knowledge graph. The path follows a "${strategy.name}" strategy (purpose: ${strategy.purpose}).

Here are the units collected for this path (currently in algorithm-generated order, which may NOT be the best reading order):
${stepsDescription}

Your tasks:
1. **Reorder** these units into the most natural, coherent reading sequence. Think about narrative flow: what should the reader encounter first to build understanding? What follows logically? Arrange them so each step builds on the previous one.
2. Give this path a concise, descriptive **name** (max 100 chars)
3. Write a **description** explaining the narrative/logical flow and WHY this reading order is valuable (max 500 chars)
4. Provide brief **reasoning** about what the reader will gain (max 300 chars)

Return orderedUnitIds as the array of unit IDs in your recommended reading order. You MUST include ALL unit IDs from the input — do not drop or add any.`,
              {
                temperature: 0.5,
                maxTokens: 800,
                zodSchema: PathProposalSchema,
                schema: {
                  name: "PathProposal",
                  description: "AI-reordered path with description",
                  properties: {
                    name: { type: "string", description: "A concise, descriptive name for the path" },
                    description: { type: "string", description: "Narrative explanation of the path flow" },
                    reasoning: { type: "string", description: "Why this reading order is valuable" },
                    orderedUnitIds: {
                      type: "array",
                      items: { type: "string" },
                      description: "Unit IDs reordered for optimal reading flow",
                    },
                  },
                  required: ["name", "description", "reasoning", "orderedUnitIds"],
                },
              },
            );
            description = result.description;
            reasoning = result.reasoning;
            if (result.name) {
              strategy.name = result.name;
            }

            // Apply AI reordering if valid (all IDs present, no extras)
            if (result.orderedUnitIds && result.orderedUnitIds.length === path.length) {
              const pathSet = new Set(path);
              const allPresent = result.orderedUnitIds.every((id) => pathSet.has(id));
              const noDuplicates = new Set(result.orderedUnitIds).size === result.orderedUnitIds.length;
              if (allPresent && noDuplicates) {
                finalPath = result.orderedUnitIds;
              }
            }
          } catch {
            // AI failed — keep greedy order, null description
          }
        }

        // Rebuild previews with final ordering
        const finalPreviews = finalPath.map((id) => {
          const u = unitMap.get(id);
          return {
            id,
            content: u ? u.content.slice(0, 80) + (u.content.length > 80 ? "…" : "") : "Unknown unit",
            unitType: u?.unitType ?? "observation",
          };
        });

        proposals.push({
          name: strategy.name,
          purpose: strategy.purpose,
          description,
          reasoning,
          path: finalPath,
          contextId: resolvedContextId!,
          unitPreviews: finalPreviews,
        });
      }

      if (proposals.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough relations to generate meaningful paths.",
        });
      }

      return {
        proposals,
        totalRelationsAnalyzed: allRelations.length,
        autoCreatedRelations: autoCreatedCount,
        totalUnits: unitIds.length,
      };
    }),

  /**
   * Accept proposed navigation paths and create the actual navigators.
   */
  acceptProposals: protectedProcedure
    .input(z.object({
      proposals: z.array(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).nullish(),
        purpose: z.string().max(30),
        contextId: z.string().uuid(),
        path: z.array(z.string().uuid()),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const created: Array<{ id: string; name: string; steps: number }> = [];

      for (const proposal of input.proposals) {
        await verifyContextOwnership(ctx.db, proposal.contextId, ctx.session.user.id!);

        // Delete existing ai-generated navigator for same purpose in same context
        await ctx.db.navigator.deleteMany({
          where: { contextId: proposal.contextId, purpose: proposal.purpose },
        });

        const nav = await ctx.db.navigator.create({
          data: {
            name: proposal.name,
            description: proposal.description ?? undefined,
            contextId: proposal.contextId,
            purpose: proposal.purpose,
            path: proposal.path,
          },
        });
        created.push({ id: nav.id, name: nav.name, steps: nav.path.length });
      }

      return { created };
    }),

  /**
   * Generate a typed path using the navigator service.
   * Creates a new navigator with path generated by the specified path type algorithm.
   */
  generateTypedPath: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      pathType: z.enum(PATH_TYPE_VALUES),
      contextId: z.string().uuid(),
      startUnitId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
      const navService = createNavigatorService(ctx.db);
      return navService.createWithPath({
        name: input.name,
        description: input.description,
        pathType: input.pathType as PathType,
        contextId: input.contextId,
        startUnitId: input.startUnitId,
        aiGenerated: true,
      });
    }),

  /**
   * Compute semantic importance scores for all units in a context.
   */
  importanceScores: protectedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyContextOwnership(ctx.db, input.contextId, ctx.session.user.id!);
      const navService = createNavigatorService(ctx.db);
      const scores = await navService.computeImportanceScores(input.contextId);
      return Object.fromEntries(scores);
    }),

  /**
   * Duplicate an existing navigator.
   * Creates a copy with the same fields, name suffixed with " (copy)", and aiGenerated: false.
   */
  duplicate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const nav = await verifyNavigatorOwnership(ctx.db, input.id, ctx.session.user.id!);
      return ctx.db.navigator.create({
        data: {
          name: `${nav.name} (copy)`,
          description: nav.description ?? undefined,
          contextId: nav.contextId,
          purpose: nav.purpose ?? undefined,
          pathType: nav.pathType ?? undefined,
          path: nav.path,
          steps: nav.steps as Parameters<typeof ctx.db.navigator.create>[0]["data"]["steps"],
          bridges: nav.bridges as Parameters<typeof ctx.db.navigator.create>[0]["data"]["bridges"],
          metadata: nav.metadata ?? undefined,
          aiGenerated: false,
        },
      });
    }),

  /**
   * List all available path types with their group and description.
   */
  pathTypes: protectedProcedure.query(() => {
    return [
      { group: "Logical / Argumentative", types: [
        { value: "argument", label: "Argument", description: "claim → evidence → counterpoints → conclusion" },
        { value: "trace_back", label: "Trace-back", description: "conclusion → backward through reasoning to foundations" },
        { value: "contradiction_map", label: "Contradiction Map", description: "Surfaces opposing claims in sequence" },
        { value: "synthesis_first", label: "Synthesis-First", description: "Conclusion first, then what it rests on" },
        { value: "toulmin_validation", label: "Toulmin Validation", description: "grounds → warrant → backing → qualifier → rebuttal" },
      ]},
      { group: "Exploratory / Generative", types: [
        { value: "discovery", label: "Discovery", description: "Chronological order of thinking development" },
        { value: "question_anchored", label: "Question-Anchored", description: "question → candidate answers → new questions" },
        { value: "branch_explorer", label: "Branch Explorer", description: "Maps all directions from a unit" },
        { value: "socratic", label: "Socratic", description: "question → partial answer → deeper question → …" },
        { value: "gap_focused", label: "Gap-Focused", description: "Only structurally incomplete units" },
      ]},
      { group: "Analytical / Structural", types: [
        { value: "causal_chain", label: "Causal Chain", description: "cause → effect → downstream effect" },
        { value: "evidence_gradient", label: "Evidence Gradient", description: "Weakest → strongest evidence (or reverse)" },
        { value: "uncertainty_gradient", label: "Uncertainty Gradient", description: "speculative → certain (or reverse)" },
        { value: "conceptual_depth", label: "Conceptual Depth", description: "Highest abstraction → most specific" },
        { value: "stakeholder_perspective", label: "Stakeholder Perspective", description: "Same topic through different stances" },
        { value: "problem_solution", label: "Problem-Solution", description: "problem → constraints → candidates → trade-offs → decision" },
      ]},
      { group: "Connective / Cross-Context", types: [
        { value: "cross_context", label: "Cross-Context", description: "Units from different contexts via bridge units" },
        { value: "historical_evolution", label: "Historical Evolution", description: "How a concept/claim changed over time" },
        { value: "analogy_bridge", label: "Analogy Bridge", description: "Cross via analogy to different domain" },
        { value: "serendipity", label: "Serendipity", description: "Includes low-salience units for unexpected discoveries" },
      ]},
    ];
  }),
});

// ─── Auto-relation helpers ──────────────────────────────────────────

function wordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Infer a relation type based on unit type pairing. */
function inferRelationType(
  sourceType: string,
  targetType: string,
  similarity: number,
): { type: string; direction: string } {
  const pair = `${sourceType}→${targetType}`;
  switch (pair) {
    case "evidence→claim":
    case "evidence→thesis":
      return { type: "supports", direction: "one_way" };
    case "claim→evidence":
    case "thesis→evidence":
      return { type: "grounded_in", direction: "one_way" };
    case "question→claim":
    case "question→thesis":
      return { type: "questions", direction: "one_way" };
    case "claim→claim":
    case "thesis→thesis":
      return similarity > 0.5
        ? { type: "supports", direction: "bidirectional" }
        : { type: "references", direction: "bidirectional" };
    case "definition→claim":
    case "definition→thesis":
      return { type: "defines", direction: "one_way" };
    case "example→claim":
    case "example→thesis":
      return { type: "exemplifies", direction: "one_way" };
    default:
      if (similarity > 0.5) return { type: "expands", direction: "bidirectional" };
      return { type: "references", direction: "bidirectional" };
  }
}

/** Build relations automatically between all unit pairs using content similarity. */
async function autoCreateRelations(
  db: PrismaClient,
  units: Array<{ id: string; content: string; unitType: string }>,
  existingRelationPairs: Set<string>,
) {
  const THRESHOLD = 0.15; // low threshold for broader coverage
  const toCreate: Array<{
    sourceUnitId: string;
    targetUnitId: string;
    type: string;
    strength: number;
    direction: string;
  }> = [];

  const wordSets = units.map((u) => ({ id: u.id, type: u.unitType, ws: wordSet(u.content) }));

  for (let i = 0; i < wordSets.length; i++) {
    for (let j = i + 1; j < wordSets.length; j++) {
      const a = wordSets[i]!;
      const b = wordSets[j]!;

      // Skip if relation already exists in either direction
      const pairKey1 = `${a.id}|${b.id}`;
      const pairKey2 = `${b.id}|${a.id}`;
      if (existingRelationPairs.has(pairKey1) || existingRelationPairs.has(pairKey2)) continue;

      const sim = jaccardSimilarity(a.ws, b.ws);
      if (sim < THRESHOLD) continue;

      const { type, direction } = inferRelationType(a.type, b.type, sim);
      // Strength maps from similarity: 0.15→0.3, 0.5→0.7, 1.0→1.0
      const strength = Math.min(1, 0.3 + sim * 0.7);

      toCreate.push({
        sourceUnitId: a.id,
        targetUnitId: b.id,
        type,
        strength: Math.round(strength * 100) / 100,
        direction,
      });
    }
  }

  if (toCreate.length > 0) {
    await db.relation.createMany({ data: toCreate });
  }

  return toCreate.length;
}

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
  grounded_in: 2,
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
