import type { PrismaClient, PathType } from "@prisma/client";
import { createRelationService } from "./relationService";

// ─── Types ─────────────────────────────────────────────────────────

export type NavigatorStep = {
  unitId: string;
  position: number;
  annotation?: string;
};

export type RelationEdge = {
  sourceUnitId: string;
  targetUnitId: string;
  type: string;
  subtype?: string | null;
  strength: number;
  direction: string;
};

export type UnitSummary = {
  id: string;
  content: string;
  unitType: string;
  importance: number;
  createdAt: Date;
};

/**
 * Relation subtypes relevant for each path type, used to filter graph edges.
 * null = use all relations.
 */
const PATH_TYPE_RELATIONS: Record<PathType, string[] | null> = {
  // Group A — Logical / Argumentative
  argument: ["supports", "contradicts", "qualifies", "rebuts", "concedes", "elaboration"],
  trace_back: ["supports", "generalizes", "specializes", "elaboration"],
  contradiction_map: ["contradicts", "rebuts", "qualifies", "contrast"],
  synthesis_first: ["supports", "contradicts", "elaboration", "summary"],
  toulmin_validation: ["supports", "qualifies", "rebuts", "concedes", "elaboration", "condition"],

  // Group B — Exploratory / Generative
  discovery: null, // chronological, all relations
  question_anchored: ["answers", "questions_meta", "elaboration"],
  branch_explorer: ["inspires", "analogizes", "triggers", "related_to", "branches_from"],
  socratic: ["answers", "questions_meta", "elaboration", "presupposes" as string].filter(Boolean),
  gap_focused: null, // uses orphan detection

  // Group C — Analytical / Structural
  causal_chain: ["cause", "results_in", "enables_next", "condition", "preconditions"],
  evidence_gradient: ["supports", "exemplifies", "references"],
  uncertainty_gradient: ["supports", "qualifies", "contradicts"],
  conceptual_depth: ["generalizes", "specializes", "is_type_of", "is_part_of", "is_instance_of"],
  stakeholder_perspective: ["contrast", "qualifies", "parallels"],
  problem_solution: ["solutionhood", "condition", "evaluation", "means"],

  // Group D — Connective / Cross-Context
  cross_context: null, // cross-context bridge detection
  historical_evolution: ["revises", "supersedes", "precedes", "follows"],
  analogy_bridge: ["analogizes", "parallels", "inspires"],
  serendipity: null, // weighted random, includes low-salience
};

// ─── Semantic Importance Score ──────────────────────────────────────

export type ImportanceFactors = {
  betweennessCentrality: number;
  relationCount: number;
  certaintyWeight: number;
  recencyWeight: number;
  userDesignatedWeight: number;
};

/**
 * Compute semantic importance score for a unit within a path context.
 * Formula from spec: betweenness×0.40 + relations×0.20 + certainty×0.20 + recency×0.10 + user×0.10
 */
export function computeSemanticImportance(factors: ImportanceFactors): number {
  return (
    factors.betweennessCentrality * 0.40 +
    factors.relationCount * 0.20 +
    factors.certaintyWeight * 0.20 +
    factors.recencyWeight * 0.10 +
    factors.userDesignatedWeight * 0.10
  );
}

// ─── Path Generation Helpers ────────────────────────────────────────

const TYPE_PRIORITY: Record<string, number> = {
  supports: 4, contradicts: 3, qualifies: 2, rebuts: 3, concedes: 2,
  generalizes: 3, specializes: 3, operationalizes: 2, exemplifies: 3,
  elaboration: 2, cause: 4, condition: 2, contrast: 2, sequence: 3,
  purpose: 2, background: 1, evaluation: 2, summary: 2,
  is_type_of: 3, is_part_of: 3, is_instance_of: 2, contains: 2,
  precedes: 3, follows: 3, enables_next: 3, continues: 2,
  related_to: 1, inspires: 2, analogizes: 2, triggers: 2,
  references: 1, answers: 4, questions_meta: 3, revises: 3, supersedes: 4,
  branches_from: 2, results_in: 4, preconditions: 3, solutionhood: 3,
};

