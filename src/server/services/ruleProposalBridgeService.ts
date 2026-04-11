import type { PrismaClient } from "@prisma/client";
import { createEpistemicRulesService, type RuleViolation } from "@/server/services/epistemicRulesService";
import { createProactiveSchedulerService, type Candidate } from "@/server/services/proactiveSchedulerService";

// ─── Rules → Proposal Bridge ───────────────────────────────────────
//
// Per DEC-2026-002 §10: The Epistemic Rules Engine is a pure function
// that can ONLY produce Proposals. It never writes Units/Relations
// directly. When the engine detects a fixable violation, the bridge
// converts that violation into a `rule_action` Proposal candidate
// and hands it to the ProactiveScheduler for budgeted surfacing.

// ─── Types ─────────────────────────────────────────────────────────

export interface UnitForScan {
  id: string;
  unitType: string;
  content: string;
}

export interface RelationForScan {
  subtype: string;
  sourceId?: string;
  targetId?: string;
}

export interface RuleActionPayload {
  rule: string;
  severity: RuleViolation["severity"];
  action:
    | "add_confidence"
    | "add_counterargument"
    | "add_evidence"
    | "soften_certainty"
    | "add_assumption_disclosure"
    | "break_cycle";
  targetUnitId?: string;
  suggestion: string;
}

export interface ScanAndProposeOptions {
  projectId?: string;
  contextId?: string;
  /** Daily budget override — defaults to scheduler's DEFAULT_DAILY_BUDGET. */
  dailyBudget?: number;
  /** If true, do not persist proposals — just return what would be surfaced. */
  dryRun?: boolean;
}

// ─── Action Mapping ────────────────────────────────────────────────

/**
 * Map rule violations to proposal actions.
 * Returns null if the violation is not actionable (e.g. info-only metadata).
 */
function violationToAction(
  violation: RuleViolation,
  targetUnitId?: string,
): RuleActionPayload | null {
  switch (violation.rule) {
    case "transparent_confidence":
      // "certainty language" detected → propose softening; otherwise → add confidence
      if (/certainty language/i.test(violation.message)) {
        return {
          rule: violation.rule,
          severity: violation.severity,
          action: "soften_certainty",
          targetUnitId,
          suggestion:
            "This unit contains absolutist language. Consider hedging (e.g., 'often', 'likely') or adding a confidence score.",
        };
      }
      return {
        rule: violation.rule,
        severity: violation.severity,
        action: "add_confidence",
        targetUnitId,
        suggestion: "Add a confidence score or uncertainty note to this unit.",
      };

    case "adversarial_balance":
      return {
        rule: violation.rule,
        severity: violation.severity,
        action: "add_counterargument",
        targetUnitId,
        suggestion:
          "No counterargument found. Consider drafting a counter-unit or dissenting perspective.",
      };

    case "no_fabrication":
      // info: claims without evidence
      return {
        rule: violation.rule,
        severity: violation.severity,
        action: "add_evidence",
        targetUnitId,
        suggestion: "This claim lacks supporting evidence. Attach an evidence unit or source.",
      };

    case "no_hidden_assumptions":
      if (/circular reasoning/i.test(violation.message)) {
        return {
          rule: violation.rule,
          severity: violation.severity,
          action: "break_cycle",
          targetUnitId,
          suggestion:
            "A support chain loops back to its origin. Review the cycle and introduce independent grounding.",
        };
      }
      return {
        rule: violation.rule,
        severity: violation.severity,
        action: "add_assumption_disclosure",
        targetUnitId,
        suggestion:
          "Several units rely on unstated assumptions. Consider adding an assumption-type unit to make them explicit.",
      };

    default:
      return null;
  }
}

/**
 * Convert an array of rule violations into scheduler Candidates.
 * Each candidate carries a rationale and priority boost derived from
 * severity so the scheduler surfaces errors before warnings before info.
 */
export function violationsToCandidates(
  violations: RuleViolation[],
  context: { targetUnitId?: string; contextId?: string },
): Candidate[] {
  const candidates: Candidate[] = [];
  for (const v of violations) {
    const action = violationToAction(v, context.targetUnitId);
    if (!action) continue;
    // Severity → priority boost (0-100). Error dominates.
    const boost =
      v.severity === "error" ? 100 : v.severity === "warning" ? 60 : 20;
    candidates.push({
      kind: "rule_action",
      targetUnitId: context.targetUnitId,
      contextId: context.contextId,
      payload: action as unknown as Record<string, unknown>,
      rationale: `${v.rule}: ${v.message}`,
      priority: boost,
    });
  }
  return candidates;
}

