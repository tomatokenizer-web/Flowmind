import type { PrismaClient } from "@prisma/client";

export interface SimilarGroup {
  units: { id: string; content: string; unitType: string }[];
  suggestedCore: string;
  similarity: number;
}

function wordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((w) => b.has(w)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function extractCore(texts: string[]): string {
  const words = texts.map(wordSet);
  const common = words.reduce((acc, set) => new Set([...acc].filter((w) => set.has(w))));
  return common.size > 0
    ? texts[0]!.split(/\W+/).filter((w) => common.has(w.toLowerCase())).join(" ")
    : texts[0]!;
}

export function createCompressionService(db: PrismaClient) {
  return {
    async findSimilarClaims(contextId: string): Promise<SimilarGroup[]> {
      const units = await db.unit.findMany({
        where: {
          unitContexts: { some: { contextId } },
          unitType: "claim",
          lifecycle: { in: ["confirmed", "pending"] },
        },
        select: { id: true, content: true, unitType: true },
        take: 100,
      });

      const groups: SimilarGroup[] = [];
      const used = new Set<string>();

      for (let i = 0; i < units.length; i++) {
        if (used.has(units[i]!.id)) continue;
        const group = [units[i]!];
        const setA = wordSet(units[i]!.content);

        for (let j = i + 1; j < units.length; j++) {
          if (used.has(units[j]!.id)) continue;
          const setB = wordSet(units[j]!.content);
          if (jaccardSimilarity(setA, setB) >= 0.5) {
            group.push(units[j]!);
            used.add(units[j]!.id);
          }
        }

        if (group.length >= 2) {
          used.add(units[i]!.id);
          groups.push({
            units: group,
            suggestedCore: extractCore(group.map((u) => u.content)),
            similarity: 0.5,
          });
        }
      }

      return groups;
    },

    async compressClaims(
      unitIds: string[],
      coreContent: string,
      userId: string,
      projectId: string,
      contextId: string,
    ) {
      // Create core unit
      const coreUnit = await db.unit.create({
        data: {
          content: coreContent,
          userId,
          projectId,
          unitType: "claim",
          lifecycle: "confirmed",
          originType: "direct_write",
        },
      });

      // Add core to context
      await db.unitContext.create({
        data: { unitId: coreUnit.id, contextId },
      });

      // Archive originals, transfer relations to core
      for (const unitId of unitIds) {
        const relations = await db.relation.findMany({
          where: { OR: [{ sourceUnitId: unitId }, { targetUnitId: unitId }] },
        });

        for (const rel of relations) {
          if (rel.sourceUnitId === unitId) {
            await db.relation.update({ where: { id: rel.id }, data: { sourceUnitId: coreUnit.id } });
          } else {
            await db.relation.update({ where: { id: rel.id }, data: { targetUnitId: coreUnit.id } });
          }
        }

        await db.unit.update({ where: { id: unitId }, data: { lifecycle: "archived" } });
      }

      return coreUnit;
    },
  };
}
