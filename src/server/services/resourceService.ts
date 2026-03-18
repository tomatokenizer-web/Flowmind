import type { Prisma, PrismaClient, ResourceType } from "@prisma/client";
import { createResourceRepository } from "@/server/repositories/resourceRepository";
import { eventBus } from "@/server/events/eventBus";
import { uploadFile, deleteFile, validateFile } from "./storageService";

export interface CreateResourceInput {
  resourceType: ResourceType;
  url: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  metadata?: Prisma.InputJsonValue;
  lifecycle?: "draft" | "pending" | "confirmed";
  unitId?: string;
}

export interface UploadResourceInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  resourceType: ResourceType;
  metadata?: Prisma.InputJsonValue;
  lifecycle?: "draft" | "pending" | "confirmed";
  unitId?: string;
}

export interface ListResourcesInput {
  userId: string;
  resourceType?: ResourceType;
  lifecycle?: string;
  cursor?: string;
  limit?: number;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending", "discarded"],
  pending: ["confirmed", "draft"],
  confirmed: ["draft"],
};

export function createResourceService(db: PrismaClient) {
  const repo = createResourceRepository(db);

  return {
    async upload(input: UploadResourceInput, userId: string) {
      validateFile(input.buffer.length, input.mimeType);

      const { url, size } = await uploadFile(
        input.buffer,
        input.fileName,
        input.mimeType,
      );

      const resource = await repo.create({
        resourceType: input.resourceType,
        url,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: size,
        metadata: input.metadata ?? undefined,
        lifecycle: input.lifecycle ?? "confirmed",
        user: { connect: { id: userId } },
      });

      if (input.unitId) {
        await repo.linkToUnit(resource.id, input.unitId);
      }

      await eventBus.emit({
        type: "resource.created",
        payload: { resourceId: resource.id, userId },
        timestamp: new Date(),
      });

      return resource;
    },

    async create(input: CreateResourceInput, userId: string) {
      const resource = await repo.create({
        resourceType: input.resourceType,
        url: input.url,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        metadata: input.metadata ?? undefined,
        lifecycle: input.lifecycle ?? "confirmed",
        user: { connect: { id: userId } },
      });

      if (input.unitId) {
        await repo.linkToUnit(resource.id, input.unitId);
      }

      await eventBus.emit({
        type: "resource.created",
        payload: { resourceId: resource.id, userId },
        timestamp: new Date(),
      });

      return resource;
    },

    async getById(id: string) {
      return repo.findById(id);
    },

    async list(input: ListResourcesInput) {
      const where: Prisma.ResourceUnitWhereInput = {
        userId: input.userId,
      };
      if (input.resourceType) {
        where.resourceType = input.resourceType;
      }
      if (input.lifecycle) {
        where.lifecycle = input.lifecycle as Prisma.EnumLifecycleFilter;
      }

      return repo.findMany({
        where,
        cursor: input.cursor,
        take: input.limit ?? 20,
      });
    },

    async delete(id: string, userId: string) {
      const existing = await repo.findById(id);
      if (!existing) return null;

      // Clean up stored file
      if (existing.url && !existing.url.startsWith("http")) {
        await deleteFile(existing.url);
      }

      const resource = await repo.delete(id);

      await eventBus.emit({
        type: "resource.deleted",
        payload: { resourceId: id, userId },
        timestamp: new Date(),
      });

      return resource;
    },

    async linkToUnit(resourceId: string, unitId: string, role?: string) {
      return repo.linkToUnit(resourceId, unitId, role);
    },

    async unlinkFromUnit(resourceId: string, unitId: string) {
      return repo.unlinkFromUnit(resourceId, unitId);
    },

    async getByUnitId(unitId: string) {
      return repo.findByUnitId(unitId);
    },

    async transitionLifecycle(id: string, targetState: string, userId: string) {
      const existing = await repo.findById(id);
      if (!existing) return null;

      const allowed = VALID_TRANSITIONS[existing.lifecycle];
      if (!allowed || !allowed.includes(targetState)) {
        throw new Error(
          `Invalid lifecycle transition: ${existing.lifecycle} → ${targetState}`,
        );
      }

      return repo.update(id, {
        lifecycle: targetState as Prisma.ResourceUnitUpdateInput["lifecycle"],
      });
    },
  };
}

export type ResourceService = ReturnType<typeof createResourceService>;
