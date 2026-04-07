import type { PrismaClient } from "@prisma/client";

/**
 * Fetch units belonging to a context, ordered by most recent first.
 *
 * This is the shared query used by many AI router procedures that need
 * to load context units for analysis (contradiction detection, merge
 * suggestions, completeness analysis, question generation, etc.).
 */
export async function getContextUnits(
  db: PrismaClient,
  contextId: string | undefined | null,
  limit = 30,
) {
  if (!contextId) return [];
  const units = await db.unit.findMany({
    where: {
      OR: [
        { unitContexts: { some: { contextId } } },
        { perspectives: { some: { contextId } } },
      ],
    },
    select: { id: true, content: true, unitType: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  return units;
}
