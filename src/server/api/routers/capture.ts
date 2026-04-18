import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createUnitService, DuplicateUnitContentError } from "@/server/services/unitService";
import { createPipelineService } from "@/server/services/pipelineService";
import { createImportPipelineService } from "@/server/services/importPipelineService";
import { inferUnitType } from "@/server/services/typeHeuristicService";
import { TRPCError } from "@trpc/server";
import type { UnitType } from "@prisma/client";

const captureSubmitSchema = z.object({
  content: z.string().min(1, "Content is required"),
  projectId: z.string().uuid(),
  /** Optional context to link the unit to (for Thread/Canvas views) */
  contextId: z.string().uuid().optional(),
  /** "capture" stores as-is, "organize" flags for AI decomposition (Epic 5) */
  mode: z.enum(["capture", "organize"]).default("capture"),
});

const processInputSchema = z.object({
  content: z.string().min(1, "Content is required").max(50000),
  projectId: z.string().uuid(),
  contextId: z.string().uuid().optional(),
  /** "full" runs all 7 passes, "quick" skips decomposition/salience/integrity */
  mode: z.enum(["full", "quick"]).default("full"),
});

export const captureRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(captureSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createUnitService(ctx.db);

      // Auto-classify unit type using heuristics (instant, no AI latency)
      const classifiedType = inferUnitType(input.content);

      try {
        const unit = await service.create(
          {
            content: input.content,
            projectId: input.projectId,
            unitType: classifiedType,
            lifecycle: "draft",
            originType: "direct_write",
            aiTrustLevel: "user_authored",
            // Flag for AI decomposition pipeline (Epic 5)
            meta: input.mode === "organize" ? { pendingDecomposition: true } : undefined,
          },
          ctx.session.user.id!,
        );

        // Link to context only if user explicitly provided one.
        // Otherwise the unit stays orphan — visible in Attention View
        // until the user assigns it or AI suggests a context.
        if (input.contextId) {
          await ctx.db.unitContext.create({
            data: {
              unitId: unit.id,
              contextId: input.contextId,
            },
          });
        }

        // AI type upgrade is deferred to explicit user action (classifyFullMetadata)
        // to conserve rate limit budget. Heuristic classification from inferUnitType() is used.

        return unit;
      } catch (error) {
        if (error instanceof DuplicateUnitContentError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
            cause: { code: error.code, existingUnitId: error.existingUnitId },
          });
        }
        throw error;
      }
    }),

  /**
   * 7-pass AI processing pipeline.
   * Runs: decomposition → classification → enrichment → relations →
   *       context placement → salience → integrity check.
   * Returns pipeline result with per-pass status.
   */
  processInput: protectedProcedure
    .input(processInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Verify context ownership if provided
      if (input.contextId) {
        const context = await ctx.db.context.findFirst({
          where: { id: input.contextId, project: { userId: ctx.session.user.id! } },
          select: { id: true },
        });
        if (!context) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
        }
      }

      const pipeline = createPipelineService(ctx.db);
      return pipeline.processInput(input, ctx.session.user.id!);
    }),

  /**
   * Re-run a single pipeline pass on an existing unit.
   */
  rerunPass: protectedProcedure
    .input(
      z.object({
        unitId: z.string().uuid(),
        passName: z.enum([
          "decomposition", "classification", "enrichment",
          "relations", "context_placement", "salience", "integrity",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }
      const pipeline = createPipelineService(ctx.db);
      return pipeline.rerunPass(input.unitId, input.passName, ctx.session.user.id!);
    }),

  /**
   * Batch process multiple text inputs through the pipeline.
   */
  batchProcessInput: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            content: z.string().min(1).max(50000),
            contextId: z.string().uuid().optional(),
          }),
        ).min(1).max(20),
        projectId: z.string().uuid(),
        mode: z.enum(["full", "quick"]).default("quick"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const pipeline = createPipelineService(ctx.db);
      const results = [];

      for (const item of input.items) {
        const result = await pipeline.processInput(
          {
            content: item.content,
            projectId: input.projectId,
            contextId: item.contextId,
            mode: input.mode,
          },
          ctx.session.user.id!,
        );
        results.push(result);
      }

      return {
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        results,
      };
    }),

  /**
   * DEC-2026-002 §11 — 2-phase import preview. Segments raw text
   * into card-sized units, flags within-batch duplicates, and
   * cross-references against the project's existing corpus. Does
   * NOT write any units — callers pass `new` items through
   * `processInput` and `duplicate_of_existing` items through the
   * merge router as their policy dictates.
   */
  importPreview: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        rawText: z.string().min(1).max(200000),
        strategy: z.enum(["sentence", "paragraph", "semantic"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id! },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      const svc = createImportPipelineService(ctx.db);
      return svc.importBatch(input.projectId, input.rawText, {
        strategy: input.strategy,
      });
    }),
});
