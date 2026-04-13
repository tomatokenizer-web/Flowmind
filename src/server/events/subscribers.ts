/**
 * Event Subscriber Registry — DEC-2026-002 §B.9
 *
 * Centralizes all event→subscriber wiring. Each subscriber is fire-and-forget:
 * failures are logged but never block the event bus or the caller.
 *
 * Subscriber categories:
 *   1. Embedding (unit.created, unit.updated) — existing, registered in embeddingService.ts
 *   2. Webhook  (all events) — existing, registered in webhookService.ts
 *   3. Salience  (unit.created, unit.updated) — recompute salience tier
 *   4. Compass   (unit.created, unit.updated) — invalidate compass cache
 *   5. Rules     (unit.created, unit.updated) — evaluate epistemic rules → proposals
 *   6. Proactive (proposal.created) — schedule proactive checks
 *   7. Compounding (assembly.exported) — extract compounding candidates
 *   8. Export logging (assembly.exported) — log to export history
 */

import type { PrismaClient } from "@prisma/client";
import { eventBus } from "@/server/events/eventBus";
import type { AppEvent } from "@/server/events/eventBus";
import { logger } from "@/server/logger";

// ─── Safe runner: wraps subscriber in try/catch + logging ──────────

function safeAsync(
  name: string,
  fn: (event: AppEvent) => Promise<void>,
): (event: AppEvent) => void {
  return (event: AppEvent) => {
    fn(event).catch((err) => {
      logger.error(
        { subscriber: name, event: event.type, error: err },
        `Event subscriber "${name}" failed`,
      );
    });
  };
}

// ─── Subscriber implementations ────────────────────────────────────

function createSalienceSubscribers(db: PrismaClient) {
  let svc: Awaited<ReturnType<typeof loadSalienceService>> | null = null;
  async function loadSalienceService() {
    const mod = await import("@/server/services/salienceService");
    return mod.createSalienceService(db);
  }

  return {
    onUnitCreated: safeAsync("salience.onUnitCreated", async (event) => {
      if (event.type !== "unit.created" && event.type !== "unit.updated") return;
      svc ??= await loadSalienceService();
      const { unitId } = event.payload;
      await svc.computeSalience(unitId);
    }),
  };
}

function createCompassSubscribers(db: PrismaClient) {
  let svc: Awaited<ReturnType<typeof loadCompassService>> | null = null;
  async function loadCompassService() {
    const mod = await import("@/server/services/compassService");
    return mod.createCompassService(db);
  }

  return {
    onUnitChanged: safeAsync("compass.onUnitChanged", async (event) => {
      if (event.type !== "unit.created" && event.type !== "unit.updated") return;
      svc ??= await loadCompassService();
      const unit = event.payload.unit;
      if (unit?.projectId) {
        await svc.calculateCompass(unit.projectId);
      }
    }),
  };
}

function createRulesSubscribers(db: PrismaClient) {
  let bridge: Awaited<ReturnType<typeof loadBridgeService>> | null = null;
  async function loadBridgeService() {
    const mod = await import("@/server/services/ruleProposalBridgeService");
    return mod.createRuleProposalBridgeService(db);
  }

  return {
    onUnitCreated: safeAsync("rules.onUnitCreated", async (event) => {
      if (event.type !== "unit.created") return;
      bridge ??= await loadBridgeService();
      const { userId } = event.payload;
      const unit = event.payload.unit;
      if (!unit) return;

      // Scan the new unit against epistemic rules → create proposals if violations found
      await bridge.scanAndPropose(userId, [unit], []);
    }),
  };
}

function createProactiveSubscribers(db: PrismaClient) {
  let scheduler: Awaited<ReturnType<typeof loadSchedulerService>> | null = null;
  async function loadSchedulerService() {
    const mod = await import("@/server/services/proactiveSchedulerService");
    return mod.createProactiveSchedulerService(db);
  }

  return {
    onProposalCreated: safeAsync("proactive.onProposalCreated", async (event) => {
      if (event.type !== "proposal.created") return;
      scheduler ??= await loadSchedulerService();
      const { userId } = event.payload;
      // Schedule proactive check after new proposal arrives
      await scheduler.schedule(userId, []);
    }),
  };
}

function createCompoundingSubscribers(db: PrismaClient) {
  let extractor: Awaited<ReturnType<typeof loadExtractorService>> | null = null;
  async function loadExtractorService() {
    const mod = await import("@/server/services/compoundingExtractorService");
    return mod.createCompoundingExtractorService(db);
  }

  return {
    onAssemblyExported: safeAsync("compounding.onAssemblyExported", async (event) => {
      if (event.type !== "assembly.exported") return;
      extractor ??= await loadExtractorService();
      const { assemblyId, userId } = event.payload;
      // Extract compounding candidates from the exported assembly
      await extractor.extractFromAssembly(assemblyId, "", userId);
    }),
  };
}

// ─── Registration ──────────────────────────────────────────────────

let initialised = false;

/**
 * Register all event subscribers on the global event bus.
 * Safe to call multiple times — subscribers are only registered once.
 *
 * NOTE: Embedding subscribers are registered separately in embeddingService.ts
 * NOTE: Webhook subscribers are registered separately in webhookService.ts
 */
export function initEventSubscribers(db: PrismaClient): void {
  if (initialised) return;
  initialised = true;

  // Salience: recompute on unit create/update
  const salience = createSalienceSubscribers(db);
  eventBus.on("unit.created", salience.onUnitCreated);
  eventBus.on("unit.updated", salience.onUnitCreated);

  // Compass: invalidate/recalc on unit create/update
  const compass = createCompassSubscribers(db);
  eventBus.on("unit.created", compass.onUnitChanged);
  eventBus.on("unit.updated", compass.onUnitChanged);

  // Epistemic Rules: evaluate on new units → create proposals
  const rules = createRulesSubscribers(db);
  eventBus.on("unit.created", rules.onUnitCreated);

  // Proactive Scheduler: schedule checks on new proposals
  const proactive = createProactiveSubscribers(db);
  eventBus.on("proposal.created", proactive.onProposalCreated);

  // Compounding Extractor: extract candidates on assembly export
  const compounding = createCompoundingSubscribers(db);
  eventBus.on("assembly.exported", compounding.onAssemblyExported);

  logger.info("Event subscribers initialized (salience, compass, rules, proactive, compounding)");
}

/**
 * Reset subscriber state — for testing only.
 */
export function resetSubscribers(): void {
  initialised = false;
}
