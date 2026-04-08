import type { PrismaClient } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

export type CompassDimension = {
  name: string;
  label: string;
  score: number;
  numerator: number;
  denominator: number;
  gaps: string[];
};

export type CompassResult = {
  overall: number;
  dimensions: CompassDimension[];
  suggestions: string[];
};

type UnitRow = {
  id: string;
  content: string;
  unitType: string;
  lifecycle: string;
};

type RelationRow = {
  sourceUnitId: string;
  targetUnitId: string;
  subtype: string | null;
};

export type CompassService = ReturnType<typeof createCompassService>;

// ─── Constants ─────────────────────────────────────────────────────

const CLAIM_TYPES = new Set(["claim"]);
const EVIDENCE_TYPES = new Set(["evidence"]);
const DEFINITION_TYPES = new Set(["definition"]);
const ASSUMPTION_TYPES = new Set(["assumption"]);
const QUESTION_TYPES = new Set(["question"]);

const SUPPORTS_SUBTYPES = new Set(["supports"]);
const CONTRADICTS_SUBTYPES = new Set(["contradicts", "rebuts"]);
const DEFINES_SUBTYPES = new Set(["elaboration", "is_type_of", "is_instance_of"]);
const ASSUMES_SUBTYPES = new Set(["depends_on", "preconditions", "requires"]);
const ANSWERS_SUBTYPES = new Set(["answers"]);

const LIFECYCLE_STAGES = [
  "draft", "pending", "confirmed", "deferred", "complete", "archived", "discarded",
];

const MAX_GAPS = 3;
const CONTENT_TRUNCATE = 50;

const DIMENSION_WEIGHTS: Record<string, number> = {
  evidence_coverage: 0.25,
  counter_argument_coverage: 0.15,
  definition_coverage: 0.15,
  assumption_surfacing: 0.15,
  question_resolution: 0.15,
  scope_balance: 0.15,
};

// ─── Helpers ───────────────────────────────────────────────────────

function truncate(s: string, maxLen: number): string {
  return s.length <= maxLen ? s : s.slice(0, maxLen) + "...";
}

function shannonEntropy(counts: number[], total: number): number {
  if (total === 0) return 0;
  const numCategories = counts.filter((c) => c > 0).length;
  if (numCategories <= 1) return 0;
  let h = 0;
  for (const count of counts) {
    if (count === 0) continue;
    const p = count / total;
    h -= p * Math.log2(p);
  }
  const maxH = Math.log2(LIFECYCLE_STAGES.length);
  return maxH === 0 ? 0 : (h / maxH) * 100;
}

function buildDimension(
  name: string,
  label: string,
  numerator: number,
  denominator: number,
  gaps: string[],
): CompassDimension {
  const score = denominator === 0 ? 100 : Math.round((numerator / denominator) * 100);
  return { name, label, score, numerator, denominator, gaps: gaps.slice(0, MAX_GAPS) };
}

function generateSuggestions(dimensions: CompassDimension[]): string[] {
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const suggestions: string[] = [];

  for (const dim of sorted.slice(0, 2)) {
    if (dim.score >= 100) continue;

    switch (dim.name) {
      case "evidence_coverage":
        suggestions.push(
          `Add supporting evidence to ${dim.denominator - dim.numerator} unsupported claim(s).`,
        );
        break;
      case "counter_argument_coverage":
        suggestions.push(
          `Consider counter-arguments for ${dim.denominator - dim.numerator} claim(s) that lack opposing views.`,
        );
        break;
      case "definition_coverage":
        suggestions.push(
          `Define ${dim.denominator - dim.numerator} frequently-used concept(s) that lack formal definitions.`,
        );
        break;
      case "assumption_surfacing":
        suggestions.push(
          `Surface implicit assumptions for ${dim.denominator - dim.numerator} claim(s) — each claim likely rests on unstated premises.`,
        );
        break;
      case "question_resolution":
        suggestions.push(
          `Resolve ${dim.denominator - dim.numerator} open question(s) by adding answers or evidence.`,
        );
        break;
      case "scope_balance":
        suggestions.push(
          "Diversify unit lifecycle stages — consider maturing drafts or revisiting deferred items.",
        );
        break;
    }
  }

  return suggestions.slice(0, 3);
}

// ─── Service Factory ───────────────────────────────────────────────

