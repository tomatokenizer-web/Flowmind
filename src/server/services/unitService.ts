import type { Prisma, PrismaClient, Lifecycle } from "@prisma/client";
import { createUnitRepository } from "@/server/repositories/unitRepository";
import { eventBus } from "@/server/events/eventBus";
import { suggestUnitType } from "@/server/services/typeHeuristicService";

export interface CreateUnitInput {
  content: string;
  projectId: string;
  unitType?: Prisma.UnitCreateInput["unitType"];
  originType?: Prisma.UnitCreateInput["originType"];
  lifecycle?: Prisma.UnitCreateInput["lifecycle"];
  quality?: Prisma.UnitCreateInput["quality"];
  certainty?: Prisma.UnitCreateInput["certainty"];
  completeness?: Prisma.UnitCreateInput["completeness"];
  abstractionLevel?: Prisma.UnitCreateInput["abstractionLevel"];
  stance?: Prisma.UnitCreateInput["stance"];
  evidenceDomain?: Prisma.UnitCreateInput["evidenceDomain"];
  scope?: Prisma.UnitCreateInput["scope"];
  aiTrustLevel?: Prisma.UnitCreateInput["aiTrustLevel"];
  energyLevel?: Prisma.UnitCreateInput["energyLevel"];
  sourceUrl?: string;
  sourceTitle?: string;
  author?: string;
  isQuote?: boolean;
  sourceSpan?: Prisma.InputJsonValue;
  parentInputId?: string;
  conversationId?: string;
  meta?: Prisma.InputJsonValue;
  // v3.14 fields
  unitKind?: Prisma.UnitCreateInput["unitKind"];
  sourceText?: string;
  lifecycleState?: Prisma.UnitCreateInput["lifecycleState"];
  voice?: Prisma.UnitCreateInput["voice"];
  authoredBy?: string;
  primaryType?: Prisma.UnitCreateInput["primaryType"];
  secondaryTypes?: Prisma.UnitCreateInput["secondaryTypes"];
  typeConfidence?: Prisma.UnitCreateInput["typeConfidence"];
  primaryEpistemicAct?: Prisma.UnitCreateInput["primaryEpistemicAct"];
  secondaryEpistemicActs?: Prisma.UnitCreateInput["secondaryEpistemicActs"];
  epistemicOrigin?: Prisma.UnitCreateInput["epistemicOrigin"];
  applicabilityScope?: Prisma.UnitCreateInput["applicabilityScope"];
  temporalValidity?: Prisma.UnitCreateInput["temporalValidity"];
  revisability?: Prisma.UnitCreateInput["revisability"];
  warrantCommunity?: Prisma.UnitCreateInput["warrantCommunity"];
  stalenessAfter?: string;
  falsificationCondition?: string;
  recurrencePeriod?: string;
}

export interface UpdateUnitInput {
  content?: string;
  unitType?: Prisma.UnitUpdateInput["unitType"];
  lifecycle?: Prisma.UnitUpdateInput["lifecycle"];
  quality?: Prisma.UnitUpdateInput["quality"];
  certainty?: Prisma.UnitUpdateInput["certainty"];
  completeness?: Prisma.UnitUpdateInput["completeness"];
  abstractionLevel?: Prisma.UnitUpdateInput["abstractionLevel"];
  stance?: Prisma.UnitUpdateInput["stance"];
  evidenceDomain?: Prisma.UnitUpdateInput["evidenceDomain"];
  scope?: Prisma.UnitUpdateInput["scope"];
  aiTrustLevel?: Prisma.UnitUpdateInput["aiTrustLevel"];
  energyLevel?: Prisma.UnitUpdateInput["energyLevel"];
  flagged?: boolean;
  pinned?: boolean;
  incubating?: boolean;
  locked?: boolean;
  actionRequired?: boolean;
  meta?: Prisma.InputJsonValue;
  // v3.14 fields
  unitKind?: Prisma.UnitUpdateInput["unitKind"];
  sourceText?: string;
  lifecycleState?: Prisma.UnitUpdateInput["lifecycleState"];
  voice?: Prisma.UnitUpdateInput["voice"];
  authoredBy?: string;
  primaryType?: Prisma.UnitUpdateInput["primaryType"];
  secondaryTypes?: Prisma.UnitUpdateInput["secondaryTypes"];
  typeConfidence?: Prisma.UnitUpdateInput["typeConfidence"];
  primaryEpistemicAct?: Prisma.UnitUpdateInput["primaryEpistemicAct"];
  secondaryEpistemicActs?: Prisma.UnitUpdateInput["secondaryEpistemicActs"];
  epistemicOrigin?: Prisma.UnitUpdateInput["epistemicOrigin"];
  applicabilityScope?: Prisma.UnitUpdateInput["applicabilityScope"];
  temporalValidity?: Prisma.UnitUpdateInput["temporalValidity"];
  revisability?: Prisma.UnitUpdateInput["revisability"];
  warrantCommunity?: Prisma.UnitUpdateInput["warrantCommunity"];
  stalenessAfter?: string;
  falsificationCondition?: string;
  recurrencePeriod?: string;
  aiReviewPending?: boolean;
  localOnly?: boolean;
  evergreenUnit?: boolean;
  controversialFlag?: boolean;
}

