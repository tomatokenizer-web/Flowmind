/**
 * Embedding Service
 *
 * Subscribes to unit lifecycle events and asynchronously generates + stores
 * pgvector embeddings for unit content.
 *
 * - unit.created  → always embed
 * - unit.updated  → embed only when `content` changed
 *
 * Embedding is fire-and-forget: failures are logged but never surface to the
 * caller.  When Trigger.dev is connected the tasks in src/trigger/ can be used
 * instead; this service provides a direct in-process fallback that works
 * without the Trigger.dev infra running locally.
 */

import { eventBus } from "@/server/events/eventBus";
import type { AppEvent } from "@/server/events/eventBus";
import { embedAndStoreUnit } from "@/server/ai/embedding";
import { logger } from "@/server/logger";

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function handleEmbedUnit(unitId: string, content: string): Promise<void> {
  try {
    await embedAndStoreUnit(unitId, content);
  } catch (err) {
    // Non-critical: log and move on — the unit still exists without an embedding.
    logger.error(
      { unitId, error: err },
      "embeddingService: failed to generate/store embedding"
    );
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onUnitCreated(event: AppEvent): void {
  if (event.type !== "unit.created") return;
  const { unitId, unit } = event.payload;
  if (!unit?.content) return;

  // Fire-and-forget
  void handleEmbedUnit(unitId, unit.content);
}

function onUnitUpdated(event: AppEvent): void {
  if (event.type !== "unit.updated") return;
  const { unitId, changes } = event.payload;

  // Only re-embed when the content actually changed.
  if (!changes?.content) return;

  void handleEmbedUnit(unitId, changes.content);
}

// ─── Initialisation ───────────────────────────────────────────────────────────

let initialised = false;

/**
 * Register embedding event handlers on the global event bus.
 * Safe to call multiple times — handlers are only registered once.
 */
export function initEmbeddingService(): void {
  if (initialised) return;
  initialised = true;

  eventBus.on("unit.created", onUnitCreated);
  eventBus.on("unit.updated", onUnitUpdated);

  logger.info("embeddingService: initialised");
}
