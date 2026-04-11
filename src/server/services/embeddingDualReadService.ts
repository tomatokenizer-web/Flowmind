import type { PrismaClient } from "@prisma/client";

// ─── DEC-2026-002 §13: Embedding Dual-Read ────────────────────────
//
// When the active embedding model changes (new provider, new
// dimension, or a retrained variant), we cannot atomically
// re-embed the whole corpus. The system therefore supports a
// "dual-read" window:
//
//   1. The old model stays `isActive` while a new model row is
//      added to `embedding_model_registry` (also `isActive`).
//   2. Units embedded under the old model are queued for
//      re-embed by bumping their `embeddingModel` to NULL.
//   3. Read paths query both models and merge / deduplicate.
//   4. Once the backfill completes, the old model is deactivated.
//
// This service is the *control plane* for that transition — it
// never touches the pgvector column itself. Actual vector writes
// happen in the embedding worker / trigger task.
//
// The module is defensive: it only manipulates the registry and
// the nullable `embeddingModel` field on Unit. If no provider is
// configured (current state per src/server/ai/embedding.ts) the
// service is still safe to invoke — it just reports zero-work.

// ─── Types ────────────────────────────────────────────────────────

export interface ModelRegistration {
  name: string;
  provider: string;
  dimension: number;
  scope?: string;
}

export interface DualReadStatus {
  activeModels: Array<{
    name: string;
    provider: string;
    dimension: number;
    scope: string;
    unitsEmbedded: number;
  }>;
  unitsPendingReembed: number;
  /** True whenever there is more than one active model. */
  dualReadActive: boolean;
}

// ─── Service ──────────────────────────────────────────────────────

export function createEmbeddingDualReadService(db: PrismaClient) {
  /**
   * Register a new embedding model. If a row with the same name
   * already exists it is re-activated (no duplicate rows). The
   * previous active model is NOT deactivated — the caller should
   * decide when to end the dual-read window via `deactivateModel`.
   */
  async function registerNewModel(reg: ModelRegistration) {
    const existing = await db.embeddingModelRegistry.findUnique({
      where: { name: reg.name },
    });
    if (existing) {
      if (!existing.isActive) {
        await db.embeddingModelRegistry.update({
          where: { name: reg.name },
          data: { isActive: true },
        });
      }
      return { created: false, name: reg.name };
    }
    await db.embeddingModelRegistry.create({
      data: {
        name: reg.name,
        provider: reg.provider,
        dimension: reg.dimension,
        scope: reg.scope ?? "general",
        isActive: true,
      },
    });
    return { created: true, name: reg.name };
  }

  /**
   * Deactivate an embedding model. After this the corpus read path
   * should stop merging vectors from that model. Returns the
   * number of units still tagged with the deactivated model so the
   * caller can decide whether to force-reembed them first.
   */
  async function deactivateModel(modelName: string) {
    const active = await db.embeddingModelRegistry.findUnique({
      where: { name: modelName },
      select: { isActive: true },
    });
    if (!active) {
      return { deactivated: false, remaining: 0 };
    }
    if (active.isActive) {
      await db.embeddingModelRegistry.update({
        where: { name: modelName },
        data: { isActive: false },
      });
    }
    const remaining = await db.unit.count({
      where: { embeddingModel: modelName },
    });
    return { deactivated: true, remaining };
  }

  /**
   * Mark every unit currently tagged with `fromModel` as needing a
   * re-embed. We do this by nulling `embeddingModel`, which the
   * embed worker uses as its queue selector. Returns the count
   * queued.
   */
  async function markForReembed(fromModel: string) {
    const result = await db.unit.updateMany({
      where: { embeddingModel: fromModel },
      data: { embeddingModel: null },
    });
    return { queued: result.count };
  }

  /**
   * Count units grouped by embeddingModel — used to drive the
   * dual-read UI surface (`X units on model A, Y units on model B,
   * Z pending`).
   */
  async function countUnitsByModel(): Promise<Map<string, number>> {
    const rows = await db.unit.groupBy({
      by: ["embeddingModel"],
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.embeddingModel ?? "__pending__";
      map.set(key, r._count._all);
    }
    return map;
  }

  /**
   * Full status snapshot: every active model + its unit count, plus
   * the count of units pending re-embed. Dual-read is considered
   * "active" whenever more than one model is active simultaneously.
   */
  async function getStatus(): Promise<DualReadStatus> {
    const active = await db.embeddingModelRegistry.findMany({
      where: { isActive: true },
      select: {
        name: true,
        provider: true,
        dimension: true,
        scope: true,
      },
    });
    const counts = await countUnitsByModel();

    const activeModels = active.map((m) => ({
      name: m.name,
      provider: m.provider,
      dimension: m.dimension,
      scope: m.scope,
      unitsEmbedded: counts.get(m.name) ?? 0,
    }));

    const unitsPendingReembed = counts.get("__pending__") ?? 0;

    return {
      activeModels,
      unitsPendingReembed,
      dualReadActive: activeModels.length > 1,
    };
  }

  return {
    registerNewModel,
    deactivateModel,
    markForReembed,
    countUnitsByModel,
    getStatus,
  };
}

export type EmbeddingDualReadService = ReturnType<
  typeof createEmbeddingDualReadService
>;
