import type { PrismaClient } from "@prisma/client";

export function createContextVisitService(db: PrismaClient) {
  async function recordVisit({
    userId,
    contextId,
    lastViewedUnitId,
  }: {
    userId: string;
    contextId: string;
    lastViewedUnitId?: string;
  }) {
    return db.contextVisit.upsert({
      where: { userId_contextId: { userId, contextId } },
      create: {
        userId,
        contextId,
        lastVisitedAt: new Date(),
        lastViewedUnitId: lastViewedUnitId ?? null,
      },
      update: {
        lastVisitedAt: new Date(),
        ...(lastViewedUnitId !== undefined && {
          lastViewedUnitId,
        }),
      },
    });
  }

  async function getLastVisit(userId: string, contextId: string) {
    return db.contextVisit.findUnique({
      where: { userId_contextId: { userId, contextId } },
    });
  }

  async function updateLastViewedUnit(
    userId: string,
    contextId: string,
    unitId: string,
  ) {
    return db.contextVisit.upsert({
      where: { userId_contextId: { userId, contextId } },
      create: {
        userId,
        contextId,
        lastVisitedAt: new Date(),
        lastViewedUnitId: unitId,
      },
      update: {
        lastViewedUnitId: unitId,
      },
    });
  }

  return { recordVisit, getLastVisit, updateLastViewedUnit };
}
