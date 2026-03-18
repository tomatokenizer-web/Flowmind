import type { PrismaClient, Stance, UnitType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface UpsertPerspectiveInput {
  unitId: string;
  contextId: string;
  type?: UnitType | null;
  stance?: Stance;
  importance?: number;
  note?: string;
}

export function createPerspectiveService(db: PrismaClient) {
  function validateImportance(importance: number | undefined) {
    if (importance !== undefined && (importance < 0 || importance > 1)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Importance must be between 0.0 and 1.0",
      });
    }
  }

  return {
    async upsert(input: UpsertPerspectiveInput) {
      validateImportance(input.importance);

      return db.unitPerspective.upsert({
        where: {
          unitId_contextId: {
            unitId: input.unitId,
            contextId: input.contextId,
          },
        },
        create: {
          unitId: input.unitId,
          contextId: input.contextId,
          type: input.type ?? undefined,
          stance: input.stance ?? "neutral",
          importance: input.importance ?? 0.5,
          note: input.note ?? null,
        },
        update: {
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.stance !== undefined ? { stance: input.stance } : {}),
          ...(input.importance !== undefined
            ? { importance: input.importance }
            : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
        },
      });
    },

    async getForUnit(unitId: string, contextId: string) {
      return db.unitPerspective.findUnique({
        where: {
          unitId_contextId: { unitId, contextId },
        },
      });
    },

    async getForContext(contextId: string) {
      return db.unitPerspective.findMany({
        where: { contextId },
        include: { unit: true },
        orderBy: { importance: "desc" },
      });
    },

    async deletePerspective(unitId: string, contextId: string) {
      const existing = await db.unitPerspective.findUnique({
        where: {
          unitId_contextId: { unitId, contextId },
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Perspective not found for this unit-context pair",
        });
      }

      return db.unitPerspective.delete({
        where: {
          unitId_contextId: { unitId, contextId },
        },
      });
    },
  };
}
