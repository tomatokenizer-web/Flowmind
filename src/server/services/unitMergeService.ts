import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface MergePreview {
  sourceUnit: { id: string; content: string };
  targetUnit: { id: string; content: string };
  relationsToTransfer: number;
  assemblyItemsToUpdate: number;
  perspectivesToTransfer: number;
  duplicateRelations: number;
}

export interface MergeInput {
  sourceUnitId: string; // will be archived
  targetUnitId: string; // survives
  keepContent: "source" | "target";
}

export function createUnitMergeService(db: PrismaClient) {
  return {
    /** Preview what will change before committing the merge */
    async preview(sourceUnitId: string, targetUnitId: string): Promise<MergePreview> {
      const [sourceUnit, targetUnit] = await Promise.all([
        db.unit.findUnique({ where: { id: sourceUnitId }, select: { id: true, content: true } }),
        db.unit.findUnique({ where: { id: targetUnitId }, select: { id: true, content: true } }),
      ]);

      if (!sourceUnit) throw new TRPCError({ code: "NOT_FOUND", message: "Source unit not found" });
      if (!targetUnit) throw new TRPCError({ code: "NOT_FOUND", message: "Target unit not found" });

      const [sourceRelations, targetRelations, assemblyItems, perspectives] = await Promise.all([
        db.relation.findMany({
          where: { OR: [{ sourceUnitId }, { targetUnitId: sourceUnitId }] },
          select: { id: true, sourceUnitId: true, targetUnitId: true, type: true, strength: true },
        }),
        db.relation.findMany({
          where: { OR: [{ sourceUnitId: targetUnitId }, { targetUnitId }] },
          select: { sourceUnitId: true, targetUnitId: true, type: true },
        }),
        db.assemblyItem.count({ where: { unitId: sourceUnitId } }),
        db.unitPerspective.count({ where: { unitId: sourceUnitId } }),
      ]);

      // Count duplicates: source relations that would conflict with target
      let duplicateRelations = 0;
      for (const srcRel of sourceRelations) {
        const otherEndId =
          srcRel.sourceUnitId === sourceUnitId ? srcRel.targetUnitId : srcRel.sourceUnitId;
        const isDuplicate = targetRelations.some(
          (tRel) =>
            tRel.type === srcRel.type &&
            (tRel.sourceUnitId === otherEndId || tRel.targetUnitId === otherEndId),
        );
        if (isDuplicate) duplicateRelations++;
      }

      return {
        sourceUnit,
        targetUnit,
        relationsToTransfer: sourceRelations.length - duplicateRelations,
        assemblyItemsToUpdate: assemblyItems,
        perspectivesToTransfer: perspectives,
        duplicateRelations,
      };
    },

    /** Execute the merge — re-attributes everything from source to target, archives source */
    async merge(input: MergeInput): Promise<{ merged: boolean; targetUnitId: string }> {
      const { sourceUnitId, targetUnitId, keepContent } = input;

      const [sourceUnit, targetUnit] = await Promise.all([
        db.unit.findUnique({ where: { id: sourceUnitId } }),
        db.unit.findUnique({ where: { id: targetUnitId } }),
      ]);

      if (!sourceUnit) throw new TRPCError({ code: "NOT_FOUND", message: "Source unit not found" });
      if (!targetUnit) throw new TRPCError({ code: "NOT_FOUND", message: "Target unit not found" });

      // Get all relations for source
      const sourceRelations = await db.relation.findMany({
        where: { OR: [{ sourceUnitId }, { targetUnitId: sourceUnitId }] },
      });

      // Get existing target relations for dedup check
      const targetRelations = await db.relation.findMany({
        where: { OR: [{ sourceUnitId: targetUnitId }, { targetUnitId }] },
      });

      await db.$transaction(async (tx) => {
        // 1. Update content if keeping source content
        if (keepContent === "source") {
          await tx.unit.update({
            where: { id: targetUnitId },
            data: { content: sourceUnit.content },
          });
        }

        // 2. Transfer relations — skip duplicates, keep higher strength
        for (const rel of sourceRelations) {
          const isSource = rel.sourceUnitId === sourceUnitId;
          const otherEndId = isSource ? rel.targetUnitId : rel.sourceUnitId;

          // Skip self-referencing after merge
          if (otherEndId === targetUnitId) continue;

          // Check for duplicate
          const duplicate = targetRelations.find(
            (tRel) =>
              tRel.type === rel.type &&
              (tRel.sourceUnitId === otherEndId || tRel.targetUnitId === otherEndId),
          );

          if (duplicate) {
            // Keep higher strength
            if (rel.strength > duplicate.strength) {
              await tx.relation.update({
                where: { id: duplicate.id },
                data: { strength: rel.strength },
              });
            }
            await tx.relation.delete({ where: { id: rel.id } });
          } else {
            // Re-attribute relation to target
            await tx.relation.update({
              where: { id: rel.id },
              data: isSource
                ? { sourceUnitId: targetUnitId }
                : { targetUnitId: targetUnitId },
            });
          }
        }

        // 3. Update assembly items
        await tx.assemblyItem.updateMany({
          where: { unitId: sourceUnitId },
          data: { unitId: targetUnitId },
        });

        // 4. Transfer perspectives (only if target lacks one for that context)
        const sourcePerspectives = await tx.unitPerspective.findMany({
          where: { unitId: sourceUnitId },
        });
        for (const p of sourcePerspectives) {
          const existing = await tx.unitPerspective.findUnique({
            where: { unitId_contextId: { unitId: targetUnitId, contextId: p.contextId } },
          });
          if (!existing) {
            await tx.unitPerspective.create({
              data: {
                unitId: targetUnitId,
                contextId: p.contextId,
                type: p.type,
                stance: p.stance,
                importance: p.importance,
                note: p.note,
              },
            });
          }
          await tx.unitPerspective.delete({ where: { id: p.id } });
        }

        // 5. Transfer UnitContext memberships
        const sourceMemberships = await tx.unitContext.findMany({
          where: { unitId: sourceUnitId },
        });
        for (const m of sourceMemberships) {
          const exists = await tx.unitContext.findUnique({
            where: { unitId_contextId: { unitId: targetUnitId, contextId: m.contextId } },
          });
          if (!exists) {
            await tx.unitContext.create({
              data: { unitId: targetUnitId, contextId: m.contextId },
            });
          }
        }

        // 6. Archive source unit
        await tx.unit.update({
          where: { id: sourceUnitId },
          data: { lifecycle: "archived", meta: { mergedInto: targetUnitId } },
        });
      });

      return { merged: true, targetUnitId };
    },
  };
}
