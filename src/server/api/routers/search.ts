import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createSearchService, type SearchLayer } from "@/server/services/searchService";
import { generateEmbedding } from "@/server/ai/embedding";

// ─── Zod Schemas ────────────────────────────────────────────────────

const unitTypeEnum = z.enum([
  "claim", "question", "evidence", "counterargument",
  "observation", "idea", "definition", "assumption", "action",
]);

const lifecycleEnum = z.enum([
  "draft", "pending", "confirmed", "deferred",
  "complete", "archived", "discarded",
]);

const searchLayerEnum = z.enum(["text", "structural", "temporal", "semantic"]);

const searchQuerySchema = z.object({
  query: z.string().max(500),
  contextId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  layers: z.array(searchLayerEnum).default(["text"]),
  limit: z.number().int().min(1).max(100).default(50),
  // Structural filters
  unitTypes: z.array(unitTypeEnum).optional(),
  lifecycles: z.array(lifecycleEnum).optional(),
  minRelationCount: z.number().int().min(0).optional(),
  maxRelationCount: z.number().int().min(0).optional(),
  // Temporal filters
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// ─── Router ─────────────────────────────────────────────────────────

export const searchRouter = createTRPCRouter({
  query: protectedProcedure
    .input(searchQuerySchema)
    .query(async ({ ctx, input }) => {
      const service = createSearchService(ctx.db);

      const results = await service.search(
        input.query,
        {
          contextId: input.contextId,
          projectId: input.projectId,
          layers: input.layers as SearchLayer[],
          limit: input.limit,
        },
        // Structural filters
        {
          unitTypes: input.unitTypes,
          lifecycles: input.lifecycles,
          minRelationCount: input.minRelationCount,
          maxRelationCount: input.maxRelationCount,
        },
        // Temporal filters
        {
          createdAfter: input.createdAfter,
          createdBefore: input.createdBefore,
          sortOrder: input.sortOrder,
        },
      );

      return results;
    }),

  /**
   * Dedicated semantic search endpoint.
   * Generates an embedding for the query and returns the most similar units.
   */
  semantic: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        projectId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Check if embedding provider is configured
      const testEmbedding = await generateEmbedding("test");
      if (!testEmbedding) {
        return {
          results: [],
          embeddingConfigured: false,
          message: "Semantic search requires an embedding provider. Configure AI_EMBEDDING_MODEL and an API key in your environment to enable this feature.",
        };
      }

      const service = createSearchService(ctx.db);

      const results = await service.search(
        input.query,
        {
          projectId: input.projectId,
          layers: ["semantic"],
          limit: input.limit,
        },
      );

      return { results, embeddingConfigured: true, message: null };
    }),
});
