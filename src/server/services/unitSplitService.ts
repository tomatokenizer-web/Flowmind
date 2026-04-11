import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { eventBus } from "@/server/events/eventBus";

// ─── DEC-2026-002 §14: Split / Merge State Machine ────────────────
//
// The merge half already exists in unitMergeService. This module
// provides the symmetric SPLIT operation: given one unit, produce
// two child units whose concatenated content equals (or closely
// matches) the original's content, and archive the original.
//
// State transitions:
//
//   draft | confirmed  ──split──►  2× draft child units
//                                  parent → archived (keeps meta.splitInto = [ids])
//
// Split semantics:
//   • The parent's relations are carried forward to the FIRST child
//     by default (configurable via `relationPolicy`).
//   • Assembly membership is transferred to the FIRST child only —
//     callers that want both halves in an assembly should add the
//     second child explicitly after the split.
//   • The parent is archived but NOT deleted, so the split is
//     auditable / reversible via unitMergeService.merge.
//
// This service does NOT call AI. Boundary selection is the caller's
// responsibility — callers typically run cardBoundaryService first
// and pass the offset that separates the two halves.

// ─── Types ────────────────────────────────────────────────────────

export interface SplitInput {
  sourceUnitId: string;
  /** Character offset (0 ≤ offset < content.length). */
  splitAtOffset: number;
  /**
   * Which child inherits the parent's relations + assembly links.
   * Default: "first" — the left half keeps everything.
   */
  relationPolicy?: "first" | "second" | "both" | "none";
  userId?: string;
}

export interface SplitPreview {
  sourceUnit: { id: string; content: string };
  firstContent: string;
  secondContent: string;
  relationsToTransfer: number;
  assemblyItemsToUpdate: number;
  perspectivesToTransfer: number;
}

export interface SplitResult {
  parentUnitId: string;
  firstChildId: string;
  secondChildId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function validateSplit(content: string, offset: number): void {
  if (!Number.isInteger(offset)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "splitAtOffset must be an integer" });
  }
  if (offset <= 0 || offset >= content.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `splitAtOffset ${offset} out of range for content length ${content.length}`,
    });
  }
  const first = content.slice(0, offset).trim();
  const second = content.slice(offset).trim();
  if (first.length === 0 || second.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Both halves of the split must contain non-whitespace content",
    });
  }
}

// ─── Service ──────────────────────────────────────────────────────

