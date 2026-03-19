/**
 * Dynamic chunk computation service.
 * Chunks are transient — never stored in DB.
 */

export interface TransientChunk {
  id: string;
  unitIds: string[];
  label: string;
  dominantType: string;
}

type Purpose = "argument" | "creative" | "chronological";

interface UnitInput {
  id: string;
  unitType: string;
  createdAt: Date;
}

interface RelationInput {
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  strength: number;
}

// ─── Relation type sets ────────────────────────────────────────────

const ARGUMENT_TYPES = new Set([
  "supports",
  "contradicts",
  "derives_from",
  "expands",
  "references",
  "exemplifies",
  "defines",
  "questions",
]);

const CREATIVE_TYPES = new Set([
  "inspires",
  "echoes",
  "transforms_into",
  "foreshadows",
  "parallels",
  "contextualizes",
  "operationalizes",
]);

// ─── Union-Find (path compression + union by rank) ─────────────────

class UnionFind {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  private ensure(id: string): void {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      this.rank.set(id, 0);
    }
  }

  find(id: string): string {
    this.ensure(id);
    const p = this.parent.get(id)!;
    if (p !== id) {
      this.parent.set(id, this.find(p));
    }
    return this.parent.get(id)!;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const rankA = this.rank.get(ra)!;
    const rankB = this.rank.get(rb)!;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
    } else if (rankA > rankB) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

function dominantUnitType(unitIds: string[], unitMap: Map<string, UnitInput>): string {
  const counts = new Map<string, number>();
  for (const id of unitIds) {
    const t = unitMap.get(id)?.unitType ?? "unknown";
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best = "unknown";
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = type;
    }
  }
  return best;
}

function buildChunksFromComponents(
  componentMap: Map<string, string[]>, // root → unitIds
  purpose: "argument" | "creative",
  unitMap: Map<string, UnitInput>,
): TransientChunk[] {
  const chunks: TransientChunk[] = [];
  let index = 0;
  for (const [, unitIds] of componentMap) {
    if (unitIds.length < 2) continue;
    chunks.push({
      id: `chunk-${index}`,
      unitIds,
      label: `Cluster ${index + 1}`,
      dominantType: dominantUnitType(unitIds, unitMap),
    });
    index++;
  }
  return chunks;
}

// ─── Main export ───────────────────────────────────────────────────

export function computeChunks(
  purpose: Purpose,
  units: UnitInput[],
  relations: RelationInput[],
): TransientChunk[] {
  if (units.length < 4) {
    if (units.length === 0) return [];
    const unitMap = new Map(units.map((u) => [u.id, u]));
    return [
      {
        id: "chunk-0",
        unitIds: units.map((u) => u.id),
        label: purpose === "chronological" ? "All" : "Cluster 1",
        dominantType: dominantUnitType(
          units.map((u) => u.id),
          unitMap,
        ),
      },
    ];
  }

  const unitMap = new Map(units.map((u) => [u.id, u]));
  const unitIdSet = new Set(units.map((u) => u.id));

  if (purpose === "chronological") {
    // Group by YYYY-MM-DD of createdAt
    const dayBuckets = new Map<string, string[]>();
    for (const unit of units) {
      const day = unit.createdAt.toISOString().slice(0, 10);
      const bucket = dayBuckets.get(day) ?? [];
      bucket.push(unit.id);
      dayBuckets.set(day, bucket);
    }

    const chunks: TransientChunk[] = [];
    let index = 0;
    for (const [day, unitIds] of dayBuckets) {
      if (unitIds.length < 2) continue;
      chunks.push({
        id: `chunk-${index}`,
        unitIds,
        label: day,
        dominantType: dominantUnitType(unitIds, unitMap),
      });
      index++;
    }
    return chunks;
  }

  // argument or creative: union-find over relevant relations
  const uf = new UnionFind();

  // Initialise every unit in the set
  for (const unit of units) {
    uf.find(unit.id); // ensure node exists
  }

  for (const rel of relations) {
    // Both endpoints must be in our unit set
    if (!unitIdSet.has(rel.sourceUnitId) || !unitIdSet.has(rel.targetUnitId)) {
      continue;
    }

    if (purpose === "argument") {
      if (ARGUMENT_TYPES.has(rel.type) && rel.strength >= 0.3) {
        uf.union(rel.sourceUnitId, rel.targetUnitId);
      }
    } else {
      // creative — any strength
      if (CREATIVE_TYPES.has(rel.type)) {
        uf.union(rel.sourceUnitId, rel.targetUnitId);
      }
    }
  }

  // Collect components
  const components = new Map<string, string[]>();
  for (const unit of units) {
    const root = uf.find(unit.id);
    const group = components.get(root) ?? [];
    group.push(unit.id);
    components.set(root, group);
  }

  return buildChunksFromComponents(components, purpose, unitMap);
}
