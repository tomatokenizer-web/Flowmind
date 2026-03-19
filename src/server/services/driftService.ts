import type { PrismaClient } from "@prisma/client";

function keywordOverlapScore(text: string, purpose: string): number {
  const textWords = new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const purposeWords = purpose.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  if (purposeWords.length === 0) return 0;
  const matches = purposeWords.filter((w) => textWords.has(w)).length;
  return 1 - matches / purposeWords.length;
}

export function createDriftService(db: PrismaClient) {
  return {
    async updateDriftScoresForProject(projectId: string) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { name: true, type: true },
      });
      const purpose = project?.name ?? "";
      if (!purpose) return;

      const units = await db.unit.findMany({
        where: { projectId },
        select: { id: true, content: true },
      });

      for (const unit of units) {
        const driftScore = keywordOverlapScore(unit.content, purpose);
        await db.unit.update({
          where: { id: unit.id },
          data: { driftScore },
        });
      }
    },

    async getHighDriftUnits(projectId: string, threshold = 0.7) {
      return db.unit.findMany({
        where: {
          projectId,
          driftScore: { gte: threshold },
          lifecycle: { notIn: ["archived", "discarded"] },
        },
        select: {
          id: true,
          content: true,
          unitType: true,
          driftScore: true,
          createdAt: true,
        },
        orderBy: { driftScore: "desc" },
        take: 50,
      });
    },
  };
}
