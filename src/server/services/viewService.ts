import type { PrismaClient } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

export type AttentionViewName =
  | "orphan_units"
  | "incubating"
  | "high_salience"
  | "stale"
  | "conflicting"
  | "unanswered_questions";

export type ViewSort = "salience" | "date" | "relation_count" | "type";
export type ViewOrder = "asc" | "desc";

export type ViewFilter = {
  unitType?: string;
  lifecycle?: string;
  salienceMin?: number;
  salienceMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  minRelations?: number;
  maxRelations?: number;
};

export type ViewResult = {
  id: string;
  content: string;
  unitType: string;
  lifecycle: string;
  importance: number;
  createdAt: Date;
  modifiedAt: Date;
  relationCount: number;
};

// ─── Service ────────────────────────────────────────────────────────

export function createViewService(db: PrismaClient) {
  /**
   * Orphan Units — units with 0 relations.
   */
  async function orphanUnits(projectId: string, limit = 50): Promise<ViewResult[]> {
    const units = await db.unit.findMany({
      where: { projectId },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true, modifiedAt: true,
        _count: { select: { relationsAsSource: true, relationsAsTarget: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return units
      .filter((u) => u._count.relationsAsSource + u._count.relationsAsTarget === 0)
      .slice(0, limit)
      .map((u) => ({
        id: u.id,
        content: u.content,
        unitType: u.unitType,
        lifecycle: u.lifecycle,
        importance: u.importance,
        createdAt: u.createdAt,
        modifiedAt: u.modifiedAt,
        relationCount: 0,
      }));
  }

  /**
   * Incubating — recently created units with low relation count.
   */
  async function incubating(projectId: string, daysThreshold = 7, limit = 50): Promise<ViewResult[]> {
    const since = new Date();
    since.setDate(since.getDate() - daysThreshold);

    const units = await db.unit.findMany({
      where: {
        projectId,
        createdAt: { gte: since },
      },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true, modifiedAt: true,
        _count: { select: { relationsAsSource: true, relationsAsTarget: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit * 2, // overfetch then filter
    });

    return units
      .filter((u) => u._count.relationsAsSource + u._count.relationsAsTarget <= 2)
      .slice(0, limit)
      .map((u) => ({
        id: u.id,
        content: u.content,
        unitType: u.unitType,
        lifecycle: u.lifecycle,
        importance: u.importance,
        createdAt: u.createdAt,
        modifiedAt: u.modifiedAt,
        relationCount: u._count.relationsAsSource + u._count.relationsAsTarget,
      }));
  }

  /**
   * High Salience — top-N units by importance/salience score.
   */
  async function highSalience(projectId: string, limit = 20): Promise<ViewResult[]> {
    const units = await db.unit.findMany({
      where: { projectId, importance: { gt: 0 } },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true, modifiedAt: true,
        _count: { select: { relationsAsSource: true, relationsAsTarget: true } },
      },
      orderBy: { importance: "desc" },
      take: limit,
    });

    return units.map((u) => ({
      id: u.id,
      content: u.content,
      unitType: u.unitType,
      lifecycle: u.lifecycle,
      importance: u.importance,
      createdAt: u.createdAt,
      modifiedAt: u.modifiedAt,
      relationCount: u._count.relationsAsSource + u._count.relationsAsTarget,
    }));
  }

  /**
   * Stale — not updated in N days, salience decaying.
   */
  async function stale(projectId: string, staleDays = 30, limit = 50): Promise<ViewResult[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleDays);

    const units = await db.unit.findMany({
      where: {
        projectId,
        modifiedAt: { lt: cutoff },
        lifecycle: { not: "archived" },
      },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true, modifiedAt: true,
        _count: { select: { relationsAsSource: true, relationsAsTarget: true } },
      },
      orderBy: { modifiedAt: "asc" },
      take: limit,
    });

    return units.map((u) => ({
      id: u.id,
      content: u.content,
      unitType: u.unitType,
      lifecycle: u.lifecycle,
      importance: u.importance,
      createdAt: u.createdAt,
      modifiedAt: u.modifiedAt,
      relationCount: u._count.relationsAsSource + u._count.relationsAsTarget,
    }));
  }

  /**
   * Conflicting — units involved in contradicts/rebuts relations.
   */
  async function conflicting(projectId: string, limit = 50): Promise<ViewResult[]> {
    const conflictRelations = await db.relation.findMany({
      where: {
        subtype: { in: ["contradicts", "rebuts", "qualifies"] },
        sourceUnit: { projectId },
      },
      select: { sourceUnitId: true, targetUnitId: true },
      take: limit * 2,
    });

    const unitIds = new Set<string>();
    for (const r of conflictRelations) {
      unitIds.add(r.sourceUnitId);
      unitIds.add(r.targetUnitId);
    }

    if (unitIds.size === 0) return [];

    const units = await db.unit.findMany({
      where: { id: { in: [...unitIds] } },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true, modifiedAt: true,
        _count: { select: { relationsAsSource: true, relationsAsTarget: true } },
      },
    });

    return units.slice(0, limit).map((u) => ({
      id: u.id,
      content: u.content,
      unitType: u.unitType,
      lifecycle: u.lifecycle,
      importance: u.importance,
      createdAt: u.createdAt,
      modifiedAt: u.modifiedAt,
      relationCount: u._count.relationsAsSource + u._count.relationsAsTarget,
    }));
  }

  /**
   * Unanswered Questions — question units without answers relation.
   */
  async function unansweredQuestions(projectId: string, limit = 50): Promise<ViewResult[]> {
    const questions = await db.unit.findMany({
      where: { projectId, unitType: "question" },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true, modifiedAt: true,
        relationsAsTarget: {
          where: { subtype: "answers" },
          select: { id: true },
          take: 1,
        },
        _count: { select: { relationsAsSource: true, relationsAsTarget: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return questions
      .filter((q) => q.relationsAsTarget.length === 0)
      .slice(0, limit)
      .map((u) => ({
        id: u.id,
        content: u.content,
        unitType: u.unitType,
        lifecycle: u.lifecycle,
        importance: u.importance,
        createdAt: u.createdAt,
        modifiedAt: u.modifiedAt,
        relationCount: u._count.relationsAsSource + u._count.relationsAsTarget,
      }));
  }

  /**
   * Custom view with filters and sorting.
   */
  async function customView(
    projectId: string,
    filter: ViewFilter = {},
    sort: ViewSort = "date",
    order: ViewOrder = "desc",
    limit = 50,
  ): Promise<ViewResult[]> {
    const where: Record<string, unknown> = { projectId };

    if (filter.unitType) where.unitType = filter.unitType;
    if (filter.lifecycle) where.lifecycle = filter.lifecycle;
    if (filter.salienceMin !== undefined || filter.salienceMax !== undefined) {
      where.importance = {
        ...(filter.salienceMin !== undefined ? { gte: filter.salienceMin } : {}),
        ...(filter.salienceMax !== undefined ? { lte: filter.salienceMax } : {}),
      };
    }
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {
        ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
        ...(filter.dateTo ? { lte: filter.dateTo } : {}),
      };
    }

    const orderByMap: Record<ViewSort, Record<string, string>> = {
      salience: { importance: order },
      date: { createdAt: order },
      relation_count: { createdAt: order }, // can't sort by count directly, fallback
      type: { unitType: order },
    };

    const units = await db.unit.findMany({
      where,
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true, modifiedAt: true,
        _count: { select: { relationsAsSource: true, relationsAsTarget: true } },
      },
      orderBy: orderByMap[sort],
      take: limit,
    });

    let results = units.map((u) => ({
      id: u.id,
      content: u.content,
      unitType: u.unitType,
      lifecycle: u.lifecycle,
      importance: u.importance,
      createdAt: u.createdAt,
      modifiedAt: u.modifiedAt,
      relationCount: u._count.relationsAsSource + u._count.relationsAsTarget,
    }));

    // Post-filter by relation count if specified
    if (filter.minRelations !== undefined) {
      results = results.filter((r) => r.relationCount >= filter.minRelations!);
    }
    if (filter.maxRelations !== undefined) {
      results = results.filter((r) => r.relationCount <= filter.maxRelations!);
    }

    // Sort by relation_count if requested (can't do in DB)
    if (sort === "relation_count") {
      results.sort((a, b) =>
        order === "desc" ? b.relationCount - a.relationCount : a.relationCount - b.relationCount,
      );
    }

    return results;
  }

  /**
   * Get a predefined attention view by name.
   */
  async function getAttentionView(
    name: AttentionViewName,
    projectId: string,
    limit = 50,
  ): Promise<ViewResult[]> {
    switch (name) {
      case "orphan_units":
        return orphanUnits(projectId, limit);
      case "incubating":
        return incubating(projectId, 7, limit);
      case "high_salience":
        return highSalience(projectId, limit);
      case "stale":
        return stale(projectId, 30, limit);
      case "conflicting":
        return conflicting(projectId, limit);
      case "unanswered_questions":
        return unansweredQuestions(projectId, limit);
    }
  }

  return {
    orphanUnits,
    incubating,
    highSalience,
    stale,
    conflicting,
    unansweredQuestions,
    customView,
    getAttentionView,
  };
}

export type ViewService = ReturnType<typeof createViewService>;
