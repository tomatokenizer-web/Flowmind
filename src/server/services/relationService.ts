import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { eventBus } from "@/server/events/eventBus";

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
}

export interface UpdateRelationInput {
  strength?: number;
  type?: string;
  direction?: "one_way" | "bidirectional";
  purpose?: string[];
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

      if (sourceUnit.lifecycle === "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Source unit is in draft lifecycle and cannot have relations",
        });
      }

      if (targetUnit.lifecycle === "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Target unit is in draft lifecycle and cannot have relations",
        });
      }

      const isLoopback = input.sourceUnitId === input.targetUnitId;

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

    async listByUnit(unitId: string, contextId?: string) {
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
