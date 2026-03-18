import type { Unit } from "@prisma/client";

// ─── Event Types ───────────────────────────────────────────────────

export type UnitEventType =
  | "unit.created"
  | "unit.updated"
  | "unit.archived"
  | "unit.deleted"
  | "unit.lifecycleChanged";

export interface UnitEvent {
  type: UnitEventType;
  payload: {
    unitId: string;
    userId: string;
    unit?: Unit;
    changes?: Partial<Unit>;
  };
  timestamp: Date;
}

type EventHandler = (event: UnitEvent) => void | Promise<void>;

// ─── Event Bus ─────────────────────────────────────────────────────

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(eventType: UnitEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  async emit(event: UnitEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    const promises = Array.from(handlers).map((handler) => handler(event));
    await Promise.allSettled(promises);
  }

  removeAllListeners(eventType?: UnitEventType): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }
}

export const eventBus = new EventBus();
