import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// ─── Zod Schemas ───────────────────────────────────────────────────

const uuidSchema = z.string().uuid();

const createInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(""),
  projectId: uuidSchema,
  scope: z.enum(["private", "shared"]),
  reusable: z.boolean(),
  purposeTag: z.string().optional(),
});

const listInput = z.object({
  projectId: uuidSchema.optional(),
});

const updateInput = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  reusable: z.boolean().optional(),
});

const deleteInput = z.object({
  id: uuidSchema,
});

// ─── Router ────────────────────────────────────────────────────────

export const customRelationTypeRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      // Check for name conflict with system relation types
      const systemConflict = await ctx.db.systemRelationType.findFirst({
        where: { name: { equals: input.name, mode: "insensitive" } },
        select: { id: true },
      });

      if (systemConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `The name "${input.name}" conflicts with a system relation type.`,
        });
      }

      const customType = await ctx.db.customRelationType.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description,
          projectId: input.projectId,
          createdById: ctx.session.user.id ?? null,
          scope: input.scope,
          reusable: input.reusable,
          purposeTag: input.purposeTag ?? null,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      });

      return customType;
    }),

  list: protectedProcedure
    .input(listInput)
    .query(async ({ ctx, input }) => {
      if (!input.projectId) return [];
      return ctx.db.customRelationType.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      });
    }),

  update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, name, description, reusable } = input;

      // If renaming, check for system type conflict
      if (name !== undefined) {
        const systemConflict = await ctx.db.systemRelationType.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          select: { id: true },
        });

        if (systemConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `The name "${name}" conflicts with a system relation type.`,
          });
        }
      }

      const updated = await ctx.db.customRelationType.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(reusable !== undefined && { reusable }),
        },
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(deleteInput)
    .mutation(async ({ ctx, input }) => {
      // Look up the custom type to get its name for the relations query
      const customType = await ctx.db.customRelationType.findUnique({
        where: { id: input.id },
        select: { name: true },
      });

      if (!customType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom relation type not found.",
        });
      }

      // Set affected relations to "untyped" instead of cascade delete
      const updateResult = await ctx.db.relation.updateMany({
        where: {
          type: customType.name,
          isCustom: true,
        },
        data: {
          type: "untyped",
          isCustom: false,
          customName: null,
        },
      });

      await ctx.db.customRelationType.delete({
        where: { id: input.id },
      });

      return { deleted: true, relationsRetyped: updateResult.count };
    }),

  listSystemTypes: protectedProcedure
    .query(async ({ ctx }) => {
      const systemTypes = await ctx.db.systemRelationType.findMany({
        orderBy: { sortOrder: "asc" },
      });

      // Group by category
      const grouped = systemTypes.reduce<
        Record<string, typeof systemTypes>
      >((acc, type) => {
        const cat = type.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat]!.push(type);
        return acc;
      }, {});

      return grouped;
    }),
});
