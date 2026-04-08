import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createGraphQueryService } from "@/server/services/graphQueryService";
import { createRhetoricalShapeService } from "@/server/services/rhetoricalShapeService";

const SCOPE_VALUES: [string, ...string[]] = ["single_context", "context_set", "pursuit", "global"];

async function verifyProject(db: Parameters<typeof createGraphQueryService>[0], projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
}

export const graphQueryRouter = createTRPCRouter({
  structural: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      unitType: z.string().optional(),
      lifecycle: z.string().optional(),
      hasNoIncoming: z.string().optional(),
      hasNoOutgoing: z.string().optional(),
      scope: z.enum(SCOPE_VALUES).default("global"),
      contextId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createGraphQueryService(ctx.db);
      return svc.structural(
        input.projectId,
        { unitType: input.unitType, lifecycle: input.lifecycle, hasNoIncoming: input.hasNoIncoming, hasNoOutgoing: input.hasNoOutgoing },
        input.scope as "single_context" | "context_set" | "pursuit" | "global",
        { contextId: input.contextId },
        input.limit,
      );
    }),

  attribute: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      unitType: z.string().optional(),
      lifecycle: z.string().optional(),
      importanceMin: z.number().min(0).max(1).optional(),
      importanceMax: z.number().min(0).max(1).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      flagged: z.boolean().optional(),
      pinned: z.boolean().optional(),
      incubating: z.boolean().optional(),
      aiReviewPending: z.boolean().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createGraphQueryService(ctx.db);
      const { projectId, limit, ...filters } = input;
      return svc.attribute(projectId, filters, limit);
    }),

  topological: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      metric: z.enum(["centrality", "bridge_units", "orphans", "clusters"]),
      scope: z.enum(SCOPE_VALUES).default("global"),
      contextId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createGraphQueryService(ctx.db);
      return svc.topological(
        input.projectId,
        { metric: input.metric },
        input.scope as "single_context" | "context_set" | "pursuit" | "global",
        { contextId: input.contextId },
        input.limit,
      );
    }),

  temporal: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      period: z.enum(["today", "this_week", "this_month", "custom"]),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      field: z.enum(["createdAt", "modifiedAt"]).default("createdAt"),
      limit: z.number().int().min(1).max(500).default(100),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createGraphQueryService(ctx.db);
      return svc.temporal(
        input.projectId,
        { period: input.period, dateFrom: input.dateFrom, dateTo: input.dateTo, field: input.field },
        input.limit,
      );
    }),

  comparative: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      contextIdA: z.string().uuid(),
      contextIdB: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createGraphQueryService(ctx.db);
      return svc.comparative(input.projectId, input.contextIdA, input.contextIdB);
    }),

  aggregation: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      groupBy: z.enum(["unitType", "lifecycle", "epistemicAct"]),
      scope: z.enum(SCOPE_VALUES).default("global"),
      contextId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createGraphQueryService(ctx.db);
      return svc.aggregation(
        input.projectId,
        input.groupBy,
        input.scope as "single_context" | "context_set" | "pursuit" | "global",
        { contextId: input.contextId },
      );
    }),

  semantic: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      anchorUnitId: z.string().uuid().optional(),
      text: z.string().max(500).optional(),
      threshold: z.number().min(0).max(1).default(0.5),
      scope: z.enum(SCOPE_VALUES).default("global"),
      contextId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(20),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createGraphQueryService(ctx.db);
      return svc.semantic(
        input.projectId,
        { anchorUnitId: input.anchorUnitId, text: input.text, threshold: input.threshold },
        input.scope as "single_context" | "context_set" | "pursuit" | "global",
        { contextId: input.contextId },
        input.limit,
      );
    }),

  composite: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      steps: z.array(z.object({
        method: z.enum(["structural", "attribute", "semantic", "topological", "temporal", "comparative", "aggregation", "path"]),
        params: z.record(z.unknown()),
      })).min(1).max(5),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createGraphQueryService(ctx.db);
      return svc.composite(input.projectId, input.steps, input.limit);
    }),

  path: protectedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      direction: z.enum(["ancestors", "descendants", "both"]).default("both"),
      maxDepth: z.number().int().min(1).max(10).default(5),
    }))
    .query(async ({ ctx, input }) => {
      // Verify unit ownership
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, project: { userId: ctx.session.user.id! } },
        select: { id: true },
      });
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });

      const svc = createGraphQueryService(ctx.db);
      return svc.pathQuery(input.unitId, input.direction, input.maxDepth);
    }),

  /**
   * Detect the rhetorical shape of a context's unit graph.
   */
  rhetoricalShape: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      contextId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      await verifyProject(ctx.db, input.projectId, ctx.session.user.id!);
      const svc = createRhetoricalShapeService(ctx.db);
      return svc.detectShape(input.projectId, input.contextId);
    }),

  /**
   * List available query methods with descriptions.
   */
  methods: protectedProcedure.query(() => [
    { method: "structural", trustLevel: "deterministic", description: "Exact graph structure matching" },
    { method: "attribute", trustLevel: "deterministic", description: "Filter by stored metadata" },
    { method: "semantic", trustLevel: "ai_interpreted", description: "Similarity search via word overlap (pgvector upgrade planned)" },
    { method: "topological", trustLevel: "algorithmic", description: "Graph-theoretic analysis" },
    { method: "temporal", trustLevel: "deterministic", description: "Time-based retrieval" },
    { method: "comparative", trustLevel: "deterministic", description: "Diff and overlap between contexts" },
    { method: "aggregation", trustLevel: "deterministic", description: "Statistical summaries" },
    { method: "path", trustLevel: "deterministic", description: "Graph traversal" },
    { method: "composite", trustLevel: "algorithmic", description: "Chained multi-method queries" },
  ]),

  /**
   * Classify a natural language query into the best graph query method + suggested params.
   * Deterministic keyword matching — no AI call required.
   */
  classifyNL: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(500) }))
    .query(({ input }) => {
      const q = input.query.toLowerCase();

      // Temporal patterns
      if (/\b(today|yesterday|this week|this month|recent|latest|new|created)\b/.test(q)) {
        const period = /today|yesterday/.test(q) ? "today"
          : /this week/.test(q) ? "this_week"
          : "this_month";
        return { method: "temporal" as const, params: { period }, confidence: 0.85 };
      }

      // Topological patterns
      if (/\b(central|hub|bridge|connect|orphan|isolated|cluster|communit)/i.test(q)) {
        const metric = /bridge|connect/.test(q) ? "bridge_units"
          : /orphan|isolated/.test(q) ? "orphans"
          : /cluster|communit/.test(q) ? "clusters"
          : "centrality";
        return { method: "topological" as const, params: { metric }, confidence: 0.8 };
      }

      // Aggregation patterns
      if (/\b(how many|count|distribut|breakdown|summary|statistic|group)\b/.test(q)) {
        const groupBy = /type/.test(q) ? "unitType"
          : /lifecycle|status|state/.test(q) ? "lifecycle"
          : "unitType";
        return { method: "aggregation" as const, params: { groupBy }, confidence: 0.8 };
      }

      // Structural patterns
      if (/\b(claim|evidence|question|concept|definition|note)\b/.test(q) && /\b(find|show|list|all|get)\b/.test(q)) {
        const typeMatch = q.match(/\b(claim|evidence|question|concept|definition|note|analogy|example|summary)\b/);
        return { method: "structural" as const, params: { unitType: typeMatch?.[1] }, confidence: 0.75 };
      }

      // Attribute patterns
      if (/\b(important|salient|flagged|pinned|incubating|high.?priority)\b/.test(q)) {
        return { method: "attribute" as const, params: { importanceMin: 0.7 }, confidence: 0.75 };
      }

      // Path patterns
      if (/\b(ancestor|descendant|parent|child|upstream|downstream|trace|path)\b/.test(q)) {
        const direction = /ancestor|parent|upstream/.test(q) ? "ancestors"
          : /descendant|child|downstream/.test(q) ? "descendants"
          : "both";
        return { method: "path" as const, params: { direction }, confidence: 0.7 };
      }

      // Comparative patterns
      if (/\b(compare|diff|overlap|shared|common|unique|between)\b/.test(q)) {
        return { method: "comparative" as const, params: {}, confidence: 0.7 };
      }

      // Default: semantic text search
      return { method: "semantic" as const, params: { text: input.query }, confidence: 0.5 };
    }),
});
