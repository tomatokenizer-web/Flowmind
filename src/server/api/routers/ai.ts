import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createAIService } from "@/server/ai";
import type {
  DecompositionResult,
  SplitReattributionResult,
  AlternativeFraming,
  CounterArgument,
  IdentifiedAssumption,
  ContradictionPair,
  MergeSuggestion,
  CompletenessAnalysis,
  ContextSummary,
  GeneratedQuestion,
  NextStepSuggestion,
  ExtractedTerm,
  StanceClassification,
} from "@/server/ai";

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const suggestTypeSchema = z.object({
  content: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
});

const suggestRelationsSchema = z.object({
  content: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
});

const contributionRatioSchema = z.object({
  contextId: z.string().uuid(),
});

const decomposeTextSchema = z.object({
  text: z.string().min(1).max(10000),
  contextId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
});

// ─── Story 5.4-5.15 Schemas ───────────────────────────────────────────────

const proposeSplitReattributionSchema = z.object({
  unitId: z.string().uuid(),
  contentA: z.string().min(1).max(5000),
  contentB: z.string().min(1).max(5000),
});

const generateAlternativeFramingSchema = z.object({
  content: z.string().min(1).max(5000),
  currentType: z.string(),
  contextId: z.string().uuid().optional(),
});

const suggestCounterArgumentsSchema = z.object({
  content: z.string().min(1).max(5000),
  unitType: z.string(),
  contextId: z.string().uuid().optional(),
});

const identifyAssumptionsSchema = z.object({
  content: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
});

const contextUnitsSchema = z.object({
  contextId: z.string().uuid(),
});

