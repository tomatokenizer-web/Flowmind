/**
 * Embedding generation and storage — DEC-2026-002 §13.
 *
 * Supports OpenAI-compatible embedding APIs (text-embedding-3-small default).
 * Falls back gracefully when no API key or provider is configured.
 *
 * The Unit model carries an `embedding` column backed by pgvector.
 * Because Prisma marks it as `Unsupported("vector")`, writes go through
 * `$executeRaw` with an explicit cast.
 */

import { db } from "@/lib/db";
import { logger } from "@/server/logger";
import { env } from "@/env";
import { getEmbeddingModel } from "@/server/ai/provider";

// ─── Configuration ───────────────────────────────────────────────────────────

/** OpenAI-compatible embedding endpoint. Uses ANTHROPIC_BASE_URL proxy if set. */
function getEmbeddingEndpoint(): string | null {
  // Check for explicit embedding endpoint
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? process.env.OPENAI_BASE_URL;
  if (baseUrl) {
    // Proxy mode: route through the configured base URL
    return `${baseUrl.replace(/\/+$/, "")}/v1/embeddings`;
  }
  // Direct OpenAI API
  if (process.env.OPENAI_API_KEY) {
    return "https://api.openai.com/v1/embeddings";
  }
  return null;
}

function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY ?? env.ANTHROPIC_API_KEY ?? null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text.
 * Returns null when no embedding provider is configured.
 */
export async function generateEmbedding(
  text: string,
): Promise<number[] | null> {
  if (!text || text.trim().length === 0) {
    logger.debug("generateEmbedding: empty text, skipping");
    return null;
  }

  const endpoint = getEmbeddingEndpoint();
  const apiKey = getApiKey();

  if (!endpoint) {
    logger.debug("generateEmbedding: no embedding endpoint configured, skipping");
    return null;
  }

  const model = getEmbeddingModel();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 8000), // Truncate to avoid token limits
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      logger.error(
        { status: response.status, error: errorText.slice(0, 500), model },
        "generateEmbedding: API request failed",
      );
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<{ embedding: number[] }>;
    };

    const embedding = data.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      logger.error({ data }, "generateEmbedding: unexpected response shape");
      return null;
    }

    return embedding;
  } catch (err) {
    logger.error(
      { error: err, model },
      "generateEmbedding: network error",
    );
    return null;
  }
}

/**
 * Persist a pre-computed embedding vector to the Unit's pgvector column.
 * Uses $executeRaw with explicit ::vector cast since Prisma doesn't support
 * the vector type natively.
 */
export async function storeUnitEmbedding(
  unitId: string,
  embedding: number[],
): Promise<void> {
  // Validate embedding contains only finite numbers
  if (!embedding.every((v) => typeof v === "number" && Number.isFinite(v))) {
    throw new Error("storeUnitEmbedding: embedding contains non-numeric values");
  }
  const vectorLiteral = `[${embedding.join(",")}]`;

  await db.$executeRaw`
    UPDATE "Unit"
    SET embedding = ${vectorLiteral}::vector,
        "embeddingModel" = ${getEmbeddingModel()},
        "embeddingGeneratedAt" = NOW()
    WHERE id = ${unitId}::uuid
  `;

  logger.info(
    { unitId, dimensions: embedding.length },
    "storeUnitEmbedding: stored",
  );
}

/**
 * Convenience helper: generate an embedding for `text` and immediately store
 * it on the given unit. No-op if no embedding provider is configured.
 */
export async function embedAndStoreUnit(
  unitId: string,
  content: string,
): Promise<void> {
  const embedding = await generateEmbedding(content);
  if (!embedding) return;
  await storeUnitEmbedding(unitId, embedding);
}
