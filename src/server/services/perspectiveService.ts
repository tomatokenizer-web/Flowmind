import type {
  PrismaClient, Stance, UnitType,
  CertaintyLevel, ScaleSource, ContextDependency, ContextRole, RoleSource,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface UpsertPerspectiveInput {
  unitId: string;
  contextId: string;
  type?: UnitType | null;
  stance?: Stance;
  importance?: number;
  note?: string;
  // D-01 Perspective Layer fields
  certaintyLevel?: CertaintyLevel;
  cognitiveScale?: number;
  scaleSource?: ScaleSource;
  contextDependency?: ContextDependency;
  contextRole?: ContextRole;
  roleSource?: RoleSource;
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

      // Validate cognitiveScale range (D-01: 0.0–10.0)
      if (input.cognitiveScale !== undefined && (input.cognitiveScale < 0 || input.cognitiveScale > 10)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cognitive scale must be between 0.0 and 10.0",
        });
      }

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
          certaintyLevel: input.certaintyLevel ?? undefined,
          cognitiveScale: input.cognitiveScale ?? undefined,
          scaleSource: input.scaleSource ?? undefined,
          contextDependency: input.contextDependency ?? undefined,
          contextRole: input.contextRole ?? undefined,
          roleSource: input.roleSource ?? undefined,
        },
        update: {
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.stance !== undefined ? { stance: input.stance } : {}),
          ...(input.importance !== undefined
            ? { importance: input.importance }
            : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(input.certaintyLevel !== undefined ? { certaintyLevel: input.certaintyLevel } : {}),
          ...(input.cognitiveScale !== undefined ? { cognitiveScale: input.cognitiveScale } : {}),
          ...(input.scaleSource !== undefined ? { scaleSource: input.scaleSource } : {}),
          ...(input.contextDependency !== undefined ? { contextDependency: input.contextDependency } : {}),
          ...(input.contextRole !== undefined ? { contextRole: input.contextRole } : {}),
          ...(input.roleSource !== undefined ? { roleSource: input.roleSource } : {}),
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

    async listForUnit(unitId: string) {
      return db.unitPerspective.findMany({
        where: { unitId },
        include: {
          context: {
            select: { id: true, name: true },
          },
        },
        orderBy: { importance: "desc" },
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
