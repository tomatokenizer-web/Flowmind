// ─── Epistemic Rules Service ──────────────────────────────────────────────
// Pure-function rules engine that checks AI outputs against cardinal
// epistemic rules. No AI calls — purely deterministic pattern matching.

// ─── Types ─────────────────────────────────────────────────────────

export type RuleViolation = {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  field?: string;
};

export type RuleCheckResult = {
  passed: boolean;
  violations: RuleViolation[];
  checkedRules: string[];
};

// ─── Cardinal Rules ────────────────────────────────────────────────

const CARDINAL_RULES = [
  "no_fabrication",
  "preserve_intent",
  "transparent_confidence",
  "adversarial_balance",
  "no_hidden_assumptions",
] as const;

// ─── Helpers ───────────────────────────────────────────────────────

const FABRICATION_PATTERNS = /\b(make\s+up|invent|fabricate|create\s+fake|forge|hallucinate)\b/i;
const DESTRUCTIVE_REWRITE_PATTERNS = /\b(replace\s+entirely|rewrite\s+completely|delete\s+original|overwrite\s+all|discard\s+original)\b/i;
const CERTAINTY_LANGUAGE = /\b(definitely|always|never|certainly|undoubtedly|absolutely|without\s+question|indisputably)\b/i;

function makeResult(violations: RuleViolation[], checkedRules: string[]): RuleCheckResult {
  return {
    passed: violations.filter((v) => v.severity === "error").length === 0,
    violations,
    checkedRules,
  };
}

// ─── Pre-Generation Check ──────────────────────────────────────────

/**
 * Validate a prompt BEFORE sending it to AI.
 * Catches requests for fabrication or destructive rewrites.
 */
function checkPreGeneration(prompt: string): RuleCheckResult {
  const violations: RuleViolation[] = [];
  const checked = ["no_fabrication", "preserve_intent"];

  if (FABRICATION_PATTERNS.test(prompt)) {
    violations.push({
      rule: "no_fabrication",
      severity: "error",
      message: "Prompt asks AI to fabricate or invent evidence. Rephrase to request analysis instead.",
      field: "prompt",
    });
  }

  if (DESTRUCTIVE_REWRITE_PATTERNS.test(prompt)) {
    violations.push({
      rule: "preserve_intent",
      severity: "warning",
      message: "Prompt requests complete replacement of original content. Consider preserving the original alongside AI output.",
      field: "prompt",
    });
  }

  return makeResult(violations, checked);
}

// ─── Post-Generation Check ─────────────────────────────────────────

/**
 * Validate an AI RESPONSE after generation.
 * Checks confidence transparency, adversarial balance, hidden assumptions, and AI flagging.
 */
function checkPostGeneration(
  response: unknown,
  context: { hasConfidence?: boolean; hasAiFlag?: boolean; unitCount?: number },
): RuleCheckResult {
  const violations: RuleViolation[] = [];
  const checked = [
    "transparent_confidence",
    "adversarial_balance",
    "no_hidden_assumptions",
    "no_fabrication",
  ];

  // transparent_confidence: warn if no confidence scores
  if (!context.hasConfidence) {
    violations.push({
      rule: "transparent_confidence",
      severity: "warning",
      message: "AI response has no confidence scores. Consider adding confidence metadata.",
    });
  }

  // adversarial_balance: check if only supporting relations
  if (response && typeof response === "object") {
    const json = JSON.stringify(response);
    const hasSupports = json.includes('"supports"');
    const hasContradicts = json.includes('"contradicts"') || json.includes('"opposes"');
    if (hasSupports && !hasContradicts) {
      violations.push({
        rule: "adversarial_balance",
        severity: "info",
        message: "Response contains only supporting evidence. Consider prompting for counterarguments.",
      });
    }
  }

  // no_hidden_assumptions: warn if many units but no assumption type
  if (context.unitCount !== undefined && context.unitCount > 5) {
    const json = typeof response === "object" ? JSON.stringify(response) : "";
    if (!json.includes('"assumption"')) {
      violations.push({
        rule: "no_hidden_assumptions",
        severity: "warning",
        message: `${context.unitCount} units generated without any assumption-type unit. Hidden assumptions may be unexamined.`,
      });
    }
  }

  // no_fabrication: warn if AI output not flagged
  if (!context.hasAiFlag) {
    violations.push({
      rule: "no_fabrication",
      severity: "warning",
      message: "AI output is not flagged as AI-generated. Add aiGenerated metadata.",
    });
  }

  return makeResult(violations, checked);
}

// ─── Structural Integrity Check ────────────────────────────────────

/**
 * Validate epistemic integrity of a set of units and relations.
 * Checks for unsupported claims, overconfident language, and circular reasoning.
 */
function validateEpistemicIntegrity(
  units: Array<{ unitType: string; content: string }>,
  relations: Array<{ subtype: string; sourceId?: string; targetId?: string }>,
): RuleCheckResult {
  const violations: RuleViolation[] = [];
  const checked = ["no_fabrication", "transparent_confidence", "no_hidden_assumptions"];

  // Check: claims should ideally have supporting evidence
  const claims = units.filter((u) => u.unitType === "claim");
  const hasEvidence = units.some((u) => u.unitType === "evidence");
  const hasSupportsRelation = relations.some(
    (r) => r.subtype === "supports" || r.subtype === "evidences",
  );
  if (claims.length > 0 && !hasEvidence && !hasSupportsRelation) {
    violations.push({
      rule: "no_fabrication",
      severity: "info",
      message: `${claims.length} claim(s) found without supporting evidence. Consider adding evidence units.`,
    });
  }

  // Check: certainty language in claims
  for (const unit of units) {
    if (CERTAINTY_LANGUAGE.test(unit.content)) {
      violations.push({
        rule: "transparent_confidence",
        severity: "warning",
        message: `Unit contains certainty language ("${unit.content.match(CERTAINTY_LANGUAGE)?.[0]}") that may indicate overconfidence.`,
        field: "content",
      });
    }
  }

  // Check: circular reasoning (A supports B supports A)
  if (relations.length > 1) {
    const graph = new Map<string, Set<string>>();
    for (const r of relations) {
      if ((r.subtype === "supports" || r.subtype === "evidences") && r.sourceId && r.targetId) {
        if (!graph.has(r.sourceId)) graph.set(r.sourceId, new Set());
        graph.get(r.sourceId)!.add(r.targetId);
      }
    }

    // Simple cycle detection via DFS
    for (const startNode of graph.keys()) {
      const visited = new Set<string>();
      const stack = [startNode];
      while (stack.length > 0) {
        const node = stack.pop()!;
        if (node === startNode && visited.size > 0) {
          violations.push({
            rule: "no_hidden_assumptions",
            severity: "warning",
            message: "Circular reasoning detected: a support chain loops back to its origin.",
          });
          break;
        }
        if (visited.has(node)) continue;
        visited.add(node);
        const neighbors = graph.get(node);
        if (neighbors) {
          for (const n of neighbors) stack.push(n);
        }
      }
    }
  }

  return makeResult(violations, checked);
}

// ─── Factory ───────────────────────────────────────────────────────

export function createEpistemicRulesService() {
  return {
    checkPreGeneration,
    checkPostGeneration,
    validateEpistemicIntegrity,
    CARDINAL_RULES,
  };
}

export type EpistemicRulesService = ReturnType<typeof createEpistemicRulesService>;