export function createCompassService(db: PrismaClient) {
  async function calculateCompass(
    projectId: string,
    contextId?: string,
  ): Promise<CompassResult> {
    // ── Load units ──────────────────────────────────────────────
    const unitWhere: Parameters<typeof db.unit.findMany>[0] = contextId
      ? {
          where: {
            projectId,
            unitContexts: { some: { contextId } },
          },
          select: { id: true, content: true, unitType: true, lifecycle: true },
        }
      : {
          where: { projectId },
          select: { id: true, content: true, unitType: true, lifecycle: true },
        };

    const units = (await db.unit.findMany(unitWhere)) as unknown as UnitRow[];
    const unitIds = new Set(units.map((u) => u.id));

    // ── Load relations scoped to these units ────────────────────
    const relations = (await db.relation.findMany({
      where: {
        sourceUnitId: { in: [...unitIds] },
        targetUnitId: { in: [...unitIds] },
      },
      select: { sourceUnitId: true, targetUnitId: true, subtype: true },
    })) as unknown as RelationRow[];

    // ── Index data ──────────────────────────────────────────────
    const unitById = new Map(units.map((u) => [u.id, u]));
    const claims = units.filter((u) => CLAIM_TYPES.has(u.unitType));
    const questions = units.filter((u) => QUESTION_TYPES.has(u.unitType));
    const concepts = units.filter((u) => DEFINITION_TYPES.has(u.unitType));

    // Build relation lookup: targetUnitId -> set of subtypes pointing at it
    const incomingSubtypes = new Map<string, Set<string>>();
    // Build relation lookup: sourceUnitId -> set of subtypes from it
    const outgoingSubtypes = new Map<string, Set<string>>();

    for (const rel of relations) {
      if (rel.subtype) {
        if (!incomingSubtypes.has(rel.targetUnitId)) {
          incomingSubtypes.set(rel.targetUnitId, new Set());
        }
        incomingSubtypes.get(rel.targetUnitId)!.add(rel.subtype);

        if (!outgoingSubtypes.has(rel.sourceUnitId)) {
          outgoingSubtypes.set(rel.sourceUnitId, new Set());
        }
        outgoingSubtypes.get(rel.sourceUnitId)!.add(rel.subtype);
      }
    }

    // Also check: for "supports" from evidence -> claim, the claim is the target
    // For "contradicts"/"rebuts" -> claim, the claim is the target
    // For "answers" -> question, the question is the target
    // For "depends_on" -> assumption from claim, the claim is the source

    // ── 1. Evidence Coverage ────────────────────────────────────
    const claimsWithEvidence = claims.filter((c) => {
      const subs = incomingSubtypes.get(c.id);
      return subs && [...subs].some((s) => SUPPORTS_SUBTYPES.has(s));
    });
    const evidenceGaps = claims
      .filter((c) => {
        const subs = incomingSubtypes.get(c.id);
        return !subs || ![...subs].some((s) => SUPPORTS_SUBTYPES.has(s));
      })
      .map((c) => `Claim "${truncate(c.content, CONTENT_TRUNCATE)}" has no supporting evidence`);

    const evidenceDim = buildDimension(
      "evidence_coverage",
      "Evidence Coverage",
      claimsWithEvidence.length,
      claims.length,
      evidenceGaps,
    );

    // ── 2. Counter-Argument Coverage ────────────────────────────
    const claimsWithCounter = claims.filter((c) => {
      const subs = incomingSubtypes.get(c.id);
      return subs && [...subs].some((s) => CONTRADICTS_SUBTYPES.has(s));
    });
    const counterGaps = claims
      .filter((c) => {
        const subs = incomingSubtypes.get(c.id);
        return !subs || ![...subs].some((s) => CONTRADICTS_SUBTYPES.has(s));
      })
      .map((c) => `Claim "${truncate(c.content, CONTENT_TRUNCATE)}" has no counter-arguments`);

    const counterDim = buildDimension(
      "counter_argument_coverage",
      "Counter-Argument Coverage",
      claimsWithCounter.length,
      claims.length,
      counterGaps,
    );

    // ── 3. Definition Coverage ──────────────────────────────────
    // Find concept/definition units that appear 3+ times as relation targets
    // (i.e., units frequently referenced). If no definition-type units exist,
    // fall back to checking which units have a defines-type relation incoming.
    const conceptsNeedingDefinition = concepts.length > 0
      ? concepts
      : units.filter((u) => {
          // Count how many relations target this unit
          const incoming = relations.filter((r) => r.targetUnitId === u.id);
          return incoming.length >= 3;
        });

    const conceptsWithDefinition = conceptsNeedingDefinition.filter((c) => {
      const subs = incomingSubtypes.get(c.id);
      if (subs && [...subs].some((s) => DEFINES_SUBTYPES.has(s))) return true;
      // Also check outgoing: definition unit -> defines -> concept
      const out = outgoingSubtypes.get(c.id);
      return out && [...out].some((s) => DEFINES_SUBTYPES.has(s));
    });
    const defGaps = conceptsNeedingDefinition
      .filter((c) => {
        const subs = incomingSubtypes.get(c.id);
        const out = outgoingSubtypes.get(c.id);
        const hasIncoming = subs && [...subs].some((s) => DEFINES_SUBTYPES.has(s));
        const hasOutgoing = out && [...out].some((s) => DEFINES_SUBTYPES.has(s));
        return !hasIncoming && !hasOutgoing;
      })
      .map((c) => `"${truncate(c.content, CONTENT_TRUNCATE)}" lacks a formal definition`);

    const definitionDim = buildDimension(
      "definition_coverage",
      "Definition Coverage",
      conceptsWithDefinition.length,
      conceptsNeedingDefinition.length,
      defGaps,
    );

    // ── 4. Assumption Surfacing ─────────────────────────────────
    // Heuristic: each claim likely has ~1 implicit assumption
    const claimsWithAssumption = claims.filter((c) => {
      const out = outgoingSubtypes.get(c.id);
      if (out && [...out].some((s) => ASSUMES_SUBTYPES.has(s))) return true;
      const inc = incomingSubtypes.get(c.id);
      return inc && [...inc].some((s) => ASSUMES_SUBTYPES.has(s));
    });
    const assumptionGaps = claims
      .filter((c) => {
        const out = outgoingSubtypes.get(c.id);
        const inc = incomingSubtypes.get(c.id);
        const hasOut = out && [...out].some((s) => ASSUMES_SUBTYPES.has(s));
        const hasInc = inc && [...inc].some((s) => ASSUMES_SUBTYPES.has(s));
        return !hasOut && !hasInc;
      })
      .map((c) => `Claim "${truncate(c.content, CONTENT_TRUNCATE)}" has no surfaced assumptions`);

    const assumptionDim = buildDimension(
      "assumption_surfacing",
      "Assumption Surfacing",
      claimsWithAssumption.length,
      claims.length,
      assumptionGaps,
    );

    // ── 5. Question Resolution ──────────────────────────────────
    const resolvedQuestions = questions.filter((q) => {
      const subs = incomingSubtypes.get(q.id);
      return subs && [...subs].some((s) => ANSWERS_SUBTYPES.has(s));
    });
    const questionGaps = questions
      .filter((q) => {
        const subs = incomingSubtypes.get(q.id);
        return !subs || ![...subs].some((s) => ANSWERS_SUBTYPES.has(s));
      })
      .map((q) => `Question "${truncate(q.content, CONTENT_TRUNCATE)}" is unresolved`);

    const questionDim = buildDimension(
      "question_resolution",
      "Question Resolution",
      resolvedQuestions.length,
      questions.length,
      questionGaps,
    );

    // ── 6. Scope Balance (entropy) ──────────────────────────────
    const lifecycleCounts = LIFECYCLE_STAGES.map(
      (stage) => units.filter((u) => u.lifecycle === stage).length,
    );
    const entropyScore = Math.round(shannonEntropy(lifecycleCounts, units.length));
    const nonEmptyStages = lifecycleCounts.filter((c) => c > 0).length;
    const scopeGaps: string[] = [];
    if (nonEmptyStages <= 2 && units.length > 0) {
      scopeGaps.push(
        `Units are concentrated in ${nonEmptyStages} lifecycle stage(s) — consider diversifying`,
      );
    }
    const emptyStages = LIFECYCLE_STAGES.filter(
      (_, i) => lifecycleCounts[i] === 0,
    );
    if (emptyStages.length > 0 && units.length > 0) {
      scopeGaps.push(
        `No units in: ${emptyStages.slice(0, 3).join(", ")}`,
      );
    }

    const scopeDim: CompassDimension = {
      name: "scope_balance",
      label: "Scope Balance",
      score: entropyScore,
      numerator: nonEmptyStages,
      denominator: LIFECYCLE_STAGES.length,
      gaps: scopeGaps.slice(0, MAX_GAPS),
    };

    // ── Aggregate ───────────────────────────────────────────────
    const dimensions = [
      evidenceDim,
      counterDim,
      definitionDim,
      assumptionDim,
      questionDim,
      scopeDim,
    ];

    const overall = Math.round(
      dimensions.reduce(
        (sum, d) => sum + d.score * (DIMENSION_WEIGHTS[d.name] ?? 0),
        0,
      ),
    );

    const suggestions = generateSuggestions(dimensions);

    return { overall, dimensions, suggestions };
  }

  return { calculateCompass };
}
