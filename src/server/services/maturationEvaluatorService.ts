import type { PrismaClient } from "@prisma/client";
import type { Candidate } from "@/server/services/proactiveSchedulerService";

// ─── DEC-2026-002 §5: Maturation Evaluator ─────────────────────────
//
// The maturation evaluator scores every claim in a project on a
// maturity rubric and emits `maturation` proposal candidates for
// claims that fall below the threshold. Candidates carry a concrete
// next-step (e.g. "add supporting evidence", "surface counter").
//
// This is a DETERMINISTIC scorer — no AI calls. It operates on the
// same Unit/Relation shape the Epistemic Rules Engine consumes so
// the two services can share upstream loaders.
//
// Dimensions (each 0-1, then averaged):
//
//   1. Evidence support       — ≥1 incoming `supports`
//   2. Counter coverage       — ≥1 incoming `contradicts`/`rebuts`
//   3. Hedging language       — inverse of absolutist-phrase count
//   4. Recency of revision    — inverse-sigmoid on modifiedAt age
//   5. Grounding definitions  — key nouns have matching definition units
//
// Claims with mature score ≥ MATURE_THRESHOLD produce zero candidates.
// Otherwise, the LOWEST-scoring dimension drives a single candidate.

// ─── Constants ─────────────────────────────────────────────────────

const MATURE_THRESHOLD = 0.65;
const ABSOLUTIST_PATTERN =
  /\b(always|never|all|none|every|must|definitely|absolutely|certainly|undeniably|obviously|clearly)\b/gi;
const RECENCY_HALF_LIFE_DAYS = 30;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const SUPPORTS_SUBTYPES = new Set(["supports"]);
const CONTRADICTS_SUBTYPES = new Set(["contradicts", "rebuts"]);

// ─── Types ─────────────────────────────────────────────────────────

export interface UnitForMaturation {
  id: string;
  content: string;
  unitType: string;
  modifiedAt: Date;
}

export interface RelationForMaturation {
  sourceUnitId: string;
  targetUnitId: string;
  subtype: string | null;
}

export interface MaturityBreakdown {
  unitId: string;
  score: number;
  dimensions: {
    evidence: number;
    counter: number;
    hedging: number;
    recency: number;
    grounding: number;
  };
  weakest: keyof MaturityBreakdown["dimensions"];
}

export interface MaturationCandidate extends Candidate {
  kind: "maturation";
  targetUnitId: string;
  payload: {
    weakestDimension: keyof MaturityBreakdown["dimensions"];
    suggestion: string;
    currentScore: number;
  };
}

export interface EvaluateOptions {
  contextId?: string;
  /** Override the maturity pass/fail threshold (0-1). */
  threshold?: number;
  /** Max candidates to return. */
  limit?: number;
}

// ─── Scoring helpers ───────────────────────────────────────────────

function recencyComponent(modifiedAt: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - modifiedAt.getTime()) / MS_PER_DAY);
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function hedgingComponent(content: string): number {
  const matches = content.match(ABSOLUTIST_PATTERN);
  const count = matches?.length ?? 0;
  // Each absolutist phrase subtracts 0.2 from a starting 1.0 floor of 0.
  return Math.max(0, 1 - 0.2 * count);
}

/**
 * Extract naive key terms: capitalised nouns and quoted strings.
 * Deliberately simple — we only use this to check whether the unit's
 * key terms are grounded by any definition-type units.
 */
function extractKeyTerms(content: string): string[] {
  const terms: string[] = [];
  const quoted = content.match(/"([^"]+)"/g);
  if (quoted) {
    for (const q of quoted) {
      terms.push(q.slice(1, -1).toLowerCase());
    }
  }
  const caps = content.match(/\b[A-Z][a-zA-Z]{3,}\b/g);
  if (caps) {
    for (const c of caps) {
      const lower = c.toLowerCase();
      if (!terms.includes(lower)) terms.push(lower);
    }
  }
  return terms;
}

// ─── Service ───────────────────────────────────────────────────────

