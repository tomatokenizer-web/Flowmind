import type { PrismaClient } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

export type FlagScope = "global" | "user" | "project";

export type FlagCheck = {
  key: string;
  enabled: boolean;
  scope: FlagScope;
};

// ─── Default Flags (DEC-004 §L: Full default) ─────────────────────

const DEFAULT_FLAGS: Array<{
  key: string;
  enabled: boolean;
  description: string;
}> = [
  { key: "epistemic_acts_full", enabled: true, description: "Show all 22 epistemic acts in UI" },
  { key: "rhetorical_shape_ui", enabled: true, description: "Display rhetorical shape indicators" },
  { key: "compass_numeric_score", enabled: true, description: "Show numeric scores alongside ring" },
  { key: "advanced_graph_queries", enabled: true, description: "Enable all 9 graph query methods" },
  { key: "bridge_text_generation", enabled: true, description: "Enable AI bridge text between units" },
  { key: "knowledge_compounding", enabled: true, description: "Enable knowledge compounding metrics" },
  { key: "domain_templates", enabled: true, description: "Enable domain template selection" },
  { key: "decision_journal", enabled: false, description: "Decision journal feature (Phase 6)" },
  // DEC-2026-002 §B.15.1 — Capture mode selector.
  // false (default) = review_queue: proposals stay `pending` until the user resolves them.
  // true = auto_apply: proposals surfaced by the scheduler are immediately marked `accepted`.
  { key: "proposal.auto_apply", enabled: false, description: "Capture mode: auto-apply vs review queue" },
];

// ─── Service Factory ───────────────────────────────────────────────

export function createFeatureFlagService(db: PrismaClient) {
  /**
   * Check if a feature flag is enabled.
   * Resolution order: project scope → user scope → global scope → default.
   */
  async function isEnabled(
    key: string,
    opts?: { userId?: string; projectId?: string },
  ): Promise<boolean> {
    const conditions: Array<{ key: string; scope: string; scopeId: string | null }> = [];

    // Check project-specific first
    if (opts?.projectId) {
      conditions.push({ key, scope: "project", scopeId: opts.projectId });
    }
    // Then user-specific
    if (opts?.userId) {
      conditions.push({ key, scope: "user", scopeId: opts.userId });
    }
    // Then global
    conditions.push({ key, scope: "global", scopeId: null });

    for (const condition of conditions) {
      const flag = await db.featureFlag.findFirst({
        where: {
          key: condition.key,
          scope: condition.scope,
          scopeId: condition.scopeId,
        },
        select: { enabled: true },
      });
      if (flag) return flag.enabled;
    }

    // Fall back to default
    const defaultFlag = DEFAULT_FLAGS.find((f) => f.key === key);
    return defaultFlag?.enabled ?? false;
  }

  /** Get all flags with their resolved state for a user/project context */
  async function getAllFlags(
    opts?: { userId?: string; projectId?: string },
  ): Promise<FlagCheck[]> {
    // Batch-load all flags in a single query to avoid N+1
    const keys = DEFAULT_FLAGS.map((f) => f.key);
    const allDbFlags = await db.featureFlag.findMany({
      where: { key: { in: keys } },
      select: { key: true, enabled: true, scope: true, scopeId: true },
    });

    // Group by key for resolution
    const flagsByKey = new Map<string, typeof allDbFlags>();
    for (const flag of allDbFlags) {
      const existing = flagsByKey.get(flag.key) ?? [];
      existing.push(flag);
      flagsByKey.set(flag.key, existing);
    }

    return DEFAULT_FLAGS.map((def) => {
      const candidates = flagsByKey.get(def.key) ?? [];
      // Resolution chain: project → user → global → default
      let resolved: { enabled: boolean; scope: string } | undefined;
      if (opts?.projectId) {
        const match = candidates.find((f) => f.scope === "project" && f.scopeId === opts.projectId);
        if (match) resolved = { enabled: match.enabled, scope: "project" };
      }
      if (!resolved && opts?.userId) {
        const match = candidates.find((f) => f.scope === "user" && f.scopeId === opts.userId);
        if (match) resolved = { enabled: match.enabled, scope: "user" };
      }
      if (!resolved) {
        const match = candidates.find((f) => f.scope === "global" && f.scopeId === null);
        if (match) resolved = { enabled: match.enabled, scope: "global" };
      }

      return {
        key: def.key,
        enabled: resolved?.enabled ?? def.enabled,
        scope: (resolved?.scope ?? "default") as FlagScope,
      };
    });
  }

  /** Set a feature flag value */
  async function setFlag(
    key: string,
    enabled: boolean,
    scope: FlagScope = "global",
    scopeId?: string,
  ): Promise<void> {
    const resolvedScopeId = scopeId ?? null;
    const description = DEFAULT_FLAGS.find((f) => f.key === key)?.description ?? null;

    const existing = await db.featureFlag.findFirst({
      where: { key, scope, scopeId: resolvedScopeId },
    });

    if (existing) {
      await db.featureFlag.update({
        where: { id: existing.id },
        data: { enabled },
      });
    } else {
      await db.featureFlag.create({
        data: { key, enabled, scope, scopeId: resolvedScopeId, description },
      });
    }
  }

  /** Seed default flags into DB (idempotent) */
  async function seedDefaults(): Promise<{ seeded: number }> {
    let count = 0;
    for (const def of DEFAULT_FLAGS) {
      const existing = await db.featureFlag.findFirst({
        where: { key: def.key, scope: "global", scopeId: null },
      });
      if (!existing) {
        await db.featureFlag.create({
          data: {
            key: def.key,
            enabled: def.enabled,
            scope: "global",
            scopeId: null,
            description: def.description,
          },
        });
        count++;
      }
    }
    return { seeded: count };
  }

  /** List all default flag definitions */
  function getDefaultFlags() {
    return DEFAULT_FLAGS;
  }

  return { isEnabled, getAllFlags, setFlag, seedDefaults, getDefaultFlags };
}

export type FeatureFlagService = ReturnType<typeof createFeatureFlagService>;