/**
 * Build a greedy path through a relation graph.
 * Traverses by weight (type priority × strength), avoiding revisits.
 */
export function buildGreedyPath(
  startId: string,
  relations: RelationEdge[],
  allowedTypes: string[] | null,
  maxSteps = 30,
): string[] {
  type Edge = { target: string; weight: number };
  const adj = new Map<string, Edge[]>();

  for (const r of relations) {
    if (allowedTypes && !allowedTypes.includes(r.type) && !allowedTypes.includes(r.subtype ?? "")) continue;

    const typePriority = TYPE_PRIORITY[r.subtype ?? r.type] ?? 1;
    const weight = typePriority * r.strength;

    if (!adj.has(r.sourceUnitId)) adj.set(r.sourceUnitId, []);
    adj.get(r.sourceUnitId)!.push({ target: r.targetUnitId, weight });

    if (!adj.has(r.targetUnitId)) adj.set(r.targetUnitId, []);
    adj.get(r.targetUnitId)!.push({ target: r.sourceUnitId, weight: weight * 0.6 });
  }

  const path: string[] = [startId];
  const visited = new Set<string>([startId]);
  let current = startId;

  for (let i = 0; i < maxSteps; i++) {
    const neighbors = adj.get(current) ?? [];
    const unvisited = neighbors
      .filter((e) => !visited.has(e.target))
      .sort((a, b) => b.weight - a.weight);

    if (unvisited.length === 0) break;
    const next = unvisited[0]!;
    path.push(next.target);
    visited.add(next.target);
    current = next.target;
  }

  return path;
}

/**
 * Find the hub unit — the most connected node in a set of relations.
 */
