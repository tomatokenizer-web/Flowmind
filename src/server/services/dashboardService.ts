import type { PrismaClient } from "@prisma/client";

export interface ContextCardData {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  unitCount: number;
  unresolvedQuestionCount: number;
  lastModifiedAt: Date;
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
        },
        orderBy: { updatedAt: "desc" },
      });

      const cards: ContextCardData[] = contexts.map((ctx) => {
        const openQuestions = Array.isArray(ctx.openQuestions)
          ? ctx.openQuestions
          : [];

        return {
          id: ctx.id,
          name: ctx.name,
          description: ctx.description,
          parentId: ctx.parentId,
          parentName: ctx.parent?.name ?? null,
          unitCount: ctx._count.unitContexts,
          unresolvedQuestionCount: openQuestions.length,
          lastModifiedAt: ctx.updatedAt,
        };
      });

      return { contexts: cards };
    },
  };
}
