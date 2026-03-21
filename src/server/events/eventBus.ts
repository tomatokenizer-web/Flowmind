import type { Unit, Relation } from "@prisma/client";

// ─── Event Types ───────────────────────────────────────────────────

export type UnitEventType =
  | "unit.created"
  | "unit.updated"
  | "unit.archived"
  | "unit.deleted"
  | "unit.lifecycleChanged"
  | "unit.merged"
  | "unit.contentChanged";

export type ResourceEventType =
  | "resource.created"
  | "resource.deleted";

export type RelationEventType =
  | "relation.created"
  | "relation.updated"
  | "relation.deleted";

export type AppEventType = UnitEventType | ResourceEventType | RelationEventType;

export interface UnitEvent {
  type: Exclude<UnitEventType, "unit.merged">;
  payload: {
    unitId: string;
    userId: string;
    unit?: Unit;
    changes?: Partial<Unit>;
  };
  timestamp: Date;
}

export interface UnitMergedEvent {
  type: "unit.merged";
  payload: {
    sourceUnitId: string;
    targetUnitId: string;
    userId: string;
  };
  timestamp: Date;
}

export interface ResourceEvent {
  type: ResourceEventType;
  payload: {
    resourceId: string;
    userId: string;
  };
  timestamp: Date;
}

export interface RelationEvent {
  type: RelationEventType;
  payload: {
    relationId: string;
    userId: string;
    relation?: Relation;
    changes?: Partial<Relation>;
  };
  timestamp: Date;
}

export type AppEvent = UnitEvent | UnitMergedEvent | ResourceEvent | RelationEvent;

type EventHandler = (event: AppEvent) => void | Promise<void>;

// ─── Event Bus ─────────────────────────────────────────────────────

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(eventType: AppEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  async emit(event: AppEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    const promises = Array.from(handlers).map((handler) => handler(event));
    await Promise.allSettled(promises);
  }

  removeAllListeners(eventType?: AppEventType): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }
}

export const eventBus = new EventBus();