export interface ListUnitsInput {
  projectId: string;
  userId?: string;
  lifecycle?: string;
  unitType?: string;
  contextId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
  sortBy?: "createdAt" | "modifiedAt" | "importance";
  sortOrder?: "asc" | "desc";
}

/**
 * Thrown when a unit with identical content already exists in the project.
 * The caller (tRPC router / UI) should inspect `code` to decide whether to
 * show a "similar unit exists — continue?" prompt rather than a hard block.
 */
export class DuplicateUnitContentError extends Error {
  readonly code = "DUPLICATE_UNIT_CONTENT" as const;
  readonly existingUnitId: string;

  constructor(existingUnitId: string) {
    super("A unit with identical content already exists in this project.");
    this.name = "DuplicateUnitContentError";
    this.existingUnitId = existingUnitId;
  }
}

// Valid lifecycle transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending", "confirmed", "discarded"],
  pending: ["confirmed", "draft", "deferred", "discarded"],
  confirmed: ["draft", "complete", "archived", "discarded", "fossilized", "promoted"],
  deferred: ["pending", "draft", "discarded"],
  complete: ["confirmed", "archived", "fossilized"],
  archived: ["draft", "confirmed"],
  discarded: ["draft"],
  fossilized: ["archived"],       // Fossils can only be archived (tombstone)
  promoted: ["confirmed", "archived"], // Promoted units return to confirmed or archive
};

