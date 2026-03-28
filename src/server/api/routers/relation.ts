import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const relationRouter = createTRPCRouter({
  // ---- list relations for a unit ----
  list: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        type: z.string().optional(),
        layer: z.number().int().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify ownership
      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { project: { select: { userId: true } } },
      });
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (unit.project.userId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your unit" });

      // Build type filter — optionally join with SystemRelationType for layer filtering
      let typeFilter: string[] | undefined;
      if (input.layer !== undefined) {
        const systemTypes = await ctx.db.systemRelationType.findMany({
          where: { layer: input.layer },
          select: { name: true },
        });
        typeFilter = systemTypes.map((t) => t.name);
      }

      const where = {
        OR: [{ sourceUnitId: input.unitId }, { targetUnitId: input.unitId }],
        ...(input.type ? { type: input.type } : {}),
        ...(typeFilter ? { type: { in: typeFilter } } : {}),
      };

      return ctx.db.relation.findMany({
        where,
        include: {
          sourceUnit: { select: { id: true, content: true, primaryType: true } },
          targetUnit: { select: { id: true, content: true, primaryType: true } },
          perspective: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // ---- create ----
  create: protectedProcedure
    .input(
      z.object({
        sourceUnitId: z.string().uuid(),
        targetUnitId: z.string().uuid(),
        type: z.string().min(1).max(50),
        fromType: z.string().max(50).optional(),
        strength: z.number().min(0).max(1).default(0.5),
        direction: z.enum(["one_way", "bidirectional"]).default("one_way"),
        nsDirection: z
          .enum(["nucleus_to_satellite", "satellite_to_nucleus", "multinuclear"])
          .optional(),
        purpose: z.array(z.string()).optional(),
        perspectiveId: z.string().uuid().optional(),
        createdBy: z
          .enum(["user", "ai_suggested_confirmed", "ai_auto"])
          .default("user"),
        isCustom: z.boolean().default(false),
        customName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify both units exist and belong to the same user
      const [source, target] = await Promise.all([
        ctx.db.unit.findUnique({
          where: { id: input.sourceUnitId },
          select: { id: true, project: { select: { userId: true } } },
        }),
        ctx.db.unit.findUnique({
          where: { id: input.targetUnitId },
          select: { id: true, project: { select: { userId: true } } },
        }),
      ]);

      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Source unit not found" });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Target unit not found" });
      if (source.project.userId !== userId || target.project.userId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your units" });

      const isLoopback = input.sourceUnitId === input.targetUnitId;

      return ctx.db.relation.create({
        data: {
          ...input,
          purpose: input.purpose ?? [],
          isLoopback,
        },
      });
    }),

  // ---- update ----
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        type: z.string().min(1).max(50).optional(),
        strength: z.number().min(0).max(1).optional(),
        maturity: z.string().max(20).optional(),
        direction: z.enum(["one_way", "bidirectional"]).optional(),
        nsDirection: z
          .enum(["nucleus_to_satellite", "satellite_to_nucleus", "multinuclear"])
          .optional(),
        purpose: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const relation = await ctx.db.relation.findUnique({
        where: { id: input.id },
        select: { sourceUnit: { select: { project: { select: { userId: true } } } } },
      });
      if (!relation) throw new TRPCError({ code: "NOT_FOUND", message: "Relation not found" });
      if (relation.sourceUnit.project.userId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your relation" });

      const { id, ...data } = input;
      return ctx.db.relation.update({ where: { id }, data });
    }),

  // ---- delete (relations CAN be deleted) ----
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const relation = await ctx.db.relation.findUnique({
        where: { id: input.id },
        select: { sourceUnit: { select: { project: { select: { userId: true } } } } },
      });
      if (!relation) throw new TRPCError({ code: "NOT_FOUND", message: "Relation not found" });
      if (relation.sourceUnit.project.userId !== userId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your relation" });

      return ctx.db.relation.delete({ where: { id: input.id } });
    }),

  // ---- bulkCreate (for AI pipeline pass 5-6) ----
  bulkCreate: protectedProcedure
    .input(
      z.object({
        relations: z
          .array(
            z.object({
              sourceUnitId: z.string().uuid(),
              targetUnitId: z.string().uuid(),
              type: z.string().min(1).max(50),
              fromType: z.string().max(50).optional(),
              strength: z.number().min(0).max(1).default(0.5),
              direction: z.enum(["one_way", "bidirectional"]).default("one_way"),
              nsDirection: z
                .enum(["nucleus_to_satellite", "satellite_to_nucleus", "multinuclear"])
                .optional(),
              purpose: z.array(z.string()).optional(),
              perspectiveId: z.string().uuid().optional(),
              createdBy: z
                .enum(["user", "ai_suggested_confirmed", "ai_auto"])
                .default("ai_auto"),
            }),
          )
          .min(1)
          .max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Collect all unique unit IDs for a single ownership check
      const unitIds = new Set<string>();
      for (const r of input.relations) {
        unitIds.add(r.sourceUnitId);
        unitIds.add(r.targetUnitId);
      }

      const units = await ctx.db.unit.findMany({
        where: { id: { in: [...unitIds] } },
        select: { id: true, project: { select: { userId: true } } },
      });

      const unitMap = new Map(units.map((u) => [u.id, u]));

      for (const uid of unitIds) {
        const unit = unitMap.get(uid);
        if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: `Unit ${uid} not found` });
        if (unit.project.userId !== userId)
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your unit" });
      }

      const data = input.relations.map((r) => ({
        ...r,
        purpose: r.purpose ?? [],
        isLoopback: r.sourceUnitId === r.targetUnitId,
      }));

      const result = await ctx.db.relation.createMany({ data });
      return { count: result.count };
    }),

  // ---- getSystemTypes (for UI type selector) ----
  getSystemTypes: protectedProcedure
    .input(z.object({ layer: z.number().int().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.systemRelationType.findMany({
        where: input?.layer !== undefined ? { layer: input.layer } : {},
        orderBy: [{ layer: "asc" }, { sortOrder: "asc" }],
      });
    }),
});
