import type { Prisma, PrismaClient } from "@prisma/client";
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
}

export interface ListUnitsInput {
  projectId: string;
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
  confirmed: ["draft", "complete", "archived", "discarded"],
  deferred: ["pending", "draft", "discarded"],
  complete: ["confirmed", "archived"],
  archived: ["draft", "confirmed"],
  discarded: ["draft"],
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

      // Touch lastAccessed
      await repo.update(id, { lastAccessed: new Date() }).catch(() => {
        // Non-critical, don't fail the read
      });

      return unit;
    },

    async list(input: ListUnitsInput) {
      const where: Prisma.UnitWhereInput = {
        projectId: input.projectId,
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
        },
        timestamp: new Date(),
      });

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
          targetState,
          userId,
          allowedFromStates,
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
      const result = await this.transitionLifecycle(id, "archived", userId);
      if (!result) return null;

      await eventBus.emit({
        type: "unit.archived",
        payload: { unitId: id, userId, unit: result.unit },
        timestamp: new Date(),
      });

      return result.unit;
    },

    async delete(id: string, userId: string) {
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
