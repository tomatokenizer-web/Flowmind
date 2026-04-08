import type { PrismaClient } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CompoundingMetrics = {
  unit: {
    revisionCount: number;
    relationGrowth: number;
    salienceTrajectory: "rising" | "stable" | "declining";
    daysSinceCreation: number;
    daysSinceLastEdit: number;
  };
  context: {
    unitCount: number;
    completenessScore: number;
    avgRelationsPerUnit: number;
    depth: number;
  };
  project: {
    totalUnits: number;
    totalRelations: number;
    crossContextConnections: number;
    knowledgeDensity: number;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Service Factory ─────────────────────────────────────────────────────────

export function createCompoundingService(db: PrismaClient) {
  async function getUnitMetrics(
    unitId: string,
  ): Promise<CompoundingMetrics["unit"]> {
    const unit = await db.unit.findUniqueOrThrow({
      where: { id: unitId },
      select: { createdAt: true, modifiedAt: true, importance: true },
    });

    const revisionCount = await db.unitVersion.count({
      where: { unitId },
    });

    const relationGrowth = await db.relation.count({
      where: {
        OR: [{ sourceUnitId: unitId }, { targetUnitId: unitId }],
        createdAt: { gt: unit.createdAt },
      },
    });

    // Salience trajectory: compare current importance to earliest version within 7 days
    let salienceTrajectory: "rising" | "stable" | "declining" = "stable";
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldVersion = await db.unitVersion.findFirst({
      where: { unitId, createdAt: { lte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      select: { meta: true },
    });

    if (oldVersion?.meta && typeof oldVersion.meta === "object") {
      const oldMeta = oldVersion.meta as Record<string, unknown>;
      const oldImportance =
        typeof oldMeta.importance === "number" ? oldMeta.importance : null;
      if (oldImportance !== null) {
        const diff = unit.importance - oldImportance;
        if (diff > 0.05) salienceTrajectory = "rising";
        else if (diff < -0.05) salienceTrajectory = "declining";
      }
    }

    const now = new Date();
    return {
      revisionCount,
      relationGrowth,
      salienceTrajectory,
      daysSinceCreation: daysBetween(unit.createdAt, now),
      daysSinceLastEdit: daysBetween(unit.modifiedAt, now),
    };
  }

  async function getContextMetrics(
    contextId: string,
  ): Promise<CompoundingMetrics["context"]> {
    // Count units in this context
    const unitCount = await db.unitContext.count({
      where: { contextId },
    });

    if (unitCount === 0) {
      return { unitCount: 0, completenessScore: 0, avgRelationsPerUnit: 0, depth: 0 };
    }

    // Get unit IDs in context
    const unitContexts = await db.unitContext.findMany({
      where: { contextId },
      select: { unitId: true },
    });
    const unitIds = unitContexts.map((uc) => uc.unitId);

    // Completeness heuristic: % of claims that have at least one evidence relation
    const claims = await db.unit.findMany({
      where: { id: { in: unitIds }, unitType: "claim" },
      select: { id: true },
    });

    let completenessScore = 100;
    if (claims.length > 0) {
      const claimIds = claims.map((c) => c.id);
      const supportedClaims = await db.relation.findMany({
        where: {
          targetUnitId: { in: claimIds },
          type: { in: ["supports", "evidence"] },
        },
        select: { targetUnitId: true },
        distinct: ["targetUnitId"],
      });
      completenessScore = Math.round(
        (supportedClaims.length / claims.length) * 100,
      );
    }

    // Average relations per unit
    const totalRelations = await db.relation.count({
      where: {
        OR: [
          { sourceUnitId: { in: unitIds } },
          { targetUnitId: { in: unitIds } },
        ],
      },
    });
    const avgRelationsPerUnit =
      unitCount > 0 ? Math.round((totalRelations / unitCount) * 100) / 100 : 0;

    // Depth: BFS from roots (units with no incoming relations in this context)
    const incomingTargets = await db.relation.findMany({
      where: {
        sourceUnitId: { in: unitIds },
        targetUnitId: { in: unitIds },
      },
      select: { sourceUnitId: true, targetUnitId: true },
    });

    const unitIdSet = new Set(unitIds);
    const children = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const rel of incomingTargets) {
      if (!children.has(rel.sourceUnitId)) {
        children.set(rel.sourceUnitId, []);
      }
      children.get(rel.sourceUnitId)!.push(rel.targetUnitId);
      hasParent.add(rel.targetUnitId);
    }

    const roots = unitIds.filter((id) => !hasParent.has(id));
    let maxDepth = 0;
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({
      id,
      depth: 0,
    }));

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.id)) continue;
      visited.add(item.id);
      if (item.depth > maxDepth) maxDepth = item.depth;
      if (item.depth >= 10) continue; // Cap at 10

      const childIds = children.get(item.id) ?? [];
      for (const childId of childIds) {
        if (!visited.has(childId) && unitIdSet.has(childId)) {
          queue.push({ id: childId, depth: item.depth + 1 });
        }
      }
    }

    return { unitCount, completenessScore, avgRelationsPerUnit, depth: maxDepth };
  }

  async function getProjectMetrics(
    projectId: string,
  ): Promise<CompoundingMetrics["project"]> {
    const totalUnits = await db.unit.count({ where: { projectId } });

    // Get all unit IDs in this project for relation counting
    const projectUnits = await db.unit.findMany({
      where: { projectId },
      select: { id: true },
    });
    const unitIds = projectUnits.map((u) => u.id);

    const totalRelations = await db.relation.count({
      where: { sourceUnitId: { in: unitIds } },
    });

    // Cross-context connections: relations where source and target are in different contexts
    const crossContextRaw = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT r.id)::bigint as count
      FROM relations r
      JOIN unit_contexts uc1 ON uc1.unit_id = r.source_unit_id
      JOIN unit_contexts uc2 ON uc2.unit_id = r.target_unit_id
      WHERE r.source_unit_id = ANY(${unitIds}::uuid[])
        AND uc1.context_id != uc2.context_id
    `;
    const crossContextConnections = Number(crossContextRaw[0]?.count ?? 0);

    const knowledgeDensity =
      totalUnits > 0
        ? Math.round((totalRelations / totalUnits) * 100) / 100
        : 0;

    return {
      totalUnits,
      totalRelations,
      crossContextConnections,
      knowledgeDensity,
    };
  }

  async function getCompoundingMetrics(
    projectId: string,
    contextId?: string,
    unitId?: string,
  ): Promise<Partial<CompoundingMetrics>> {
    const result: Partial<CompoundingMetrics> = {};

    const promises: Promise<void>[] = [];

    promises.push(
      getProjectMetrics(projectId).then((m) => {
        result.project = m;
      }),
    );

    if (contextId) {
      promises.push(
        getContextMetrics(contextId).then((m) => {
          result.context = m;
        }),
      );
    }

    if (unitId) {
      promises.push(
        getUnitMetrics(unitId).then((m) => {
          result.unit = m;
        }),
      );
    }

    await Promise.all(promises);
    return result;
  }

  return {
    getUnitMetrics,
    getContextMetrics,
    getProjectMetrics,
    getCompoundingMetrics,
  };
}

export type CompoundingService = ReturnType<typeof createCompoundingService>;