export function createMaturationEvaluatorService(db: PrismaClient) {
  /**
   * Evaluate maturity for every claim in the given project and
   * return candidates for the weakest dimension of each below-threshold
   * claim.
   *
   * Pure read — never writes. Handing candidates to
   * proactiveSchedulerService is the caller's responsibility so budget
   * accounting + suppression filtering still apply.
   */
  async function evaluateProject(
    projectId: string,
    opts: EvaluateOptions = {},
  ) {
    const threshold = opts.threshold ?? MATURE_THRESHOLD;
    const limit = opts.limit ?? 20;

    const units = (await db.unit.findMany({
      where: { projectId, unitType: "claim" },
      select: { id: true, content: true, unitType: true, modifiedAt: true },
    })) as UnitForMaturation[];

    if (units.length === 0) {
      return { breakdowns: [], candidates: [] };
    }

    const unitIds = units.map((u) => u.id);
    const relations = (await db.relation.findMany({
      where: {
        OR: [
          { sourceUnitId: { in: unitIds } },
          { targetUnitId: { in: unitIds } },
        ],
      },
      select: { sourceUnitId: true, targetUnitId: true, subtype: true },
    })) as RelationForMaturation[];

    const definitions = await db.unit.findMany({
      where: { projectId, unitType: "definition" },
      select: { content: true },
    });
    const definitionTerms = new Set<string>();
    for (const d of definitions) {
      for (const t of extractKeyTerms(d.content)) definitionTerms.add(t);
    }

    // Index incoming relations by target.
    const incoming = new Map<string, RelationForMaturation[]>();
    for (const r of relations) {
      if (!incoming.has(r.targetUnitId)) incoming.set(r.targetUnitId, []);
      incoming.get(r.targetUnitId)!.push(r);
    }

    const now = new Date();
    const breakdowns: MaturityBreakdown[] = [];
    const candidates: MaturationCandidate[] = [];

    for (const u of units) {
      const incomingRels = incoming.get(u.id) ?? [];

      const evidenceCount = incomingRels.filter(
        (r) => r.subtype && SUPPORTS_SUBTYPES.has(r.subtype),
      ).length;
      const counterCount = incomingRels.filter(
        (r) => r.subtype && CONTRADICTS_SUBTYPES.has(r.subtype),
      ).length;

      // Multi-evidence caps at 1.0 but partial credit for exactly 1.
      const evidence = evidenceCount === 0 ? 0 : evidenceCount >= 2 ? 1 : 0.6;
      const counter = counterCount === 0 ? 0 : 1;
      const hedging = hedgingComponent(u.content);
      const recency = recencyComponent(u.modifiedAt, now);

      const keyTerms = extractKeyTerms(u.content);
      const grounding =
        keyTerms.length === 0
          ? 1
          : keyTerms.filter((t) => definitionTerms.has(t)).length / keyTerms.length;

      const dims = { evidence, counter, hedging, recency, grounding };
      const score =
        (dims.evidence + dims.counter + dims.hedging + dims.recency + dims.grounding) / 5;

      // Find the weakest dimension (ties broken by fixed priority order).
      const ordered = Object.entries(dims).sort((a, b) => a[1] - b[1]);
      const weakest = ordered[0]![0] as keyof MaturityBreakdown["dimensions"];

      breakdowns.push({ unitId: u.id, score, dimensions: dims, weakest });

      if (score < threshold) {
        candidates.push({
          kind: "maturation",
          targetUnitId: u.id,
          contextId: opts.contextId,
          payload: {
            weakestDimension: weakest,
            suggestion: suggestionFor(weakest),
            currentScore: Math.round(score * 100) / 100,
          },
          rationale: `Maturation: ${weakest} is the weakest dimension (score ${score.toFixed(2)})`,
          // Priority boost scales inversely with score — weakest claims first.
          priority: Math.round((1 - score) * 100),
        });
      }
    }

    // Sort candidates by priority desc and cap at limit.
    candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return {
      breakdowns,
      candidates: candidates.slice(0, limit),
    };
  }

  return { evaluateProject };
}

function suggestionFor(
  weakest: keyof MaturityBreakdown["dimensions"],
): string {
  switch (weakest) {
    case "evidence":
      return "Attach a supporting evidence unit or external source to raise confidence.";
    case "counter":
      return "Draft a counterargument or dissenting perspective to stress-test the claim.";
    case "hedging":
      return "Absolutist language detected — soften with qualifiers (often, likely) or confidence scores.";
    case "recency":
      return "Claim has not been revised in a while — re-validate against current context.";
    case "grounding":
      return "Key terms lack formal definitions — add definition units to ground the claim.";
  }
}

export type MaturationEvaluatorService = ReturnType<
  typeof createMaturationEvaluatorService
>;
