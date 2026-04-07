import type { PrismaClient, LifecycleState } from "@prisma/client";
import { eventBus } from "@/server/events/eventBus";

// ─── v3.14 4-State Lifecycle Machine ────────────────────────────────
//
// States: draft → confirmed → deferred → archived
//
// Transition graph:
//   draft      → confirmed, deferred
//   confirmed  → deferred, archived
//   deferred   → draft, archived
//   archived   → draft  (reactivation only)

export const LIFECYCLE_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  draft: ["confirmed", "deferred"],
  confirmed: ["deferred", "archived"],
  deferred: ["draft", "archived"],
  archived: ["draft"],
};

export class InvalidTransitionError extends Error {
  readonly code = "INVALID_LIFECYCLE_TRANSITION" as const;
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super(`Invalid lifecycle transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;
  }
}

export function createLifecycleService(db: PrismaClient) {
  return {
    canTransition(from: LifecycleState, to: LifecycleState): boolean {
      const allowed = LIFECYCLE_TRANSITIONS[from];
      return allowed?.includes(to) ?? false;
    },

    getAvailableTransitions(from: LifecycleState): LifecycleState[] {
      return LIFECYCLE_TRANSITIONS[from] ?? [];
    },

    async transition(
      unitId: string,
      targetState: LifecycleState,
      userId: string,
      options?: { aiReviewPending?: boolean },
    ) {
      const existing = await db.unit.findFirst({
        where: { id: unitId },
        select: { id: true, lifecycleState: true },
      });

      if (!existing) return null;

      const currentState = existing.lifecycleState ?? "draft";

      // No-op if already in target state
      if (currentState === targetState) {
        return { unit: existing, previousState: currentState };
      }

      // Validate transition
      if (!this.canTransition(currentState, targetState)) {
        throw new InvalidTransitionError(currentState, targetState);
      }

      // Determine aiReviewPending value:
      // - When transitioning to confirmed, auto-clear to false unless explicitly set
      // - Otherwise, use the explicitly provided value (if any)
      let aiReviewPendingUpdate: boolean | undefined;
      if (targetState === "confirmed") {
        aiReviewPendingUpdate = options?.aiReviewPending ?? false;
      } else if (options?.aiReviewPending !== undefined) {
        aiReviewPendingUpdate = options.aiReviewPending;
      }

      const unit = await db.unit.update({
        where: { id: unitId },
        data: {
          lifecycleState: targetState,
          modifiedAt: new Date(),
          ...(aiReviewPendingUpdate !== undefined ? { aiReviewPending: aiReviewPendingUpdate } : {}),
        },
      });

      await eventBus.emit({
        type: "unit.lifecycleChanged",
        payload: {
          unitId,
          userId,
          unit,
          changes: { lifecycleState: targetState } as Partial<typeof unit>,
        },
        timestamp: new Date(),
      });

      return { unit, previousState: currentState };
    },
  };
}

export type LifecycleService = ReturnType<typeof createLifecycleService>;