// ─── Service ───────────────────────────────────────────────────────

/**
 * Bridge service: runs the pure rules engine over a set of units/relations
 * and surfaces any resulting actions through the ProactiveScheduler.
 *
 * This is the SINGLE entry point for turning rule violations into
 * user-visible proposals. Direct usage of `epistemicRulesService` by
 * other subsystems is read-only — only this bridge creates Proposals.
 */
export function createRuleProposalBridgeService(db: PrismaClient) {
  const rules = createEpistemicRulesService();
  const scheduler = createProactiveSchedulerService(db);

  /**
   * Scan a set of units + relations for rule violations and hand any
   * fixable ones to the proactive scheduler.
   *
   * Returns the count of surfaced/deferred proposals plus the raw
   * RuleCheckResult so callers can still inspect non-actionable info.
   */
  async function scanAndPropose(
    userId: string,
    units: UnitForScan[],
    relations: RelationForScan[],
    opts: ScanAndProposeOptions = {},
  ) {
    const ruleResult = rules.validateEpistemicIntegrity(units, relations);

    // Associate each violation with the unit whose content triggered it
    // (for certainty-language violations). For other violations we cannot
    // reliably map back to a single unit, so targetUnitId stays undefined.
    const candidates: Candidate[] = [];
    for (const v of ruleResult.violations) {
      let targetUnitId: string | undefined;
      if (v.rule === "transparent_confidence" && /certainty language/i.test(v.message)) {
        // Find the first unit whose content still matches the flagged phrase.
        const phraseMatch = v.message.match(/\("([^"]+)"\)/);
        const phrase = phraseMatch?.[1];
        if (phrase) {
          const hit = units.find((u) =>
            new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(u.content),
          );
          targetUnitId = hit?.id;
        }
      }
      const asCandidates = violationsToCandidates([v], {
        targetUnitId,
        contextId: opts.contextId,
      });
      candidates.push(...asCandidates);
    }

    if (candidates.length === 0) {
      return {
        ruleResult,
        surfaced: 0,
        deferred: 0,
        suppressedByCooldown: 0,
        deduplicated: 0,
        candidates: [],
        dryRun: opts.dryRun ?? false,
      };
    }

    // DEC-2026-002 §B.15.6 — stamp a single monotonic tick for this
    // scan and de-dupe against existing pending rule_action proposals
    // for the same (targetUnitId, rule). Without this, repeated scans
    // of the same unit would pile duplicate nudges into the queue.
    const evalTick = Date.now();
    const existingPending = await db.proposal.findMany({
      where: {
        userId,
        kind: "rule_action",
        status: "pending",
      },
      select: { targetUnitId: true, payload: true },
    });
    const pendingKeys = new Set<string>();
    for (const p of existingPending) {
      const rule =
        typeof p.payload === "object" && p.payload !== null && "rule" in p.payload
          ? String((p.payload as { rule?: unknown }).rule ?? "")
          : "";
      pendingKeys.add(`${p.targetUnitId ?? "*"}::${rule}`);
    }

    const deduped: Candidate[] = [];
    let deduplicated = 0;
    for (const c of candidates) {
      const rule = (c.payload as { rule?: string }).rule ?? "";
      const key = `${c.targetUnitId ?? "*"}::${rule}`;
      if (pendingKeys.has(key)) {
        deduplicated++;
        continue;
      }
      deduped.push({ ...c, evalTick });
    }

    if (deduped.length === 0) {
      return {
        ruleResult,
        surfaced: 0,
        deferred: 0,
        suppressedByCooldown: 0,
        deduplicated,
        candidates,
        dryRun: opts.dryRun ?? false,
      };
    }

    if (opts.dryRun) {
      const preview = await scheduler.preview(userId, deduped, {
        dailyBudget: opts.dailyBudget,
      });
      return {
        ruleResult,
        surfaced: preview.wouldSurface.length,
        deferred: preview.wouldDefer.length,
        suppressedByCooldown: preview.wouldSuppress.length,
        deduplicated,
        candidates,
        dryRun: true,
      };
    }

    const result = await scheduler.schedule(userId, deduped, {
      dailyBudget: opts.dailyBudget,
    });
    return {
      ruleResult,
      surfaced: result.surfaced,
      deferred: result.deferred,
      suppressedByCooldown: result.suppressed,
      deduplicated,
      candidates,
      dryRun: false,
    };
  }

  return {
    scanAndPropose,
    violationsToCandidates,
  };
}

export type RuleProposalBridgeService = ReturnType<
  typeof createRuleProposalBridgeService
>;
