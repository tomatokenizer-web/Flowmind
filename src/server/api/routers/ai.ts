import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createAIService, generateSessionId, createSafetyGuard, enforceRateLimit } from "@/server/ai";
import { TRPCError } from "@trpc/server";
import { getContextUnits } from "@/server/api/helpers/context-units";
import { handleAIError } from "@/server/api/helpers/ai-error";
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
  ScopeJumpResult,
  NLQIntent,
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

// ─── Story 5.11: Scope Jump Detection Schema ──────────────────────────────────

const detectScopeJumpSchema = z.object({
  text: z.string().min(1).max(5000),
  contextId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
});

// ─── Story 5.7: Branch Potential Score Schema ─────────────────────────────────

const computeBranchPotentialSchema = z.object({
  unitId: z.string().uuid(),
});

// ─── Story 5.8: Missing Argument Alerts Schema ────────────────────────────────

const detectMissingArgumentsSchema = z.object({
  contextId: z.string().uuid(),
});

// ─── Story 5.10: Epistemic Humility Schema ────────────────────────────────────

const detectControversialTopicSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ─── Story 5.15: External Knowledge Search Schema ─────────────────────────────

const searchExternalKnowledgeSchema = z.object({
  query: z.string().min(1).max(500),
  unitId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

// ─── Story 6.7: Natural Language Query Schema ─────────────────────────────────

const naturalLanguageQuerySchema = z.object({
  query: z.string().min(1).max(500),
  projectId: z.string().uuid(),
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
      const existingUnits = await getContextUnits(ctx.db, input.contextId, 20);

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
      const existingUnits = await getContextUnits(ctx.db, input.contextId, 20);

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
        handleAIError(error, "AI decomposition");
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

      const units = await getContextUnits(ctx.db, input.contextId, 30);

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

      const units = await getContextUnits(ctx.db, input.contextId, 30);

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

      const units = await getContextUnits(ctx.db, input.contextId, 30);

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

      const units = await getContextUnits(ctx.db, input.contextId, 50);

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

      const units = await getContextUnits(ctx.db, input.contextId, 30);

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

      const units = await getContextUnits(ctx.db, input.contextId, 30);

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

      const units = await getContextUnits(ctx.db, input.contextId, 50);

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
      } catch (err) {
        handleAIError(err, "AI refinement");
      }
    }),

  generatePrompt: protectedProcedure
    .input(
      z.object({
        contextId: z.string().uuid(),
        format: z.enum(["chat", "system", "structured"]).default("chat"),
        unitIds: z.array(z.string().uuid()).optional(),
        /** Which top-level sections to include. Omit to include all available. */
        enabledSections: z
          .array(
            z.enum([
              "background",
              "claims",
              "evidence",
              "observations",
              "counterarguments",
              "constraints",
              "questions",
            ]),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const context = await ctx.db.context.findFirst({
        where: { id: input.contextId },
        select: { id: true, name: true, description: true, projectId: true },
      });
      if (!context) throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });

      const project = await ctx.db.project.findFirst({
        where: { id: context.projectId, userId },
        select: { id: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      let units: Array<{ id: string; content: string; unitType: string }>;
      if (input.unitIds && input.unitIds.length > 0) {
        const rows = await ctx.db.unit.findMany({
          where: { id: { in: input.unitIds }, userId },
          select: { id: true, content: true, unitType: true },
        });
        units = rows.map((u) => ({ ...u, unitType: u.unitType as string }));
      } else {
        const rows = await ctx.db.unitContext.findMany({
          where: { contextId: input.contextId },
          select: { unit: { select: { id: true, content: true, unitType: true } } },
        });
        units = rows.map((r) => ({ ...r.unit, unitType: r.unit.unitType as string }));
      }

      const byType: Record<string, string[]> = {};
      for (const u of units) {
        if (!byType[u.unitType]) byType[u.unitType] = [];
        byType[u.unitType]!.push(u.content);
      }

      // Helper: check whether a section key is enabled (absent = all enabled)
      type SectionKey = NonNullable<typeof input.enabledSections>[number];
      const enabled = input.enabledSections;
      const sec = (key: SectionKey) => !enabled || enabled.includes(key);

      const sections: string[] = [];
      const background = context.description ?? context.name;
      if (sec("background")) sections.push(`# ${context.name}\n\n## Background\n${background}`);
      if (sec("claims") && byType["claim"]?.length) sections.push(`## Key Claims\n${byType["claim"].map((c, i) => `${i + 1}. ${c}`).join("\n")}`);
      if (sec("evidence") && byType["evidence"]?.length) sections.push(`## Evidence\n${byType["evidence"].map((e, i) => `${i + 1}. ${e}`).join("\n")}`);
      if (sec("observations") && byType["observation"]?.length) sections.push(`## Observations\n${byType["observation"].map((o, i) => `${i + 1}. ${o}`).join("\n")}`);
      if (sec("counterarguments") && byType["counterargument"]?.length) sections.push(`## Counter-arguments\n${byType["counterargument"].map((c, i) => `${i + 1}. ${c}`).join("\n")}`);
      if (sec("constraints") && byType["assumption"]?.length) sections.push(`## Constraints & Assumptions\n${byType["assumption"].map((a, i) => `${i + 1}. ${a}`).join("\n")}`);
      if (sec("questions") && byType["question"]?.length) sections.push(`## Open Questions\n${byType["question"].map((q, i) => `${i + 1}. ${q}`).join("\n")}`);

      const base = sections.join("\n\n");
      let prompt: string;
      if (input.format === "system") {
        prompt = `You are working with the following structured context. Use it to inform your responses.\n\n${base}`;
      } else if (input.format === "structured") {
        prompt = `<context>\n${base}\n</context>`;
      } else {
        prompt = `Here is my structured thinking on this topic. Please review it and help me think through it further.\n\n${base}`;
      }

      return { prompt, unitCount: units.length, format: input.format };
    }),

  // ─── Story 5.11: Scope Jump Detection ────────────────────────────────────

  /**
   * Detect if the user's input is a significant topic/scope change
   * compared to the active context's existing units.
   */
  detectScopeJump: rateLimitedProcedure
    .input(detectScopeJumpSchema)
    .mutation(async ({ ctx, input }): Promise<ScopeJumpResult> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

      const existingUnits = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { content: true, unitType: true },
        take: 15,
        orderBy: { createdAt: "desc" },
      });

      return aiService.detectScopeJump(input.text, existingUnits, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });
    }),

  // ─── Story 5.7: Branch Potential Score ───────────────────────────────────

  /**
   * Compute branch potential score for a unit using heuristic analysis.
   * Returns a score 0-4 and the reasons that contributed to the score.
   * No AI call — purely heuristic for performance.
   */
  computeBranchPotential: protectedProcedure
    .input(computeBranchPotentialSchema)
    .query(async ({ ctx, input }): Promise<{ score: number; reasons: string[] }> => {
      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { content: true, unitType: true },
      });

      if (!unit) {
        return { score: 0, reasons: [] };
      }

      const SPECULATIVE_WORDS = /\b(maybe|perhaps|what if|could|might|possibly|suppose|imagine|wonder|hypothetically)\b/i;

      let score = 0;
      const reasons: string[] = [];

      if (unit.content.includes("?")) {
        score += 1;
        reasons.push("Contains a question");
      }

      if (SPECULATIVE_WORDS.test(unit.content)) {
        score += 1;
        reasons.push("Uses speculative language");
      }

      if (unit.content.length > 100) {
        score += 1;
        reasons.push("Rich content with more substance to explore");
      }

      if (["question", "idea", "observation"].includes(unit.unitType)) {
        score += 1;
        reasons.push(`Unit type '${unit.unitType}' invites further exploration`);
      }

      return { score: Math.min(score, 4), reasons };
    }),

  // ─── Story 5.8: Missing Argument Alerts ──────────────────────────────────

  /**
   * Detect structural gaps in a context's argument by analysing unit types.
   * Heuristic — no AI call required.
   */
  detectMissingArguments: protectedProcedure
    .input(detectMissingArgumentsSchema)
    .query(async ({ ctx, input }): Promise<{
      gaps: Array<{ type: string; message: string; severity: "high" | "medium" | "low" }>;
    }> => {
      const units = await ctx.db.unit.findMany({
        where: {
          perspectives: { some: { contextId: input.contextId } },
          lifecycle: { not: "draft" },
        },
        select: { unitType: true },
        take: 100,
      });

      if (units.length === 0) {
        return { gaps: [] };
      }

      const typeSet = new Set(units.map((u) => u.unitType));
      const gaps: Array<{ type: string; message: string; severity: "high" | "medium" | "low" }> = [];

      const hasClaims = typeSet.has("claim");
      const hasEvidence = typeSet.has("evidence");
      const hasCounterarguments = typeSet.has("counterargument");
      const hasQuestions = typeSet.has("question");

      if (hasClaims && !hasEvidence) {
        gaps.push({ type: "missing_evidence", message: "Claims lack supporting evidence", severity: "high" });
      }

      if (hasClaims && !hasCounterarguments) {
        gaps.push({ type: "missing_counterargument", message: "No opposing viewpoints considered", severity: "medium" });
      }

      if (hasEvidence && !hasClaims) {
        gaps.push({ type: "unconnected_evidence", message: "Evidence not connected to any claims", severity: "high" });
      }

      if (!hasQuestions) {
        gaps.push({ type: "no_questions", message: "No open questions to explore", severity: "low" });
      }

      return { gaps };
    }),

  // ─── Story 6.7: Natural Language Query ───────────────────────────────────

  /**
   * Convert a natural language question into search parameters,
   * run the search, and return ranked results with an AI-generated summary.
   */
  naturalLanguageQuery: rateLimitedProcedure
    .input(naturalLanguageQuerySchema)
    .mutation(async ({ ctx, input }): Promise<{
      intent: NLQIntent;
      results: Array<{
        unitId: string;
        content: string;
        unitType: string;
        relevanceSummary: string;
        score: number;
      }>;
    }> => {
      const aiService = createAIService(ctx.db);
      const sessionId = resolveSessionId(input.sessionId);

      // Step 1: Extract intent from natural language
      const intent = await aiService.extractNLQIntent(input.query, {
        userId: ctx.session.user.id!,
        sessionId,
        contextId: input.contextId,
      });

      if (intent.keywords.length === 0) {
        return { intent, results: [] };
      }

      // Step 2: Run text search with extracted keywords
      const { createSearchService } = await import("@/server/services/searchService");
      const searchService = createSearchService(ctx.db);

      const searchQuery = intent.keywords.join(" ");
      const rawResults = await searchService.search(
        searchQuery,
        {
          projectId: input.projectId,
          contextId: input.contextId,
          layers: ["text"],
          limit: 20,
        },
        intent.unitTypes?.length
          ? { unitTypes: intent.unitTypes as import("@prisma/client").UnitType[] }
          : undefined,
      );

      // Step 3: Annotate results with relevance summary (simple — no extra AI call)
      const results = rawResults.slice(0, 10).map((r) => ({
        unitId: r.unitId,
        content: r.content,
        unitType: r.unitType,
        relevanceSummary: `Matched "${intent.keywords.slice(0, 3).join(", ")}" in ${r.matchLayer} layer`,
        score: r.score,
      }));

      return { intent, results };
    }),

  // ─── Story 5.10: Epistemic Humility / Controversial Topic Detection ──────────

  /**
   * Heuristic detection of controversial or absolutist content.
   * No AI call required — purely regex/keyword based.
   */
  detectControversialTopic: protectedProcedure
    .input(detectControversialTopicSchema)
    .mutation(({ input }): { isControversial: boolean; reasons: string[]; suggestion: string } => {
      const text = input.content.toLowerCase();
      const reasons: string[] = [];

      // Controversial keywords
      const controversialKeywords = [
        "politics", "political", "religion", "religious", "abortion",
        "gun control", "gun rights", "immigration", "race", "racism",
        "gender", "transgender", "climate change", "global warming",
        "vaccine", "vaccination", "war", "death penalty", "capital punishment",
        "euthanasia", "drugs legalization", "affirmative action",
        "socialism", "capitalism", "communism", "fascism",
      ];

      const matchedKeywords = controversialKeywords.filter((kw) => text.includes(kw));
      if (matchedKeywords.length > 0) {
        reasons.push(`Contains potentially controversial topic(s): ${matchedKeywords.slice(0, 3).join(", ")}`);
      }

      // Absolute language patterns
      const absolutePatterns = [
        /\beveryone knows\b/,
        /\bobviously\b/,
        /\bclearly\b/,
        /\balways\b/,
        /\bnever\b/,
        /\ball \w+ are\b/,
        /\bno one\b/,
        /\bno \w+ ever\b/,
        /\bwithout question\b/,
        /\bundeniably\b/,
        /\bit('s| is) (a )?fact\b/,
        /\beverybody\b/,
        /\bnobody\b/,
      ];

      const matchedAbsolute = absolutePatterns
        .filter((p) => p.test(text))
        .map((p) => p.source.replace(/\\b/g, "").replace(/\\/g, ""));

      if (matchedAbsolute.length > 0) {
        reasons.push(`Uses absolute language (e.g., "${matchedAbsolute[0]}")`);
      }

      const isControversial = reasons.length > 0;
      const suggestion = isControversial
        ? "Consider adding qualifying language and acknowledging alternative perspectives"
        : "";

      return { isControversial, reasons, suggestion };
    }),

  // ─── Story 5.15: External Knowledge Search ───────────────────────────────────

  /**
   * Use AI training knowledge to suggest related concepts and reading directions.
   * NOT a web search — generates suggestions from the model's knowledge.
   */
  searchExternalKnowledge: rateLimitedProcedure
    .input(searchExternalKnowledgeSchema)
    .mutation(async ({ ctx, input }): Promise<{
      suggestions: Array<{ title: string; description: string; relevance: string }>;
      relatedConcepts: string[];
    }> => {
      const sessionId = resolveSessionId(input.sessionId);
      void sessionId; // used for safety-guard tracking upstream

      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const { z: zod } = await import("zod");
        const provider = getAIProvider();

        const ExternalKnowledgeSchema = zod.object({
          suggestions: zod.array(
            zod.object({
              title: zod.string(),
              description: zod.string(),
              relevance: zod.string(),
            })
          ),
          relatedConcepts: zod.array(zod.string()),
        });

        const result = await provider.generateStructured<{
          suggestions: Array<{ title: string; description: string; relevance: string }>;
          relatedConcepts: string[];
        }>(
          `You are a knowledgeable research assistant. Given the following query or topic, suggest 3-5 highly relevant resources, topics, or concepts that would deepen understanding of it.

Query: "${input.query.slice(0, 400)}"

Return structured JSON with:
- suggestions: array of { title, description, relevance } where relevance explains why it's helpful
- relatedConcepts: 3-6 brief related concept names

Focus on academic, scientific, or well-established knowledge sources. Do not invent URLs or authors.`,
          {
            temperature: 0.5,
            maxTokens: 1024,
            zodSchema: ExternalKnowledgeSchema,
            schema: {
              name: "ExternalKnowledge",
              description: "Related knowledge suggestions",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Topic or resource title" },
                      description: { type: "string", description: "Brief description of the resource/topic" },
                      relevance: { type: "string", description: "Why this is relevant to the query" },
                    },
                    required: ["title", "description", "relevance"],
                  },
                },
                relatedConcepts: {
                  type: "array",
                  items: { type: "string" },
                  description: "Short related concept names",
                },
              },
              required: ["suggestions", "relatedConcepts"],
            },
          }
        );

        return result;
      } catch (error: unknown) {
        handleAIError(error, "External knowledge search");
      }
    }),

  /**
   * AI-powered bulk relation creation: analyzes ALL units in a context
   * and auto-creates relations between them using Claude.
   * Processes units in batches to stay within token limits.
   */
  autoRelate: rateLimitedProcedure
    .input(z.object({ contextId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify context ownership
      const context = await ctx.db.context.findFirst({
        where: { id: input.contextId, project: { userId } },
        select: { id: true },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      // Get all units in this context via unitContext (not perspectives)
      const contextLinks = await ctx.db.unitContext.findMany({
        where: { contextId: input.contextId },
        select: { unitId: true },
      });
      const linkedIds = contextLinks.map((u) => u.unitId);
      const units = linkedIds.length > 0
        ? await ctx.db.unit.findMany({
            where: { id: { in: linkedIds } },
            select: { id: true, content: true, unitType: true },
            take: 50,
          })
        : [];
      if (units.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 units to analyze relations." });
      }

      // Get existing relations to avoid duplicates
      const unitIds = units.map((u) => u.id);
      const existingRelations = await ctx.db.relation.findMany({
        where: {
          OR: [
            { sourceUnitId: { in: unitIds }, targetUnitId: { in: unitIds } },
          ],
        },
        select: { sourceUnitId: true, targetUnitId: true },
      });
      const existingPairs = new Set(
        existingRelations.flatMap((r) => [
          `${r.sourceUnitId}|${r.targetUnitId}`,
          `${r.targetUnitId}|${r.sourceUnitId}`,
        ]),
      );

      // Build the unit list for the prompt
      const unitDescriptions = units
        .map((u, i) => `[${i}] id:${u.id} (${u.unitType}) "${u.content.slice(0, 120)}"`)
        .join("\n");

      const { getAIProvider } = await import("@/server/ai/provider");
      const provider = getAIProvider();

      const VALID_TYPES = new Set([
        "supports", "contradicts", "derives_from", "expands",
        "references", "exemplifies", "defines", "questions",
      ]);

      const prompt = `Analyze ALL the following thought units and identify meaningful relations between them.
Find as many genuine relations as possible — aim for comprehensive coverage.

Units:
${unitDescriptions}

Available relation types: supports, contradicts, derives_from, expands, references, exemplifies, defines, questions

Return ONLY a JSON object with this exact format (no other text):
{"relations":[{"sourceIndex":0,"targetIndex":1,"type":"supports","strength":0.8}]}

Each relation: sourceIndex (int), targetIndex (int), type (one of the types above), strength (0.0-1.0).
Be thorough — even weak relations (0.3+) are valuable for navigation.`;

      try {
        const raw = await provider.generateText(prompt, {
          temperature: 0.3,
          maxTokens: 2048,
        });

        // Extract JSON from response (may have markdown fences)
        const jsonMatch = raw.match(/\{[\s\S]*"relations"[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("AI response did not contain valid JSON");
        }
        const result = JSON.parse(jsonMatch[0]) as {
          relations: Array<{ sourceIndex: number; targetIndex: number; type: string; strength: number }>;
        };

        // Filter valid relations and deduplicate against existing
        const relations = Array.isArray(result.relations) ? result.relations : [];
        const toCreate = relations
          .filter((r) => {
            if (typeof r.sourceIndex !== "number" || typeof r.targetIndex !== "number") return false;
            if (r.sourceIndex < 0 || r.sourceIndex >= units.length) return false;
            if (r.targetIndex < 0 || r.targetIndex >= units.length) return false;
            if (r.sourceIndex === r.targetIndex) return false;
            if (!VALID_TYPES.has(r.type)) return false;
            const srcId = units[r.sourceIndex]!.id;
            const tgtId = units[r.targetIndex]!.id;
            return !existingPairs.has(`${srcId}|${tgtId}`);
          })
          .map((r) => ({
            sourceUnitId: units[r.sourceIndex]!.id,
            targetUnitId: units[r.targetIndex]!.id,
            type: r.type,
            strength: Math.round(r.strength * 100) / 100,
            direction: "one_way" as const,
          }));

        let createdCount = 0;
        if (toCreate.length > 0) {
          const batch = await ctx.db.relation.createMany({ data: toCreate });
          createdCount = batch.count;
        }

        return {
          created: createdCount,
          analyzed: units.length,
          skippedDuplicates: relations.length - toCreate.length,
        };
      } catch (error: unknown) {
        handleAIError(error, "Auto-relate units");
      }
    }),
});
