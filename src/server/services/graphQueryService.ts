import type { PrismaClient, Prisma } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

export type QueryScope = "single_context" | "context_set" | "pursuit" | "global";

export type QueryMethod =
  | "structural"
  | "attribute"
  | "semantic"
  | "topological"
  | "temporal"
  | "comparative"
  | "aggregation"
  | "path"
  | "composite";

export type QueryResult = {
  method: QueryMethod;
  trustLevel: "deterministic" | "algorithmic" | "ai_interpreted";
  items: QueryItem[];
  count: number;
};

export type QueryItem = {
  id: string;
  content: string;
  unitType: string;
  lifecycle: string;
  importance: number;
  createdAt: Date;
  score?: number;
  metadata?: Record<string, unknown>;
};

export type AggregationResult = {
  method: "aggregation";
  trustLevel: "deterministic";
  data: Record<string, unknown>;
};

// ─── Service ────────────────────────────────────────────────────────

export function createGraphQueryService(db: PrismaClient) {
  /**
   * Resolve unit IDs for a given scope.
   */
  async function resolveScope(
    projectId: string,
    scope: QueryScope,
    scopeParams?: { contextId?: string; contextIds?: string[]; pursuitId?: string },
  ): Promise<string[]> {
    switch (scope) {
      case "single_context": {
        if (!scopeParams?.contextId) return [];
        const ucs = await db.unitContext.findMany({
          where: { contextId: scopeParams.contextId },
          select: { unitId: true },
        });
        return ucs.map((uc) => uc.unitId);
      }
      case "context_set": {
        if (!scopeParams?.contextIds?.length) return [];
        const ucs = await db.unitContext.findMany({
          where: { contextId: { in: scopeParams.contextIds } },
          select: { unitId: true },
        });
        return [...new Set(ucs.map((uc) => uc.unitId))];
      }
      case "pursuit": {
        if (!scopeParams?.pursuitId) return [];
        const contexts = await db.context.findMany({
          where: { inquiryId: scopeParams.pursuitId },
          select: { id: true },
        });
        const ctxIds = contexts.map((c) => c.id);
        if (ctxIds.length === 0) return [];
        const ucs = await db.unitContext.findMany({
          where: { contextId: { in: ctxIds } },
          select: { unitId: true },
        });
        return [...new Set(ucs.map((uc) => uc.unitId))];
      }
      case "global": {
        const units = await db.unit.findMany({
          where: { projectId },
          select: { id: true },
        });
        return units.map((u) => u.id);
      }
    }
  }

  // ── Method 1: Structural ─────────────────────────────────────────

  /**
   * Structural queries: exact graph structure matching.
   * Deterministic, complete results.
   */
  async function structural(
    projectId: string,
    query: {
      unitType?: string;
      hasNoIncoming?: string; // relation subtype with no incoming edges
      hasNoOutgoing?: string;
      lifecycle?: string;
    },
    scope: QueryScope = "global",
    scopeParams?: { contextId?: string },
    limit = 100,
  ): Promise<QueryResult> {
    const where: Prisma.UnitWhereInput = { projectId };

    if (query.unitType) where.unitType = query.unitType as Prisma.UnitWhereInput["unitType"];
    if (query.lifecycle) where.lifecycle = query.lifecycle as Prisma.UnitWhereInput["lifecycle"];

    // Scope filtering
    if (scope === "single_context" && scopeParams?.contextId) {
      where.unitContexts = { some: { contextId: scopeParams.contextId } };
    }

    // Structural: no incoming of specific type
    if (query.hasNoIncoming) {
      where.relationsAsTarget = { none: { subtype: query.hasNoIncoming as Prisma.RelationWhereInput["subtype"] } };
    }
    if (query.hasNoOutgoing) {
      where.relationsAsSource = { none: { subtype: query.hasNoOutgoing as Prisma.RelationWhereInput["subtype"] } };
    }

    const units = await db.unit.findMany({
      where,
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true,
      },
      take: limit,
      orderBy: { importance: "desc" },
    });

    return {
      method: "structural",
      trustLevel: "deterministic",
      count: units.length,
      items: units.map((u) => ({
        id: u.id,
        content: u.content,
        unitType: u.unitType,
        lifecycle: u.lifecycle,
        importance: u.importance,
        createdAt: u.createdAt,
      })),
    };
  }

  // ── Method 2: Attribute ──────────────────────────────────────────

  /**
   * Attribute queries: filter by stored metadata.
   * Deterministic results.
   */
  async function attribute(
    projectId: string,
    filters: {
      unitType?: string;
      lifecycle?: string;
      importanceMin?: number;
      importanceMax?: number;
      dateFrom?: Date;
      dateTo?: Date;
      flagged?: boolean;
      pinned?: boolean;
      incubating?: boolean;
      aiReviewPending?: boolean;
    },
    limit = 100,
  ): Promise<QueryResult> {
    const where: Prisma.UnitWhereInput = { projectId };

    if (filters.unitType) where.unitType = filters.unitType as Prisma.UnitWhereInput["unitType"];
    if (filters.lifecycle) where.lifecycle = filters.lifecycle as Prisma.UnitWhereInput["lifecycle"];
    if (filters.flagged !== undefined) where.flagged = filters.flagged;
    if (filters.pinned !== undefined) where.pinned = filters.pinned;
    if (filters.incubating !== undefined) where.incubating = filters.incubating;
    if (filters.aiReviewPending !== undefined) where.aiReviewPending = filters.aiReviewPending;
    if (filters.importanceMin !== undefined || filters.importanceMax !== undefined) {
      where.importance = {
        ...(filters.importanceMin !== undefined ? { gte: filters.importanceMin } : {}),
        ...(filters.importanceMax !== undefined ? { lte: filters.importanceMax } : {}),
      };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    const units = await db.unit.findMany({
      where,
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return {
      method: "attribute",
      trustLevel: "deterministic",
      count: units.length,
      items: units.map((u) => ({
        id: u.id, content: u.content, unitType: u.unitType,
        lifecycle: u.lifecycle, importance: u.importance, createdAt: u.createdAt,
      })),
    };
  }

  // ── Method 3: Semantic ───────────────────────────────────────────

  /**
   * Semantic queries: pgvector cosine similarity search.
   * AI-interpreted trust level since results depend on embedding quality.
   */
  async function semantic(
    projectId: string,
    query: {
      /** The unit ID to find similar units to */
      anchorUnitId?: string;
      /** Raw text to search for (requires embedding service) */
      text?: string;
      /** Similarity threshold (0-1), default 0.5 */
      threshold?: number;
    },
    scope: QueryScope = "global",
    scopeParams?: { contextId?: string },
    limit = 20,
  ): Promise<QueryResult> {
    const threshold = query.threshold ?? 0.5;

    // Anchor-based: find units similar to a specific unit using content overlap
    if (query.anchorUnitId) {
      const anchor = await db.unit.findFirst({
        where: { id: query.anchorUnitId, projectId },
        select: { id: true, content: true },
      });
      if (!anchor) return { method: "semantic", trustLevel: "ai_interpreted", count: 0, items: [] };

      // Scope filtering
      const where: Prisma.UnitWhereInput = {
        projectId,
        id: { not: anchor.id },
      };
      if (scope === "single_context" && scopeParams?.contextId) {
        where.unitContexts = { some: { contextId: scopeParams.contextId } };
      }

      // Word-overlap similarity as a fallback when pgvector embeddings are unavailable
      const candidates = await db.unit.findMany({
        where,
        select: {
          id: true, content: true, unitType: true, lifecycle: true,
          importance: true, createdAt: true,
        },
        take: 200, // fetch pool for scoring
        orderBy: { importance: "desc" },
      });

      const anchorWords = new Set(
        anchor.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
      );

      const scored = candidates
        .map((u) => {
          const uWords = new Set(
            u.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
          );
          const intersection = [...anchorWords].filter((w) => uWords.has(w)).length;
          const union = new Set([...anchorWords, ...uWords]).size;
          const sim = union > 0 ? intersection / union : 0;
          return { ...u, score: sim };
        })
        .filter((u) => u.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        method: "semantic",
        trustLevel: "ai_interpreted",
        count: scored.length,
        items: scored.map((u) => ({
          id: u.id,
          content: u.content,
          unitType: u.unitType,
          lifecycle: u.lifecycle,
          importance: u.importance,
          createdAt: u.createdAt,
          score: u.score,
        })),
      };
    }

    // Text-based: keyword search fallback (full pgvector search deferred)
    if (query.text) {
      const where: Prisma.UnitWhereInput = {
        projectId,
        content: { contains: query.text, mode: "insensitive" },
      };
      if (scope === "single_context" && scopeParams?.contextId) {
        where.unitContexts = { some: { contextId: scopeParams.contextId } };
      }

      const units = await db.unit.findMany({
        where,
        select: {
          id: true, content: true, unitType: true, lifecycle: true,
          importance: true, createdAt: true,
        },
        take: limit,
        orderBy: { importance: "desc" },
      });

      return {
        method: "semantic",
        trustLevel: "ai_interpreted",
        count: units.length,
        items: units.map((u) => ({
          id: u.id, content: u.content, unitType: u.unitType,
          lifecycle: u.lifecycle, importance: u.importance, createdAt: u.createdAt,
          score: 1.0, // exact match
        })),
      };
    }

    return { method: "semantic", trustLevel: "ai_interpreted", count: 0, items: [] };
  }

  // ── Method 4: Topological ────────────────────────────────────────

  /**
   * Topological queries: graph-theoretic analysis.
   * Algorithmic, deterministic results.
   */
  async function topological(
    projectId: string,
    query: {
      metric: "centrality" | "bridge_units" | "orphans" | "clusters";
    },
    scope: QueryScope = "global",
    scopeParams?: { contextId?: string },
    limit = 50,
  ): Promise<QueryResult> {
    const unitIds = await resolveScope(projectId, scope, scopeParams);
    if (unitIds.length === 0) return { method: "topological", trustLevel: "algorithmic", count: 0, items: [] };

    const relations = await db.relation.findMany({
      where: {
        OR: [
          { sourceUnitId: { in: unitIds } },
          { targetUnitId: { in: unitIds } },
        ],
      },
      select: { sourceUnitId: true, targetUnitId: true, strength: true },
    });

    // Build adjacency for degree counting
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    for (const id of unitIds) {
      inDegree.set(id, 0);
      outDegree.set(id, 0);
    }
    for (const r of relations) {
      outDegree.set(r.sourceUnitId, (outDegree.get(r.sourceUnitId) ?? 0) + 1);
      inDegree.set(r.targetUnitId, (inDegree.get(r.targetUnitId) ?? 0) + 1);
    }

    let scoredIds: Array<{ id: string; score: number }>;

    switch (query.metric) {
      case "centrality": {
        // Combined degree centrality
        scoredIds = unitIds.map((id) => ({
          id,
          score: (inDegree.get(id) ?? 0) + (outDegree.get(id) ?? 0),
        }));
        const maxDeg = Math.max(...scoredIds.map((s) => s.score), 1);
        scoredIds = scoredIds.map((s) => ({ ...s, score: s.score / maxDeg }));
        scoredIds.sort((a, b) => b.score - a.score);
        break;
      }
      case "bridge_units": {
        // Units connecting otherwise disconnected groups (high betweenness proxy: high in+out degree)
        scoredIds = unitIds
          .map((id) => ({
            id,
            score: Math.min(inDegree.get(id) ?? 0, outDegree.get(id) ?? 0),
          }))
          .filter((s) => s.score > 0);
        scoredIds.sort((a, b) => b.score - a.score);
        break;
      }
      case "orphans": {
        scoredIds = unitIds
          .filter((id) => (inDegree.get(id) ?? 0) + (outDegree.get(id) ?? 0) === 0)
          .map((id) => ({ id, score: 0 }));
        break;
      }
      case "clusters": {
        // Simple connected components via union-find
        const parent = new Map<string, string>();
        for (const id of unitIds) parent.set(id, id);
        function find(x: string): string {
          while (parent.get(x) !== x) {
            parent.set(x, parent.get(parent.get(x)!)!);
            x = parent.get(x)!;
          }
          return x;
        }
        function union(a: string, b: string) {
          parent.set(find(a), find(b));
        }
        for (const r of relations) {
          if (unitIds.includes(r.sourceUnitId) && unitIds.includes(r.targetUnitId)) {
            union(r.sourceUnitId, r.targetUnitId);
          }
        }
        // Group by root
        const clusterMap = new Map<string, string[]>();
        for (const id of unitIds) {
          const root = find(id);
          if (!clusterMap.has(root)) clusterMap.set(root, []);
          clusterMap.get(root)!.push(id);
        }
        // Return cluster representatives (largest clusters first)
        const clusters = [...clusterMap.values()].sort((a, b) => b.length - a.length);
        scoredIds = clusters.flatMap((cluster) =>
          cluster.map((id, i) => ({ id, score: i === 0 ? cluster.length : 0 })),
        );
        break;
      }
    }

    const topIds = scoredIds.slice(0, limit).map((s) => s.id);
    const scoreMap = new Map(scoredIds.map((s) => [s.id, s.score]));

    const units = await db.unit.findMany({
      where: { id: { in: topIds } },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true,
      },
    });

    // Maintain score-based ordering
    const unitMap = new Map(units.map((u) => [u.id, u]));
    const items: QueryItem[] = topIds
      .map((id) => {
        const u = unitMap.get(id);
        if (!u) return null;
        return {
          id: u.id, content: u.content, unitType: u.unitType,
          lifecycle: u.lifecycle, importance: u.importance,
          createdAt: u.createdAt, score: scoreMap.get(id),
        };
      })
      .filter(Boolean) as QueryItem[];

    return {
      method: "topological",
      trustLevel: "algorithmic",
      count: items.length,
      items,
    };
  }

  // ── Method 5: Temporal ───────────────────────────────────────────

  /**
   * Temporal queries: time-based retrieval.
   */
  async function temporal(
    projectId: string,
    query: {
      period: "today" | "this_week" | "this_month" | "custom";
      dateFrom?: Date;
      dateTo?: Date;
      field?: "createdAt" | "modifiedAt";
    },
    limit = 100,
  ): Promise<QueryResult> {
    const field = query.field ?? "createdAt";
    let dateFrom: Date;
    const dateTo = query.dateTo ?? new Date();

    switch (query.period) {
      case "today":
        dateFrom = new Date();
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case "this_week":
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case "this_month":
        dateFrom = new Date();
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        break;
      case "custom":
        dateFrom = query.dateFrom ?? new Date(0);
        break;
    }

    const units = await db.unit.findMany({
      where: {
        projectId,
        [field]: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true,
      },
      orderBy: { [field]: "desc" },
      take: limit,
    });

    return {
      method: "temporal",
      trustLevel: "deterministic",
      count: units.length,
      items: units.map((u) => ({
        id: u.id, content: u.content, unitType: u.unitType,
        lifecycle: u.lifecycle, importance: u.importance, createdAt: u.createdAt,
      })),
    };
  }

  // ── Method 6: Comparative ────────────────────────────────────────

  /**
   * Compare units across two contexts.
   */
  async function comparative(
    projectId: string,
    contextIdA: string,
    contextIdB: string,
  ): Promise<{
    method: "comparative";
    trustLevel: "deterministic";
    onlyA: QueryItem[];
    onlyB: QueryItem[];
    shared: QueryItem[];
  }> {
    const [ucsA, ucsB] = await Promise.all([
      db.unitContext.findMany({ where: { contextId: contextIdA }, select: { unitId: true } }),
      db.unitContext.findMany({ where: { contextId: contextIdB }, select: { unitId: true } }),
    ]);

    const setA = new Set(ucsA.map((u) => u.unitId));
    const setB = new Set(ucsB.map((u) => u.unitId));

    const onlyAIds = [...setA].filter((id) => !setB.has(id));
    const onlyBIds = [...setB].filter((id) => !setA.has(id));
    const sharedIds = [...setA].filter((id) => setB.has(id));

    const allIds = [...new Set([...onlyAIds, ...onlyBIds, ...sharedIds])];
    if (allIds.length === 0) {
      return { method: "comparative", trustLevel: "deterministic", onlyA: [], onlyB: [], shared: [] };
    }

    const units = await db.unit.findMany({
      where: { id: { in: allIds }, projectId },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true,
      },
    });
    const unitMap = new Map(units.map((u) => [u.id, u]));

    function toItems(ids: string[]): QueryItem[] {
      return ids
        .map((id) => unitMap.get(id))
        .filter(Boolean)
        .map((u) => ({
          id: u!.id, content: u!.content, unitType: u!.unitType,
          lifecycle: u!.lifecycle, importance: u!.importance, createdAt: u!.createdAt,
        }));
    }

    return {
      method: "comparative",
      trustLevel: "deterministic",
      onlyA: toItems(onlyAIds),
      onlyB: toItems(onlyBIds),
      shared: toItems(sharedIds),
    };
  }

  // ── Method 7: Aggregation ────────────────────────────────────────

  /**
   * Statistical summaries: unit counts by type, lifecycle, etc.
   */
  async function aggregation(
    projectId: string,
    groupBy: "unitType" | "lifecycle" | "epistemicAct",
    scope: QueryScope = "global",
    scopeParams?: { contextId?: string },
  ): Promise<AggregationResult> {
    const where: Prisma.UnitWhereInput = { projectId };

    if (scope === "single_context" && scopeParams?.contextId) {
      where.unitContexts = { some: { contextId: scopeParams.contextId } };
    }

    const units = await db.unit.findMany({
      where,
      select: { [groupBy]: true },
    });

    const counts: Record<string, number> = {};
    for (const u of units) {
      const val = String((u as Record<string, unknown>)[groupBy] ?? "unknown");
      counts[val] = (counts[val] ?? 0) + 1;
    }

    return {
      method: "aggregation",
      trustLevel: "deterministic",
      data: {
        groupBy,
        total: units.length,
        distribution: counts,
      },
    };
  }

  // ── Method 8: Path ───────────────────────────────────────────────

  /**
   * Graph traversal: ancestors/descendants via relation chains.
   */
  async function pathQuery(
    unitId: string,
    direction: "ancestors" | "descendants" | "both",
    maxDepth = 5,
  ): Promise<QueryResult> {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: unitId, depth: 0 }];
    const ordered: string[] = [];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);
      if (id !== unitId) ordered.push(id);

      // ancestors = units pointing TO current (current is target)
      // descendants = units current points TO (current is source)
      const where: Prisma.RelationWhereInput =
        direction === "ancestors"
          ? { targetUnitId: id }
          : direction === "descendants"
            ? { sourceUnitId: id }
            : { OR: [{ sourceUnitId: id }, { targetUnitId: id }] };

      const rels = await db.relation.findMany({
        where,
        select: { sourceUnitId: true, targetUnitId: true },
      });

      for (const r of rels) {
        const nextId = r.sourceUnitId === id ? r.targetUnitId : r.sourceUnitId;
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, depth: depth + 1 });
        }
      }
    }

    if (ordered.length === 0) {
      return { method: "path", trustLevel: "deterministic", count: 0, items: [] };
    }

    const units = await db.unit.findMany({
      where: { id: { in: ordered } },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true,
      },
    });

    const unitMap = new Map(units.map((u) => [u.id, u]));
    const items: QueryItem[] = ordered
      .map((id) => unitMap.get(id))
      .filter(Boolean)
      .map((u) => ({
        id: u!.id, content: u!.content, unitType: u!.unitType,
        lifecycle: u!.lifecycle, importance: u!.importance, createdAt: u!.createdAt,
      }));

    return {
      method: "path",
      trustLevel: "deterministic",
      count: items.length,
      items,
    };
  }

  // ── Method 9: Composite ──────────────────────────────────────────

  /**
   * Composite queries: chain multiple query methods together.
   * Each step filters the result set of the previous step.
   */
  async function composite(
    projectId: string,
    steps: Array<{
      method: Exclude<QueryMethod, "composite">;
      params: Record<string, unknown>;
    }>,
    limit = 50,
  ): Promise<QueryResult> {
    let currentIds: string[] | null = null;

    for (const step of steps) {
      let result: QueryResult;

      switch (step.method) {
        case "structural":
          result = await structural(
            projectId,
            step.params as Parameters<typeof structural>[1],
            (step.params.scope as QueryScope) ?? "global",
            step.params.scopeParams as { contextId?: string },
            500, // larger pool for intermediate results
          );
          break;
        case "attribute":
          result = await attribute(
            projectId,
            step.params as Parameters<typeof attribute>[1],
            500,
          );
          break;
        case "semantic":
          result = await semantic(
            projectId,
            step.params as Parameters<typeof semantic>[1],
            (step.params.scope as QueryScope) ?? "global",
            step.params.scopeParams as { contextId?: string },
            500,
          );
          break;
        case "topological":
          result = await topological(
            projectId,
            step.params as Parameters<typeof topological>[1],
            (step.params.scope as QueryScope) ?? "global",
            step.params.scopeParams as { contextId?: string },
            500,
          );
          break;
        case "temporal":
          result = await temporal(projectId, step.params as Parameters<typeof temporal>[1], 500);
          break;
        case "aggregation":
          // Aggregation returns different shape — skip for composite
          continue;
        case "comparative":
          // Comparative returns different shape — skip for composite
          continue;
        case "path":
          result = await pathQuery(
            step.params.unitId as string,
            (step.params.direction as "ancestors" | "descendants" | "both") ?? "both",
            (step.params.maxDepth as number) ?? 5,
          );
          break;
        default:
          continue;
      }

      // Intersect with previous results
      if (currentIds === null) {
        currentIds = result.items.map((i) => i.id);
      } else {
        const resultIdSet = new Set(result.items.map((i) => i.id));
        currentIds = currentIds.filter((id) => resultIdSet.has(id));
      }
    }

    if (!currentIds || currentIds.length === 0) {
      return { method: "composite", trustLevel: "algorithmic", count: 0, items: [] };
    }

    // Fetch final units
    const units = await db.unit.findMany({
      where: { id: { in: currentIds.slice(0, limit) } },
      select: {
        id: true, content: true, unitType: true, lifecycle: true,
        importance: true, createdAt: true,
      },
    });

    return {
      method: "composite",
      trustLevel: "algorithmic",
      count: units.length,
      items: units.map((u) => ({
        id: u.id, content: u.content, unitType: u.unitType,
        lifecycle: u.lifecycle, importance: u.importance, createdAt: u.createdAt,
      })),
    };
  }

  return {
    resolveScope,
    structural,
    attribute,
    semantic,
    topological,
    temporal,
    comparative,
    aggregation,
    pathQuery,
    composite,
  };
}

export type GraphQueryService = ReturnType<typeof createGraphQueryService>;
