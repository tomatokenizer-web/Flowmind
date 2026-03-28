/**
 * Card Boundary Algorithm for Flow Reading View
 *
 * Groups path units into readable "cards" following these rules (priority order):
 * 1. Nucleus-satellite pairs are NEVER split across cards (hard constraint)
 * 2. Units sharing a primary relation (per navigation purpose) are grouped together
 * 3. Expertise-level cap: novice=3, intermediate=5, expert=8 (soft — rule 1 overrides)
 * 4. Break triggers:
 *    (a) Relation type changes from primary to secondary
 *    (b) Temporal gap in derivation order exceeds threshold
 *    (c) Fork point reached (branch diverges into 2+ paths)
 * 5. Orphan units (no qualifying relations to neighbors) get their own card
 */

import type { ExpertiseLevel } from "~/stores/theme-store";

/* ─── Types ─── */

export interface PathUnit {
  id: string;
  primaryType: string;
  contextId?: string | null;
  /** ID of the nucleus unit if this is a satellite */
  nucleusId?: string | null;
  /** IDs of satellite units if this is a nucleus */
  satelliteIds?: string[];
  /** Timestamp for temporal gap detection */
  createdAt?: Date | string | null;
}

export interface PathRelation {
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  layer?: string;
  /** Whether this is a primary relation for current navigation purpose */
  isPrimary?: boolean;
}

export interface CardGroup {
  id: string;
  unitIds: string[];
  /** Derived theme label for the card */
  theme: string;
  /** Primary type of the majority of units in the card */
  dominantType: string;
  /** Index in the overall sequence */
  index: number;
  /** Relations internal to this card */
  internalRelations: PathRelation[];
  /** Relations pointing to units outside this card */
  externalRelations: PathRelation[];
  /** Whether this card contains only an orphan unit */
  isOrphan: boolean;
}

export interface CardBoundaryOptions {
  /** Navigation purpose — affects which relations are "primary" */
  navigationPurpose?: "argument" | "creative" | "causal" | "temporal" | "structural" | "general";
  /** Temporal gap threshold in hours (default: 24) */
  temporalGapThresholdHours?: number;
}

/* ─── Constants ─── */

const MAX_UNITS_BY_EXPERTISE: Record<ExpertiseLevel, number> = {
  novice: 3,
  intermediate: 5,
  expert: 8,
};

const NUCLEUS_SATELLITE_RELATIONS = new Set([
  "elaborates",
  "specifies",
  "exemplifies",
  "supports",
  "justifies",
  "restates",
  "expands",
  "summarizes",
]);

/** Relations considered "primary" per navigation purpose */
const PRIMARY_RELATIONS: Record<string, Set<string>> = {
  argument: new Set(["supports", "contradicts", "rebuts", "undercuts", "qualifies", "questions", "concedes"]),
  creative: new Set(["inspires", "transforms_into", "foreshadows", "echoes", "subverts", "recontextualizes"]),
  causal: new Set(["causes", "enables", "prevents", "results_in", "motivated_by", "condition_for"]),
  temporal: new Set(["precedes", "follows", "simultaneous_with"]),
  structural: new Set(["contains", "part_of", "is_a", "defined_by", "classifies"]),
  general: new Set(["supports", "contradicts", "derives_from", "questions", "inspires", "contains"]),
};

const DEFAULT_TEMPORAL_GAP_HOURS = 24;

/* ─── Helpers ─── */

function getMajorityType(units: PathUnit[]): string {
  const counts: Record<string, number> = {};
  for (const u of units) {
    counts[u.primaryType] = (counts[u.primaryType] ?? 0) + 1;
  }
  let max = 0;
  let result = units[0]?.primaryType ?? "claim";
  for (const [type, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      result = type;
    }
  }
  return result;
}

function deriveTheme(units: PathUnit[], dominantType: string): string {
  const typeLabel = dominantType.charAt(0).toUpperCase() + dominantType.slice(1);
  if (units.length === 1) return typeLabel;
  return `${typeLabel} cluster`;
}

function buildNucleusSatelliteGroups(
  units: PathUnit[],
): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  const unitMap = new Map(units.map((u) => [u.id, u]));

  for (const unit of units) {
    if (unit.nucleusId && unitMap.has(unit.nucleusId)) {
      const nucleusId = unit.nucleusId;
      if (!groups.has(nucleusId)) {
        groups.set(nucleusId, new Set([nucleusId]));
      }
      groups.get(nucleusId)!.add(unit.id);
    }

    if (unit.satelliteIds) {
      for (const satId of unit.satelliteIds) {
        if (unitMap.has(satId)) {
          if (!groups.has(unit.id)) {
            groups.set(unit.id, new Set([unit.id]));
          }
          groups.get(unit.id)!.add(satId);
        }
      }
    }
  }

  return groups;
}