export function createUnitSplitService(db: PrismaClient) {
  async function preview(
    sourceUnitId: string,
    splitAtOffset: number,
  ): Promise<SplitPreview> {
    const source = await db.unit.findUnique({
      where: { id: sourceUnitId },
      select: { id: true, content: true },
    });
    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source unit not found" });
    }
    validateSplit(source.content, splitAtOffset);

    const [relations, assemblyItems, perspectives] = await Promise.all([
      db.relation.count({
        where: {
          OR: [{ sourceUnitId }, { targetUnitId: sourceUnitId }],
        },
      }),
      db.assemblyItem.count({ where: { unitId: sourceUnitId } }),
      db.unitPerspective.count({ where: { unitId: sourceUnitId } }),
    ]);

    return {
      sourceUnit: source,
      firstContent: source.content.slice(0, splitAtOffset).trim(),
      secondContent: source.content.slice(splitAtOffset).trim(),
      relationsToTransfer: relations,
      assemblyItemsToUpdate: assemblyItems,
      perspectivesToTransfer: perspectives,
    };
  }

  async function split(input: SplitInput): Promise<SplitResult> {
    const policy = input.relationPolicy ?? "first";
    const parent = await db.unit.findUnique({
      where: { id: input.sourceUnitId },
    });
    if (!parent) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source unit not found" });
    }
    if (parent.lifecycle === "archived") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot split an already-archived unit",
      });
    }
    validateSplit(parent.content, input.splitAtOffset);

    const firstContent = parent.content.slice(0, input.splitAtOffset).trim();
    const secondContent = parent.content.slice(input.splitAtOffset).trim();

    // Copy the same typed fields onto each child so they can stand
    // alone immediately. Intentionally NOT copying salience — the
    // next batchRecomputeSalience pass will refresh tiers for the
    // children with their new relation topology.
    const baseChildData = {
      userId: parent.userId,
      projectId: parent.projectId,
      unitType: parent.unitType,
      lifecycle: "draft" as const,
      lifecycleState: "draft" as const,
      originType: parent.originType,
      voice: parent.voice,
      primaryEpistemicAct: parent.primaryEpistemicAct,
      epistemicOrigin: parent.epistemicOrigin,
      applicabilityScope: parent.applicabilityScope,
      temporalValidity: parent.temporalValidity,
      revisability: parent.revisability,
    };

    const result = await db.$transaction(async (tx) => {
      const firstChild = await tx.unit.create({
        data: { ...baseChildData, content: firstContent },
      });
      const secondChild = await tx.unit.create({
        data: { ...baseChildData, content: secondContent },
      });

      // Redirect relations according to policy.
      if (policy !== "none") {
        const relations = await tx.relation.findMany({
          where: {
            OR: [
              { sourceUnitId: input.sourceUnitId },
              { targetUnitId: input.sourceUnitId },
            ],
          },
        });

        for (const rel of relations) {
          // Capture original endpoints before any update mutates the row.
          const originalSourceIsParent = rel.sourceUnitId === input.sourceUnitId;
          const originalTargetIsParent = rel.targetUnitId === input.sourceUnitId;

          if (policy === "both") {
            // Clone the same relation onto the second child BEFORE we
            // redirect the original onto the first child, so both children
            // inherit the link independently.
            await tx.relation.create({
              data: {
                type: rel.type,
                subtype: rel.subtype,
                strength: rel.strength,
                direction: rel.direction,
                layer: rel.layer,
                sourceUnitId: originalSourceIsParent
                  ? secondChild.id
                  : rel.sourceUnitId,
                targetUnitId: originalTargetIsParent
                  ? secondChild.id
                  : rel.targetUnitId,
              },
            });
          }

          if (policy === "first" || policy === "both") {
            if (originalSourceIsParent) {
              await tx.relation.update({
                where: { id: rel.id },
                data: { sourceUnitId: firstChild.id },
              });
            } else if (originalTargetIsParent) {
              await tx.relation.update({
                where: { id: rel.id },
                data: { targetUnitId: firstChild.id },
              });
            }
          } else if (policy === "second") {
            if (originalSourceIsParent) {
              await tx.relation.update({
                where: { id: rel.id },
                data: { sourceUnitId: secondChild.id },
              });
            } else if (originalTargetIsParent) {
              await tx.relation.update({
                where: { id: rel.id },
                data: { targetUnitId: secondChild.id },
              });
            }
          }
        }
      }

      // Assembly items always follow the first child (callers that
      // want the second in assemblies add it explicitly).
      await tx.assemblyItem.updateMany({
        where: { unitId: input.sourceUnitId },
        data: { unitId: firstChild.id },
      });

      // UnitContext memberships carry to both children.
      const memberships = await tx.unitContext.findMany({
        where: { unitId: input.sourceUnitId },
      });
      for (const m of memberships) {
        await tx.unitContext.create({
          data: { unitId: firstChild.id, contextId: m.contextId },
        });
        await tx.unitContext.create({
          data: { unitId: secondChild.id, contextId: m.contextId },
        });
        await tx.unitContext.delete({
          where: { unitId_contextId: { unitId: input.sourceUnitId, contextId: m.contextId } },
        });
      }

      // Archive the parent with a pointer to its children so the
      // split is auditable / reversible.
      const existingMeta =
        parent.meta && typeof parent.meta === "object" && !Array.isArray(parent.meta)
          ? (parent.meta as Record<string, unknown>)
          : {};
      await tx.unit.update({
        where: { id: input.sourceUnitId },
        data: {
          lifecycle: "archived",
          lifecycleState: "archived",
          meta: {
            ...existingMeta,
            splitInto: [firstChild.id, secondChild.id],
            splitAt: input.splitAtOffset,
          },
        },
      });

      return {
        parentUnitId: input.sourceUnitId,
        firstChildId: firstChild.id,
        secondChildId: secondChild.id,
      };
    });

    await eventBus.emit({
      type: "unit.split",
      payload: {
        parentUnitId: result.parentUnitId,
        firstChildId: result.firstChildId,
        secondChildId: result.secondChildId,
        userId: input.userId ?? "system",
      },
      timestamp: new Date(),
    });

    return result;
  }

  return { preview, split };
}

export type UnitSplitService = ReturnType<typeof createUnitSplitService>;
