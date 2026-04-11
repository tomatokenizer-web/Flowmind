import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createRagFusionService } from "@/server/services/ragFusionService";

// ─── Zod Schemas ────────────────────────────────────────────────────

const intentEnum = z.enum([
  "factual",
  "exploratory",
  "structural",
  "temporal",
  "balanced",
]);

const searchLayerEnum = z.enum(["text", "structural", "semantic", "temporal"]);

const unitTypeEnum = z.enum([
  "claim", "question", "evidence", "counterargument",
  "observation", "idea", "definition", "assumption", "action",
]);

const lifecycleEnum = z.enum([
  "draft", "pending", "confirmed", "deferred",
  "complete", "archived", "discarded",
]);

const queryInputSchema = z.object({
  query: z.string().min(1).max(500),
  projectId: z.string().uuid(),
  contextId: z.string().uuid().optional(),
  intent: intentEnum.optional(),
  layers: z.array(searchLayerEnum).min(1).max(4).optional(),
  k: z.number().int().min(1).max(1000).default(60),
  limit: z.number().int().min(1).max(100).default(50),
  perLayerLimit: z.number().int().min(1).max(200).default(100),
  structuralFilters: z
    .object({
      unitTypes: z.array(unitTypeEnum).optional(),
      lifecycles: z.array(lifecycleEnum).optional(),
      minRelationCount: z.number().int().min(0).optional(),
      maxRelationCount: z.number().int().min(0).optional(),
    })
    .optional(),
  temporalFilters: z
    .object({
      createdAfter: z.date().optional(),
      createdBefore: z.date().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    })
    .optional(),
});

// ─── Router ─────────────────────────────────────────────────────────

export const ragRouter = createTRPCRouter({
  /**
   * Reciprocal Rank Fusion query across 4 layers.
   * Per DEC-2026-002 §1.
   */
  query: protectedProcedure
    .input(queryInputSchema)
    .query(async ({ ctx, input }) => {
      const fusion = createRagFusionService(ctx.db);
      const intent = input.intent ?? fusion.classifyIntent(input.query);
      const results = await fusion.query(input.query, {
        projectId: input.projectId,
        contextId: input.contextId,
        intent,
        layers: input.layers,
        k: input.k,
        limit: input.limit,
        perLayerLimit: input.perLayerLimit,
        structuralFilters: input.structuralFilters,
        temporalFilters: input.temporalFilters,
      });
      return { intent, results };
    }),

  /**
   * Deterministic intent classifier preview — no DB access.
   */
  classifyIntent: protectedProcedure
    .input(z.object({ query: z.string().max(500) }))
    .query(({ ctx, input }) => {
      const fusion = createRagFusionService(ctx.db);
      return { intent: fusion.classifyIntent(input.query) };
    }),
});