function getTimestamp(unit: PathUnit): number | null {
  if (!unit.createdAt) return null;
  const d = unit.createdAt instanceof Date ? unit.createdAt : new Date(unit.createdAt);
  return d.getTime();
}

function hasTemporalGap(prev: PathUnit, curr: PathUnit, thresholdHours: number): boolean {
  const t1 = getTimestamp(prev);
  const t2 = getTimestamp(curr);
  if (t1 === null || t2 === null) return false;
  const gapMs = Math.abs(t2 - t1);
  return gapMs > thresholdHours * 60 * 60 * 1000;
}

function isForkPoint(unitId: string, relations: PathRelation[]): boolean {
  const outgoing = relations.filter((r) => r.sourceUnitId === unitId);
  return outgoing.length >= 2;
}

function isOrphanUnit(unitId: string, relations: PathRelation[], primarySet: Set<string>): boolean {
  return !relations.some(
    (r) =>
      (r.sourceUnitId === unitId || r.targetUnitId === unitId) &&
      primarySet.has(r.type),
  );
}

function isRelationPrimary(relType: string, purpose: string): boolean {
  const set = PRIMARY_RELATIONS[purpose] ?? PRIMARY_RELATIONS.general!;
  return set.has(relType);
}

/* ─── Path Coherence Score ─── */

/**
 * Computes a path coherence score (0.0–1.0) before reading.
 * Measures: relation density, type consistency, temporal continuity, orphan ratio.
 */
export function computePathCoherence(
  orderedUnits: PathUnit[],
  relations: PathRelation[],
  purpose: string = "general",
): number {
  if (orderedUnits.length <= 1) return 1.0;

  const primarySet = PRIMARY_RELATIONS[purpose] ?? PRIMARY_RELATIONS.general!;
  const unitIds = new Set(orderedUnits.map((u) => u.id));

  // Relation density: ratio of primary relations between path units vs possible
  const pathRelations = relations.filter(
    (r) => unitIds.has(r.sourceUnitId) && unitIds.has(r.targetUnitId) && primarySet.has(r.type),
  );
  const maxPossible = orderedUnits.length - 1;
  const densityScore = Math.min(1, pathRelations.length / Math.max(1, maxPossible));

  // Type consistency: how uniform are the unit types
  const typeCounts: Record<string, number> = {};
  for (const u of orderedUnits) {
    typeCounts[u.primaryType] = (typeCounts[u.primaryType] ?? 0) + 1;
  }
  const maxTypeCount = Math.max(...Object.values(typeCounts));
  const typeScore = maxTypeCount / orderedUnits.length;

  // Orphan ratio: units with no primary relations to path neighbors
  let orphanCount = 0;
  for (const u of orderedUnits) {
    if (isOrphanUnit(u.id, relations, primarySet)) orphanCount++;
  }
  const orphanScore = 1 - orphanCount / orderedUnits.length;

  // Weighted average
  return densityScore * 0.4 + typeScore * 0.2 + orphanScore * 0.4;
}

/* ─── Main Algorithm ─── */

