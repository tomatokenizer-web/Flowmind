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
    const results: FlagCheck[] = [];

    for (const def of DEFAULT_FLAGS) {
      const enabled = await isEnabled(def.key, opts);
      results.push({
        key: def.key,
        enabled,
        scope: "global",
      });
    }

    return results;
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
