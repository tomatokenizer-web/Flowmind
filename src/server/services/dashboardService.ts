import type { PrismaClient } from "@prisma/client";

// Unit types that are meaningful for completeness scoring
export const COMPASS_UNIT_TYPES = [
  "claim",
  "evidence",
  "counterargument",
  "question",
  "assumption",
] as const;

export type CompassUnitType = (typeof COMPASS_UNIT_TYPES)[number];

export type UnitTypeCounts = Record<CompassUnitType, number>;

export interface ContextCardData {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  unitCount: number;
  unresolvedQuestionCount: number;
  unitTypeCounts: UnitTypeCounts;
  /** Alias for component compatibility: matches ContextSummaryData.updatedAt */
  updatedAt: Date;
}

export interface DashboardData {
  contexts: ContextCardData[];
}

export function createDashboardService(db: PrismaClient) {
  return {
    async getDashboardData(userId: string): Promise<DashboardData> {
      // Single optimized query — joins project → contexts with counts
      const contexts = await db.context.findMany({
        where: {
          project: { userId },
        },
        select: {
          id: true,
          name: true,
          description: true,
          parentId: true,
          openQuestions: true,
          updatedAt: true,
          parent: {
            select: { name: true },
          },
          _count: {
            select: { unitContexts: true },
          },
          unitContexts: {
            select: {
              unit: {
                select: { unitType: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const cards: ContextCardData[] = contexts.map((ctx) => {
        const openQuestions = Array.isArray(ctx.openQuestions)
          ? ctx.openQuestions
          : [];

        // Tally unit types for the compass
        const unitTypeCounts: UnitTypeCounts = {
          claim: 0,
          evidence: 0,
          counterargument: 0,
          question: 0,
          assumption: 0,
        };
        for (const uc of ctx.unitContexts) {
          const t = uc.unit.unitType as CompassUnitType;
          if (t in unitTypeCounts) {
            unitTypeCounts[t]++;
          }
        }

        return {
          id: ctx.id,
          name: ctx.name,
          description: ctx.description,
          parentId: ctx.parentId,
          parentName: ctx.parent?.name ?? null,
          unitCount: ctx._count.unitContexts,
          unresolvedQuestionCount: openQuestions.length,
          unitTypeCounts,
          updatedAt: ctx.updatedAt,
        };
      });

      return { contexts: cards };
    },
  };
}
