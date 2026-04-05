import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { createRelationService } from "@/server/services/relationService";
import { PathProposalSchema } from "@/server/ai/schemas";

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
      path: z.array(z.string().uuid()).default([]),
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
          path: input.path,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).nullish(),
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

        // Generate AI description for this path
        let description: string | null = null;
        let reasoning: string | null = null;

        if (aiProvider) {
          try {
            const stepsDescription = unitPreviews
              .map((u, i) => `${i + 1}. [${u.unitType}] ${u.content}`)
              .join("\n");

            const result = await aiProvider.generateStructured<{
              name: string;
              description: string;
              reasoning: string;
            }>(
              `You are analyzing a reading path through a knowledge graph. This path follows a "${strategy.name}" strategy (${strategy.purpose}).

Here are the steps in order:
${stepsDescription}

Provide:
1. A concise name for this path (max 100 chars)
2. A description explaining what narrative or logical flow this path follows and WHY reading these units in this order is valuable (max 500 chars)
3. Brief reasoning about the path's coherence and what the reader will gain (max 300 chars)`,
              {
                temperature: 0.5,
                maxTokens: 512,
                zodSchema: PathProposalSchema,
                schema: {
                  name: "PathProposal",
                  description: "AI-generated path description and reasoning",
                  properties: {
                    name: { type: "string", description: "A concise, descriptive name for the path" },
                    description: { type: "string", description: "Narrative explanation of the path flow" },
                    reasoning: { type: "string", description: "Why this reading order is valuable" },
                  },
                  required: ["name", "description", "reasoning"],
                },
              },
            );
            description = result.description;
            reasoning = result.reasoning;
            // Use AI-suggested name if available
            if (result.name) {
              strategy.name = result.name;
            }
          } catch {
            // AI failed for this proposal — continue with null description
          }
        }

        proposals.push({
          name: strategy.name,
          purpose: strategy.purpose,
          description,
          reasoning,
          path,
          contextId: resolvedContextId!,
          unitPreviews,
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
