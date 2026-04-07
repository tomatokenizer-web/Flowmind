import type { PrismaClient, RelationLayer, RelationSubtype, NsDirection, RelationCreatedBy } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { eventBus } from "@/server/events/eventBus";

// ─── Relation Type Constraint Map ────────────────────────────────────
// Source/target unit type constraints for known relation types.
// Keys are relation type strings; values define allowed source/target unitType sets.
// Pairs not in the map are allowed (custom/unknown types pass through).

type UnitTypeName = string;

interface RelationConstraint {
  sourceTypes?: UnitTypeName[];
  targetTypes?: UnitTypeName[];
}

const RELATION_TYPE_CONSTRAINTS: Record<string, RelationConstraint> = {
  supports: {
    sourceTypes: ["evidence", "claim", "example"],
    targetTypes: ["claim", "thesis"],
  },
  contradicts: {
    sourceTypes: ["claim", "counterargument"],
    targetTypes: ["claim", "counterargument"],
  },
  defines: {
    sourceTypes: ["definition"],
  },
  exemplifies: {
    sourceTypes: ["example"],
  },
  questions: {
    sourceTypes: ["question"],
  },
};

function validateRelationTypeConstraints(
  relationType: string,
  sourceUnitType: string,
  targetUnitType: string,
): void {
  const constraint = RELATION_TYPE_CONSTRAINTS[relationType];
  if (!constraint) return; // Unknown/custom type — allow

  if (constraint.sourceTypes && !constraint.sourceTypes.includes(sourceUnitType)) {
    console.warn(
      `[relationService] Type constraint warning: relation type "${relationType}" ` +
      `expects source unit types [${constraint.sourceTypes.join(", ")}] ` +
      `but got "${sourceUnitType}"`,
    );
  }
  if (constraint.targetTypes && !constraint.targetTypes.includes(targetUnitType)) {
    console.warn(
      `[relationService] Type constraint warning: relation type "${relationType}" ` +
      `expects target unit types [${constraint.targetTypes.join(", ")}] ` +
      `but got "${targetUnitType}"`,
    );
  }
}

// ─── Input Types ────────────────────────────────────────────────────

export interface CreateRelationInput {
  sourceUnitId: string;
  targetUnitId: string;
  perspectiveId?: string;
  type: string;
  strength?: number;
  direction?: "one_way" | "bidirectional";
  purpose?: string[];
  isCustom?: boolean;
  customName?: string;
  // v3.14 D-05 fields
  layer?: RelationLayer;
  subtype?: RelationSubtype;
  fromType?: string;
  nsDirection?: NsDirection;
  relationCreatedBy?: RelationCreatedBy;
  confidence?: string;
}

export interface UpdateRelationInput {
  strength?: number;
  type?: string;
  direction?: "one_way" | "bidirectional";
  purpose?: string[];
  // v3.14 D-05 fields
  layer?: RelationLayer;
  subtype?: RelationSubtype;
  fromType?: string;
  nsDirection?: NsDirection;
  relationCreatedBy?: RelationCreatedBy;
  confidence?: string;
}

// ─── Service ────────────────────────────────────────────────────────

