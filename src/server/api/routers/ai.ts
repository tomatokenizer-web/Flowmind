import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createAIService, generateSessionId, createSafetyGuard, enforceRateLimit } from "@/server/ai";
import { TRPCError } from "@trpc/server";
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
import {
  ExplorationDirectionsSchema,
  RefinementSchema,
} from "@/server/ai/schemas";

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const suggestTypeSchema = z.object({
  content: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
  /** Optional client-provided session ID for consecutive branch tracking */
  sessionId: z.string().uuid().optional(),
});

const suggestRelationsSchema = z.object({
  content: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

const contributionRatioSchema = z.object({
  contextId: z.string().uuid(),
});

const decomposeTextSchema = z.object({
  text: z.string().min(1).max(10000),
  contextId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
});

// ─── Story 5.4-5.15 Schemas ───────────────────────────────────────────────

const proposeSplitReattributionSchema = z.object({
  unitId: z.string().uuid(),
  contentA: z.string().min(1).max(5000),
  contentB: z.string().min(1).max(5000),
  sessionId: z.string().uuid().optional(),
});

const generateAlternativeFramingSchema = z.object({
  content: z.string().min(1).max(5000),
  currentType: z.string(),
  contextId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

const suggestCounterArgumentsSchema = z.object({
  content: z.string().min(1).max(5000),
  unitType: z.string(),
  contextId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

const identifyAssumptionsSchema = z.object({
  content: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

const contextUnitsSchema = z.object({
  contextId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
});

const stanceClassificationSchema = z.object({
  unitContent: z.string().min(1).max(5000),
  targetContent: z.string().min(1).max(5000),
  contextId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve a session ID for safety guard tracking.
 *
 * If the client provides a sessionId (from a prior createSafetySession call),
 * use it so that consecutive branch counting works across requests.
 * Otherwise, generate a cryptographically random one-time ID.
 */
function resolveSessionId(clientSessionId?: string): string {
  return clientSessionId ?? generateSessionId();
}

// ─── Rate-Limited Procedure ──────────────────────────────────────────────

/**
 * A protectedProcedure with sliding-window rate limiting applied.
 * The endpoint name is derived from the tRPC path (e.g. "ai.suggestType").
 * When the limit is exceeded, a TOO_MANY_REQUESTS error is thrown with
 * retry-after information.
 */
const rateLimitedProcedure = protectedProcedure.use(async ({ ctx, path, next }) => {
  const userId = ctx.session.user.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  await enforceRateLimit(ctx.db, userId, path);
  return next();
});

// ─── Router ───────────────────────────────────────────────────────────────

export const aiRouter = createTRPCRouter({
  /**
   * Create a DB-backed safety guard session.
   * Clients should call this once when entering a context editing view
   * and reuse the returned sessionId for all AI requests in that session.
   */
  createSafetySession: protectedProcedure
    .mutation(async ({ ctx }) => {
      const guard = createSafetyGuard(ctx.db);
      const sessionId = await guard.createSession(ctx.session.user.id!);
      return { sessionId };
    }),

  suggestType: rateLimitedProcedure
    .input(suggestTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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

  suggestRelations: rateLimitedProcedure
    .input(suggestRelationsSchema)
    .mutation(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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

  getContributionRatio: rateLimitedProcedure
    .input(contributionRatioSchema)
    .query(async ({ ctx, input }) => {
      const aiService = createAIService(ctx.db);
      return aiService.getContributionRatio(input.contextId);
    }),

  /**
   * Decompose text into multiple units with proposed relations.
   * Returns proposals for user review - NOT saved to DB yet.
   */
  decomposeText: rateLimitedProcedure
    .input(decomposeTextSchema)
    .mutation(async ({ ctx, input }): Promise<DecompositionResult> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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

      try {
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
      } catch (error: unknown) {
        // Transform Anthropic SDK errors into user-friendly tRPC errors
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStr = JSON.stringify(error);

        if (errMsg.includes("credit") || errMsg.includes("balance") || errStr.includes("credit") || errStr.includes("balance")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Anthropic API credit balance is too low. Please add credits at console.anthropic.com.",
          });
        }
        if (errMsg.includes("invalid_api_key") || errMsg.includes("401") || errMsg.includes("authentication")) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid Anthropic API key. Check ANTHROPIC_API_KEY in your .env file.",
          });
        }
        if (errMsg.includes("rate_limit") || errMsg.includes("429")) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Anthropic API rate limit reached. Please wait a moment and try again.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI decomposition failed: ${errMsg}`,
        });
      }
    }),

  // ─── Story 5.4: Unit Split with Relation Re-attribution ─────────────────

  /**
   * Propose how to reassign relations when splitting a unit into two parts
   */
  proposeSplitReattribution: rateLimitedProcedure
    .input(proposeSplitReattributionSchema)
    .mutation(async ({ ctx, input }): Promise<SplitReattributionResult> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  generateAlternativeFraming: rateLimitedProcedure
    .input(generateAlternativeFramingSchema)
    .mutation(async ({ ctx, input }): Promise<AlternativeFraming[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  suggestCounterArguments: rateLimitedProcedure
    .input(suggestCounterArgumentsSchema)
    .mutation(async ({ ctx, input }): Promise<CounterArgument[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  identifyAssumptions: rateLimitedProcedure
    .input(identifyAssumptionsSchema)
    .mutation(async ({ ctx, input }): Promise<IdentifiedAssumption[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  detectContradictions: rateLimitedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<ContradictionPair[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  suggestMerge: rateLimitedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<MergeSuggestion[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  analyzeCompleteness: rateLimitedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<CompletenessAnalysis> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  summarizeContext: rateLimitedProcedure
    .input(contextUnitsSchema)
    .query(async ({ ctx, input }): Promise<ContextSummary> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  generateQuestions: rateLimitedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<GeneratedQuestion[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  suggestNextSteps: rateLimitedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<NextStepSuggestion[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  extractKeyTerms: rateLimitedProcedure
    .input(contextUnitsSchema)
    .mutation(async ({ ctx, input }): Promise<ExtractedTerm[]> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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
  classifyStance: rateLimitedProcedure
    .input(stanceClassificationSchema)
    .mutation(async ({ ctx, input }): Promise<StanceClassification> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

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

  // ─── Missing procedures ──────────────────────────────────────────

  suggestExplorationDirections: rateLimitedProcedure
    .input(z.object({ unitId: z.string().uuid(), contextId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { content: true, unitType: true },
      });
      if (!unit) return { directions: [] };

      // Generate exploration directions using AI provider directly
      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const result = await provider.generateStructured<{ directions: { prompt: string; expectedType: string }[] }>(
          `Given this thought unit (type: ${unit.unitType}): "${unit.content.slice(0, 300)}"
Suggest 2-3 specific exploration directions that would help develop this thought further.`,
          {
            temperature: 0.7,
            maxTokens: 512,
            zodSchema: ExplorationDirectionsSchema,
            schema: {
              name: "ExplorationDirections",
              description: "AI-suggested exploration directions",
              properties: {
                directions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      prompt: { type: "string", description: "A specific question or prompt to explore" },
                      expectedType: { type: "string", enum: ["question", "idea", "claim", "evidence", "counterargument"] },
                    },
                    required: ["prompt", "expectedType"],
                  },
                },
              },
              required: ["directions"],
            },
          }
        );
        return result;
      } catch {
        // Fallback directions when AI unavailable
        const fallbacks: Record<string, { prompt: string; expectedType: string }[]> = {
          claim: [
            { prompt: `What evidence supports this claim?`, expectedType: "evidence" },
            { prompt: `What are the strongest counterarguments?`, expectedType: "counterargument" },
            { prompt: `What assumptions underlie this?`, expectedType: "assumption" },
          ],
          question: [
            { prompt: `What would a direct answer look like?`, expectedType: "claim" },
            { prompt: `What related questions does this raise?`, expectedType: "question" },
            { prompt: `What evidence would help answer this?`, expectedType: "evidence" },
          ],
          default: [
            { prompt: `What implications does this have?`, expectedType: "idea" },
            { prompt: `How does this connect to other ideas?`, expectedType: "observation" },
            { prompt: `What questions does this raise?`, expectedType: "question" },
          ],
        };
        return { directions: fallbacks[unit.unitType] ?? fallbacks.default };
      }
    }),

  refineUnit: rateLimitedProcedure
    .input(z.object({ unitId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const prompt = `Refine this thought for clarity and coherence. Preserve the core meaning.
Original: "${input.content}"
Return JSON: { "refined": "...", "changes": ["change1", "change2"] }`;

        const getProvider = (await import("@/server/ai/provider")).getAIProvider;
        const provider = getProvider();
        const result = await provider.generateStructured<{ refined: string; changes: string[] }>(prompt, {
          temperature: 0.3,
          maxTokens: 512,
          zodSchema: RefinementSchema,
          schema: {
            name: "Refinement",
            description: "Refined unit content",
            properties: {
              refined: { type: "string" },
              changes: { type: "array", items: { type: "string" } },
            },
            required: ["refined", "changes"],
          },
        });
        return { original: input.content, refined: result.refined, changes: result.changes };
      } catch {
        return { original: input.content, refined: input.content, changes: [] };
      }
    }),

  generatePrompt: protectedProcedure
    .input(z.object({ unitIds: z.array(z.string().uuid()), contextId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const units = await ctx.db.unit.findMany({
        where: { id: { in: input.unitIds } },
        select: { content: true, unitType: true },
      });

      const byType = units.reduce((acc, u) => {
        acc[u.unitType] = acc[u.unitType] ?? [];
        acc[u.unitType]!.push(u.content);
        return acc;
      }, {} as Record<string, string[]>);

      const lines: string[] = [];
      if (byType.claim?.length) lines.push(`## Key Claims\n${byType.claim.map((c, i) => `${i + 1}. ${c}`).join("\n")}`);
      if (byType.evidence?.length) lines.push(`## Evidence\n${byType.evidence.map((e) => `- ${e}`).join("\n")}`);
      if (byType.question?.length) lines.push(`## Open Questions\n${byType.question.map((q) => `- ${q}`).join("\n")}`);
      if (byType.assumption?.length) lines.push(`## Assumptions\n${byType.assumption.map((a) => `- ${a}`).join("\n")}`);
      if (byType.observation?.length) lines.push(`## Observations\n${byType.observation.map((o) => `- ${o}`).join("\n")}`);

      return { prompt: lines.join("\n\n"), unitCount: units.length };
    }),
});
