import { task, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";

// ─── Payload Schema ───────────────────────────────────────────────────────────

const BatchEmbeddingPayload = z.object({
  /** List of unit IDs to (re-)embed. Max 100 per batch. */
  unitIds: z.array(z.string().uuid()).min(1).max(100),
});

export type BatchEmbeddingPayload = z.infer<typeof BatchEmbeddingPayload>;

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * Placeholder: batch embedding generation for multiple units.
 * Useful for backfilling embeddings on existing units or re-embedding after
 * model changes.
 *
 * Full vector-search integration (pgvector similarity queries, semantic search
 * router, context clustering) will be implemented in a later story.
 */
export const batchGenerateEmbeddings = task({
  id: "batch-generate-embeddings",
  maxDuration: 300, // 5 minutes for large batches
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload: BatchEmbeddingPayload) => {
    const parsed = BatchEmbeddingPayload.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid payload for batch-generate-embeddings");
    }

    const { unitIds } = parsed.data;

    logger.info("batch-generate-embeddings: starting", {
      count: unitIds.length,
    });

    const { db } = await import("~/lib/db");
    const { generateEmbedding, storeUnitEmbedding } = await import(
      "@/server/ai/embedding"
    );

    const results = { success: 0, failed: 0, skipped: 0 };

    for (const unitId of unitIds) {
      try {
        const unit = await db.unit.findUnique({
          where: { id: unitId },
          select: { id: true, content: true },
        });

        if (!unit) {
          logger.warn("batch-generate-embeddings: unit not found", { unitId });
          results.skipped++;
          continue;
        }

        const embedding = await generateEmbedding(unit.content);
        if (!embedding) {
          logger.warn("batch-generate-embeddings: no embedding provider, skipping unit", { unitId });
          results.skipped++;
          continue;
        }
        await storeUnitEmbedding(unit.id, embedding);
        results.success++;
      } catch (err) {
        logger.error("batch-generate-embeddings: failed for unit", {
          unitId,
          error: err,
        });
        results.failed++;
      }
    }

    logger.info("batch-generate-embeddings: complete", results);
    return results;
  },
});
