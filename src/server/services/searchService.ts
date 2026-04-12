import type { PrismaClient, UnitType, Lifecycle, Prisma } from "@prisma/client";
import { generateEmbedding } from "@/server/ai/embedding";

// ─── Types ───────────────────────────────────────────────────────────

export type SearchLayer = "text" | "structural" | "temporal" | "semantic";

export interface SearchOptions {
  contextId?: string;
  projectId: string;
  layers: SearchLayer[];
  limit?: number;
}

export interface SearchResult {
  unitId: string;
  content: string;
  unitType: UnitType;
  lifecycle: Lifecycle;
  score: number;
  matchLayer: SearchLayer;
  highlights: string[];
  createdAt: Date;
  relationCount: number;
}

export interface StructuralFilters {
  unitTypes?: UnitType[];
  lifecycles?: Lifecycle[];
  minRelationCount?: number;
  maxRelationCount?: number;
}

export interface TemporalFilters {
  createdAfter?: Date;
  createdBefore?: Date;
  sortOrder?: "asc" | "desc";
}

// ─── Service ─────────────────────────────────────────────────────────

export function createSearchService(db: PrismaClient) {
  /**
   * Multi-layer search across units
   * - text: PostgreSQL ILIKE for content matching with highlights
   * - structural: filter by unitType, lifecycle, relation count
   * - temporal: filter/sort by createdAt
   */
  async function search(
    query: string,
    options: SearchOptions,
    structuralFilters?: StructuralFilters,
    temporalFilters?: TemporalFilters,
  ): Promise<SearchResult[]> {
    const { projectId, contextId, layers, limit = 50 } = options;
    const results: Map<string, SearchResult> = new Map();

    // Base where clause for project/context filtering
    const baseWhere: Prisma.UnitWhereInput = {
      projectId,
      ...(contextId && {
        unitContexts: {
          some: { contextId },
        },
      }),
    };

    // Text layer: ILIKE search with highlights
    if (layers.includes("text") && query.trim()) {
      const textResults = await searchTextLayer(query, baseWhere, limit);
      for (const r of textResults) {
        mergeResult(results, r, "text");
      }
    }

    // Structural layer: filter by type, lifecycle, relation count
    if (layers.includes("structural")) {
      const structuralResults = await searchStructuralLayer(
        query,
        baseWhere,
        structuralFilters,
        limit,
      );
      for (const r of structuralResults) {
        mergeResult(results, r, "structural");
      }
    }

    // Temporal layer: filter/sort by date
    if (layers.includes("temporal")) {
      const temporalResults = await searchTemporalLayer(
        query,
        baseWhere,
        temporalFilters,
        limit,
      );
      for (const r of temporalResults) {
        mergeResult(results, r, "temporal");
      }
    }

    // Semantic layer: vector similarity search via pgvector
    if (layers.includes("semantic") && query.trim()) {
      const semanticResults = await searchSemanticLayer(
        query,
        projectId,
        limit,
      );
      for (const r of semanticResults) {
        mergeResult(results, r, "semantic");
      }
    }

    // Sort by score descending and limit
    const sorted = Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sorted;
  }

  /**
   * Text layer search using PostgreSQL ILIKE
   */
  async function searchTextLayer(
    query: string,
    baseWhere: Prisma.UnitWhereInput,
    limit: number,
  ): Promise<SearchResult[]> {
    const searchPattern = `%${query.replace(/[%_]/g, "\\$&")}%`;

    // Use raw query for ILIKE with case-insensitive matching
    const units = await db.$queryRaw<
      Array<{
        id: string;
        content: string;
        unit_type: UnitType;
        lifecycle: Lifecycle;
        created_at: Date;
        project_id: string;
      }>
    >`
      SELECT id, content, unit_type, lifecycle, created_at, project_id
      FROM "Unit"
      WHERE content ILIKE ${searchPattern}
        AND project_id = ${(baseWhere as { projectId: string }).projectId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    // Get relation counts for matched units
    const unitIds = units.map((u) => u.id);
    const relationCounts = await getRelationCounts(unitIds);

    return units.map((unit) => ({
      unitId: unit.id,
      content: unit.content,
      unitType: unit.unit_type,
      lifecycle: unit.lifecycle,
      score: calculateTextScore(unit.content, query),
      matchLayer: "text" as SearchLayer,
      highlights: extractHighlights(unit.content, query),
      createdAt: unit.created_at,
      relationCount: relationCounts.get(unit.id) ?? 0,
    }));
  }

  /**
   * Structural layer search: filter by type, lifecycle, relation count
   */
  async function searchStructuralLayer(
    query: string,
    baseWhere: Prisma.UnitWhereInput,
    filters?: StructuralFilters,
    limit?: number,
  ): Promise<SearchResult[]> {
    const where: Prisma.UnitWhereInput = {
      ...baseWhere,
      ...(filters?.unitTypes?.length && { unitType: { in: filters.unitTypes } }),
      ...(filters?.lifecycles?.length && { lifecycle: { in: filters.lifecycles } }),
    };

    // If query is provided, also match content
    if (query.trim()) {
      where.content = { contains: query, mode: "insensitive" };
    }

    const units = await db.unit.findMany({
      where,
      select: {
        id: true,
        content: true,
        unitType: true,
        lifecycle: true,
        createdAt: true,
        _count: {
          select: {
            relationsAsSource: true,
            relationsAsTarget: true,
          },
        },
      },
      take: limit ?? 50,
      orderBy: { createdAt: "desc" },
    });

    // Filter by relation count if specified
    let filtered = units;
    if (filters?.minRelationCount !== undefined || filters?.maxRelationCount !== undefined) {
      filtered = units.filter((u) => {
        const count = u._count.relationsAsSource + u._count.relationsAsTarget;
        if (filters.minRelationCount !== undefined && count < filters.minRelationCount) {
          return false;
        }
        if (filters.maxRelationCount !== undefined && count > filters.maxRelationCount) {
          return false;
        }
        return true;
      });
    }

    return filtered.map((unit) => ({
      unitId: unit.id,
      content: unit.content,
      unitType: unit.unitType,
      lifecycle: unit.lifecycle,
      score: calculateStructuralScore(unit, filters),
      matchLayer: "structural" as SearchLayer,
      highlights: query.trim() ? extractHighlights(unit.content, query) : [],
      createdAt: unit.createdAt,
      relationCount: unit._count.relationsAsSource + unit._count.relationsAsTarget,
    }));
  }

  /**
   * Temporal layer search: filter/sort by date
   */
  async function searchTemporalLayer(
    query: string,
    baseWhere: Prisma.UnitWhereInput,
    filters?: TemporalFilters,
    limit?: number,
  ): Promise<SearchResult[]> {
    const where: Prisma.UnitWhereInput = {
      ...baseWhere,
      ...(filters?.createdAfter && { createdAt: { gte: filters.createdAfter } }),
      ...(filters?.createdBefore && {
        createdAt: {
          ...(filters?.createdAfter ? { gte: filters.createdAfter } : {}),
          lte: filters.createdBefore,
        },
      }),
    };

    // If query is provided, also match content
    if (query.trim()) {
      where.content = { contains: query, mode: "insensitive" };
    }

    const units = await db.unit.findMany({
      where,
      select: {
        id: true,
        content: true,
        unitType: true,
        lifecycle: true,
        createdAt: true,
        _count: {
          select: {
            relationsAsSource: true,
            relationsAsTarget: true,
          },
        },
      },
      take: limit ?? 50,
      orderBy: { createdAt: filters?.sortOrder ?? "desc" },
    });

    return units.map((unit) => ({
      unitId: unit.id,
      content: unit.content,
      unitType: unit.unitType,
      lifecycle: unit.lifecycle,
      score: calculateTemporalScore(unit.createdAt),
      matchLayer: "temporal" as SearchLayer,
      highlights: query.trim() ? extractHighlights(unit.content, query) : [],
      createdAt: unit.createdAt,
      relationCount: unit._count.relationsAsSource + unit._count.relationsAsTarget,
    }));
  }

  /**
   * Semantic layer search using pgvector cosine similarity.
   *
   * Generates an embedding for the query text, then finds the closest
   * unit embeddings using the `<=>` (cosine distance) operator.
   * Only units that already have an embedding stored are considered.
   */
  async function searchSemanticLayer(
    query: string,
    projectId: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      // No embedding provider configured — skip semantic search
      return [];
    }
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;

    const rows = await db.$queryRaw<
      Array<{
        id: string;
        content: string;
        unit_type: UnitType;
        lifecycle: Lifecycle;
        created_at: Date;
        similarity: number;
      }>
    >`
      SELECT
        id,
        content,
        unit_type,
        lifecycle,
        created_at,
        1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "Unit"
      WHERE "projectId" = ${projectId}::uuid
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;

    const unitIds = rows.map((r) => r.id);
    const relationCounts = await getRelationCounts(unitIds);

    return rows.map((row) => ({
      unitId: row.id,
      content: row.content,
      unitType: row.unit_type,
      lifecycle: row.lifecycle,
      score: Number(row.similarity),
      matchLayer: "semantic" as SearchLayer,
      highlights: [],
      createdAt: row.created_at,
      relationCount: relationCounts.get(row.id) ?? 0,
    }));
  }

  /**
   * Get relation counts for a list of unit IDs
   */
  async function getRelationCounts(unitIds: string[]): Promise<Map<string, number>> {
    if (unitIds.length === 0) return new Map();

    const counts = await db.unit.findMany({
      where: { id: { in: unitIds } },
      select: {
        id: true,
        _count: {
          select: {
            relationsAsSource: true,
            relationsAsTarget: true,
          },
        },
      },
    });

    return new Map(
      counts.map((u) => [u.id, u._count.relationsAsSource + u._count.relationsAsTarget]),
    );
  }

  /**
   * Merge a result into the results map, keeping highest score
   */
  function mergeResult(
    results: Map<string, SearchResult>,
    result: SearchResult,
    layer: SearchLayer,
  ): void {
    const existing = results.get(result.unitId);
    if (!existing) {
      results.set(result.unitId, { ...result, matchLayer: layer });
    } else if (result.score > existing.score) {
      results.set(result.unitId, {
        ...result,
        matchLayer: layer,
        highlights: [...new Set([...existing.highlights, ...result.highlights])],
      });
    } else {
      // Merge highlights even if score is lower
      existing.highlights = [...new Set([...existing.highlights, ...result.highlights])];
    }
  }

  /**
   * Calculate text match score (0-1)
   */
  function calculateTextScore(content: string, query: string): number {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Exact match gets highest score
    if (lowerContent === lowerQuery) return 1.0;

    // Start of content match
    if (lowerContent.startsWith(lowerQuery)) return 0.9;

    // Word boundary match
    const wordBoundaryMatch = new RegExp(`\\b${escapeRegex(lowerQuery)}\\b`, "i").test(content);
    if (wordBoundaryMatch) return 0.8;

    // Contains match - score based on relative length
    const matches = lowerContent.split(lowerQuery).length - 1;
    const coverage = (query.length * matches) / content.length;
    return Math.min(0.7, 0.3 + coverage * 0.4);
  }

  /**
   * Calculate structural match score
   */
  function calculateStructuralScore(
    unit: { _count: { relationsAsSource: number; relationsAsTarget: number } },
    filters?: StructuralFilters,
  ): number {
    const relationCount = unit._count.relationsAsSource + unit._count.relationsAsTarget;
    // Higher relation count = higher score
    const relationScore = Math.min(1, relationCount / 10);
    // Bonus if matches specific filters
    const filterBonus = filters?.unitTypes?.length || filters?.lifecycles?.length ? 0.2 : 0;
    return Math.min(1, 0.5 + relationScore * 0.3 + filterBonus);
  }

  /**
   * Calculate temporal score based on recency
   */
  function calculateTemporalScore(createdAt: Date): number {
    const ageMs = Date.now() - createdAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    // Decay over 7 days
    const decay = Math.exp(-ageHours / (24 * 7));
    return 0.3 + decay * 0.7;
  }

  /**
   * Extract highlighted snippets from content
   */
  function extractHighlights(content: string, query: string): string[] {
    if (!query.trim()) return [];

    const highlights: string[] = [];
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const contextChars = 40;

    let searchStart = 0;
    let matchIndex = lowerContent.indexOf(lowerQuery, searchStart);

    while (matchIndex !== -1 && highlights.length < 3) {
      const start = Math.max(0, matchIndex - contextChars);
      const end = Math.min(content.length, matchIndex + query.length + contextChars);

      let snippet = content.slice(start, end);
      if (start > 0) snippet = "..." + snippet;
      if (end < content.length) snippet = snippet + "...";

      highlights.push(snippet);
      searchStart = matchIndex + query.length;
      matchIndex = lowerContent.indexOf(lowerQuery, searchStart);
    }

    return highlights;
  }

  /**
   * Escape regex special characters
   */
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return {
    search,
  };
}
