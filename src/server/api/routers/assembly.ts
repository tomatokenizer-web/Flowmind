import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createAssemblyService } from "@/server/services/assemblyService";
import { TRPCError } from "@trpc/server";

// ─── Zod Schemas ───────────────────────────────────────────────────────────

const createAssemblySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  templateType: z.string().max(50).optional(),
});

const updateAssemblySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

const addUnitSchema = z.object({
  assemblyId: z.string().uuid(),
  unitId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
  slotName: z.string().max(100).optional(),
});

const removeUnitSchema = z.object({
  assemblyId: z.string().uuid(),
  unitId: z.string().uuid(),
});

const reorderUnitsSchema = z.object({
  assemblyId: z.string().uuid(),
  orderedUnitIds: z.array(z.string().uuid()).min(1).max(100),
});

const updateBridgeTextSchema = z.object({
  assemblyId: z.string().uuid(),
  unitId: z.string().uuid(),
  bridgeText: z.string().max(5000).nullable(),
});

const createFromTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  templateType: z.string().max(50),
  slots: z.array(
    z.object({
      name: z.string().min(1).max(100),
      position: z.number().int().min(0),
    })
  ),
});

// ─── Router ────────────────────────────────────────────────────────────────

export const assemblyRouter = createTRPCRouter({
  /**
   * Create a new assembly
   */
  create: protectedProcedure
    .input(createAssemblySchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      return service.create(input, ctx.session.user.id!);
    }),

  /**
   * Get assembly by ID with ordered items and unit data
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      const assembly = await service.getById(input.id, ctx.session.user.id!);

      if (!assembly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found",
        });
      }

      return assembly;
    }),

  /**
   * List assemblies for a project with item counts
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      return service.list(input.projectId, ctx.session.user.id!);
    }),

  /**
   * Update assembly metadata (name, description)
   */
  update: protectedProcedure
    .input(updateAssemblySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const service = createAssemblyService(ctx.db);
      const assembly = await service.update(id, data, ctx.session.user.id!);

      if (!assembly) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found",
        });
      }

      return assembly;
    }),

  /**
   * Delete an assembly
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      const deleted = await service.delete(input.id, ctx.session.user.id!);

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly not found",
        });
      }

      return { success: true };
    }),

  /**
   * Add a unit to an assembly
   * Rejects if unit.lifecycle === 'draft'
   */
  addUnit: protectedProcedure
    .input(addUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      return service.addUnit(input, ctx.session.user.id!);
    }),

  /**
   * Remove a unit from an assembly (does not delete the unit)
   */
  removeUnit: protectedProcedure
    .input(removeUnitSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      const removed = await service.removeUnit(
        input.assemblyId,
        input.unitId,
        ctx.session.user.id!
      );

      if (!removed) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit not found in assembly",
        });
      }

      return { success: true };
    }),

  /**
   * Reorder units in an assembly
   */
  reorderUnits: protectedProcedure
    .input(reorderUnitsSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      await service.reorderUnits(
        input.assemblyId,
        input.orderedUnitIds,
        ctx.session.user.id!
      );

      return { success: true };
    }),

  /**
   * Update bridge text between units
   */
  updateBridgeText: protectedProcedure
    .input(updateBridgeTextSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      const item = await service.updateBridgeText(
        input.assemblyId,
        input.unitId,
        input.bridgeText,
        ctx.session.user.id!
      );

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assembly item not found",
        });
      }

      return item;
    }),

  /**
   * Create assembly from template with pre-defined slots
   */
  createFromTemplate: protectedProcedure
    .input(createFromTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createAssemblyService(ctx.db);
      return service.createFromTemplate(input, ctx.session.user.id!);
    }),

  /**
   * Export assembly as formatted text
   */
  export: protectedProcedure
    .input(z.object({
      assemblyId: z.string().uuid(),
      format: z.enum(["essay", "presentation", "email", "social"]),
    }))
    .query(async ({ ctx, input }) => {
      const assembly = await ctx.db.assembly.findUnique({
        where: { id: input.assemblyId },
        include: {
          items: {
            orderBy: { position: "asc" },
            include: {
              unit: { select: { id: true, content: true, unitType: true } },
            },
          },
        },
      });

      if (!assembly) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });

      const units = assembly.items
        .filter((item) => item.unit !== null)
        .map((item) => ({
          content: item.unit!.content,
          type: item.unit!.unitType,
          slotName: null as string | null,
          bridgeText: item.bridgeText,
        }));

      let content = "";

      if (input.format === "essay") {
        content = units.map((u) => {
          const heading = u.slotName ? `\n## ${u.slotName}\n\n` : "\n";
          return `${heading}${u.content}${u.bridgeText ? `\n\n${u.bridgeText}` : ""}`;
        }).join("\n");
      } else if (input.format === "presentation") {
        content = units.map((u, i) => {
          return `Slide ${i + 1}${u.slotName ? ` — ${u.slotName}` : ""}\n• ${u.content}`;
        }).join("\n\n");
      } else if (input.format === "email") {
        const actionItems = units.filter((u) => u.type === "action");
        const keyPoints = units.filter((u) => u.type !== "action");
        content = `Key Points:\n${keyPoints.map((u) => `• ${u.content}`).join("\n")}`;
        if (actionItems.length > 0) {
          content += `\n\nAction Items:\n${actionItems.map((u) => `☐ ${u.content}`).join("\n")}`;
        }
      } else if (input.format === "social") {
        content = units.map((u) => {
          const truncated = u.content.length > 240 ? u.content.slice(0, 237) + "..." : u.content;
          return truncated;
        }).join("\n\n---\n\n");
      }

      return {
        content,
        format: input.format,
        unitCount: units.length,
        exportedAt: new Date(),
      };
    }),

  /**
   * Get source map for an assembly — groups units by origin type
   */
  getSourceMap: protectedProcedure
    .input(z.object({ assemblyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const assembly = await ctx.db.assembly.findUnique({
        where: { id: input.assemblyId },
        include: {
          project: { select: { userId: true } },
          items: {
            include: {
              unit: { select: { originType: true } },
            },
          },
        },
      });

      if (!assembly) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });
      if (assembly.project.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Categorize origin types into display groups
      const groupOf = (originType: string | null): string => {
        if (!originType) return "human";
        if (originType === "direct_write") return "human";
        if (originType === "ai_generated" || originType === "ai_refined") return "ai";
        if (
          originType === "external_excerpt" ||
          originType === "external_inspiration" ||
          originType === "external_summary"
        )
          return "import";
        return "decomposition";
      };

      const counts: Record<string, number> = {};
      for (const item of assembly.items) {
        const group = groupOf(item.unit?.originType ?? null);
        counts[group] = (counts[group] ?? 0) + 1;
      }

      const totalUnits = assembly.items.length;
      const sources = Object.entries(counts).map(([origin, count]) => ({
        origin,
        count,
        percentage: totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0,
      }));

      return { sources, totalUnits };
    }),

  /**
   * Propose slot mappings for a template based on unit types in a context
   */
  proposeSlotMappings: protectedProcedure
    .input(
      z.object({
        contextId: z.string().uuid(),
        templateType: z.string().max(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch units in this context via UnitContext join
      const unitContexts = await ctx.db.unitContext.findMany({
        where: { contextId: input.contextId },
        include: {
          unit: {
            select: {
              id: true,
              unitType: true,
              lifecycle: true,
              relationsAsSource: { select: { id: true } },
              relationsAsTarget: { select: { id: true } },
            },
          },
        },
      });

      const units = unitContexts
        .map((uc) => uc.unit)
        .filter((u) => u.lifecycle !== "draft" && u.lifecycle !== "archived" && u.lifecycle !== "discarded");

      // Slot → unit type heuristic mapping
      const SLOT_HEURISTICS: Record<string, { types: string[]; preferMostRelated?: boolean }> = {
        thesis: { types: ["claim"] },
        claim: { types: ["claim"] },
        introduction: { types: ["observation", "definition"] },
        evidence: { types: ["evidence"] },
        conclusion: { types: ["claim"], preferMostRelated: true },
        warrant: { types: ["claim", "evidence"] },
        rebuttal: { types: ["counterargument"] },
        abstract: { types: ["observation", "claim"] },
        methods: { types: ["action", "observation"] },
        results: { types: ["evidence", "observation"] },
        discussion: { types: ["claim", "assumption"] },
        hook: { types: ["claim", "observation", "question"] },
        problem: { types: ["observation", "question"] },
        solution: { types: ["claim", "idea"] },
        "call to action": { types: ["action"] },
      };

      // Template slot definitions (mirrors AssemblyTemplateDialog)
      const TEMPLATE_SLOTS: Record<string, string[]> = {
        essay: ["Introduction", "Body I", "Body II", "Body III", "Conclusion"],
        research_paper: ["Abstract", "Introduction", "Methods", "Results", "Discussion"],
        presentation: ["Hook", "Problem", "Solution", "Evidence", "Call to Action"],
        debate_brief: ["Claim", "Warrant I", "Warrant II", "Evidence", "Rebuttal"],
      };

      const slots = TEMPLATE_SLOTS[input.templateType] ?? [];
      const usedUnitIds = new Set<string>();
      const proposals: { slot: string; proposedUnitId: string; confidence: number }[] = [];

      for (const slot of slots) {
        const heuristic = SLOT_HEURISTICS[slot.toLowerCase().replace(/\s+[ivx]+$/i, "").trim()];
        if (!heuristic) continue;

        // Filter to units of matching types not yet proposed
        let candidates = units.filter(
          (u) => heuristic.types.includes(u.unitType) && !usedUnitIds.has(u.id)
        );

        if (candidates.length === 0) continue;

        // If preferMostRelated, sort by total relation count descending
        if (heuristic.preferMostRelated) {
          candidates = [...candidates].sort((a, b) => {
            const aRels = a.relationsAsSource.length + a.relationsAsTarget.length;
            const bRels = b.relationsAsSource.length + b.relationsAsTarget.length;
            return bRels - aRels;
          });
        }

        const picked = candidates[0]!;
        const confidence = heuristic.types[0] === picked.unitType ? 0.85 : 0.6;
        proposals.push({ slot, proposedUnitId: picked.id, confidence });
        usedUnitIds.add(picked.id);
      }

      return proposals;
    }),

  /**
   * Diff two assemblies
   */
  diff: protectedProcedure
    .input(z.object({ assemblyAId: z.string().uuid(), assemblyBId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [a, b] = await Promise.all([
        ctx.db.assembly.findUnique({ where: { id: input.assemblyAId }, include: { items: { include: { unit: true } } } }),
        ctx.db.assembly.findUnique({ where: { id: input.assemblyBId }, include: { items: { include: { unit: true } } } }),
      ]);
      if (!a || !b) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found" });

      const aIds = new Set(a.items.map((i) => i.unitId));
      const bIds = new Set(b.items.map((i) => i.unitId));
      const onlyInA = a.items.filter((i) => !bIds.has(i.unitId)).map((i) => i.unitId);
      const onlyInB = b.items.filter((i) => !aIds.has(i.unitId)).map((i) => i.unitId);
      const shared = a.items.filter((i) => bIds.has(i.unitId)).map((i) => i.unitId);

      return { onlyInA, onlyInB, shared, summary: { added: onlyInB.length, removed: onlyInA.length, shared: shared.length } };
    }),
});
