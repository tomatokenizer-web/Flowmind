/**
 * Embedding generation and storage.
 *
 * Currently a stub — embedding generation is disabled until an embedding
 * provider is configured (Voyage AI, Cohere, or similar).
 *
 * The Unit model already carries an `embedding` column backed by pgvector.
 * Because Prisma marks it as `Unsupported("vector")`, writes must go through
 * `$executeRaw` with an explicit cast.
 */

import { db } from "@/lib/db";
import { logger } from "@/server/logger";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text.
 *
 * Currently returns null — no embedding provider is configured.
 * To enable, set up Voyage AI or another embedding service and
 * implement the API call here.
 */
export async function generateEmbedding(
  _text: string
): Promise<number[] | null> {
  logger.debug("generateEmbedding: no embedding provider configured, skipping");
  return null;
}

/**
 * Persist a pre-computed embedding vector to the `units.embedding` pgvector
 * column.  Prisma does not support `vector` natively, so we use `$executeRaw`
 * with an explicit `::vector` cast.
 */
export async function storeUnitEmbedding(
  unitId: string,
  embedding: number[]
): Promise<void> {
  const vectorLiteral = `[${embedding.join(",")}]`;

  await db.$executeRaw`
    UPDATE units
    SET embedding = ${vectorLiteral}::vector
    WHERE id = ${unitId}::uuid
  `;

  logger.info(
    { unitId, dimensions: embedding.length },
    "storeUnitEmbedding: stored"
  );
}

/**
 * Convenience helper: generate an embedding for `text` and immediately store
 * it on the given unit. No-op if no embedding provider is configured.
 */
export async function embedAndStoreUnit(
  unitId: string,
  content: string
): Promise<void> {
  const embedding = await generateEmbedding(content);
  if (!embedding) return;
  await storeUnitEmbedding(unitId, embedding);
}