const stanceClassificationSchema = z.object({
  unitContent: z.string().min(1).max(5000),
  targetContent: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const aiRouter = createTRPCRouter({
  suggestType: protectedProcedure
    .input(suggestTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);

      // Generate a session ID from user ID + timestamp (simplified)
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const suggestion = await aiService.suggestUnitType(input.content, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });

      return {
        suggestion,
        aiTrustLevel: "inferred" as const,
      };
    }),

  suggestRelations: protectedProcedure
    .input(suggestRelationsSchema)
    .mutation(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      // Get existing units in the context
      const existingUnits = await ctx.db.unit.findMany({
        where: {
          perspectives: {
            some: { contextId: input.contextId },
          },
          lifecycle: { not: "draft" },
        },
        select: {
          id: true,
          content: true,
          unitType: true,
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      const suggestions = await aiService.suggestRelations(
        input.content,
        existingUnits,
        {
          userId: ctx.session.user.id!,
          sessionId,
          contextId: input.contextId,
        }
      );

      return {
        suggestions,
        aiTrustLevel: "inferred" as const,
      };
    }),

  getContributionRatio: protectedProcedure
    .input(contributionRatioSchema)
    .query(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);
      return aiService.getContributionRatio(input.contextId);
    }),

  /**
   * Decompose text into multiple units with proposed relations.
   * Returns proposals for user review - NOT saved to DB yet.
   */
  decomposeText: protectedProcedure
    .input(decomposeTextSchema)
    .mutation(async ({ ctx, input }): Promise<DecompositionResult> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      // Get existing units in the context for relation suggestions
      const existingUnits = await ctx.db.unit.findMany({
        where: {
          perspectives: {
            some: { contextId: input.contextId },
          },
          lifecycle: { not: "draft" },
        },
        select: {
          id: true,
          content: true,
          unitType: true,
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      const result = await aiService.decomposeText(
        input.text,
        input.contextId ?? "",
        existingUnits,
        {
          userId: ctx.session.user.id!,
          sessionId,
          contextId: input.contextId,
        }
      );

      return result;
    }),

  // ─── Story 5.4: Unit Split with Relation Re-attribution ─────────────────

  /**
   * Propose how to reassign relations when splitting a unit into two parts
   */
  proposeSplitReattribution: protectedProcedure
    .input(proposeSplitReattributionSchema)
    .mutation(async ({ ctx, input }): Promise<SplitReattributionResult> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      return aiService.proposeSplitReattribution(
        input.unitId,
        input.contentA,
        input.contentB,
        {
          userId: ctx.session.user.id!,
          sessionId,
        }
      );
    }),

  // ─── Story 5.5: Alternative Framing ─────────────────────────────────────

  /**
   * Generate alternative ways to frame a unit's content
   */
  generateAlternativeFraming: protectedProcedure
    .input(generateAlternativeFramingSchema)
    .mutation(async ({ ctx, input }): Promise<AlternativeFraming[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      return aiService.generateAlternativeFraming(
        input.content,
        input.currentType,
        {
          userId: ctx.session.user.id!,
          sessionId,
          contextId: input.contextId,
        }
      );
    }),

  // ─── Story 5.6: Counter-Arguments ───────────────────────────────────────

  /**
   * Suggest counter-arguments for a claim or argument
   */
  suggestCounterArguments: protectedProcedure
    .input(suggestCounterArgumentsSchema)
    .mutation(async ({ ctx, input }): Promise<CounterArgument[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      return aiService.suggestCounterArguments(
        input.content,
        input.unitType,
        {
          userId: ctx.session.user.id!,
          sessionId,
          contextId: input.contextId,
        }
      );
    }),

  // ─── Story 5.7: Assumption Identification ───────────────────────────────

  /**
   * Identify underlying assumptions in content
   */
  identifyAssumptions: protectedProcedure
    .input(identifyAssumptionsSchema)
    .mutation(async ({ ctx, input }): Promise<IdentifiedAssumption[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      return aiService.identifyAssumptions(input.content, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.8: Contradiction Detection ─────────────────────────────────

  /**
   * Detect contradictions between units in a context
   */
  detectContradictions: protectedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<ContradictionPair[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const units = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { id: true, content: true, unitType: true },
        take: 30,
        orderBy: { createdAt: "desc" },
      });

      return aiService.detectContradictions(units, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.9: Merge Suggestion ────────────────────────────────────────

  /**
   * Suggest units that could be merged
   */
  suggestMerge: protectedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<MergeSuggestion[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const units = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { id: true, content: true, unitType: true },
        take: 30,
        orderBy: { createdAt: "desc" },
      });

      return aiService.suggestMerge(units, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.10: Completeness Analysis ──────────────────────────────────

  /**
   * Analyze completeness of an argument or context
   */
  analyzeCompleteness: protectedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<CompletenessAnalysis> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const units = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { id: true, content: true, unitType: true },
        take: 30,
        orderBy: { createdAt: "desc" },
      });

      return aiService.analyzeCompleteness(units, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.11: Context Summary ────────────────────────────────────────

  /**
   * Generate a summary of a context's content
   */
  summarizeContext: protectedProcedure
    .input(contextUnitsSchema)
    .query(async ({ ctx, input }): Promise<ContextSummary> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const units = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { id: true, content: true, unitType: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      });

      return aiService.summarizeContext(units, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.12: Question Generation ────────────────────────────────────

  /**
   * Generate questions to deepen understanding
   */
  generateQuestions: protectedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<GeneratedQuestion[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const units = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { id: true, content: true, unitType: true },
        take: 30,
        orderBy: { createdAt: "desc" },
      });

      return aiService.generateQuestions(units, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.13: Next Steps ─────────────────────────────────────────────

  /**
   * Suggest next steps for developing the argument
   */
  suggestNextSteps: protectedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<NextStepSuggestion[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const units = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { id: true, content: true, unitType: true },
        take: 30,
        orderBy: { createdAt: "desc" },
      });

      return aiService.suggestNextSteps(units, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.14: Key Term Extraction ────────────────────────────────────

  /**
   * Extract key terms from context units
   */
  extractKeyTerms: protectedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<ExtractedTerm[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      const units = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { id: true, content: true, unitType: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      });

      return aiService.extractKeyTerms(units, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.15: Stance Classification ──────────────────────────────────

  /**
   * Classify the stance of a unit relative to another
   */
  classifyStance: protectedProcedure
    .input(stanceClassificationSchema)
    .mutation(async ({ ctx, input }): Promise<StanceClassification> => {
      const aiService = createAIService(ctx.db);
      const sessionId = `${ctx.session.user.id}-${Date.now()}`;

      return aiService.classifyStance(
        input.unitContent,
        input.targetContent,
        {
          userId: ctx.session.user.id!,
          sessionId,
          contextId: input.contextId,
        }
      );
    }),
});