function findHub(relations: RelationEdge[], fallbackId: string): string {
  const counts = new Map<string, number>();
  for (const r of relations) {
    counts.set(r.sourceUnitId, (counts.get(r.sourceUnitId) ?? 0) + 1);
    counts.set(r.targetUnitId, (counts.get(r.targetUnitId) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallbackId;
}

/**
 * Compute betweenness centrality approximation using BFS from sampled sources.
 */
function computeBetweenness(
  unitIds: string[],
  relations: RelationEdge[],
): Map<string, number> {
  const adj = new Map<string, string[]>();
  for (const r of relations) {
    if (!adj.has(r.sourceUnitId)) adj.set(r.sourceUnitId, []);
    adj.get(r.sourceUnitId)!.push(r.targetUnitId);
    if (!adj.has(r.targetUnitId)) adj.set(r.targetUnitId, []);
    adj.get(r.targetUnitId)!.push(r.sourceUnitId);
  }

  const centrality = new Map<string, number>();
  for (const id of unitIds) centrality.set(id, 0);

  // Sample up to 20 sources for BFS
  const sources = unitIds.slice(0, Math.min(20, unitIds.length));

  for (const source of sources) {
    const queue: string[] = [source];
    const dist = new Map<string, number>([[source, 0]]);
    const paths = new Map<string, number>([[source, 1]]);
    const order: string[] = [];

    // BFS forward pass
    while (queue.length > 0) {
      const v = queue.shift()!;
      order.push(v);
      const d = dist.get(v)!;
      for (const w of adj.get(v) ?? []) {
        if (!dist.has(w)) {
          dist.set(w, d + 1);
          paths.set(w, 0);
          queue.push(w);
        }
        if (dist.get(w) === d + 1) {
          paths.set(w, (paths.get(w) ?? 0) + (paths.get(v) ?? 0));
        }
      }
    }

    // Backward accumulation
    const delta = new Map<string, number>();
    for (const id of unitIds) delta.set(id, 0);

    while (order.length > 0) {
      const w = order.pop()!;
      for (const v of adj.get(w) ?? []) {
        if (dist.get(v) === (dist.get(w) ?? 0) - 1) {
          const contribution = ((paths.get(v) ?? 0) / (paths.get(w) ?? 1)) * (1 + (delta.get(w) ?? 0));
          delta.set(v, (delta.get(v) ?? 0) + contribution);
        }
      }
      if (w !== source) {
        centrality.set(w, (centrality.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
  }

  // Normalize to [0, 1]
  const max = Math.max(...centrality.values(), 1);
  for (const [k, v] of centrality) centrality.set(k, v / max);

  return centrality;
}

// ─── Service ────────────────────────────────────────────────────────

export function createNavigatorService(db: PrismaClient) {
  const relationService = createRelationService(db);

  /**
   * Fetch all relations between a set of units, optionally filtered by subtype.
   */
  async function getRelations(unitIds: string[], allowedSubtypes: string[] | null): Promise<RelationEdge[]> {
    const relations = await db.relation.findMany({
      where: {
        OR: [
          { sourceUnitId: { in: unitIds } },
          { targetUnitId: { in: unitIds } },
        ],
      },
      select: {
        sourceUnitId: true,
        targetUnitId: true,
        type: true,
        subtype: true,
        strength: true,
        direction: true,
      },
    });

    if (!allowedSubtypes) return relations as RelationEdge[];

    return (relations as RelationEdge[]).filter(
      (r) => allowedSubtypes.includes(r.type) || allowedSubtypes.includes(r.subtype ?? ""),
    );
  }

  /**
   * Get units for a context or project.
   */
  async function getUnits(
    contextId?: string,
    projectId?: string,
  ): Promise<UnitSummary[]> {
    if (contextId) {
      const unitContexts = await db.unitContext.findMany({
        where: { contextId },
        select: { unitId: true },
      });
      const unitIds = unitContexts.map((uc) => uc.unitId);
      if (unitIds.length === 0) return [];
      return db.unit.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, content: true, unitType: true, importance: true, createdAt: true },
      }) as Promise<UnitSummary[]>;
    }
    if (projectId) {
      return db.unit.findMany({
        where: { projectId },
        select: { id: true, content: true, unitType: true, importance: true, createdAt: true },
      }) as Promise<UnitSummary[]>;
    }
    return [];
  }

  /**
   * Generate a path for a specific path type.
   * Returns ordered unit IDs suitable for path/steps fields.
   */
  async function generatePath(
    pathType: PathType,
    contextId: string,
    projectId?: string,
    startUnitId?: string,
  ): Promise<{ path: string[]; steps: NavigatorStep[]; entryPoint: string }> {
    const units = await getUnits(contextId, projectId);
    if (units.length < 2) {
      return { path: [], steps: [], entryPoint: "" };
    }

    const unitIds = units.map((u) => u.id);
    const unitMap = new Map(units.map((u) => [u.id, u]));
    const allowedTypes = PATH_TYPE_RELATIONS[pathType];
    const relations = await getRelations(unitIds, allowedTypes);

    let orderedIds: string[];

    switch (pathType) {
      // ── Chronological / Discovery ───────────────────────────────
      case "discovery": {
        orderedIds = [...units]
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((u) => u.id);
        break;
      }

      // ── Historical Evolution: follow revises/supersedes chain ──
      case "historical_evolution": {
        const revisionRels = relations.filter(
          (r) => ["revises", "supersedes", "precedes", "follows"].includes(r.subtype ?? r.type),
        );
        if (revisionRels.length === 0) {
          orderedIds = [...units].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((u) => u.id);
        } else {
          const start = startUnitId ?? findHub(revisionRels, unitIds[0]!);
          orderedIds = buildGreedyPath(start, revisionRels, null);
        }
        break;
      }

      // ── Evidence Gradient: sort by importance (proxy for evidence strength) ──
      case "evidence_gradient": {
        const evidenceUnits = units.filter((u) => ["evidence", "example", "observation"].includes(u.unitType));
        const otherUnits = units.filter((u) => !["evidence", "example", "observation"].includes(u.unitType));
        orderedIds = [
          ...evidenceUnits.sort((a, b) => a.importance - b.importance),
          ...otherUnits.sort((a, b) => b.importance - a.importance),
        ].map((u) => u.id);
        break;
      }

      // ── Uncertainty Gradient: speculative → certain ──
      case "uncertainty_gradient": {
        orderedIds = [...units]
          .sort((a, b) => a.importance - b.importance)
          .map((u) => u.id);
        break;
      }

      // ── Serendipity: weighted random including low-salience units ──
      case "serendipity": {
        const shuffled = [...units];
        // Fisher-Yates with importance-biased swap probability
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
        }
        orderedIds = shuffled.map((u) => u.id);
        break;
      }

      // ── Gap-Focused: orphan and low-relation units first ──
      case "gap_focused": {
        const relCounts = new Map<string, number>();
        for (const id of unitIds) relCounts.set(id, 0);
        for (const r of relations) {
          relCounts.set(r.sourceUnitId, (relCounts.get(r.sourceUnitId) ?? 0) + 1);
          relCounts.set(r.targetUnitId, (relCounts.get(r.targetUnitId) ?? 0) + 1);
        }
        orderedIds = [...units]
          .sort((a, b) => (relCounts.get(a.id) ?? 0) - (relCounts.get(b.id) ?? 0))
          .map((u) => u.id);
        break;
      }

      // ── Question-Anchored: questions first, then answers ──
      case "question_anchored": {
        const questions = units.filter((u) => u.unitType === "question");
        const nonQuestions = units.filter((u) => u.unitType !== "question");
        orderedIds = [...questions, ...nonQuestions].map((u) => u.id);
        break;
      }

      // ── Conceptual Depth: high abstraction → specific ──
      case "conceptual_depth": {
        // Use relation count as proxy for abstraction (more connections = more abstract)
        const relCounts = new Map<string, number>();
        for (const id of unitIds) relCounts.set(id, 0);
        for (const r of relations) {
          relCounts.set(r.sourceUnitId, (relCounts.get(r.sourceUnitId) ?? 0) + 1);
          relCounts.set(r.targetUnitId, (relCounts.get(r.targetUnitId) ?? 0) + 1);
        }
        orderedIds = [...units]
          .sort((a, b) => (relCounts.get(b.id) ?? 0) - (relCounts.get(a.id) ?? 0))
          .map((u) => u.id);
        break;
      }

      // ── Argument Chain: claim hub → supporting evidence → counter ──
      case "argument": {
        const claims = units.filter((u) => ["claim", "counterargument"].includes(u.unitType));
        const evidence = units.filter((u) => ["evidence", "example"].includes(u.unitType));
        const rest = units.filter((u) => !["claim", "counterargument", "evidence", "example"].includes(u.unitType));
        orderedIds = [...claims.sort((a, b) => b.importance - a.importance), ...evidence, ...rest].map((u) => u.id);
        break;
      }

      // ── Trace Back: start from conclusion, follow supports backward ──
      case "trace_back": {
        const start = startUnitId ?? units.sort((a, b) => b.importance - a.importance)[0]?.id ?? unitIds[0]!;
        // Reverse the greedy path (conclusion → premises)
        const forward = buildGreedyPath(start, relations, allowedTypes);
        orderedIds = forward.reverse();
        break;
      }

      // ── Contradiction Map: pair contradicting units ──
      case "contradiction_map": {
        const contradictRels = relations.filter((r) => ["contradicts", "rebuts", "qualifies"].includes(r.subtype ?? r.type));
        const paired: string[] = [];
        const seen = new Set<string>();
        for (const r of contradictRels) {
          if (!seen.has(r.sourceUnitId)) { paired.push(r.sourceUnitId); seen.add(r.sourceUnitId); }
          if (!seen.has(r.targetUnitId)) { paired.push(r.targetUnitId); seen.add(r.targetUnitId); }
        }
        // Add remaining units not in contradictions
        const remaining = unitIds.filter((id) => !seen.has(id));
        orderedIds = [...paired, ...remaining];
        break;
      }

      // ── Synthesis First: conclusions/summaries first, then supporting ──
      case "synthesis_first": {
        const synthTypes = ["claim", "interpretation", "decision"];
        const synth = units.filter((u) => synthTypes.includes(u.unitType));
        const support = units.filter((u) => !synthTypes.includes(u.unitType));
        orderedIds = [
          ...synth.sort((a, b) => b.importance - a.importance),
          ...support.sort((a, b) => b.importance - a.importance),
        ].map((u) => u.id);
        break;
      }

      // ── Toulmin Validation: claim → grounds → warrant → backing → qualifier → rebuttal ──
      case "toulmin_validation": {
        const toulminOrder: Record<string, number> = {
          claim: 0, evidence: 1, assumption: 2, example: 3, definition: 4, counterargument: 5, question: 6,
        };
        orderedIds = [...units]
          .sort((a, b) => (toulminOrder[a.unitType] ?? 99) - (toulminOrder[b.unitType] ?? 99))
          .map((u) => u.id);
        break;
      }

      // ── Branch Explorer: hub first, then explore each branch ──
      case "branch_explorer": {
        if (relations.length === 0) {
          orderedIds = units.map((u) => u.id);
        } else {
          const hub = startUnitId ?? findHub(relations, unitIds[0]!);
          // BFS from hub to explore breadth-first
          const queue = [hub];
          const visited = new Set([hub]);
          const result = [hub];
          const adj = new Map<string, string[]>();
          for (const r of relations) {
            if (!adj.has(r.sourceUnitId)) adj.set(r.sourceUnitId, []);
            adj.get(r.sourceUnitId)!.push(r.targetUnitId);
            if (!adj.has(r.targetUnitId)) adj.set(r.targetUnitId, []);
            adj.get(r.targetUnitId)!.push(r.sourceUnitId);
          }
          while (queue.length > 0) {
            const v = queue.shift()!;
            for (const w of adj.get(v) ?? []) {
              if (!visited.has(w)) {
                visited.add(w);
                result.push(w);
                queue.push(w);
              }
            }
          }
          // Add any isolated nodes
          for (const id of unitIds) if (!visited.has(id)) result.push(id);
          orderedIds = result;
        }
        break;
      }

      // ── Socratic: alternate questions and answers ──
      case "socratic": {
        const questions = units.filter((u) => u.unitType === "question");
        const answers = units.filter((u) => u.unitType !== "question");
        const interleaved: UnitSummary[] = [];
        const maxLen = Math.max(questions.length, answers.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < questions.length) interleaved.push(questions[i]!);
          if (i < answers.length) interleaved.push(answers[i]!);
        }
        orderedIds = interleaved.map((u) => u.id);
        break;
      }

      // ── Causal Chain: follow cause/results_in edges ──
      case "causal_chain": {
        const causalRels = relations.filter((r) => ["cause", "results_in", "enables_next", "condition"].includes(r.subtype ?? r.type));
        if (causalRels.length === 0) {
          orderedIds = units.map((u) => u.id);
        } else {
          // Find root cause (node with no incoming causal edges)
          const hasIncoming = new Set(causalRels.map((r) => r.targetUnitId));
          const roots = unitIds.filter((id) => !hasIncoming.has(id));
          const start = startUnitId ?? roots[0] ?? findHub(causalRels, unitIds[0]!);
          orderedIds = buildGreedyPath(start, causalRels, null);
        }
        break;
      }

      // ── Stakeholder Perspective: group by contrasting viewpoints ──
      case "stakeholder_perspective": {
        const contrastRels = relations.filter((r) => ["contrast", "qualifies", "parallels"].includes(r.subtype ?? r.type));
        if (contrastRels.length === 0) {
          orderedIds = units.map((u) => u.id);
        } else {
          const start = startUnitId ?? findHub(contrastRels, unitIds[0]!);
          orderedIds = buildGreedyPath(start, contrastRels, null);
        }
        break;
      }

      // ── Problem-Solution: problems first, then solutions ──
      case "problem_solution": {
        const problemTypes = ["question", "observation", "assumption"];
        const solutionTypes = ["claim", "action", "decision", "idea"];
        const problems = units.filter((u) => problemTypes.includes(u.unitType));
        const solutions = units.filter((u) => solutionTypes.includes(u.unitType));
        const rest = units.filter((u) => !problemTypes.includes(u.unitType) && !solutionTypes.includes(u.unitType));
        orderedIds = [...problems, ...solutions, ...rest].map((u) => u.id);
        break;
      }

      // ── Cross-Context: units appearing in multiple contexts first ──
      case "cross_context": {
        // Without context data, fall back to importance-based ordering
        orderedIds = [...units]
          .sort((a, b) => b.importance - a.importance)
          .map((u) => u.id);
        break;
      }

      // ── Analogy Bridge: follow analogy/parallel edges ──
      case "analogy_bridge": {
        const analogyRels = relations.filter((r) => ["analogizes", "parallels", "inspires"].includes(r.subtype ?? r.type));
        if (analogyRels.length === 0) {
          orderedIds = units.map((u) => u.id);
        } else {
          const start = startUnitId ?? findHub(analogyRels, unitIds[0]!);
          orderedIds = buildGreedyPath(start, analogyRels, null);
        }
        break;
      }

      // ── All other types: greedy walk with type-appropriate relations ──
      default: {
        if (relations.length === 0) {
          orderedIds = units.map((u) => u.id);
        } else {
          const start = startUnitId ?? findHub(relations, unitIds[0]!);
          orderedIds = buildGreedyPath(start, relations, null);
        }
        break;
      }
    }

    // Limit to 30 steps max
    orderedIds = orderedIds.slice(0, 30);

    const steps: NavigatorStep[] = orderedIds.map((id, i) => ({
      unitId: id,
      position: i,
    }));

    return {
      path: orderedIds,
      steps,
      entryPoint: orderedIds[0] ?? "",
    };
  }

  /**
   * Compute semantic importance scores for units within a context.
   */
  async function computeImportanceScores(
    contextId: string,
  ): Promise<Map<string, number>> {
    const units = await getUnits(contextId);
    if (units.length === 0) return new Map();

    const unitIds = units.map((u) => u.id);
    const relations = await getRelations(unitIds, null);

    // Betweenness centrality
    const betweenness = computeBetweenness(unitIds, relations);

    // Relation count normalized
    const relCounts = new Map<string, number>();
    for (const id of unitIds) relCounts.set(id, 0);
    for (const r of relations) {
      relCounts.set(r.sourceUnitId, (relCounts.get(r.sourceUnitId) ?? 0) + 1);
      relCounts.set(r.targetUnitId, (relCounts.get(r.targetUnitId) ?? 0) + 1);
    }
    const maxRels = Math.max(...relCounts.values(), 1);

    // Recency weight: newer = higher
    const now = Date.now();
    const maxAge = Math.max(
      ...units.map((u) => now - u.createdAt.getTime()),
      1,
    );

    const scores = new Map<string, number>();
    for (const unit of units) {
      const recency = 1 - (now - unit.createdAt.getTime()) / maxAge;
      const score = computeSemanticImportance({
        betweennessCentrality: betweenness.get(unit.id) ?? 0,
        relationCount: (relCounts.get(unit.id) ?? 0) / maxRels,
        certaintyWeight: unit.importance, // using stored importance as proxy
        recencyWeight: recency,
        userDesignatedWeight: unit.importance > 0.7 ? 1 : 0,
      });
      scores.set(unit.id, Math.round(score * 100) / 100);
    }

    return scores;
  }

  /**
   * Create a navigator with a generated path.
   */
  async function createWithPath(input: {
    name: string;
    description?: string;
    pathType: PathType;
    contextId: string;
    projectId?: string;
    startUnitId?: string;
    aiGenerated?: boolean;
  }) {
    const { path, steps } = await generatePath(
      input.pathType,
      input.contextId,
      input.projectId,
      input.startUnitId,
    );

    return db.navigator.create({
      data: {
        name: input.name,
        description: input.description,
        pathType: input.pathType,
        contextId: input.contextId,
        path,
        steps: steps as unknown as import("@prisma/client").Prisma.InputJsonValue,
        aiGenerated: input.aiGenerated ?? false,
        metadata: { entryPoint: path[0] },
      },
    });
  }

  return {
    generatePath,
    computeImportanceScores,
    computeSemanticImportance,
    createWithPath,
    buildGreedyPath,
    getRelations,
    getUnits,
    findHub,
  };
}

export type NavigatorService = ReturnType<typeof createNavigatorService>;