export function createUnitService(db: PrismaClient) {
  const repo = createUnitRepository(db);

  return {
    async create(input: CreateUnitInput, userId: string) {
      // Determine lifecycle: confirmed for user-authored, draft for AI
      const isAiOrigin =
        input.originType === "ai_generated" || input.originType === "ai_refined";

      // Auto-assign unit type via heuristics when not explicitly provided
      const typeExplicitlyProvided = input.unitType !== undefined;
      const unitType = typeExplicitlyProvided
        ? input.unitType!
        : suggestUnitType(input.content).unitType;

      // AI-generated content starts as draft for review; user-written content is confirmed immediately
      const lifecycle =
        input.lifecycle ??
        (isAiOrigin ? "draft" : "confirmed");

      const aiTrustLevel =
        input.aiTrustLevel ?? (isAiOrigin ? "inferred" : "user_authored");

      // Story 2.1: Warn (non-hard-block) on exact duplicate content within project.
      // Callers catching DuplicateUnitContentError can prompt the user to confirm.
      const duplicate = await repo.findByExactContent(input.projectId, input.content);
      if (duplicate) {
        throw new DuplicateUnitContentError(duplicate.id);
      }

      const unit = await repo.create({
        content: input.content,
        unitType,
        originType: input.originType ?? "direct_write",
        lifecycle,
        quality: input.quality ?? "raw",
        certainty: input.certainty,
        completeness: input.completeness,
        abstractionLevel: input.abstractionLevel,
        stance: input.stance,
        evidenceDomain: input.evidenceDomain,
        scope: input.scope,
        aiTrustLevel,
        energyLevel: input.energyLevel,
        sourceUrl: input.sourceUrl,
        sourceTitle: input.sourceTitle,
        author: input.author,
        isQuote: input.isQuote ?? false,
        sourceSpan: input.sourceSpan ?? undefined,
        parentInputId: input.parentInputId,
        conversationId: input.conversationId,
        meta: input.meta ?? undefined,
        // v3.14 fields — sourceText defaults to content (spec: never edited after creation)
        sourceText: input.sourceText ?? input.content,
        unitKind: input.unitKind,
        lifecycleState: input.lifecycleState ?? (lifecycle === "draft" ? "draft" : "confirmed"),
        voice: input.voice,
        authoredBy: input.authoredBy,
        primaryType: input.primaryType ?? unitType,
        secondaryTypes: input.secondaryTypes,
        typeConfidence: input.typeConfidence,
        primaryEpistemicAct: input.primaryEpistemicAct,
        secondaryEpistemicActs: input.secondaryEpistemicActs,
        epistemicOrigin: input.epistemicOrigin,
        applicabilityScope: input.applicabilityScope,
        temporalValidity: input.temporalValidity,
        revisability: input.revisability,
        warrantCommunity: input.warrantCommunity,
        stalenessAfter: input.stalenessAfter,
        falsificationCondition: input.falsificationCondition,
        recurrencePeriod: input.recurrencePeriod,
        user: { connect: { id: userId } },
        project: { connect: { id: input.projectId } },
      });

      await eventBus.emit({
        type: "unit.created",
        payload: { unitId: unit.id, userId, unit },
        timestamp: new Date(),
      });

      return unit;
    },

    async getById(id: string) {
      const unit = await repo.findById(id);
      if (!unit) return null;

      // Fire-and-forget lastAccessed — don't block the read
      void repo.update(id, { lastAccessed: new Date() }).catch(() => {});

      return unit;
    },

    async list(input: ListUnitsInput) {
      const where: Prisma.UnitWhereInput = {
        projectId: input.projectId,
        ...(input.userId ? { userId: input.userId } : {}),
      };

      if (input.lifecycle) {
        where.lifecycle = input.lifecycle as Prisma.EnumLifecycleFilter;
      }
      if (input.unitType) {
        where.unitType = input.unitType as Prisma.EnumUnitTypeFilter;
      }
      if (input.contextId) {
        where.unitContexts = {
          some: { contextId: input.contextId },
        };
      }
      if (input.search) {
        where.content = { contains: input.search, mode: "insensitive" };
      }

      const sortField = input.sortBy ?? "createdAt";
      const orderBy: Prisma.UnitOrderByWithRelationInput = {
        [sortField]: input.sortOrder ?? "desc",
      };

      return repo.findMany({
        where,
        orderBy,
        cursor: input.cursor,
        take: input.limit ?? 20,
        contextId: input.contextId,
      });
    },

    async update(id: string, input: UpdateUnitInput, userId: string) {
      // Auto-version before edit: snapshot current state
      const existing = await repo.findById(id);
      if (!existing) return null;

      if (input.content && input.content !== existing.content) {
        const nextVersion = (await repo.getLatestVersionNumber(id)) + 1;
        await repo.createVersion({
          unit: { connect: { id } },
          version: nextVersion,
          content: existing.content,
          meta: existing.meta ?? undefined,
          changeReason: "auto-version before edit",
        });
      }

      // Story 2.2: When a unit type is auto-assigned via heuristics,
      // ensure lifecycle is set to "draft" for review
      const updateInput = { ...input };
      if (updateInput.unitType && !updateInput.lifecycle) {
        updateInput.lifecycle = "draft";
      }

      const unit = await repo.update(id, updateInput);

      await eventBus.emit({
        type: "unit.updated",
        payload: { unitId: id, userId, unit, changes: updateInput as Partial<typeof unit> },
        timestamp: new Date(),
      });

      return unit;
    },

    async transitionLifecycle(
      id: string,
      targetState: string,
      userId: string,
    ) {
      const existing = await repo.findById(id);
      if (!existing) return null;

      const allowed = VALID_TRANSITIONS[existing.lifecycle];
      if (!allowed || !allowed.includes(targetState)) {
        throw new Error(
          `Invalid lifecycle transition: ${existing.lifecycle} → ${targetState}`,
        );
      }

      const unit = await repo.update(id, { lifecycle: targetState as Prisma.UnitUpdateInput["lifecycle"] });

      await eventBus.emit({
        type: "unit.lifecycleChanged",
        payload: {
          unitId: id,
          userId,
          unit,
          changes: { lifecycle: targetState as unknown as undefined },
          previousLifecycle: existing.lifecycle,
        },
        timestamp: new Date(),
      });

      // Emit specific events for fossilized/promoted transitions
      if (targetState === "fossilized") {
        await eventBus.emit({
          type: "unit.fossilized",
          payload: { unitId: id, userId, unit, changes: {}, previousLifecycle: existing.lifecycle },
          timestamp: new Date(),
        });
      } else if (targetState === "promoted") {
        await eventBus.emit({
          type: "unit.promoted",
          payload: { unitId: id, userId, unit, changes: {}, previousLifecycle: existing.lifecycle },
          timestamp: new Date(),
        });
      }

      return { unit, previousLifecycle: existing.lifecycle };
    },

    async bulkTransitionLifecycle(
      ids: string[],
      targetState: string,
      userId: string,
    ) {
      // 1. Fetch current lifecycle for all requested units (ownership-scoped)
      const units = await repo.findLifecyclesByIds(ids, userId);

      const ownedIds = new Set(units.map((u) => u.id));
      const skipped: Array<{ id: string; reason: string }> = [];

      // Flag any IDs not found / not owned
      for (const id of ids) {
        if (!ownedIds.has(id)) {
          skipped.push({ id, reason: "Not found or access denied" });
        }
      }

      // 2. Determine which current states are valid for this target
      const allowedFromStates: string[] = [];
      for (const [from, targets] of Object.entries(VALID_TRANSITIONS)) {
        if (targets.includes(targetState)) {
          allowedFromStates.push(from);
        }
      }

      // Flag units whose transition is invalid
      const eligibleIds: string[] = [];
      for (const unit of units) {
        if (allowedFromStates.includes(unit.lifecycle)) {
          eligibleIds.push(unit.id);
        } else {
          skipped.push({
            id: unit.id,
            reason: `Invalid transition: ${unit.lifecycle} -> ${targetState}`,
          });
        }
      }

      // 3. Single batch update for all eligible units
      let updatedCount = 0;
      if (eligibleIds.length > 0) {
        updatedCount = await repo.bulkUpdateLifecycle(
          eligibleIds,
          targetState as Lifecycle,
          userId,
          allowedFromStates as Lifecycle[],
        );

        // Emit events for updated units
        for (const id of eligibleIds) {
          await eventBus.emit({
            type: "unit.lifecycleChanged",
            payload: {
              unitId: id,
              userId,
              unit: undefined,
              changes: { lifecycle: targetState as unknown as undefined },
            },
            timestamp: new Date(),
          });
        }
      }

      return { updatedCount, skipped };
    },

    async archive(id: string, userId: string) {
      // Build dependency map before archiving
      const [relations, navigators] = await Promise.all([
        db.relation.findMany({
          where: { OR: [{ sourceUnitId: id }, { targetUnitId: id }] },
          select: {
            id: true, type: true, strength: true,
            sourceUnit: { select: { id: true, content: true, unitType: true } },
            targetUnit: { select: { id: true, content: true, unitType: true } },
          },
        }),
        db.navigator.findMany({
          where: { path: { has: id } },
          select: { id: true, name: true },
        }),
      ]);

      const result = await this.transitionLifecycle(id, "archived", userId);
      if (!result) return null;

      // Clear aiReviewPending on archive
      await db.unit.update({ where: { id }, data: { aiReviewPending: false } });

      await eventBus.emit({
        type: "unit.archived",
        payload: { unitId: id, userId, unit: result.unit },
        timestamp: new Date(),
      });

      return {
        unit: result.unit,
        previousLifecycle: result.previousLifecycle,
        dependencies: {
          relations: relations.map((r) => ({
            id: r.id,
            type: r.type,
            strength: r.strength,
            connectedUnit: r.sourceUnit.id === id ? r.targetUnit : r.sourceUnit,
          })),
          navigators,
        },
      };
    },

    async delete(id: string, userId: string) {
      // Clean up navigator paths that reference this unit
      const navigatorsWithUnit = await db.navigator.findMany({
        where: { path: { has: id } },
        select: { id: true, path: true },
      });
      for (const nav of navigatorsWithUnit) {
        await db.navigator.update({
          where: { id: nav.id },
          data: { path: nav.path.filter((uid) => uid !== id) },
        });
      }

      // Clean up orphaned assembly items
      await db.assemblyItem.deleteMany({
        where: { unitId: id },
      });

      const unit = await repo.delete(id);

      await eventBus.emit({
        type: "unit.deleted",
        payload: { unitId: id, userId },
        timestamp: new Date(),
      });

      return unit;
    },
  };
}

export type UnitService = ReturnType<typeof createUnitService>;
