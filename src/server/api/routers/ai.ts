import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { UnitType, Prisma } from "@prisma/client";
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
  DerivationSuggestionsSchema,
  BridgeSuggestionsSchema,
  DerivationPlacementSchema,
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
  projectId: z.string().uuid().optional(),
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

      // Get existing units: try context first, fall back to project-wide
      let existingUnits = await getContextUnits(ctx.db, input.contextId, 20);

      if (existingUnits.length === 0 && input.projectId) {
        // Fallback: get recent units from the entire project (include drafts)
        existingUnits = await ctx.db.unit.findMany({
          where: {
            projectId: input.projectId,
            userId: ctx.session.user.id!,
          },
          select: { id: true, content: true, unitType: true },
          take: 20,
          orderBy: { createdAt: "desc" },
        });
      }

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

  // ─── Full metadata classification ──────────────────────────────────

  classifyFullMetadata: rateLimitedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      content: z.string().min(1).max(5000),
    }))
    .mutation(async ({ ctx: _ctx, input }) => {
      const { getAIProvider } = await import("@/server/ai/provider");
      const { z: zod } = await import("zod");
      const provider = getAIProvider();

      const MetadataClassificationSchema = zod.object({
        unitType: zod.enum(["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"]),
        certainty: zod.enum(["certain", "probable", "hypothesis", "uncertain"]).nullable(),
        completeness: zod.enum(["complete", "needs_evidence", "unaddressed_counterarg", "exploring", "fragment"]).nullable(),
        evidenceDomain: zod.enum(["external_public", "external_private", "personal_event", "personal_belief", "personal_intuition", "reasoned_inference"]).nullable(),
        scope: zod.enum(["universal", "domain_general", "domain_specific", "situational", "interpersonal", "personal"]).nullable(),
        stance: zod.enum(["support", "oppose", "neutral", "exploring"]).nullable(),
      });

      try {
        const result = await provider.generateStructured<{
          unitType: string;
          certainty: string | null;
          completeness: string | null;
          evidenceDomain: string | null;
          scope: string | null;
          stance: string | null;
        }>(
          `Analyze this thought unit and classify ALL its metadata fields.

Text: "${input.content.slice(0, 500)}"

Classify each field:
- unitType: The cognitive function (claim, question, evidence, counterargument, observation, idea, definition, assumption, action)
- certainty: How certain the author is (certain, probable, hypothesis, uncertain) — null if unclear
- completeness: How complete the thought is (complete, needs_evidence, unaddressed_counterarg, exploring, fragment)
- evidenceDomain: Source of knowledge (external_public, external_private, personal_event, personal_belief, personal_intuition, reasoned_inference) — null if unclear
- scope: How broadly it applies (universal, domain_general, domain_specific, situational, interpersonal, personal)
- stance: Author's position (support, oppose, neutral, exploring) — null if standalone thought`,
          {
            temperature: 0.3,
            maxTokens: 512,
            zodSchema: MetadataClassificationSchema,
            schema: {
              name: "MetadataClassification",
              description: "Full metadata classification for a thought unit",
              properties: {
                unitType: { type: "string", enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"] },
                certainty: { type: "string", enum: ["certain", "probable", "hypothesis", "uncertain"], nullable: true },
                completeness: { type: "string", enum: ["complete", "needs_evidence", "unaddressed_counterarg", "exploring", "fragment"], nullable: true },
                evidenceDomain: { type: "string", enum: ["external_public", "external_private", "personal_event", "personal_belief", "personal_intuition", "reasoned_inference"], nullable: true },
                scope: { type: "string", enum: ["universal", "domain_general", "domain_specific", "situational", "interpersonal", "personal"], nullable: true },
                stance: { type: "string", enum: ["support", "oppose", "neutral", "exploring"], nullable: true },
              },
              required: ["unitType", "certainty", "completeness", "evidenceDomain", "scope", "stance"],
            },
          },
        );

        return result;
      } catch (error: unknown) {
        handleAIError(error, "Full metadata classification");
      }
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

  /**
   * Suggest derivation units that could be created from an existing unit.
   * Returns up to 4 AI-generated suggestions with content, type, and relation.
   */
  suggestDerivations: rateLimitedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      contextId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const unit = await ctx.db.unit.findUnique({
        where: { id: input.unitId },
        select: { content: true, unitType: true },
      });
      if (!unit) return { derivations: [] };

      // Gather sibling context for richer suggestions
      let contextSnippet = "";
      if (input.contextId) {
        const siblings = await ctx.db.unit.findMany({
          where: {
            unitContexts: { some: { contextId: input.contextId } },
            id: { not: input.unitId },
          },
          select: { content: true, unitType: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        });
        if (siblings.length > 0) {
          contextSnippet = `\n\nOther units in the same context:\n${siblings.map((s) => `- [${s.unitType}] ${s.content.slice(0, 120)}`).join("\n")}`;
        }
      }

      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const result = await provider.generateStructured<{
          derivations: {
            content: string;
            unitType: string;
            relationToOrigin: string;
            rationale: string;
          }[];
        }>(
          `You are a thinking assistant. Given the following thought unit (type: ${unit.unitType}):
"${unit.content.slice(0, 500)}"${contextSnippet}

Suggest 3-4 specific new thought units the user could derive from this one to deepen their thinking. Each suggestion should:
- Be a concrete, self-contained thought (not a vague prompt). Keep content under 300 characters.
- Have a specific unit type (claim, question, evidence, counterargument, observation, idea, definition, assumption, action)
- Have a clear relationship to the original (supports, contradicts, derives_from, expands, questions, etc.)
- Help the user explore different angles, challenge assumptions, or build on the idea
- Include a brief rationale (under 150 characters) explaining why this derivation is useful

Prioritize diversity: suggest different types and relationships, not just more of the same.`,
          {
            temperature: 0.7,
            maxTokens: 1200,
            zodSchema: DerivationSuggestionsSchema,
            schema: {
              name: "DerivationSuggestions",
              description: "AI-suggested derivation units from a source unit",
              properties: {
                derivations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      content: { type: "string", description: "The full content of the suggested derived unit" },
                      unitType: { type: "string", enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"] },
                      relationToOrigin: { type: "string", enum: ["supports", "contradicts", "derives_from", "expands", "references", "exemplifies", "defines", "questions"] },
                      rationale: { type: "string", description: "Brief explanation of why this derivation is useful" },
                    },
                    required: ["content", "unitType", "relationToOrigin", "rationale"],
                  },
                },
              },
              required: ["derivations"],
            },
          },
        );
        return { derivations: result.derivations, aiGenerated: true };
      } catch (error) {
        console.error("suggestDerivations AI call failed:", error);
        return { derivations: [], aiGenerated: false };
      }
    }),

  /**
   * Create a derived unit, link it to origin, optionally assign to a context,
   * and auto-relate with existing units in that context.
   */
  createDerivationInContext: rateLimitedProcedure
    .input(z.object({
      /** The source unit this derivation comes from */
      sourceUnitId: z.string().uuid(),
      /** Content of the new derived unit */
      content: z.string().min(1).max(2000),
      /** Unit type for the new unit */
      unitType: z.enum(["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"]),
      /** Relation type from source → new unit */
      relationToOrigin: z.string().min(1),
      /** Project to create the unit in */
      projectId: z.string().uuid(),
      /** Optional: context to assign the new unit to */
      contextId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify ownership
      const sourceUnit = await ctx.db.unit.findFirst({
        where: { id: input.sourceUnitId, userId },
        select: { id: true },
      });
      if (!sourceUnit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source unit not found" });
      }

      // 1. Create the derived unit
      const newUnit = await ctx.db.unit.create({
        data: {
          content: input.content,
          unitType: input.unitType,
          lifecycle: "draft",
          originType: "ai_refined",
          sourceSpan: { derivedFrom: input.sourceUnitId },
          projectId: input.projectId,
          userId,
        },
        select: { id: true, content: true, unitType: true },
      });

      // 2. Create relation from source → derived
      await ctx.db.relation.create({
        data: {
          sourceUnitId: input.sourceUnitId,
          targetUnitId: newUnit.id,
          type: input.relationToOrigin,
          strength: 0.7,
          direction: "one_way",
          purpose: ["derivation"],
        },
      });

      let autoRelatedCount = 0;

      // 3. If contextId provided, assign to context and auto-relate
      if (input.contextId) {
        const context = await ctx.db.context.findFirst({
          where: { id: input.contextId, project: { userId } },
          select: { id: true },
        });
        if (!context) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
        }

        // Add unit to context
        await ctx.db.unitContext.create({
          data: { unitId: newUnit.id, contextId: input.contextId },
        }).catch(() => {
          // Ignore duplicate — unit may already be in context
        });

        // Get other units in this context for auto-relation
        const contextLinks = await ctx.db.unitContext.findMany({
          where: { contextId: input.contextId },
          select: { unitId: true },
        });
        const siblingIds = contextLinks
          .map((l) => l.unitId)
          .filter((id) => id !== newUnit.id && id !== input.sourceUnitId);

        if (siblingIds.length > 0) {
          // Get sibling units content for AI analysis
          const siblings = await ctx.db.unit.findMany({
            where: { id: { in: siblingIds.slice(0, 15) } },
            select: { id: true, content: true, unitType: true },
          });

          if (siblings.length > 0) {
            // Get existing relations to avoid duplicates
            const allIds = [newUnit.id, ...siblings.map((s) => s.id)];
            const existingRels = await ctx.db.relation.findMany({
              where: {
                OR: [
                  { sourceUnitId: { in: allIds }, targetUnitId: { in: allIds } },
                ],
              },
              select: { sourceUnitId: true, targetUnitId: true },
            });
            const existingPairs = new Set(
              existingRels.flatMap((r) => [
                `${r.sourceUnitId}|${r.targetUnitId}`,
                `${r.targetUnitId}|${r.sourceUnitId}`,
              ]),
            );

            const allUnits = [newUnit, ...siblings];
            const unitDescriptions = allUnits
              .map((u, i) => `[${i}] (${u.unitType}) "${u.content.slice(0, 120)}"`)
              .join("\n");

            try {
              const { getAIProvider } = await import("@/server/ai/provider");
              const provider = getAIProvider();

              const raw = await provider.generateText(
                `Analyze these thought units and find relations FROM unit [0] (the new unit) TO others.
Focus only on relations involving [0].

Units:
${unitDescriptions}

Available relation types: supports, contradicts, derives_from, expands, references, exemplifies, defines, questions

Return ONLY JSON: {"relations":[{"sourceIndex":0,"targetIndex":1,"type":"supports","strength":0.7}]}
Only include relations where sourceIndex=0 or targetIndex=0.`,
                { temperature: 0.3, maxTokens: 1024 },
              );

              const jsonMatch = raw.match(/\{[\s\S]*"relations"[\s\S]*\}/);
              if (jsonMatch) {
                const VALID_TYPES = new Set([
                  "supports", "contradicts", "derives_from", "expands",
                  "references", "exemplifies", "defines", "questions",
                ]);
                const parsed = JSON.parse(jsonMatch[0]) as {
                  relations: Array<{ sourceIndex: number; targetIndex: number; type: string; strength: number }>;
                };
                const toCreate = (parsed.relations ?? [])
                  .filter((r) => {
                    if (r.sourceIndex < 0 || r.sourceIndex >= allUnits.length) return false;
                    if (r.targetIndex < 0 || r.targetIndex >= allUnits.length) return false;
                    if (r.sourceIndex === r.targetIndex) return false;
                    if (!VALID_TYPES.has(r.type)) return false;
                    if (r.sourceIndex !== 0 && r.targetIndex !== 0) return false;
                    const srcId = allUnits[r.sourceIndex]!.id;
                    const tgtId = allUnits[r.targetIndex]!.id;
                    return !existingPairs.has(`${srcId}|${tgtId}`);
                  })
                  .map((r) => ({
                    sourceUnitId: allUnits[r.sourceIndex]!.id,
                    targetUnitId: allUnits[r.targetIndex]!.id,
                    type: r.type,
                    strength: Math.round(r.strength * 100) / 100,
                    direction: "one_way" as const,
                  }));

                if (toCreate.length > 0) {
                  const batch = await ctx.db.relation.createMany({ data: toCreate });
                  autoRelatedCount = batch.count;
                }
              }
            } catch (error) {
              console.error("Auto-relate in context failed:", error);
              // Non-fatal: unit was already created and assigned
            }
          }
        }
      }

      return {
        unitId: newUnit.id,
        contextAssigned: !!input.contextId,
        autoRelatedCount,
      };
    }),

  refineUnit: rateLimitedProcedure
    .input(z.object({ unitId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ ctx: _ctx, input }) => {
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
          ? { unitTypes: intent.unitTypes as UnitType[] }
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
    .mutation(async ({ ctx: _ctx, input }): Promise<{
      suggestions: Array<{ title: string; description: string; relevance: string; url?: string }>;
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
              url: zod.string().url().optional(),
            })
          ),
          relatedConcepts: zod.array(zod.string()),
        });

        const result = await provider.generateStructured<{
          suggestions: Array<{ title: string; description: string; relevance: string; url?: string }>;
          relatedConcepts: string[];
        }>(
          `You are a knowledgeable research assistant. Given the following query or topic, suggest 3-5 highly relevant resources, topics, or concepts that would deepen understanding of it.

Query: "${input.query.slice(0, 400)}"

Return structured JSON with:
- suggestions: array of { title, description, relevance, url? } where relevance explains why it's helpful. If you are confident about the URL (e.g., Wikipedia pages, DOI links, official documentation), include it in the url field. Only provide URLs you are highly confident exist. Do not fabricate URLs.
- relatedConcepts: 3-6 brief related concept names

Focus on academic, scientific, or well-established knowledge sources.`,
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
                      url: { type: "string", description: "Optional URL if highly confident it exists (e.g., Wikipedia, DOI, official docs)" },
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
    .input(z.object({
      contextId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      let units: Array<{ id: string; content: string; unitType: string }>;

      if (input.projectId) {
        // Project-scoped: get all units in the project
        const project = await ctx.db.project.findFirst({
          where: { id: input.projectId, userId },
          select: { id: true },
        });
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        units = await ctx.db.unit.findMany({
          where: { projectId: input.projectId },
          select: { id: true, content: true, unitType: true },
          take: 50,
        });
      } else if (input.contextId) {
        // Context-scoped: original behavior
        const context = await ctx.db.context.findFirst({
          where: { id: input.contextId, project: { userId } },
          select: { id: true },
        });
        if (!context) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
        }
        const contextLinks = await ctx.db.unitContext.findMany({
          where: { contextId: input.contextId },
          select: { unitId: true },
        });
        const linkedIds = contextLinks.map((u) => u.unitId);
        units = linkedIds.length > 0
          ? await ctx.db.unit.findMany({
              where: { id: { in: linkedIds } },
              select: { id: true, content: true, unitType: true },
              take: 50,
            })
          : [];
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Either projectId or contextId is required" });
      }
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

  // ─── Generate context title from constituent units ────────────────────

  generateContextTitle: rateLimitedProcedure
    .input(z.object({
      contextId: z.string().uuid(),
      save: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const context = await ctx.db.context.findFirst({
        where: { id: input.contextId, project: { userId } },
        select: { id: true, name: true },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }
      const contextName = context.name;

      const contextLinks = await ctx.db.unitContext.findMany({
        where: { contextId: input.contextId },
        select: { unitId: true },
      });
      const unitIds = contextLinks.map((u) => u.unitId);
      if (unitIds.length === 0) {
        return { title: contextName, updated: false };
      }

      const units = await ctx.db.unit.findMany({
        where: { id: { in: unitIds } },
        select: { content: true, unitType: true },
        take: 30,
      });

      const unitSummary = units
        .map((u) => `(${u.unitType}) "${u.content.slice(0, 80)}"`)
        .join("\n");

      const { getAIProvider } = await import("@/server/ai/provider");
      const provider = getAIProvider();

      try {
        const raw = await provider.generateText(
          `You are naming a context (a thematic grouping of thought units).
Based on these ${units.length} units, generate a concise, descriptive title (3-8 words, English).
The title should capture the overarching theme or topic.

Units:
${unitSummary}

Return ONLY the title text, nothing else.`,
          { temperature: 0.4, maxTokens: 50 },
        );

        const title = raw.trim().replace(/^["']|["']$/g, "").slice(0, 100);
        if (title) {
          if (input.save) {
            await ctx.db.context.update({
              where: { id: input.contextId },
              data: { name: title },
            });
          }
          return { title, updated: input.save };
        }
        return { title: contextName, updated: false };
      } catch (error: unknown) {
        handleAIError(error, "Generate context title");
        return { title: contextName, updated: false };
      }
    }),

  // ─── Reset relations for context (delete + re-create with AI) ─────────

  resetContextRelations: rateLimitedProcedure
    .input(z.object({
      contextId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const context = await ctx.db.context.findFirst({
        where: { id: input.contextId, project: { userId } },
        select: { id: true },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      // Get all unit IDs in this context
      const contextLinks = await ctx.db.unitContext.findMany({
        where: { contextId: input.contextId },
        select: { unitId: true },
      });
      const unitIds = contextLinks.map((u) => u.unitId);

      if (unitIds.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 units to reset relations." });
      }

      // Delete all existing relations between units in this context
      const deleted = await ctx.db.relation.deleteMany({
        where: {
          sourceUnitId: { in: unitIds },
          targetUnitId: { in: unitIds },
        },
      });

      // Now fetch units for autoRelate
      const units = await ctx.db.unit.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, content: true, unitType: true },
        take: 50,
      });

      const unitDescriptions = units
        .map((u, i) => `[${i}] id:${u.id} (${u.unitType}) "${u.content.slice(0, 120)}"`)
        .join("\n");

      const { getAIProvider } = await import("@/server/ai/provider");
      const provider = getAIProvider();

      const VALID_TYPES = new Set([
        "supports", "contradicts", "derives_from", "expands",
        "references", "exemplifies", "defines", "questions",
      ]);

      try {
        const raw = await provider.generateText(
          `Analyze ALL the following thought units and identify meaningful relations between them.
Find as many genuine relations as possible — aim for comprehensive coverage.

Units:
${unitDescriptions}

Available relation types: supports, contradicts, derives_from, expands, references, exemplifies, defines, questions

Return ONLY a JSON object with this exact format (no other text):
{"relations":[{"sourceIndex":0,"targetIndex":1,"type":"supports","strength":0.8}]}

Each relation: sourceIndex (int), targetIndex (int), type (one of the types above), strength (0.0-1.0).
Be thorough — even weak relations (0.3+) are valuable for navigation.`,
          { temperature: 0.3, maxTokens: 2048 },
        );

        const jsonMatch = raw.match(/\{[\s\S]*"relations"[\s\S]*\}/);
        if (!jsonMatch) {
          return { deleted: deleted.count, created: 0, analyzed: units.length };
        }

        const RelationsResponseSchema = z.object({
          relations: z.array(z.object({
            sourceIndex: z.number(),
            targetIndex: z.number(),
            type: z.string(),
            strength: z.number(),
          })),
        });
        const parsed = RelationsResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (!parsed.success) {
          return { deleted: deleted.count, created: 0, analyzed: units.length };
        }

        const toCreate = parsed.data.relations
          .filter((r) => {
            if (r.sourceIndex < 0 || r.sourceIndex >= units.length) return false;
            if (r.targetIndex < 0 || r.targetIndex >= units.length) return false;
            if (r.sourceIndex === r.targetIndex) return false;
            return VALID_TYPES.has(r.type);
          })
          .map((r) => ({
            sourceUnitId: units[r.sourceIndex]!.id,
            targetUnitId: units[r.targetIndex]!.id,
            type: r.type,
            strength: Math.round(Math.min(1, Math.max(0, r.strength)) * 100) / 100,
            direction: "one_way" as const,
          }));

        let createdCount = 0;
        if (toCreate.length > 0) {
          const batch = await ctx.db.relation.createMany({ data: toCreate, skipDuplicates: true });
          createdCount = batch.count;
        }

        return {
          deleted: deleted.count,
          created: createdCount,
          analyzed: units.length,
        };
      } catch (error: unknown) {
        handleAIError(error, "Reset context relations");
        return { deleted: deleted.count, created: 0, analyzed: units.length };
      }
    }),

  // ─── Context Operations: suggest merges and splits ──────────────────────

  suggestContextOperations: rateLimitedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const contexts = await ctx.db.context.findMany({
        where: { projectId: input.projectId },
        select: {
          id: true,
          name: true,
          description: true,
          unitContexts: {
            select: { unit: { select: { content: true, unitType: true } } },
            take: 5,
          },
        },
        take: 30,
      });

      if (contexts.length < 2) {
        return { mergeSuggestions: [], splitSuggestions: [] };
      }

      const contextDescriptions = contexts.map((c, i) => {
        const samples = c.unitContexts
          .map((uc) => `  [${uc.unit.unitType}] ${uc.unit.content.slice(0, 80)}`)
          .join("\n");
        return `[${i}] id:${c.id} "${c.name}"${c.description ? ` — ${c.description}` : ""}\n${samples || "  (empty)"}`;
      }).join("\n\n");

      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const prompt = `Analyze these contexts from a knowledge project and suggest which ones should be merged (overlapping themes) or split (too broad/mixed topics).

Contexts:
${contextDescriptions}

Return ONLY a JSON object with this exact format (no other text):
{"mergeSuggestions":[{"indexA":0,"indexB":1,"reason":"short reason","confidence":0.8}],"splitSuggestions":[{"index":0,"reason":"short reason","suggestedSplitA":"name A","suggestedSplitB":"name B","confidence":0.7}]}

Rules:
- Only suggest merges for contexts with genuinely overlapping themes (confidence >= 0.5)
- Only suggest splits for contexts that clearly cover multiple distinct topics (confidence >= 0.5)
- Keep reasons under 100 characters
- It's fine to return empty arrays if no operations are warranted`;

        const response = await provider.generateText(prompt, {
          temperature: 0.3,
          maxTokens: 1024,
        });

        const jsonMatch = response.match(/\{[\s\S]*"mergeSuggestions"[\s\S]*\}/);
        if (!jsonMatch) {
          return { mergeSuggestions: [], splitSuggestions: [] };
        }

        const ContextOpsSchema = z.object({
          mergeSuggestions: z.array(z.object({
            indexA: z.number(),
            indexB: z.number(),
            reason: z.string(),
            confidence: z.number(),
          })).optional().default([]),
          splitSuggestions: z.array(z.object({
            index: z.number(),
            reason: z.string(),
            suggestedSplitA: z.string(),
            suggestedSplitB: z.string(),
            confidence: z.number(),
          })).optional().default([]),
        });
        const validated = ContextOpsSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (!validated.success) {
          return { mergeSuggestions: [], splitSuggestions: [] };
        }

        const mergeSuggestions = validated.data.mergeSuggestions
          .filter((m) => m.indexA >= 0 && m.indexA < contexts.length && m.indexB >= 0 && m.indexB < contexts.length)
          .map((m) => ({
            contextIdA: contexts[m.indexA]!.id,
            contextNameA: contexts[m.indexA]!.name,
            contextIdB: contexts[m.indexB]!.id,
            contextNameB: contexts[m.indexB]!.name,
            reason: m.reason,
            confidence: Math.min(1, Math.max(0, m.confidence)),
          }));

        const splitSuggestions = validated.data.splitSuggestions
          .filter((s) => s.index >= 0 && s.index < contexts.length)
          .map((s) => ({
            contextId: contexts[s.index]!.id,
            contextName: contexts[s.index]!.name,
            reason: s.reason,
            suggestedSplitA: s.suggestedSplitA,
            suggestedSplitB: s.suggestedSplitB,
            confidence: Math.min(1, Math.max(0, s.confidence)),
          }));

        return { mergeSuggestions, splitSuggestions };
      } catch (error: unknown) {
        handleAIError(error, "Suggest context operations");
        return { mergeSuggestions: [], splitSuggestions: [] };
      }
    }),

  // ─── Suggest unit allocation for context split ──────────────────────────

  suggestSplitAllocation: rateLimitedProcedure
    .input(z.object({
      contextId: z.string().uuid(),
      nameA: z.string().min(1).max(200),
      nameB: z.string().min(1).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const context = await ctx.db.context.findFirst({
        where: { id: input.contextId, project: { userId } },
        select: { id: true, name: true },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      const unitLinks = await ctx.db.unitContext.findMany({
        where: { contextId: input.contextId },
        select: { unit: { select: { id: true, content: true, unitType: true } } },
        take: 50,
      });

      if (unitLinks.length === 0) {
        return { allocations: [] };
      }

      const units = unitLinks.map((ul, i) => ({
        index: i,
        id: ul.unit.id,
        summary: `(${ul.unit.unitType}) "${ul.unit.content.slice(0, 100)}"`,
      }));

      const { getAIProvider } = await import("@/server/ai/provider");
      const provider = getAIProvider();

      try {
        const response = await provider.generateText(
          `You are splitting the context "${context.name}" into two sub-contexts:
- Group A: "${input.nameA}"
- Group B: "${input.nameB}"

Assign each unit to group A, B, or "parent" (keep in original).

Units:
${units.map((u) => `[${u.index}] ${u.summary}`).join("\n")}

Return ONLY a JSON array (no other text):
[{"index":0,"group":"A"},{"index":1,"group":"B"},{"index":2,"group":"parent"}]`,
          { temperature: 0.3, maxTokens: 2000 },
        );

        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return { allocations: [] };

        const AllocationSchema = z.array(z.object({
          index: z.number(),
          group: z.enum(["A", "B", "parent"]),
        }));

        const parsed = AllocationSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (!parsed.success) return { allocations: [] };

        const allocations = parsed.data
          .filter((a) => a.index >= 0 && a.index < units.length)
          .map((a) => ({
            unitId: units[a.index]!.id,
            group: a.group,
          }));

        return { allocations };
      } catch (error: unknown) {
        handleAIError(error, "Suggest split allocation");
        return { allocations: [] };
      }
    }),

  // ─── Context Suggestion: suggest existing contexts for a unit ───────────

  suggestContextForUnit: rateLimitedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      projectId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Get the unit
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, userId },
        select: { id: true, content: true, unitType: true },
      });
      if (!unit) return { suggestions: [], newContextName: null };

      // Get all contexts in this project with sample units
      const contexts = await ctx.db.context.findMany({
        where: { projectId: input.projectId, project: { userId } },
        select: {
          id: true,
          name: true,
          description: true,
          unitContexts: {
            select: { unit: { select: { content: true, unitType: true } } },
            take: 5,
          },
        },
        take: 20,
      });

      if (contexts.length === 0) {
        // No contexts exist — suggest creating one
        return {
          suggestions: [],
          newContextName: unit.content.slice(0, 60).replace(/[?!.,;:]+$/, "").trim(),
        };
      }

      // Check which contexts this unit is already in
      const existingLinks = await ctx.db.unitContext.findMany({
        where: { unitId: input.unitId },
        select: { contextId: true },
      });
      const linkedContextIds = new Set(existingLinks.map((l) => l.contextId));

      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const contextDescriptions = contexts.map((c, i) => {
          const sampleContent = c.unitContexts
            .map((uc) => `[${uc.unit.unitType}] ${uc.unit.content.slice(0, 80)}`)
            .join("\n  ");
          return `[${i}] "${c.name}"${c.description ? ` — ${c.description}` : ""}\n  Sample units:\n  ${sampleContent || "(empty)"}`;
        }).join("\n\n");

        const ContextSuggestionSchema = (await import("zod")).z.object({
          matches: (await import("zod")).z.array(
            (await import("zod")).z.object({
              contextIndex: (await import("zod")).z.number(),
              confidence: (await import("zod")).z.number(),
              reason: (await import("zod")).z.string(),
            })
          ),
          newContextName: (await import("zod")).z.string().nullable(),
        });

        const result = await provider.generateStructured<{
          matches: Array<{ contextIndex: number; confidence: number; reason: string }>;
          newContextName: string | null;
        }>(
          `Given this unit (${unit.unitType}): "${unit.content.slice(0, 300)}"

Which of these contexts should it belong to? Rate each relevant context.
If none fit well (all < 0.5 confidence), suggest a new context name.

Contexts:
${contextDescriptions}`,
          {
            temperature: 0.3,
            maxTokens: 512,
            zodSchema: ContextSuggestionSchema,
            schema: {
              name: "ContextSuggestion",
              description: "Suggest which contexts a unit belongs to",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      contextIndex: { type: "number" },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                      reason: { type: "string", maxLength: 100 },
                    },
                    required: ["contextIndex", "confidence", "reason"],
                  },
                },
                newContextName: { type: "string", nullable: true, description: "Suggested new context name if no existing context fits" },
              },
              required: ["matches", "newContextName"],
            },
          },
        );

        const suggestions = result.matches
          .filter((m) => m.contextIndex >= 0 && m.contextIndex < contexts.length && m.confidence >= 0.4)
          .sort((a, b) => b.confidence - a.confidence)
          .map((m) => ({
            contextId: contexts[m.contextIndex]!.id,
            contextName: contexts[m.contextIndex]!.name,
            confidence: m.confidence,
            reason: m.reason,
            alreadyLinked: linkedContextIds.has(contexts[m.contextIndex]!.id),
          }));

        return { suggestions, newContextName: result.newContextName };
      } catch {
        // Fallback: no AI — return empty
        return { suggestions: [], newContextName: null };
      }
    }),

  // ─── Auto-create context from orphan units ────────────────────────────

  autoCreateContext: rateLimitedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      unitIds: z.array(z.string().uuid()).min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify project ownership
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
        select: { id: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      // Get the units
      const units = await ctx.db.unit.findMany({
        where: { id: { in: input.unitIds }, userId },
        select: { id: true, content: true, unitType: true },
      });
      if (units.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No units found" });

      // Use AI to generate a context name and description
      let contextName: string;
      let contextDescription: string | undefined;

      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const unitList = units.map((u) => `[${u.unitType}] ${u.content.slice(0, 100)}`).join("\n");

        const ContextNameSchema = (await import("zod")).z.object({
          name: (await import("zod")).z.string(),
          description: (await import("zod")).z.string(),
        });

        const result = await provider.generateStructured<{ name: string; description: string }>(
          `These thought units seem related. Suggest a concise context name (max 60 chars) and brief description (max 200 chars) that captures their shared theme.

Units:
${unitList}`,
          {
            temperature: 0.5,
            maxTokens: 256,
            zodSchema: ContextNameSchema,
            schema: {
              name: "ContextName",
              description: "Generate context name from units",
              properties: {
                name: { type: "string", maxLength: 60 },
                description: { type: "string", maxLength: 200 },
              },
              required: ["name", "description"],
            },
          },
        );
        contextName = result.name;
        contextDescription = result.description;
      } catch {
        // Fallback: use first unit content as name
        contextName = units[0]!.content.slice(0, 50).replace(/[?!.,;:]+$/, "").trim();
        contextDescription = `Auto-created from ${units.length} unit(s)`;
      }

      // Create the context
      const newContext = await ctx.db.context.create({
        data: {
          name: contextName,
          description: contextDescription,
          projectId: input.projectId,
        },
      });

      // Add all units to the context
      await ctx.db.unitContext.createMany({
        data: units.map((u) => ({ unitId: u.id, contextId: newContext.id })),
        skipDuplicates: true,
      });

      return {
        contextId: newContext.id,
        contextName: newContext.name,
        description: contextDescription,
        unitsAdded: units.length,
      };
    }),

  // ─── Deep Dive: Generate follow-up questions ─────────────────────────

  deepDiveQuestions: rateLimitedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      content: z.string().min(1),
      unitType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, userId },
        select: { id: true },
      });
      if (!unit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      }

      const { getAIProvider } = await import("@/server/ai/provider");
      const provider = getAIProvider();

      const prompt = `Given the following thought unit, generate 4-6 follow-up questions that would deepen understanding of this topic. Each question should explore a different angle: supporting evidence, counterarguments, implications, definitions, related concepts, or practical applications.

Unit type: ${input.unitType ?? "observation"}
Content: "${input.content}"

Return ONLY a JSON object with this exact format:
{"questions":[{"text":"The question text","angle":"evidence|counter|implication|definition|related|application","priority":"high|medium"}]}

Make questions specific and thought-provoking, not generic.`;

      try {
        const raw = await provider.generateText(prompt, { temperature: 0.7, maxTokens: 1024 });
        const jsonMatch = raw.match(/\{[\s\S]*"questions"[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid AI response");

        const result = JSON.parse(jsonMatch[0]) as {
          questions: Array<{ text: string; angle: string; priority: string }>;
        };

        return {
          questions: (result.questions ?? []).slice(0, 6).map((q) => ({
            text: q.text,
            angle: q.angle ?? "related",
            priority: q.priority ?? "medium",
          })),
        };
      } catch (err) {
        return handleAIError(err, "deepDiveQuestions");
      }
    }),

  // ─── Deep Dive: Answer a question and organize into units ────────────

  deepDiveAnswer: rateLimitedProcedure
    .input(z.object({
      unitId: z.string().uuid(),
      question: z.string().min(1),
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Verify ownership
      const [unit, project] = await Promise.all([
        ctx.db.unit.findFirst({
          where: { id: input.unitId, userId },
          select: { id: true, content: true, unitType: true, projectId: true },
        }),
        ctx.db.project.findFirst({
          where: { id: input.projectId, userId },
          select: { id: true },
        }),
      ]);
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const { getAIProvider } = await import("@/server/ai/provider");
      const provider = getAIProvider();

      const prompt = `You are analyzing a thought unit and answering a follow-up question about it. Your answer should be comprehensive and well-structured.

Original unit (${unit.unitType}): "${unit.content}"

Question: "${input.question}"

Provide a thorough answer, then decompose it into discrete thought units. Each unit should be a single, self-contained idea.

Return ONLY a JSON object:
{
  "answer": "Your full answer text",
  "units": [
    {
      "content": "A single self-contained thought",
      "unitType": "claim|evidence|definition|observation|question|counterargument|idea|assumption",
      "relationToOriginal": "expands|supports|contradicts|derives_from|defines|exemplifies|questions|references",
      "strength": 0.8
    }
  ],
  "suggestContext": true or false,
  "contextName": "Suggested context name if suggestContext is true"
}

Rules:
- Generate 2-5 units from your answer
- Each unit must stand alone as a meaningful thought
- Use appropriate unit types (evidence for facts, claim for assertions, definition for term clarifications, etc.)
- Set relation strength 0.5-1.0 based on how directly it connects to the original`;

      try {
        const raw = await provider.generateText(prompt, { temperature: 0.4, maxTokens: 2048 });
        const jsonMatch = raw.match(/\{[\s\S]*"answer"[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid AI response");

        const result = JSON.parse(jsonMatch[0]) as {
          answer: string;
          units: Array<{
            content: string;
            unitType: string;
            relationToOriginal: string;
            strength: number;
          }>;
          suggestContext: boolean;
          contextName?: string;
        };

        const VALID_TYPES = new Set([
          "claim", "evidence", "definition", "observation",
          "question", "counterargument", "idea", "assumption", "action",
        ]);
        const VALID_RELATIONS = new Set([
          "supports", "contradicts", "derives_from", "expands",
          "references", "exemplifies", "defines", "questions",
        ]);

        // Create units and relations
        const createdUnits: Array<{ id: string; content: string; unitType: string }> = [];
        const createdRelations: Array<{ id: string; type: string }> = [];

        for (const u of (result.units ?? []).slice(0, 5)) {
          if (!u.content?.trim()) continue;

          const unitType = VALID_TYPES.has(u.unitType) ? u.unitType : "observation";
          const relationType = VALID_RELATIONS.has(u.relationToOriginal) ? u.relationToOriginal : "derives_from";
          const strength = Math.max(0.3, Math.min(1, u.strength ?? 0.7));

          // Create the unit
          const newUnit = await ctx.db.unit.create({
            data: {
              content: u.content.trim(),
              unitType: unitType as UnitType,
              lifecycle: "draft",
              originType: "ai_generated",
              sourceSpan: { deepDiveFrom: input.unitId, question: input.question },
              projectId: input.projectId,
              userId,
            },
          });
          createdUnits.push({ id: newUnit.id, content: newUnit.content, unitType: newUnit.unitType });

          // Create relation from original to new unit
          const relation = await ctx.db.relation.create({
            data: {
              sourceUnitId: input.unitId,
              targetUnitId: newUnit.id,
              type: relationType,
              strength,
              direction: "one_way",
            },
          });
          createdRelations.push({ id: relation.id, type: relation.type });
        }

        // Also create inter-unit relations among the new units if there are 3+
        if (createdUnits.length >= 3) {
          for (let i = 0; i < createdUnits.length - 1; i++) {
            await ctx.db.relation.create({
              data: {
                sourceUnitId: createdUnits[i]!.id,
                targetUnitId: createdUnits[i + 1]!.id,
                type: "expands",
                strength: 0.5,
                direction: "one_way",
              },
            });
          }
        }

        return {
          answer: result.answer,
          createdUnits,
          createdRelations,
          suggestContext: result.suggestContext && createdUnits.length >= 2,
          contextName: result.contextName,
        };
      } catch (err) {
        return handleAIError(err, "deepDiveAnswer");
      }
    }),

  // ─── Deep Dive: Bundle branched units into a context ──────────────────

  deepDiveBundleContext: rateLimitedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      unitIds: z.array(z.string().uuid()).min(2).max(30),
      contextName: z.string().min(1).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId },
        select: { id: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      // Verify all units belong to user
      const units = await ctx.db.unit.findMany({
        where: { id: { in: input.unitIds }, userId },
        select: { id: true },
      });
      if (units.length !== input.unitIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or more units not found" });
      }

      const newContext = await ctx.db.context.create({
        data: {
          name: input.contextName,
          description: `Deep dive exploration with ${units.length} units`,
          projectId: input.projectId,
        },
      });

      await ctx.db.unitContext.createMany({
        data: input.unitIds.map((uid) => ({ unitId: uid, contextId: newContext.id })),
        skipDuplicates: true,
      });

      return {
        contextId: newContext.id,
        contextName: newContext.name,
        unitsAdded: units.length,
      };
    }),

  // ─── Navigation Path: Bridge Gap Detection ─────────────────────────

  /**
   * Detect conceptual gaps in a navigation path and suggest bridge units.
   */
  detectBridgeGaps: rateLimitedProcedure
    .input(z.object({ navigatorId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const nav = await ctx.db.navigator.findFirst({
        where: { id: input.navigatorId, context: { project: { userId: ctx.session.user.id! } } },
      });
      if (!nav || nav.path.length < 2) {
        return { bridges: [], aiAnalyzed: true };
      }

      const units = await ctx.db.unit.findMany({
        where: { id: { in: nav.path } },
        select: { id: true, content: true, unitType: true },
      });
      const unitMap = new Map(units.map((u) => [u.id, u]));

      // Build ordered step descriptions
      const stepDescriptions = nav.path.map((id, i) => {
        const u = unitMap.get(id);
        return `${i}. [${u?.unitType ?? "unknown"}] ${u?.content.slice(0, 120) ?? "Unknown unit"}`;
      }).join("\n");

      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const result = await provider.generateStructured<{
          bridges: Array<{
            afterStepIndex: number;
            content: string;
            unitType: string;
            rationale: string;
            relationToPrev: string;
            relationToNext: string;
          }>;
          completeness?: Array<{
            suggestion: string;
            unitType: string;
            priority: "high" | "medium" | "low";
          }>;
        }>(
          `You are analyzing a reading path for conceptual coherence and completeness. Here are the steps:

${stepDescriptions}

Do TWO things:

1. **Bridge gaps** (0-3): Identify gaps where the conceptual flow breaks between adjacent steps. For each gap, suggest a bridge unit that would make the transition smoother. Only suggest bridges where there's a genuine logical disconnect — not every transition needs one.

For each bridge, specify:
- afterStepIndex: the step index after which to insert (0-based)
- content: the full text of the suggested bridge unit (max 2000 chars)
- unitType: the appropriate type (claim, question, evidence, etc.)
- rationale: why this bridge is needed
- relationToPrev: relation type to the unit before (supports, expands, derives_from, etc.)
- relationToNext: relation type to the unit after

2. **Completeness suggestions** (0-5): Identify what's MISSING from this path to make the argument/narrative more complete. These are suggestions for NEW real units the user should consider creating. Think about: missing evidence, unanswered questions, unstated assumptions, absent counterarguments.

For each completeness suggestion, specify:
- suggestion: description of the unit that should be created (max 500 chars)
- unitType: the recommended type for this unit
- priority: high (critical gap), medium (would strengthen), low (nice to have)`,
          {
            temperature: 0.5,
            maxTokens: 1500,
            zodSchema: BridgeSuggestionsSchema,
            schema: {
              name: "BridgeSuggestions",
              description: "Bridge units and completeness suggestions",
              properties: {
                bridges: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      afterStepIndex: { type: "number" },
                      content: { type: "string" },
                      unitType: { type: "string", enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"] },
                      rationale: { type: "string" },
                      relationToPrev: { type: "string", enum: ["supports", "contradicts", "derives_from", "expands", "references", "exemplifies", "defines", "questions"] },
                      relationToNext: { type: "string", enum: ["supports", "contradicts", "derives_from", "expands", "references", "exemplifies", "defines", "questions"] },
                    },
                    required: ["afterStepIndex", "content", "unitType", "rationale", "relationToPrev", "relationToNext"],
                  },
                },
                completeness: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      suggestion: { type: "string" },
                      unitType: { type: "string", enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"] },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["suggestion", "unitType", "priority"],
                  },
                },
              },
              required: ["bridges"],
            },
          },
        );
        return { ...result, completeness: result.completeness ?? [], aiAnalyzed: true };
      } catch (error) {
        console.error("detectBridgeGaps AI call failed:", error);
        return { bridges: [], completeness: [], aiAnalyzed: false };
      }
    }),

  /**
   * Accept bridge suggestions: store as inline bridges on the navigator (NOT real units).
   * Bridge data lives in navigator.bridges JSON — path remains UUID-only.
   */
  acceptBridgeUnits: protectedProcedure
    .input(z.object({
      navigatorId: z.string().uuid(),
      bridges: z.array(z.object({
        afterStepIndex: z.number().int().min(0),
        content: z.string().min(1).max(2000),
        unitType: z.string(),
        rationale: z.string().max(500).optional(),
        relationToPrev: z.string(),
        relationToNext: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const nav = await ctx.db.navigator.findFirst({
        where: { id: input.navigatorId, context: { project: { userId: ctx.session.user.id! } } },
      });
      if (!nav) throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });

      // Merge new bridges with existing ones, avoiding duplicate afterStepIndex
      const existing = (Array.isArray(nav.bridges) ? nav.bridges : []) as Array<Record<string, unknown>>;
      const existingIndexes = new Set(existing.map((b) => b.afterStepIndex));

      const newBridges = input.bridges
        .filter((b) => !existingIndexes.has(b.afterStepIndex))
        .map((b) => ({
          afterStepIndex: b.afterStepIndex,
          content: b.content,
          unitType: b.unitType,
          rationale: b.rationale ?? "",
          relationToPrev: b.relationToPrev,
          relationToNext: b.relationToNext,
        }));

      const allBridges = [...existing, ...newBridges]
        .sort((a, b) => (a.afterStepIndex as number) - (b.afterStepIndex as number));

      await ctx.db.navigator.update({
        where: { id: input.navigatorId },
        data: { bridges: JSON.parse(JSON.stringify(allBridges)) as Prisma.InputJsonValue },
      });

      return { bridgesAdded: newBridges.length, totalBridges: allBridges.length };
    }),

  /**
   * Promote an inline bridge to a real unit — creates the unit, relations,
   * inserts it into the navigator path, and removes it from bridges JSON.
   */
  promoteBridge: protectedProcedure
    .input(z.object({
      navigatorId: z.string().uuid(),
      projectId: z.string().uuid(),
      afterStepIndex: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const nav = await ctx.db.navigator.findFirst({
        where: { id: input.navigatorId, context: { project: { userId: ctx.session.user.id! } } },
      });
      if (!nav) throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });

      const bridges = (Array.isArray(nav.bridges) ? nav.bridges : []) as Array<{
        afterStepIndex: number; content: string; unitType: string;
        relationToPrev: string; relationToNext: string;
      }>;

      const bridge = bridges.find((b) => b.afterStepIndex === input.afterStepIndex);
      if (!bridge) throw new TRPCError({ code: "NOT_FOUND", message: "Bridge not found at that index" });

      const userId = ctx.session.user.id!;

      // Create the real unit
      const newUnit = await ctx.db.unit.create({
        data: {
          content: bridge.content,
          unitType: bridge.unitType as never,
          lifecycle: "draft",
          originType: "ai_generated",
          projectId: input.projectId,
          userId,
        },
      });

      // Create relations to adjacent path units
      const newPath = [...nav.path];
      const prevUnitId = newPath[bridge.afterStepIndex];
      const nextUnitId = newPath[bridge.afterStepIndex + 1];

      const relationCreates = [];
      if (prevUnitId) {
        relationCreates.push(ctx.db.relation.create({
          data: {
            sourceUnitId: prevUnitId, targetUnitId: newUnit.id,
            type: bridge.relationToPrev, strength: 0.7, direction: "one_way",
          },
        }));
      }
      if (nextUnitId) {
        relationCreates.push(ctx.db.relation.create({
          data: {
            sourceUnitId: newUnit.id, targetUnitId: nextUnitId,
            type: bridge.relationToNext, strength: 0.7, direction: "one_way",
          },
        }));
      }
      await Promise.all(relationCreates);

      // Insert unit into path and remove bridge from JSON
      newPath.splice(bridge.afterStepIndex + 1, 0, newUnit.id);

      // Reindex remaining bridges: those after the promoted one shift +1
      const remainingBridges = bridges
        .filter((b) => b.afterStepIndex !== input.afterStepIndex)
        .map((b) => ({
          ...b,
          afterStepIndex: b.afterStepIndex > input.afterStepIndex
            ? b.afterStepIndex + 1
            : b.afterStepIndex,
        }));

      await ctx.db.navigator.update({
        where: { id: input.navigatorId },
        data: { path: newPath, bridges: JSON.parse(JSON.stringify(remainingBridges)) as Prisma.InputJsonValue },
      });

      // Link to context
      await ctx.db.unitContext.create({
        data: { unitId: newUnit.id, contextId: nav.contextId },
      }).catch(() => { /* duplicate ok */ });

      return { unitId: newUnit.id, updatedPath: newPath };
    }),

  /**
   * Remove an inline bridge from a navigator without creating a real unit.
   */
  dismissBridge: protectedProcedure
    .input(z.object({
      navigatorId: z.string().uuid(),
      afterStepIndex: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const nav = await ctx.db.navigator.findFirst({
        where: { id: input.navigatorId, context: { project: { userId: ctx.session.user.id! } } },
      });
      if (!nav) throw new TRPCError({ code: "NOT_FOUND", message: "Navigator not found" });

      const bridges = (Array.isArray(nav.bridges) ? nav.bridges : []) as Array<Record<string, unknown>>;
      const filtered = bridges.filter((b) => b.afterStepIndex !== input.afterStepIndex);

      await ctx.db.navigator.update({
        where: { id: input.navigatorId },
        data: { bridges: JSON.parse(JSON.stringify(filtered)) as Prisma.InputJsonValue },
      });

      return { remaining: filtered.length };
    }),

  // ─── Navigation Path: Derivation Placement ─────────────────────────

  /**
   * After a derivation is created in FlowReader, suggest where to place it:
   * in the current path, other navigators, and which context.
   */
  suggestDerivationPlacement: rateLimitedProcedure
    .input(z.object({
      derivedUnitId: z.string().uuid(),
      originUnitId: z.string().uuid(),
      navigatorId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      // Load derived unit, origin unit, current navigator, and other navigators
      const [derivedUnit, originUnit, currentNav, otherNavs] = await Promise.all([
        ctx.db.unit.findFirst({
          where: { id: input.derivedUnitId, userId },
          select: { id: true, content: true, unitType: true },
        }),
        ctx.db.unit.findFirst({
          where: { id: input.originUnitId, userId },
          select: { id: true, content: true, unitType: true },
        }),
        ctx.db.navigator.findFirst({
          where: { id: input.navigatorId, context: { project: { userId } } },
        }),
        ctx.db.navigator.findMany({
          where: {
            context: { project: { userId } },
            id: { not: input.navigatorId },
            path: { has: input.originUnitId },
          },
          select: { id: true, name: true, path: true },
        }),
      ]);

      if (!derivedUnit || !originUnit || !currentNav) {
        // Fallback: insert after origin in current navigator
        const originIdx = currentNav?.path.indexOf(input.originUnitId) ?? -1;
        return {
          insertIntoCurrentPath: {
            recommended: true,
            insertAfterIndex: originIdx >= 0 ? originIdx : null,
            reason: "Place derived unit right after its origin",
          },
          otherNavigators: [],
          suggestedContextId: null,
          suggestedContextName: null,
        };
      }

      // Build path description for current navigator
      const pathUnits = await ctx.db.unit.findMany({
        where: { id: { in: currentNav.path } },
        select: { id: true, content: true, unitType: true },
      });
      const pathMap = new Map(pathUnits.map((u) => [u.id, u]));
      const pathDescription = currentNav.path.map((id, i) => {
        const u = pathMap.get(id);
        return `${i}. [${u?.unitType ?? "?"}] ${u?.content.slice(0, 80) ?? "?"}`;
      }).join("\n");

      const otherNavDescriptions = otherNavs.map((n) =>
        `Navigator "${n.name}" (${n.path.length} steps, origin at index ${n.path.indexOf(input.originUnitId)})`
      ).join("\n");

      // Load contexts the origin unit belongs to
      const originContexts = await ctx.db.unitContext.findMany({
        where: { unitId: input.originUnitId },
        select: { context: { select: { id: true, name: true } } },
      });
      const contextOptions = originContexts.map((uc) => `- ${uc.context.name} (${uc.context.id})`).join("\n");

      try {
        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const result = await provider.generateStructured<{
          insertIntoCurrentPath: { recommended: boolean; insertAfterIndex: number | null; reason: string };
          otherNavigators: Array<{ navigatorId: string; recommended: boolean; insertAfterIndex: number | null; reason: string }>;
          suggestedContextId: string | null;
          suggestedContextName: string | null;
        }>(
          `A user derived a new thought unit while reading a navigation path.

Derived unit: [${derivedUnit.unitType}] "${derivedUnit.content.slice(0, 200)}"
Origin unit: [${originUnit.unitType}] "${originUnit.content.slice(0, 200)}"

Current path (${currentNav.name}):
${pathDescription}

${otherNavs.length > 0 ? `Other navigators containing the origin:\n${otherNavDescriptions}` : "No other navigators contain the origin unit."}

${originContexts.length > 0 ? `Contexts the origin belongs to:\n${contextOptions}` : ""}

Decide:
1. Should the derived unit be inserted into the current path? If yes, after which step index? Consider whether it fits the path's narrative flow.
2. For each other navigator listed, should it be included? After which step?
3. Which context should the derived unit be added to? (provide the ID from the list, or null if it should stay in the same context as the origin)`,
          {
            temperature: 0.3,
            maxTokens: 512,
            zodSchema: DerivationPlacementSchema,
            schema: {
              name: "DerivationPlacement",
              description: "Placement suggestions for a derived unit",
              properties: {
                insertIntoCurrentPath: {
                  type: "object",
                  properties: {
                    recommended: { type: "boolean" },
                    insertAfterIndex: { type: "number", nullable: true },
                    reason: { type: "string" },
                  },
                  required: ["recommended", "insertAfterIndex", "reason"],
                },
                otherNavigators: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      navigatorId: { type: "string" },
                      recommended: { type: "boolean" },
                      insertAfterIndex: { type: "number", nullable: true },
                      reason: { type: "string" },
                    },
                    required: ["navigatorId", "recommended", "insertAfterIndex", "reason"],
                  },
                },
                suggestedContextId: { type: "string", nullable: true },
                suggestedContextName: { type: "string", nullable: true },
              },
              required: ["insertIntoCurrentPath", "otherNavigators", "suggestedContextId", "suggestedContextName"],
            },
          },
        );
        return result;
      } catch {
        // Heuristic fallback: insert right after origin in current path
        const originIdx = currentNav.path.indexOf(input.originUnitId);
        return {
          insertIntoCurrentPath: {
            recommended: true,
            insertAfterIndex: originIdx >= 0 ? originIdx : null,
            reason: "Place derived unit right after its origin",
          },
          otherNavigators: otherNavs.map((n) => ({
            navigatorId: n.id,
            recommended: false,
            insertAfterIndex: null,
            reason: "AI unavailable — manual review recommended",
          })),
          suggestedContextId: originContexts[0]?.context.id ?? null,
          suggestedContextName: originContexts[0]?.context.name ?? null,
        };
      }
    }),

  /**
   * Apply derivation placement: insert derived unit into navigators and assign context.
   */
  applyDerivationPlacement: protectedProcedure
    .input(z.object({
      derivedUnitId: z.string().uuid(),
      placements: z.array(z.object({
        navigatorId: z.string().uuid(),
        insertAfterIndex: z.number().int().min(0),
      })),
      contextId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;
      const updated: string[] = [];

      for (const placement of input.placements) {
        const nav = await ctx.db.navigator.findFirst({
          where: { id: placement.navigatorId, context: { project: { userId } } },
        });
        if (!nav) continue;

        const newPath = [...nav.path];
        // Insert after the specified index
        newPath.splice(placement.insertAfterIndex + 1, 0, input.derivedUnitId);

        await ctx.db.navigator.update({
          where: { id: placement.navigatorId },
          data: { path: newPath },
        });
        updated.push(nav.id);
      }

      // Assign to context if specified
      if (input.contextId) {
        await ctx.db.unitContext.create({
          data: {
            unitId: input.derivedUnitId,
            contextId: input.contextId,
          },
        }).catch(() => {
          // Ignore duplicate — unit may already be in this context
        });
      }

      return { updatedNavigators: updated };
    }),

  // ─── AI-generate reasoning chains for a context ─────────────────────────

  generateReasoningChains: rateLimitedProcedure
    .input(z.object({
      contextId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!;

      const context = await ctx.db.context.findFirst({
        where: { id: input.contextId, project: { userId } },
        select: { id: true, name: true, projectId: true },
      });
      if (!context) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context not found" });
      }

      // Get units in this context
      const unitLinks = await ctx.db.unitContext.findMany({
        where: { contextId: input.contextId },
        select: { unit: { select: { id: true, content: true, unitType: true } } },
        take: 40,
      });

      if (unitLinks.length < 2) {
        return { chains: [], bridgeUnitsCreated: 0 };
      }

      const units = unitLinks.map((ul, i) => ({
        index: i,
        id: ul.unit.id,
        type: ul.unit.unitType,
        content: ul.unit.content.slice(0, 150),
      }));

      // Also fetch existing relations for richer analysis
      const unitIds = units.map((u) => u.id);
      const relations = await ctx.db.relation.findMany({
        where: {
          sourceUnitId: { in: unitIds },
          targetUnitId: { in: unitIds },
        },
        select: { sourceUnitId: true, targetUnitId: true, type: true },
        take: 100,
      });

      const relDesc = relations.length > 0
        ? `\n\nExisting relations:\n${relations.map((r) => `${r.sourceUnitId.slice(0, 8)} -[${r.type}]-> ${r.targetUnitId.slice(0, 8)}`).join("\n")}`
        : "";

      const { getAIProvider } = await import("@/server/ai/provider");
      const provider = getAIProvider();

      try {
        const response = await provider.generateText(
          `You are analyzing thought units in the context "${context.name}" to build reasoning chains.

A reasoning chain is a logical argument: premises → inferences → conclusions.
Between existing units, there may be logical gaps. When the reasoning jump between two consecutive steps is too large or unnatural, create a BRIDGE unit to fill the gap.

Units:
${units.map((u) => `[${u.index}] (${u.type}) "${u.content}"`).join("\n")}${relDesc}

Find 1-3 reasoning chains. For each chain:
- Give it a descriptive name (3-8 words) and a goal/thesis
- Assign existing units by index with role: "premise", "inference", or "conclusion"
- Where there's a logical gap between steps, insert a bridge step with:
  - "bridge": true
  - "content": the bridging thought (1-2 sentences)
  - "unitType": one of claim, observation, inference, assumption, evidence
  - "role": the role this bridge plays in the chain

Return ONLY a JSON array (no other text):
[{"name":"chain name","goal":"thesis","steps":[
  {"index":0,"role":"premise"},
  {"bridge":true,"content":"bridging thought here","unitType":"claim","role":"inference"},
  {"index":2,"role":"conclusion"}
]}]`,
          { temperature: 0.4, maxTokens: 3000 },
        );

        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return { chains: [], bridgeUnitsCreated: 0 };

        const StepSchema = z.union([
          z.object({
            index: z.number(),
            role: z.enum(["premise", "inference", "conclusion"]),
            bridge: z.literal(false).optional(),
          }),
          z.object({
            bridge: z.literal(true),
            content: z.string(),
            unitType: z.string(),
            role: z.enum(["premise", "inference", "conclusion"]),
          }),
        ]);

        const ChainSchema = z.array(z.object({
          name: z.string(),
          goal: z.string(),
          steps: z.array(StepSchema),
        }));

        const parsed = ChainSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (!parsed.success) return { chains: [], bridgeUnitsCreated: 0 };

        // Create reasoning chains, materializing bridge units
        const created = [];
        let bridgeCount = 0;

        for (const chain of parsed.data) {
          const resolvedSteps: Array<{ unitId: string; role: string; order: number }> = [];
          let order = 0;

          for (const step of chain.steps) {
            if ("bridge" in step && step.bridge === true) {
              // Create a new bridge unit
              const bridgeUnit = await ctx.db.unit.create({
                data: {
                  content: step.content.slice(0, 2000),
                  unitType: step.unitType as "claim" | "observation" | "assumption" | "evidence" | "idea",
                  userId,
                  projectId: context.projectId,
                  originType: "ai_generated",
                  lifecycle: "confirmed",
                },
              });
              // Link bridge unit to context
              await ctx.db.unitContext.create({
                data: { unitId: bridgeUnit.id, contextId: input.contextId },
              });
              resolvedSteps.push({ unitId: bridgeUnit.id, role: step.role, order });
              bridgeCount++;
            } else if ("index" in step) {
              if (step.index >= 0 && step.index < units.length) {
                resolvedSteps.push({ unitId: units[step.index]!.id, role: step.role, order });
              }
            }
            order++;
          }

          if (resolvedSteps.length < 2) continue;

          const record = await ctx.db.reasoningChain.create({
            data: {
              name: chain.name.slice(0, 200),
              goal: chain.goal.slice(0, 1000),
              contextId: input.contextId,
              steps: resolvedSteps,
            },
          });
          created.push(record);
        }

        return { chains: created, bridgeUnitsCreated: bridgeCount };
      } catch (error: unknown) {
        handleAIError(error, "Generate reasoning chains");
        return { chains: [], bridgeUnitsCreated: 0 };
      }
    }),

  // ─── Reflection Prompts ──────────────────────────────────────────────────

  generateReflectionPrompts: rateLimitedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      contextId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Load units from context using existing helper
        const units = await getContextUnits(ctx.db, input.contextId, 20);

        // Get context name
        const context = await ctx.db.context.findUnique({
          where: { id: input.contextId },
          select: { name: true },
        });

        const { getAIProvider } = await import("@/server/ai/provider");
        const provider = getAIProvider();

        const { generateReflectionPrompts } = await import("@/server/ai/reflection");
        const prompts = await generateReflectionPrompts(
          provider,
          units,
          context?.name ?? undefined,
        );

        return { prompts, aiGenerated: true };
      } catch (error: unknown) {
        handleAIError(error, "Generate reflection prompts");
        return { prompts: [], aiGenerated: false };
      }
    }),
});