export function computeCardBoundaries(
  orderedUnits: PathUnit[],
  relations: PathRelation[],
  expertiseLevel: ExpertiseLevel,
  options: CardBoundaryOptions = {},
): CardGroup[] {
  if (orderedUnits.length === 0) return [];

  const {
    navigationPurpose = "general",
    temporalGapThresholdHours = DEFAULT_TEMPORAL_GAP_HOURS,
  } = options;

  const maxPerCard = MAX_UNITS_BY_EXPERTISE[expertiseLevel];
  const nucleusGroups = buildNucleusSatelliteGroups(orderedUnits);
  const primarySet = PRIMARY_RELATIONS[navigationPurpose] ?? PRIMARY_RELATIONS.general!;

  // Build relation lookup
  const relationsByUnit = new Map<string, PathRelation[]>();
  for (const rel of relations) {
    if (!relationsByUnit.has(rel.sourceUnitId)) {
      relationsByUnit.set(rel.sourceUnitId, []);
    }
    relationsByUnit.get(rel.sourceUnitId)!.push(rel);
    if (!relationsByUnit.has(rel.targetUnitId)) {
      relationsByUnit.set(rel.targetUnitId, []);
    }
    relationsByUnit.get(rel.targetUnitId)!.push(rel);
  }

  // Mark relation primary/secondary based on purpose
  for (const rel of relations) {
    rel.isPrimary = primarySet.has(rel.type);
  }

  const assigned = new Set<string>();
  const cards: CardGroup[] = [];
  let currentCardUnits: PathUnit[] = [];
  let lastRelationWasPrimary = true;

  function flushCard() {
    if (currentCardUnits.length === 0) return;

    const unitIds = currentCardUnits.map((u) => u.id);
    const unitIdSet = new Set(unitIds);
    const dominantType = getMajorityType(currentCardUnits);

    const internalRelations: PathRelation[] = [];
    const externalRelations: PathRelation[] = [];

    for (const uid of unitIds) {
      const rels = relationsByUnit.get(uid) ?? [];
      for (const rel of rels) {
        const otherEnd =
          rel.sourceUnitId === uid ? rel.targetUnitId : rel.sourceUnitId;
        if (unitIdSet.has(otherEnd)) {
          if (rel.sourceUnitId === uid) {
            internalRelations.push(rel);
          }
        } else {
          externalRelations.push(rel);
        }
      }
    }

    cards.push({
      id: `card-${cards.length}`,
      unitIds,
      theme: deriveTheme(currentCardUnits, dominantType),
      dominantType,
      index: cards.length,
      internalRelations,
      externalRelations,
      isOrphan: currentCardUnits.length === 1 && isOrphanUnit(currentCardUnits[0]!.id, relations, primarySet),
    });

    currentCardUnits = [];
    lastRelationWasPrimary = true;
  }

  for (let i = 0; i < orderedUnits.length; i++) {
    const unit = orderedUnits[i]!;
    if (assigned.has(unit.id)) continue;

    // Rule 5: Orphan handling — unit with no qualifying relations to neighbors
    if (isOrphanUnit(unit.id, relations, primarySet)) {
      flushCard();
      assigned.add(unit.id);
      currentCardUnits = [unit];
      flushCard();
      continue;
    }

    // Rule 4b: Temporal gap break trigger
    if (currentCardUnits.length > 0 && i > 0) {
      const prevUnit = orderedUnits[i - 1]!;
      if (hasTemporalGap(prevUnit, unit, temporalGapThresholdHours)) {
        flushCard();
      }
    }

    // Rule 4c: Fork point break trigger
    if (currentCardUnits.length > 0 && isForkPoint(unit.id, relations)) {
      flushCard();
    }

    // Rule 4a: Relation type change (primary → secondary)
    if (currentCardUnits.length > 0) {
      const connectingRels = relations.filter(
        (r) =>
          (r.sourceUnitId === unit.id && assigned.has(r.targetUnitId)) ||
          (r.targetUnitId === unit.id && assigned.has(r.sourceUnitId)),
      );
      const currentIsPrimary = connectingRels.some((r) => primarySet.has(r.type));
      if (lastRelationWasPrimary && !currentIsPrimary && currentCardUnits.length >= 2) {
        flushCard();
      }
      lastRelationWasPrimary = currentIsPrimary;
    }

    // Collect nucleus-satellite group (Rule 1)
    const unitsToAdd: PathUnit[] = [];
    let foundGroup = false;

    for (const [, groupIds] of nucleusGroups) {
      if (groupIds.has(unit.id)) {
        foundGroup = true;
        for (const gid of groupIds) {
          if (!assigned.has(gid)) {
            const gUnit = orderedUnits.find((u) => u.id === gid);
            if (gUnit) unitsToAdd.push(gUnit);
          }
        }
        break;
      }
    }

    if (!foundGroup) {
      unitsToAdd.push(unit);
    }

    // Rule 3: Expertise cap check (soft — nucleus-satellite overrides)
    if (
      currentCardUnits.length > 0 &&
      currentCardUnits.length + unitsToAdd.length > maxPerCard &&
      !foundGroup // Only flush if this isn't a nucleus-satellite group that MUST stay together
    ) {
      flushCard();
    }

    // Context affinity: different context triggers boundary (Rule 2 related)
    if (currentCardUnits.length > 0 && unitsToAdd.length > 0) {
      const currentContext = currentCardUnits[0]?.contextId;
      const newContext = unitsToAdd[0]?.contextId;
      if (
        currentContext &&
        newContext &&
        currentContext !== newContext &&
        currentCardUnits.length >= 2
      ) {
        flushCard();
      }
    }

    for (const u of unitsToAdd) {
      if (!assigned.has(u.id)) {
        currentCardUnits.push(u);
        assigned.add(u.id);
      }
    }

    // Hard flush at max (unless nucleus-satellite forced it over)
    if (currentCardUnits.length >= maxPerCard) {
      flushCard();
    }
  }

  flushCard();
  return cards;
}

export { MAX_UNITS_BY_EXPERTISE, PRIMARY_RELATIONS };
