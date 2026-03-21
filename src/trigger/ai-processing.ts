import { task, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";

// ─── Payload Schemas ──────────────────────────────────────────────────────────

const AutoClassifyPayload = z.object({
  unitId: z.string().uuid(),
  content: z.string().min(1),
  userId: z.string(),
  projectId: z.string().uuid(),
});

export type AutoClassifyPayload = z.infer<typeof AutoClassifyPayload>;

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * Background job: auto-classify a newly created unit.
 * Wraps the AI classification pipeline so the web request returns immediately
 * and classification happens asynchronously.
 */
export const autoClassifyUnit = task({
  id: "auto-classify-unit",
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: AutoClassifyPayload) => {
    const parsed = AutoClassifyPayload.safeParse(payload);
    if (!parsed.success) {
      logger.error("auto-classify-unit: invalid payload", {
        errors: parsed.error.flatten(),
      });
      throw new Error("Invalid payload for auto-classify-unit");
    }

    const { unitId, content, userId, projectId } = parsed.data;

    logger.info("auto-classify-unit: starting", { unitId, userId, projectId });

    // Lazy-import to avoid loading heavy server-only modules at task registration time.
    const { getAIProvider } = await import("@/server/ai/provider");
    const { createSafetyGuard } = await import("@/server/ai/safetyGuard");
    const { suggestUnitType } = await import("@/server/ai/classification");
    const { db } = await import("~/lib/db");

    const provider = getAIProvider();
    const safetyGuard = createSafetyGuard(db);

    const suggestion = await suggestUnitType(provider, safetyGuard, content, {
      userId,
      sessionId: `trigger-${unitId}`,
    });

    logger.info("auto-classify-unit: classification result", {
      unitId,
      suggestedType: suggestion.unitType,
      confidence: suggestion.confidence,
    });

    // Persist the suggestion back to the unit only when confidence is high.
    if (suggestion.confidence >= 0.8) {
      await db.unit.update({
        where: { id: unitId },
        data: { unitType: suggestion.unitType as never },
      });

      logger.info("auto-classify-unit: applied classification", {
        unitId,
        unitType: suggestion.unitType,
      });
    }

    return {
      unitId,
      suggestedType: suggestion.unitType,
      confidence: suggestion.confidence,
      applied: suggestion.confidence >= 0.8,
    };
  },
});

/**
 * Background job: generate and store an embedding for a unit.
 * Triggered after unit create or significant content update.
 */
export const generateUnitEmbedding = task({
  id: "generate-unit-embedding",
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: { unitId: string; content: string }) => {
    const { unitId, content } = payload;

    logger.info("generate-unit-embedding: starting", { unitId });

    const { generateEmbedding, storeUnitEmbedding } = await import(
      "@/server/ai/embedding"
    );

    const embedding = await generateEmbedding(content);
    if (!embedding) {
      logger.warn("generate-unit-embedding: no embedding provider configured, skipping", { unitId });
      return { unitId, dimensions: 0 };
    }
    await storeUnitEmbedding(unitId, embedding);

    logger.info("generate-unit-embedding: stored", {
      unitId,
      dimensions: embedding.length,
    });

    return { unitId, dimensions: embedding.length };
  },
});
