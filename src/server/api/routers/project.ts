import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createScaffoldUnits } from "@/server/services/scaffoldService";

// Input schemas
const createProjectInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  purpose: z.string().optional(),
  templateId: z.string().uuid().optional(),
  constraintLevel: z.enum(["strict", "guided", "open"]).default("guided"),
});

const updateProjectInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  constraintLevel: z.enum(["strict", "guided", "open"]).optional(),
});

export const projectRouter = createTRPCRouter({
  /**
   * Get or create the user's default project.
   * Every user gets exactly one auto-created project on first use.
   */
  getOrCreateDefault: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    // Try to find existing project
    const existing = await ctx.db.project.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    if (existing) return existing;

    // Auto-create default project
    const created = await ctx.db.project.create({
      data: {
        name: "My Thoughts",
        userId,
        constraintLevel: "guided",
      },
      select: { id: true, name: true },
    });

    return created;
  }),

  /**
   * Create a new project
   */
  create: protectedProcedure
    .input(createProjectInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Create the project
      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          userId,
          templateId: input.templateId,
          constraintLevel: input.constraintLevel,
          type: input.purpose,
        },
        include: {
          template: true,
        },
      });

      // If a template is selected, create scaffold units
      if (input.templateId && project.template) {
        const config = project.template.config as {
          scaffoldQuestions?: Array<{ type: string; content: string; placeholder?: boolean }>;
        };
        if (config.scaffoldQuestions) {
          await createScaffoldUnits(project.id, config, userId, ctx.db);
        }
      }

      return {
        id: project.id,
        name: project.name,
        constraintLevel: project.constraintLevel,
        templateId: project.templateId,
        templateName: project.template?.name ?? null,
      };
    }),

  /**
   * List all projects for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const projects = await ctx.db.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        constraintLevel: true,
        templateId: true,
        createdAt: true,
        updatedAt: true,
        template: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            contexts: true,
            units: true,
          },
        },
      },
    });

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      purpose: p.type,
      constraintLevel: p.constraintLevel as "strict" | "guided" | "open",
      templateId: p.templateId,
      templateName: p.template?.name ?? null,
      templateSlug: p.template?.slug ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      contextCount: p._count.contexts,
      unitCount: p._count.units,
    }));
  }),

  /**
   * Get a single project by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const project = await ctx.db.project.findFirst({
        where: { id: input.id, userId },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              slug: true,
              config: true,
            },
          },
          _count: {
            select: {
              contexts: true,
              units: true,
              assemblies: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return {
        id: project.id,
        name: project.name,
        purpose: project.type,
        constraintLevel: project.constraintLevel as "strict" | "guided" | "open",
        templateId: project.templateId,
        template: project.template,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        contextCount: project._count.contexts,
        unitCount: project._count.units,
        assemblyCount: project._count.assemblies,
      };
    }),

  /**
   * Update a project
   */
  update: protectedProcedure
    .input(updateProjectInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify ownership
      const existing = await ctx.db.project.findFirst({
        where: { id: input.id, userId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const updated = await ctx.db.project.update({
        where: { id: input.id },
        data: {
          name: input.name,
          constraintLevel: input.constraintLevel,
        },
        select: {
          id: true,
          name: true,
          constraintLevel: true,
        },
      });

      return updated;
    }),

  /**
   * Delete a project
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify ownership
      const existing = await ctx.db.project.findFirst({
        where: { id: input.id, userId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Check if this is the user's only project
      const projectCount = await ctx.db.project.count({
        where: { userId },
      });

      if (projectCount <= 1) {
        throw new Error("Cannot delete the only project");
      }

      await ctx.db.project.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get gap detection for a project (scaffold question completion)
   */
  getGaps: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
        include: {
          template: true,
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      if (!project.template) {
        return {
          hasTemplate: false,
          answered: [],
          unanswered: [],
          completeness: 1,
          gapRules: [],
        };
      }

      const config = project.template.config as {
        scaffoldQuestions?: Array<{ type: string; content: string; placeholder?: boolean }>;
        gapDetectionRules?: string[];
      };

      if (!config.scaffoldQuestions) {
        return {
          hasTemplate: true,
          answered: [],
          unanswered: [],
          completeness: 1,
          gapRules: config.gapDetectionRules ?? [],
        };
      }

      // Get all scaffold units for this project
      const scaffoldUnits = await ctx.db.unit.findMany({
        where: {
          projectId: input.projectId,
          meta: {
            path: ["scaffold"],
            equals: true,
          },
        },
        select: {
          id: true,
          content: true,
          lifecycle: true,
          meta: true,
        },
      });

      // Check which scaffold questions have been answered (confirmed)
      const answered: string[] = [];
      const unanswered: string[] = [];

      for (const question of config.scaffoldQuestions) {
        const matchingUnit = scaffoldUnits.find(
          (u) => (u.meta as { scaffoldQuestion?: string })?.scaffoldQuestion === question.content
        );

        if (matchingUnit && matchingUnit.lifecycle === "confirmed") {
          answered.push(question.content);
        } else {
          unanswered.push(question.content);
        }
      }

      const total = config.scaffoldQuestions.length;
      const completeness = total > 0 ? answered.length / total : 1;

      return {
        hasTemplate: true,
        answered,
        unanswered,
        completeness,
        gapRules: config.gapDetectionRules ?? [],
      };
    }),

  // ─── Story 9.7: Project-level dashboard stats ──────────────────
  getProjectStats: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (!input.projectId) return null;
      const userId = ctx.session.user.id!;

      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
        include: {
          template: { select: { name: true, config: true } },
          _count: { select: { units: true, contexts: true, assemblies: true } },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Most active context (by unit count)
      const contexts = await ctx.db.context.findMany({
        where: { projectId: input.projectId },
        select: {
          id: true,
          name: true,
          _count: { select: { unitContexts: true } },
        },
        orderBy: { unitContexts: { _count: "desc" } },
        take: 1,
      });

      const mostActiveContext = contexts[0]
        ? { id: contexts[0].id, name: contexts[0].name, unitCount: contexts[0]._count.unitContexts }
        : null;

      // Template completion progress (scaffold questions)
      let templateCompletion: { templateName: string; answered: number; total: number; pct: number } | null = null;
      if (project.template) {
        const config = project.template.config as {
          scaffoldQuestions?: Array<{ content: string }>;
        };
        const total = config.scaffoldQuestions?.length ?? 0;
        if (total > 0) {
          const answeredCount = await ctx.db.unit.count({
            where: {
              projectId: input.projectId,
              lifecycle: "confirmed",
              meta: { path: ["scaffold"], equals: true },
            },
          });
          templateCompletion = {
            templateName: project.template.name,
            answered: Math.min(answeredCount, total),
            total,
            pct: Math.round((Math.min(answeredCount, total) / total) * 100),
          };
        }
      }

      return {
        totalUnits: project._count.units,
        contextCount: project._count.contexts,
        assemblyCount: project._count.assemblies,
        mostActiveContext,
        templateCompletion,
      };
    }),

  /**
   * Get completeness stats for a project
   */
  getCompletenessStats: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (!input.projectId) return null;
      const userId = ctx.session.user.id!;

      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Get unit stats by lifecycle
      const unitStats = await ctx.db.unit.groupBy({
        by: ["lifecycle"],
        where: { projectId: input.projectId },
        _count: true,
      });

      const stats = {
        draft: 0,
        pending: 0,
        confirmed: 0,
        deferred: 0,
        complete: 0,
        archived: 0,
        discarded: 0,
        fossilized: 0,
        promoted: 0,
      };

      for (const s of unitStats) {
        stats[s.lifecycle] = s._count;
      }

      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      const active = stats.confirmed + stats.complete;
      const completeness = total > 0 ? active / total : 0;

      return {
        total,
        stats,
        completeness,
        hasContent: total > 0,
      };
    }),
});
