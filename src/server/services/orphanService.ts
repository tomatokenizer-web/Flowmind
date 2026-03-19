import type { PrismaClient } from "@prisma/client";

export function createOrphanService(db: PrismaClient) {
  return {
    async findOrphans(userId: string) {
      return db.unit.findMany({
        where: {
          userId,
          lifecycle: { notIn: ["archived", "discarded"] },
          unitContexts: { none: {} },
          assemblyItems: { none: {} },
        },
        select: {
          id: true,
          content: true,
          unitType: true,
          lifecycle: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    },

    async recoverOrphan(
      unitId: string,
      action: "context" | "incubate" | "archive" | "delete",
      contextId?: string,
    ) {
      if (action === "context" && contextId) {
        await db.unitContext.upsert({
          where: { unitId_contextId: { unitId, contextId } },
          create: { unitId, contextId },
          update: {},
        });
        return { action, unitId };
      }
      if (action === "incubate") {
        await db.unit.update({ where: { id: unitId }, data: { incubating: true } });
        return { action, unitId };
      }
      if (action === "archive") {
        await db.unit.update({ where: { id: unitId }, data: { lifecycle: "archived" } });
        return { action, unitId };
      }
      if (action === "delete") {
        await db.unit.delete({ where: { id: unitId } });
        return { action, unitId };
      }
      return { action, unitId };
    },
  };
}
