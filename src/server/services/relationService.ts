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

      // Notify both units that they were updated (a relation was added)
      await Promise.allSettled([
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

    async update(id: string, data: UpdateRelationInput) {
      const existing = await db.relation.findUnique({ where: { id } });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Relation not found",
        });
      }

      return db.relation.update({
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
    },

    async delete(id: string) {
      const existing = await db.relation.findUnique({ where: { id } });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Relation not found",
        });
      }

      return db.relation.delete({ where: { id } });
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
