import type { PrismaClient, Prisma } from "@prisma/client";
import { createContextRepository } from "@/server/repositories/contextRepository";
import { TRPCError } from "@trpc/server";

export interface CreateContextInput {
  name: string;
  description?: string;
  projectId: string;
  parentId?: string;
}

export interface UpdateContextInput {
  name?: string;
  description?: string;
}

export type ContextMaturity = "seedling" | "developing" | "mature" | "crystallized";
export type TopologyState = "isolated" | "linear" | "clustered" | "mesh";

export function computeContextMaturity(unitCount: number): ContextMaturity {
  if (unitCount > 25) return "crystallized";
  if (unitCount >= 11) return "mature";
  if (unitCount >= 4) return "developing";
  return "seedling";
}

export function createContextService(db: PrismaClient) {
  const repo = createContextRepository(db);

  async function validateUniqueName(
    name: string,
    projectId: string,
    parentId: string | null,
    excludeId?: string,
  ) {
    const existing = await repo.findByNameInScope(name, projectId, parentId);
    if (existing && existing.id !== excludeId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `A context named "${name}" already exists in this scope`,
      });
    }
  }

  return {
    async createContext(input: CreateContextInput) {
      const parentId = input.parentId ?? null;
      await validateUniqueName(input.name, input.projectId, parentId);

      return repo.create({
        name: input.name,
        description: input.description,
        project: { connect: { id: input.projectId } },
        ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
      });
    },

    async getContextById(id: string) {
      const context = await repo.findById(id);
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }
      return context;
    },

    async listContexts(projectId: string, parentId?: string | null, userId?: string) {
      return repo.findMany(projectId, parentId, userId);
    },

    async updateContext(id: string, input: UpdateContextInput) {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      if (input.name && input.name !== existing.name) {
        await validateUniqueName(input.name, existing.projectId, existing.parentId, id);
      }

      return repo.update(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      });
    },

    async deleteContext(id: string) {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }
      return repo.delete(id);
    },

    async addUnit(unitId: string, contextId: string) {
      const result = await repo.addUnit(unitId, contextId);
      await this.recomputeMaturity(contextId);
      return result;
    },

    async removeUnit(unitId: string, contextId: string) {
      const result = await repo.removeUnit(unitId, contextId);
      await this.recomputeMaturity(contextId);
      return result;
    },

    async getUnitsForContext(contextId: string) {
      return repo.getUnitsForContext(contextId);
    },

    /**
     * Recomputes and persists the maturity level of a context based on its unit count.
     * Maturity is stored in the `snapshot` field as a prefixed label.
     * Thresholds: seedling (<4), developing (4-10), mature (11-25), crystallized (>25)
     */
    async recomputeMaturity(contextId: string): Promise<ContextMaturity> {
      const unitCount = await db.unitContext.count({ where: { contextId } });
      const maturity = computeContextMaturity(unitCount);
      await db.context.update({
        where: { id: contextId },
        data: { snapshot: maturity },
      });
      return maturity;
    },

    /**
     * Computes the tension score for a context: ratio of `contradicts` relations
     * to total relations among units in this context.
     * Returns 0 if there are no relations.
     */
    async computeTensionScore(contextId: string): Promise<number> {
      const unitIds = await db.unitContext
        .findMany({ where: { contextId }, select: { unitId: true } })
        .then((rows) => rows.map((r) => r.unitId));

      if (unitIds.length === 0) return 0;

      const [totalCount, contradictsCount] = await Promise.all([
        db.relation.count({
          where: {
            sourceUnitId: { in: unitIds },
            targetUnitId: { in: unitIds },
          },
        }),
        db.relation.count({
          where: {
            sourceUnitId: { in: unitIds },
            targetUnitId: { in: unitIds },
            type: "contradicts",
          },
        }),
      ]);

      if (totalCount === 0) return 0;
      return contradictsCount / totalCount;
    },

    /**
     * Computes the topology state of a context based on relation patterns.
     * Simplified version (Phase 3 will have full implementation).
     * - "isolated": fewer than 3 relations total
     * - "linear": most units have ≤ 2 connections
     * - "clustered": some units have > 4 connections
     * - "mesh": average connections per unit > 3
     */
    async computeTopologyState(contextId: string): Promise<TopologyState> {
      const unitIds = await db.unitContext
        .findMany({ where: { contextId }, select: { unitId: true } })
        .then((rows) => rows.map((r) => r.unitId));

      if (unitIds.length === 0) return "isolated";

      const relations = await db.relation.findMany({
        where: {
          sourceUnitId: { in: unitIds },
          targetUnitId: { in: unitIds },
        },
        select: { sourceUnitId: true, targetUnitId: true },
      });

      if (relations.length < 3) return "isolated";

      // Count connections per unit (undirected)
      const connectionCount = new Map<string, number>();
      for (const unitId of unitIds) {
        connectionCount.set(unitId, 0);
      }
      for (const rel of relations) {
        connectionCount.set(rel.sourceUnitId, (connectionCount.get(rel.sourceUnitId) ?? 0) + 1);
        connectionCount.set(rel.targetUnitId, (connectionCount.get(rel.targetUnitId) ?? 0) + 1);
      }

      const counts = Array.from(connectionCount.values());
      const totalConnections = counts.reduce((sum, c) => sum + c, 0);
      const avgConnections = totalConnections / unitIds.length;
      const hasHighDegree = counts.some((c) => c > 4);

      if (hasHighDegree) return "clustered";
      if (avgConnections > 3) return "mesh";
      return "linear";
    },

    /**
     * Reorder sibling contexts within the same parent.
     * @param orderedIds - Array of context IDs in desired display order
     * @param projectId - Project ID to verify ownership
     * @param parentId - Parent context ID (null for root-level)
     */
    async reorderContexts(orderedIds: string[], projectId: string, parentId: string | null) {
      // Validate all IDs belong to the same parent scope
      const siblings = await repo.findMany(projectId, parentId);
      const siblingIds = new Set(siblings.map((s) => s.id));
      for (const id of orderedIds) {
        if (!siblingIds.has(id)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Context ${id} does not belong to the specified parent scope`,
          });
        }
      }
      await repo.reorderSiblings(orderedIds);
    },

    /**
     * Move a context to a new parent (re-parent).
     */
    async moveContext(id: string, newParentId: string | null, projectId: string) {
      const existing = await repo.findById(id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      // Prevent moving a context into itself or its own descendants
      if (newParentId) {
        let current = newParentId;
        const visited = new Set<string>();
        while (current) {
          if (current === id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot move a context into its own descendant",
            });
          }
          if (visited.has(current)) break;
          visited.add(current);
          const parent = await repo.findById(current);
          current = parent?.parentId ?? "";
        }
      }

      // Validate unique name in new scope
      await validateUniqueName(existing.name, projectId, newParentId, id);

      return repo.moveToParent(id, newParentId);
    },

    async getMergeConflicts(contextIdA: string, contextIdB: string) {
      // Find units that exist in both contexts
      const [unitsA, unitsB] = await Promise.all([
        db.unitContext.findMany({ where: { contextId: contextIdA }, select: { unitId: true } }),
        db.unitContext.findMany({ where: { contextId: contextIdB }, select: { unitId: true } }),
      ]);
      const unitIdsA = new Set(unitsA.map((u) => u.unitId));
      const sharedUnitIds = unitsB.filter((u) => unitIdsA.has(u.unitId)).map((u) => u.unitId);

      if (sharedUnitIds.length === 0) return [];

      // Check for perspective conflicts on shared units
      const [perspA, perspB] = await Promise.all([
        db.unitPerspective.findMany({
          where: { contextId: contextIdA, unitId: { in: sharedUnitIds } },
          include: { unit: { select: { id: true, content: true, unitType: true } } },
        }),
        db.unitPerspective.findMany({
          where: { contextId: contextIdB, unitId: { in: sharedUnitIds } },
          include: { unit: { select: { id: true, content: true, unitType: true } } },
        }),
      ]);

      const perspMapA = new Map(perspA.map((p) => [p.unitId, p]));
      const perspMapB = new Map(perspB.map((p) => [p.unitId, p]));

      const conflicts: Array<{
        unitId: string;
        unitContent: string;
        unitType: string;
        perspectiveA: { type: string | null; stance: string; importance: number } | null;
        perspectiveB: { type: string | null; stance: string; importance: number } | null;
      }> = [];

      for (const unitId of sharedUnitIds) {
        const pA = perspMapA.get(unitId);
        const pB = perspMapB.get(unitId);
        if (!pA && !pB) continue;

        const hasDiff =
          pA?.type !== pB?.type ||
          pA?.stance !== pB?.stance ||
          pA?.importance !== pB?.importance;

        if (hasDiff) {
          const unit = pA?.unit ?? pB?.unit;
          conflicts.push({
            unitId,
            unitContent: unit?.content ?? "",
            unitType: unit?.unitType ?? "claim",
            perspectiveA: pA ? { type: pA.type, stance: pA.stance, importance: pA.importance } : null,
            perspectiveB: pB ? { type: pB.type, stance: pB.stance, importance: pB.importance } : null,
          });
        }
      }

      return conflicts;
    },

    async splitContext(input: {
      contextId: string;
      subContextA: { name: string; unitIds: string[] };
      subContextB: { name: string; unitIds: string[] };
      projectId: string;
    }) {
      const existing = await repo.findById(input.contextId);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      // Sub-contexts go under original (original becomes parent per AC#1)
      await validateUniqueName(input.subContextA.name, input.projectId, input.contextId);
      await validateUniqueName(input.subContextB.name, input.projectId, input.contextId);

      return db.$transaction(async (tx) => {
        const txRepo = createContextRepository(tx as unknown as PrismaClient);

        const contextA = await txRepo.create({
          name: input.subContextA.name,
          project: { connect: { id: input.projectId } },
          parent: { connect: { id: input.contextId } },
        });

        const contextB = await txRepo.create({
          name: input.subContextB.name,
          project: { connect: { id: input.projectId } },
          parent: { connect: { id: input.contextId } },
        });

        // Assign units to sub-context A
        for (const unitId of input.subContextA.unitIds) {
          await tx.unitContext.upsert({
            where: { unitId_contextId: { unitId, contextId: contextA.id } },
            create: { unitId, contextId: contextA.id },
            update: {},
          });
        }

        // Assign units to sub-context B
        for (const unitId of input.subContextB.unitIds) {
          await tx.unitContext.upsert({
            where: { unitId_contextId: { unitId, contextId: contextB.id } },
            create: { unitId, contextId: contextB.id },
            update: {},
          });
        }

        // Units not assigned to either remain in parent (AC#2) — no action needed

        // Preserve relations for units that land in the same sub-context.
        // Relations between A-only units → re-point perspectiveId to new sub-context A perspective.
        // Relations between B-only units → re-point perspectiveId to new sub-context B perspective.
        // Cross-relations (A↔B) stay linked to parent perspectives (no change needed).
        const setA = new Set(input.subContextA.unitIds);
        const setB = new Set(input.subContextB.unitIds);

        // Fetch parent perspectives for units going into A or B
        const parentPerspectives = await tx.unitPerspective.findMany({
          where: {
            contextId: input.contextId,
            unitId: { in: [...input.subContextA.unitIds, ...input.subContextB.unitIds] },
          },
        });
        const parentPerspIdsForA = parentPerspectives
          .filter((p) => setA.has(p.unitId))
          .map((p) => p.id);
        const parentPerspIdsForB = parentPerspectives
          .filter((p) => setB.has(p.unitId))
          .map((p) => p.id);

        // Fetch new sub-context perspectives (copy from parent for each sub-context)
        await tx.unitPerspective.createMany({
          data: parentPerspectives
            .filter((p) => setA.has(p.unitId))
            .map((p) => ({
              unitId: p.unitId, contextId: contextA.id,
              type: p.type, stance: p.stance, importance: p.importance,
              note: p.note, canvasX: p.canvasX, canvasY: p.canvasY, canvasZoom: p.canvasZoom,
            })),
          skipDuplicates: true,
        });
        await tx.unitPerspective.createMany({
          data: parentPerspectives
            .filter((p) => setB.has(p.unitId))
            .map((p) => ({
              unitId: p.unitId, contextId: contextB.id,
              type: p.type, stance: p.stance, importance: p.importance,
              note: p.note, canvasX: p.canvasX, canvasY: p.canvasY, canvasZoom: p.canvasZoom,
            })),
          skipDuplicates: true,
        });

        // Load the newly created sub-context perspectives to get their IDs
        const [newPerspA, newPerspB] = await Promise.all([
          tx.unitPerspective.findMany({ where: { contextId: contextA.id } }),
          tx.unitPerspective.findMany({ where: { contextId: contextB.id } }),
        ]);
        const newPerspIdByUnitA = new Map(newPerspA.map((p) => [p.unitId, p.id]));
        const newPerspIdByUnitB = new Map(newPerspB.map((p) => [p.unitId, p.id]));

        // Remap relations whose perspectiveId belongs to A-only or B-only parent perspectives
        const allParentPerspIds = [...parentPerspIdsForA, ...parentPerspIdsForB];
        if (allParentPerspIds.length > 0) {
          const relationsToRemap = await tx.relation.findMany({
            where: { perspectiveId: { in: allParentPerspIds } },
          });

          for (const rel of relationsToRemap) {
            const srcInA = setA.has(rel.sourceUnitId);
            const srcInB = setB.has(rel.sourceUnitId);
            const tgtInA = setA.has(rel.targetUnitId);
            const tgtInB = setB.has(rel.targetUnitId);

            if ((srcInA || tgtInA) && !srcInB && !tgtInB) {
              // Both endpoints in A — re-point to new sub-context A perspective
              const newPerspId =
                newPerspIdByUnitA.get(rel.sourceUnitId) ??
                newPerspIdByUnitA.get(rel.targetUnitId);
              if (newPerspId) {
                await tx.relation.update({ where: { id: rel.id }, data: { perspectiveId: newPerspId } });
              }
            } else if ((srcInB || tgtInB) && !srcInA && !tgtInA) {
              // Both endpoints in B — re-point to new sub-context B perspective
              const newPerspId =
                newPerspIdByUnitB.get(rel.sourceUnitId) ??
                newPerspIdByUnitB.get(rel.targetUnitId);
              if (newPerspId) {
                await tx.relation.update({ where: { id: rel.id }, data: { perspectiveId: newPerspId } });
              }
            }
            // Cross A↔B relations: perspectiveId keeps pointing to parent context perspective
          }
        }

        return { contextA, contextB };
      });
    },

    async mergeContexts(input: {
      contextIdA: string;
      contextIdB: string;
      mergedName: string;
      conflictResolutions?: Array<{ unitId: string; keepFrom: "A" | "B" }>;
    }) {
      const [ctxA, ctxB] = await Promise.all([
        repo.findById(input.contextIdA),
        repo.findById(input.contextIdB),
      ]);

      if (!ctxA) throw new TRPCError({ code: "NOT_FOUND", message: "Context A not found" });
      if (!ctxB) throw new TRPCError({ code: "NOT_FOUND", message: "Context B not found" });

      return db.$transaction(async (tx) => {
        const txRepo = createContextRepository(tx as unknown as PrismaClient);

        // Create merged context
        const merged = await txRepo.create({
          name: input.mergedName,
          project: { connect: { id: ctxA.projectId } },
          ...(ctxA.parentId ? { parent: { connect: { id: ctxA.parentId } } } : {}),
        });

        // Gather all units from both contexts
        const [unitsA, unitsB] = await Promise.all([
          tx.unitContext.findMany({ where: { contextId: input.contextIdA } }),
          tx.unitContext.findMany({ where: { contextId: input.contextIdB } }),
        ]);

        // Batch-create unit links (deduplicated)
        const addedUnits = new Set<string>();
        const unitContextData: Array<{ unitId: string; contextId: string }> = [];
        for (const uc of [...unitsA, ...unitsB]) {
          if (!addedUnits.has(uc.unitId)) {
            addedUnits.add(uc.unitId);
            unitContextData.push({ unitId: uc.unitId, contextId: merged.id });
          }
        }
        if (unitContextData.length > 0) {
          await tx.unitContext.createMany({ data: unitContextData, skipDuplicates: true });
        }

        // Copy perspectives, resolving conflicts
        const resolutionMap = new Map(
          (input.conflictResolutions ?? []).map((r) => [r.unitId, r.keepFrom]),
        );

        const [perspA, perspB] = await Promise.all([
          tx.unitPerspective.findMany({ where: { contextId: input.contextIdA } }),
          tx.unitPerspective.findMany({ where: { contextId: input.contextIdB } }),
        ]);

        const perspMapB = new Map(perspB.map((p) => [p.unitId, p]));
        const copiedUnits = new Set<string>();
        const perspectiveData: Prisma.UnitPerspectiveCreateManyInput[] = [];

        // Process A perspectives
        for (const p of perspA) {
          const bConflict = perspMapB.get(p.unitId);
          const keepFrom = resolutionMap.get(p.unitId);
          if (bConflict && keepFrom === "B") continue;
          perspectiveData.push({
            unitId: p.unitId, contextId: merged.id,
            type: p.type, stance: p.stance, importance: p.importance,
            note: p.note, canvasX: p.canvasX, canvasY: p.canvasY, canvasZoom: p.canvasZoom,
          });
          copiedUnits.add(p.unitId);
        }

        // Process B perspectives (only those not already copied)
        for (const p of perspB) {
          if (copiedUnits.has(p.unitId)) continue;
          perspectiveData.push({
            unitId: p.unitId, contextId: merged.id,
            type: p.type, stance: p.stance, importance: p.importance,
            note: p.note, canvasX: p.canvasX, canvasY: p.canvasY, canvasZoom: p.canvasZoom,
          });
        }

        if (perspectiveData.length > 0) {
          await tx.unitPerspective.createMany({ data: perspectiveData, skipDuplicates: true });
        }

        // Preserve relations: remap perspectiveId from old A/B perspectives → new merged perspectives.
        // Build a map from old perspective ID → new merged perspective ID (keyed by unitId).
        const newMergedPersp = await tx.unitPerspective.findMany({
          where: { contextId: merged.id },
        });
        const newMergedPerspByUnit = new Map(newMergedPersp.map((p) => [p.unitId, p.id]));

        const oldPerspIds = [...perspA, ...perspB].map((p) => p.id);
        // Build old perspective ID → unitId lookup
        const oldPerspUnitMap = new Map<string, string>(
          [...perspA, ...perspB].map((p) => [p.id, p.unitId]),
        );

        if (oldPerspIds.length > 0) {
          const relationsToRemap = await tx.relation.findMany({
            where: { perspectiveId: { in: oldPerspIds } },
          });

          for (const rel of relationsToRemap) {
            if (!rel.perspectiveId) continue;
            const unitId = oldPerspUnitMap.get(rel.perspectiveId);
            if (!unitId) continue;
            const newPerspId = newMergedPerspByUnit.get(unitId);
            if (newPerspId) {
              await tx.relation.update({
                where: { id: rel.id },
                data: { perspectiveId: newPerspId },
              });
            }
          }
        }

        // Move children of both contexts to merged
        await tx.context.updateMany({
          where: { parentId: input.contextIdA },
          data: { parentId: merged.id },
        });
        await tx.context.updateMany({
          where: { parentId: input.contextIdB },
          data: { parentId: merged.id },
        });

        // Delete originals
        await tx.context.delete({ where: { id: input.contextIdA } });
        await tx.context.delete({ where: { id: input.contextIdB } });

        return txRepo.findById(merged.id);
      }, { timeout: 30000 });
    },
  };
}