export function createRelationService(db: PrismaClient) {
  return {
    async create(input: CreateRelationInput, userId: string) {
      // Verify both units exist and are not in draft lifecycle
      const [sourceUnit, targetUnit] = await Promise.all([
        db.unit.findUnique({ where: { id: input.sourceUnitId } }),
        db.unit.findUnique({ where: { id: input.targetUnitId } }),
      ]);

      if (!sourceUnit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source unit not found",
        });
      }

      if (!targetUnit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target unit not found",
        });
      }

      const isLoopback = input.sourceUnitId === input.targetUnitId;

      // Validate relation type constraints for known types (warn only, non-blocking)
      validateRelationTypeConstraints(input.type, sourceUnit.unitType, targetUnit.unitType);

      const relation = await db.relation.create({
        data: {
          sourceUnitId: input.sourceUnitId,
          targetUnitId: input.targetUnitId,
          perspectiveId: input.perspectiveId ?? null,
          type: input.type,
          strength: input.strength ?? 0.5,
          direction: input.direction ?? "one_way",
          purpose: input.purpose ?? [],
          isCustom: input.isCustom ?? false,
          customName: input.customName ?? null,
          isLoopback,
          // v3.14 D-05 fields
          layer: input.layer ?? undefined,
          subtype: input.subtype ?? undefined,
          fromType: input.fromType ?? undefined,
          nsDirection: input.nsDirection ?? undefined,
          relationCreatedBy: input.relationCreatedBy ?? undefined,
          confidence: input.confidence ?? undefined,
        },
        include: {
          sourceUnit: {
            select: { id: true, content: true, unitType: true },
          },
          targetUnit: {
            select: { id: true, content: true, unitType: true },
          },
        },
      });

      // Emit relation.created event and notify both affected units
      await Promise.allSettled([
        eventBus.emit({
          type: "relation.created",
          payload: { relationId: relation.id, userId, relation },
          timestamp: new Date(),
        }),
        eventBus.emit({
          type: "unit.updated",
          payload: { unitId: input.sourceUnitId, userId },
          timestamp: new Date(),
        }),
        eventBus.emit({
          type: "unit.updated",
          payload: { unitId: input.targetUnitId, userId },
          timestamp: new Date(),
        }),
      ]);

      return relation;
    },

    async update(id: string, data: UpdateRelationInput, userId?: string) {
      const existing = await db.relation.findUnique({ where: { id } });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Relation not found",
        });
      }

      const updated = await db.relation.update({
        where: { id },
        data: {
          ...(data.strength !== undefined ? { strength: data.strength } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.direction !== undefined ? { direction: data.direction } : {}),
          ...(data.purpose !== undefined ? { purpose: data.purpose } : {}),
        },
        include: {
          sourceUnit: {
            select: { id: true, content: true, unitType: true },
          },
          targetUnit: {
            select: { id: true, content: true, unitType: true },
          },
        },
      });

      await eventBus.emit({
        type: "relation.updated",
        payload: { relationId: id, userId: userId ?? existing.sourceUnitId, changes: data },
        timestamp: new Date(),
      });

      return updated;
    },

    async delete(id: string, userId?: string) {
      const existing = await db.relation.findUnique({ where: { id } });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Relation not found",
        });
      }

      const deleted = await db.relation.delete({ where: { id } });

      await eventBus.emit({
        type: "relation.deleted",
        payload: { relationId: id, userId: userId ?? existing.sourceUnitId },
        timestamp: new Date(),
      });

      return deleted;
    },

    async listByUnit(unitId: string, contextId?: string, layer?: RelationLayer) {
      return db.relation.findMany({
        where: {
          OR: [{ sourceUnitId: unitId }, { targetUnitId: unitId }],
          ...(contextId
            ? {
                perspective: {
                  contextId,
                },
              }
            : {}),
          ...(layer ? { layer } : {}),
        },
        include: {
          sourceUnit: {
            select: { id: true, content: true, unitType: true },
          },
          targetUnit: {
            select: { id: true, content: true, unitType: true },
          },
        },
        orderBy: { strength: "desc" },
      });
    },

    /**
     * Fetch the subgraph around a hub unit up to a given depth.
     * Returns all unique relations discovered and the set of unit IDs at each depth layer.
     */
    async neighborsByDepth(
      hubId: string,
      depth: number,
      contextId?: string,
    ): Promise<{
      relations: Array<{
        id: string;
        sourceUnitId: string;
        targetUnitId: string;
        type: string;
        strength: number;
        direction: string;
      }>;
      /** unitIds grouped by depth layer (0 = hub, 1 = direct neighbors, etc.) */
      layers: string[][];
    }> {
      const clampedDepth = Math.max(1, Math.min(3, depth));
      const seenRelationIds = new Set<string>();
      const seenUnitIds = new Set<string>([hubId]);
      const allRelations: Array<{
        id: string;
        sourceUnitId: string;
        targetUnitId: string;
        type: string;
        strength: number;
        direction: string;
      }> = [];
      const layers: string[][] = [[hubId]];

      let frontier = [hubId];

      for (let d = 0; d < clampedDepth; d++) {
        if (frontier.length === 0) break;

        // Fetch relations for all frontier nodes in one query
        const contextFilter = contextId
          ? { perspective: { contextId } }
          : {};

        const relations = await db.relation.findMany({
          where: {
            OR: [
              { sourceUnitId: { in: frontier } },
              { targetUnitId: { in: frontier } },
            ],
            ...contextFilter,
          },
          select: {
            id: true,
            sourceUnitId: true,
            targetUnitId: true,
            type: true,
            strength: true,
            direction: true,
          },
          orderBy: { strength: "desc" },
        });

        const nextFrontier = new Set<string>();

        for (const r of relations) {
          if (seenRelationIds.has(r.id)) continue;
          seenRelationIds.add(r.id);
          allRelations.push(r);

          // Discover new unit IDs
          if (!seenUnitIds.has(r.sourceUnitId)) {
            seenUnitIds.add(r.sourceUnitId);
            nextFrontier.add(r.sourceUnitId);
          }
          if (!seenUnitIds.has(r.targetUnitId)) {
            seenUnitIds.add(r.targetUnitId);
            nextFrontier.add(r.targetUnitId);
          }
        }

        const layerIds = Array.from(nextFrontier);
        if (layerIds.length > 0) {
          layers.push(layerIds);
        }
        frontier = layerIds;
      }

      return { relations: allRelations, layers };
    },

    async listBetween(sourceUnitId: string, targetUnitId: string) {
      return db.relation.findMany({
        where: {
          OR: [
            { sourceUnitId, targetUnitId },
            { sourceUnitId: targetUnitId, targetUnitId: sourceUnitId },
          ],
        },
        include: {
          sourceUnit: {
            select: { id: true, content: true, unitType: true },
          },
          targetUnit: {
            select: { id: true, content: true, unitType: true },
          },
        },
        orderBy: { strength: "desc" },
      });
    },
  };
}

export type RelationService = ReturnType<typeof createRelationService>;
