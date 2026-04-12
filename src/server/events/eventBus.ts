import type { Unit, Relation } from "@prisma/client";

// ─── Event Types ───────────────────────────────────────────────────

export type UnitEventType =
  | "unit.created"
  | "unit.updated"
  | "unit.archived"
  | "unit.deleted"
  | "unit.lifecycleChanged"
  | "unit.merged"
  | "unit.split"
  | "unit.contentChanged"
  | "unit.fossilized"
  | "unit.promoted";

export type ResourceEventType =
  | "resource.created"
  | "resource.deleted";

export type RelationEventType =
  | "relation.created"
  | "relation.updated"
  | "relation.deleted";

export type ProposalEventType =
  | "proposal.created"
  | "proposal.accepted"
  | "proposal.rejected";

export type ContextEventType = "context.tierChanged";

export type AssemblyEventType = "assembly.exported";

export type MembershipEventType = "membership.changed";

export type AppEventType =
  | UnitEventType
  | ResourceEventType
  | RelationEventType
  | ProposalEventType
  | ContextEventType
  | AssemblyEventType
  | MembershipEventType;

export interface UnitEvent {
  type: Exclude<UnitEventType, "unit.merged" | "unit.split">;
  payload: {
    unitId: string;
    userId: string;
    unit?: Unit;
    changes?: Partial<Unit>;
    previousLifecycle?: string;
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

export interface UnitSplitEvent {
  type: "unit.split";
  payload: {
    parentUnitId: string;
    firstChildId: string;
    secondChildId: string;
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

export interface ProposalEvent {
  type: ProposalEventType;
  payload: {
    proposalId: string;
    kind: string;
    targetUnitId?: string;
    contextId?: string;
    userId: string;
  };
  timestamp: Date;
}

export interface ContextTierEvent {
  type: "context.tierChanged";
  payload: {
    contextId: string;
    previousTier: string;
    newTier: string;
    userId: string;
  };
  timestamp: Date;
}

export interface AssemblyExportedEvent {
  type: "assembly.exported";
  payload: {
    assemblyId: string;
    format: string;
    userId: string;
  };
  timestamp: Date;
}

export interface MembershipChangedEvent {
  type: "membership.changed";
  payload: {
    projectId: string;
    targetUserId: string;
    action: "added" | "removed" | "roleChanged";
    role?: string;
    userId: string;
  };
  timestamp: Date;
}

export type AppEvent =
  | UnitEvent
  | UnitMergedEvent
  | UnitSplitEvent
  | ResourceEvent
  | RelationEvent
  | ProposalEvent
  | ContextTierEvent
  | AssemblyExportedEvent
  | MembershipChangedEvent;

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
