import type { PrismaClient } from "@prisma/client";
import { createContextVisitService } from "./contextVisitService";

export interface BriefingData {
  lastVisitedAt: Date;
  unitsAddedCount: number;
  unitsModifiedCount: number;
  openQuestions: string[];
  aiSuggestions: string[];
  lastViewedUnitId: string | null;
}

export function createContextBriefingService(db: PrismaClient) {
  const visitService = createContextVisitService(db);

  async function getBriefing(
    userId: string,
    contextId: string,
  ): Promise<BriefingData | null> {
    const visit = await visitService.getLastVisit(userId, contextId);

    // First visit — skip briefing
    if (!visit) return null;

    const lastVisitedAt = visit.lastVisitedAt;

    // Count units added since last visit
    const unitsAddedCount = await db.unitContext.count({
      where: {
        contextId,
        assignedAt: { gt: lastVisitedAt },
      },
    });

    // Count units modified since last visit
    const unitsModifiedCount = await db.unit.count({
      where: {
        unitContexts: { some: { contextId } },
        modifiedAt: { gt: lastVisitedAt },
      },
    });

    // Get open questions from context
    const context = await db.context.findUnique({
      where: { id: contextId },
      select: { openQuestions: true },
    });

    const openQuestions = Array.isArray(context?.openQuestions)
      ? (context.openQuestions as string[])
      : [];

    // Static AI suggestions placeholder (real AI in Epic 5)
    const aiSuggestions: string[] = [];
    if (openQuestions.length > 0) {
      aiSuggestions.push(
        `${openQuestions.length} open question${openQuestions.length === 1 ? "" : "s"} need${openQuestions.length === 1 ? "s" : ""} attention`,
      );
    }
    if (unitsAddedCount > 0) {
      aiSuggestions.push("Review newly added units since your last visit");
    }

    return {
      lastVisitedAt,
      unitsAddedCount,
      unitsModifiedCount,
      openQuestions,
      aiSuggestions,
      lastViewedUnitId: visit.lastViewedUnitId,
    };
  }

  return { getBriefing };
}
