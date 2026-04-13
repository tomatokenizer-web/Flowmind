import type { PrismaClient } from "@prisma/client";
import { getAIProvider, type AIProvider } from "./provider";
import { createSafetyGuard, type SafetyGuard } from "./safetyGuard";
import { logger } from "../logger";
import {
  TypeSuggestionSchema,
  RelationSuggestionsSchema,
  PurposeClassificationSchema,
  DecompositionBoundariesSchema,
  DecompositionRelationProposalsSchema,
  SplitReattributionSchema,
  AlternativeFramingsSchema,
  CounterArgumentsSchema,
  AssumptionsSchema,
  ContradictionsSchema,
  MergeSuggestionsSchema,
  CompletenessAnalysisSchema,
  ContextSummarySchema,
  GeneratedQuestionsSchema,
  NextStepsSchema,
  ExtractedTermsSchema,
  StanceClassificationSchema,
  ScopeJumpSchema,
  NLQIntentSchema,
} from "./schemas";
import type {
  TypeSuggestion,
  RelationSuggestion,
  SplitReattributionProposal,
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
  AIServiceContext,
  UserPurpose,
  DecompositionBoundary,
  DecompositionRelationProposal,
  UnitProposal,
  DecompositionResult,
} from "./types";

// ─── Prompt Injection Sanitization ────────────────────────────────────────
// DEC-2026-002 §B.3: All user-supplied text must be sanitized before
// inclusion in AI prompts to prevent prompt injection attacks.

/**
 * Sanitize user content before embedding in AI prompts.
 * - Escapes sequences that could be interpreted as prompt boundaries
 * - Truncates to maxLen to prevent context overflow
 * - Replaces common injection patterns
 */
function sanitizeUserContent(text: string, maxLen = 500): string {
  let sanitized = text.slice(0, maxLen);
  // Escape triple-backtick blocks that could break prompt formatting
  sanitized = sanitized.replace(/```/g, "'''");
  // Escape XML-like tags that might be interpreted as system instructions
  sanitized = sanitized.replace(/<\/?(?:system|assistant|user|human|prompt|instruction)[^>]*>/gi, "[tag removed]");
  // Replace sequences that look like prompt boundary markers
  sanitized = sanitized.replace(/---+/g, "—");
  sanitized = sanitized.replace(/===+/g, "≡");
  // Remove null bytes and control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return sanitized;
}

// ─── AI Service ───────────────────────────────────────────────────────────

export function createAIService(db: PrismaClient) {
  const provider: AIProvider = getAIProvider();
  const safetyGuard: SafetyGuard = createSafetyGuard(db);

  return {
    /**
     * Suggest a unit type based on content analysis
     */
    async suggestUnitType(
      content: string,
      ctx: AIServiceContext
    ): Promise<TypeSuggestion> {
      // Safety check
      const check = await safetyGuard.runAllChecks({
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        requestUnitCount: 0, // No units being created
        contextId: ctx.contextId,
      });

      if (!check.allowed && check.error) {
        throw new Error(check.error.message);
      }

      const prompt = `Analyze the following text and determine its primary cognitive function.

Text: "${sanitizeUserContent(content, 500)}"

Available unit types:
- claim: An assertion or statement that could be true or false
- question: A query seeking information or understanding
- evidence: Data, facts, or observations supporting a claim
- counterargument: An opposing viewpoint or challenge to a claim
- observation: A direct perception or noticed phenomenon
- idea: A creative thought or proposal for exploration
- definition: A precise explanation of a term or concept
- assumption: An unstated premise underlying reasoning
- action: A task or step to be taken

Respond with the most appropriate unit type.`;

      const result = await provider.generateStructured<TypeSuggestion>(prompt, {
        temperature: 0.3,
        maxTokens: 256,
        zodSchema: TypeSuggestionSchema,
        schema: {
          name: "TypeSuggestion",
          description: "AI suggestion for unit type classification",
          properties: {
            unitType: {
              type: "string",
              enum: [
                "claim",
                "question",
                "evidence",
                "counterargument",
                "observation",
                "idea",
                "definition",
                "assumption",
                "action",
              ],
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            reasoning: {
              type: "string",
              maxLength: 200,
            },
          },
          required: ["unitType", "confidence", "reasoning"],
        },
      });

      logger.info(
        { unitType: result.unitType, confidence: result.confidence },
        "AI type suggestion generated"
      );

      return result;
    },

    /**
     * Suggest relations between a new unit and existing units in context
     */
    async suggestRelations(
      newUnitContent: string,
      existingUnits: Array<{ id: string; content: string; unitType: string }>,
      ctx: AIServiceContext
    ): Promise<RelationSuggestion[]> {
      if (existingUnits.length === 0) {
        return [];
      }

      // Safety check
      const check = await safetyGuard.runAllChecks({
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        requestUnitCount: 0,
        contextId: ctx.contextId,
      });

      if (!check.allowed && check.error) {
        throw new Error(check.error.message);
      }

      const existingUnitsDescription = existingUnits
        .slice(0, 10)
        .map(
          (u, i) =>
            `[${i}] (${u.unitType}) "${sanitizeUserContent(u.content, 100)}..." (id: ${u.id})`
        )
        .join("\n");

      const prompt = `Analyze the relationship between a new thought unit and existing units.

New unit: "${sanitizeUserContent(newUnitContent, 300)}"

Existing units:
${existingUnitsDescription}

Available relation types:
- supports: Logically backs the other unit's claim
- contradicts: Logically conflicts with the other
- derives_from: Is logically derived from the other
- expands: Develops the other more concretely
- references: References the other as background
- exemplifies: Is a concrete instance of the other's principle
- defines: Defines a key concept of the other
- questions: Raises doubt about the other

Suggest up to 3 most relevant relations from the new unit to existing units.`;

      const result = await provider.generateStructured<{
        relations: RelationSuggestion[];
      }>(prompt, {
        temperature: 0.4,
        maxTokens: 512,
        zodSchema: RelationSuggestionsSchema,
        schema: {
          name: "RelationSuggestions",
          description: "AI suggestions for unit relations",
          properties: {
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  targetUnitId: { type: "string" },
                  relationType: {
                    type: "string",
                    enum: [
                      "supports",
                      "contradicts",
                      "derives_from",
                      "expands",
                      "references",
                      "exemplifies",
                      "defines",
                      "questions",
                    ],
                  },
                  strength: { type: "number", minimum: 0, maximum: 1 },
                  reasoning: { type: "string", maxLength: 150 },
                },
                required: ["targetUnitId", "relationType", "strength", "reasoning"],
              },
              maxItems: 3,
            },
          },
          required: ["relations"],
        },
      });

      logger.info(
        { count: result.relations.length },
        "AI relation suggestions generated"
      );

      return result.relations;
    },

    /**
     * Get the AI contribution ratio for a context
     */
    async getContributionRatio(contextId: string): Promise<{
      total: number;
      userWritten: number;
      aiGenerated: number;
      aiRefined: number;
      ratio: number;
    }> {
      const units = await db.unitContext.findMany({
        where: { contextId },
        include: { unit: { select: { originType: true, lifecycle: true } } },
      });

      const total = units.length;
      const userWritten = units.filter(
        (u) => u.unit.originType === "direct_write"
      ).length;
      const aiGenerated = units.filter(
        (u) => u.unit.originType === "ai_generated"
      ).length;
      const aiRefined = units.filter(
        (u) => u.unit.originType === "ai_refined"
      ).length;

      return {
        total,
        userWritten,
        aiGenerated,
        aiRefined,
        ratio: total > 0 ? (aiGenerated + aiRefined) / total : 0,
      };
    },

    /**
     * Reset branch count after user creates manual content
     */
    resetBranchCount(userId: string, sessionId: string): void {
      safetyGuard.resetBranchCount(userId, sessionId);
    },

    /**
     * Decompose text into multiple thought units with relations (3-step AI process)
     *
     * Step 1: Classify user purpose
     * Step 2: Propose decomposition boundaries (max 3 units per safety guard)
     * Step 3: Propose relations between new units AND existing units
     */
    async decomposeText(
      text: string,
      contextId: string,
      existingUnits: Array<{ id: string; content: string; unitType: string }>,
      ctx: AIServiceContext
    ): Promise<DecompositionResult> {
      // Short text: return single unit, no decomposition needed
      if (text.length < 20) {
        const tempId = `temp-${Date.now()}-0`;
        return {
          purpose: "other",
          proposals: [
            {
              id: tempId,
              content: text,
              proposedType: "observation",
              confidence: 0.5,
              startChar: 0,
              endChar: text.length,
              lifecycle: "draft",
              originType: "ai_generated",
            },
          ],
          relationProposals: [],
        };
      }

      // Safety check
      const check = await safetyGuard.runAllChecks({
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        requestUnitCount: 3, // Max units we'll create
        contextId: ctx.contextId,
      });

      if (!check.allowed && check.error) {
        throw new Error(check.error.message);
      }

      // ─── Step 1: Classify user purpose ─────────────────────────────────
      const purposePrompt = `Analyze the following text and determine the user's primary cognitive purpose.

Text: "${sanitizeUserContent(text, 1000)}"

Available purposes:
- arguing: Building or defending a logical argument with claims and evidence
- brainstorming: Generating ideas, possibilities, exploring options
- researching: Gathering information, noting observations, collecting evidence
- defining: Clarifying concepts, explaining terms, establishing meaning
- other: General note-taking, mixed purposes, or unclear intent

Respond with the most appropriate purpose.`;

      const purposeResult = await provider.generateStructured<{ purpose: UserPurpose; confidence: number }>(
        purposePrompt,
        {
          temperature: 0.3,
          maxTokens: 128,
          zodSchema: PurposeClassificationSchema,
          schema: {
            name: "PurposeClassification",
            description: "Classification of user's cognitive purpose",
            properties: {
              purpose: {
                type: "string",
                enum: ["arguing", "brainstorming", "researching", "defining", "other"],
              },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["purpose", "confidence"],
          },
        }
      );

      // ─── Step 2: Propose decomposition boundaries ──────────────────────
      const boundaryPrompt = `Split the following text into distinct thought units. Each unit should be a complete, self-contained thought.

Text: "${text}"

Guidelines:
- Maximum 3 units (focus on the most important divisions)
- Each unit should have a clear cognitive function (claim, question, evidence, etc.)
- Preserve the exact character positions for boundaries
- Units should not overlap
- Cover the entire text

Available unit types: claim, question, evidence, counterargument, observation, idea, definition, assumption, action

For each unit, provide:
- startChar: starting character index (0-based)
- endChar: ending character index (exclusive)
- content: the exact text content
- proposedType: the suggested unit type
- confidence: how confident you are in this split (0-1)`;

      const boundaryResult = await provider.generateStructured<{ boundaries: DecompositionBoundary[] }>(
        boundaryPrompt,
        {
          temperature: 0.4,
          maxTokens: 1024,
          zodSchema: DecompositionBoundariesSchema,
          schema: {
            name: "DecompositionBoundaries",
            description: "Proposed boundaries for text decomposition",
            properties: {
              boundaries: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "object",
                  properties: {
                    startChar: { type: "number", minimum: 0 },
                    endChar: { type: "number", minimum: 0 },
                    content: { type: "string" },
                    proposedType: {
                      type: "string",
                      enum: [
                        "claim", "question", "evidence", "counterargument",
                        "observation", "idea", "definition", "assumption", "action",
                      ],
                    },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                  required: ["startChar", "endChar", "content", "proposedType", "confidence"],
                },
              },
            },
            required: ["boundaries"],
          },
        }
      );

      // Create proposals from boundaries
      const proposals: UnitProposal[] = boundaryResult.boundaries.map((b, idx) => ({
        id: `temp-${Date.now()}-${idx}`,
        content: b.content,
        proposedType: b.proposedType,
        confidence: b.confidence,
        startChar: b.startChar,
        endChar: b.endChar,
        lifecycle: "draft" as const,
        originType: "ai_generated" as const,
      }));

      // ─── Step 3: Propose relations ─────────────────────────────────────
      let relationProposals: DecompositionRelationProposal[] = [];

      if (existingUnits.length > 0 && proposals.length > 0) {
        const existingUnitsDesc = existingUnits
          .slice(0, 10)
          .map((u) => `[${u.id}] (${u.unitType}) "${sanitizeUserContent(u.content, 100)}..."`)
          .join("\n");

        const newUnitsDesc = proposals
          .map((p, i) => `[idx:${i}] (${p.proposedType}) "${p.content.slice(0, 100)}..."`)
          .join("\n");

        const relationPrompt = `Analyze relationships between NEW units and EXISTING units in this context.

NEW UNITS (use index as sourceIdx):
${newUnitsDesc}

EXISTING UNITS (use id as targetUnitId):
${existingUnitsDesc}

Available relation types:
- supports: Logically backs the target unit's claim
- contradicts: Logically conflicts with the target
- derives_from: Is logically derived from the target
- expands: Develops the target more concretely
- references: References the target as background
- exemplifies: Is a concrete instance of the target's principle
- defines: Defines a key concept of the target
- questions: Raises doubt about the target

For each meaningful relationship from a NEW unit to an EXISTING unit, provide:
- sourceIdx: index of the new unit (0, 1, or 2)
- targetUnitId: ID of the existing unit
- relationType: type of relationship
- strength: relationship strength (0-1)
- rationale: brief explanation`;

        const relationResult = await provider.generateStructured<{
          relations: Array<{
            sourceIdx: number;
            targetUnitId: string;
            relationType: string;
            strength: number;
            rationale: string;
          }>;
        }>(relationPrompt, {
          temperature: 0.4,
          maxTokens: 768,
          zodSchema: DecompositionRelationProposalsSchema,
          schema: {
            name: "RelationProposals",
            description: "Proposed relations between new and existing units",
            properties: {
              relations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sourceIdx: { type: "number", minimum: 0, maximum: 2 },
                    targetUnitId: { type: "string" },
                    relationType: {
                      type: "string",
                      enum: [
                        "supports", "contradicts", "derives_from", "expands",
                        "references", "exemplifies", "defines", "questions",
                      ],
                    },
                    strength: { type: "number", minimum: 0, maximum: 1 },
                    rationale: { type: "string", maxLength: 150 },
                  },
                  required: ["sourceIdx", "targetUnitId", "relationType", "strength", "rationale"],
                },
              },
            },
            required: ["relations"],
          },
        });

        relationProposals = relationResult.relations;
      }

      logger.info(
        {
          purpose: purposeResult.purpose,
          proposalCount: proposals.length,
          relationCount: relationProposals.length,
        },
        "AI decomposition completed"
      );

      return {
        purpose: purposeResult.purpose,
        proposals,
        relationProposals,
      };
    },

    // ─── Story 5.4: Unit Split with Relation Re-attribution ─────────────────

    /**
     * Propose how to reassign relations when splitting a unit into two parts
     */
    async proposeSplitReattribution(
      unitId: string,
      contentA: string,
      contentB: string,
      _ctx: AIServiceContext
    ): Promise<SplitReattributionResult> {
      // Fetch the unit's existing relations
      const relations = await db.relation.findMany({
        where: {
          OR: [{ sourceUnitId: unitId }, { targetUnitId: unitId }],
        },
        include: {
          sourceUnit: { select: { id: true, content: true, unitType: true } },
          targetUnit: { select: { id: true, content: true, unitType: true } },
        },
      });

      if (relations.length === 0) {
        return { proposals: [] };
      }

      const relationsDesc = relations
        .map((r) => {
          const isSource = r.sourceUnitId === unitId;
          const other = isSource ? r.targetUnit : r.sourceUnit;
          return `[${r.id}] ${r.type} ${isSource ? "→" : "←"} "${other.content.slice(0, 80)}..." (${other.unitType})`;
        })
        .join("\n");

      const prompt = `A thought unit is being split into two parts. Help decide which part should inherit each existing relation.

ORIGINAL UNIT is being split into:
Part A: "${sanitizeUserContent(contentA, 300)}"
Part B: "${sanitizeUserContent(contentB, 300)}"

EXISTING RELATIONS:
${relationsDesc}

For each relation, determine which part (A or B) should inherit it based on semantic relevance.`;

      const result = await provider.generateStructured<{ proposals: SplitReattributionProposal[] }>(
        prompt,
        {
          temperature: 0.3,
          maxTokens: 1024,
          zodSchema: SplitReattributionSchema,
          schema: {
            name: "SplitReattribution",
            description: "Proposals for reassigning relations after unit split",
            properties: {
              proposals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    relationId: { type: "string" },
                    assignTo: { type: "string", enum: ["A", "B"] },
                    rationale: { type: "string", maxLength: 150 },
                  },
                  required: ["relationId", "assignTo", "rationale"],
                },
              },
            },
            required: ["proposals"],
          },
        }
      );

      logger.info({ unitId, proposalCount: result.proposals.length }, "Split reattribution proposals generated");
      return result;
    },

    // ─── Story 5.5: Alternative Framing ───────────────────────────────────────

    /**
     * Generate alternative ways to frame a unit's content
     */
    async generateAlternativeFraming(
      content: string,
      currentType: string,
      _ctx: AIServiceContext
    ): Promise<AlternativeFraming[]> {
      const prompt = `Suggest alternative ways to frame or express this thought unit.

Content: "${sanitizeUserContent(content, 500)}"
Current type: ${currentType}

Generate 2-3 alternative framings that:
- Express the same core idea differently
- Might be categorized as a different unit type
- Could reveal new perspectives or connections`;

      const result = await provider.generateStructured<{ framings: AlternativeFraming[] }>(prompt, {
        temperature: 0.6,
        maxTokens: 768,
        zodSchema: AlternativeFramingsSchema,
        schema: {
          name: "AlternativeFramings",
          description: "Alternative ways to frame the content",
          properties: {
            framings: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  reframedContent: { type: "string", maxLength: 500 },
                  newType: {
                    type: "string",
                    enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"],
                  },
                  rationale: { type: "string", maxLength: 150 },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                },
                required: ["reframedContent", "newType", "rationale", "confidence"],
              },
            },
          },
          required: ["framings"],
        },
      });

      logger.info({ count: result.framings.length }, "Alternative framings generated");
      return result.framings;
    },

    // ─── Story 5.6: Counter-Arguments ─────────────────────────────────────────

    /**
     * Suggest counter-arguments for a claim or argument
     */
    async suggestCounterArguments(
      content: string,
      unitType: string,
      _ctx: AIServiceContext
    ): Promise<CounterArgument[]> {
      const prompt = `Generate thoughtful counter-arguments or challenges to this thought unit.

Content: "${sanitizeUserContent(content, 500)}"
Type: ${unitType}

Generate 2-3 counter-arguments that:
- Challenge the core assertion or assumption
- Are logically sound and fair
- Could strengthen the original argument if addressed`;

      const result = await provider.generateStructured<{ counterArguments: CounterArgument[] }>(prompt, {
        temperature: 0.5,
        maxTokens: 768,
        zodSchema: CounterArgumentsSchema,
        schema: {
          name: "CounterArguments",
          description: "Counter-arguments to the content",
          properties: {
            counterArguments: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  content: { type: "string", maxLength: 400 },
                  strength: { type: "number", minimum: 0, maximum: 1 },
                  targetsClaim: { type: "string", maxLength: 100 },
                  rationale: { type: "string", maxLength: 150 },
                },
                required: ["content", "strength", "targetsClaim", "rationale"],
              },
            },
          },
          required: ["counterArguments"],
        },
      });

      logger.info({ count: result.counterArguments.length }, "Counter-arguments generated");
      return result.counterArguments;
    },

    // ─── Story 5.7: Assumption Identification ─────────────────────────────────

    /**
     * Identify underlying assumptions in content
     */
    async identifyAssumptions(
      content: string,
      _ctx: AIServiceContext
    ): Promise<IdentifiedAssumption[]> {
      const prompt = `Identify the underlying assumptions in this thought unit.

Content: "${sanitizeUserContent(content, 500)}"

Find both explicit and implicit assumptions that:
- The argument depends on to be valid
- May need to be verified or challenged
- Could affect the conclusion if false`;

      const result = await provider.generateStructured<{ assumptions: IdentifiedAssumption[] }>(prompt, {
        temperature: 0.4,
        maxTokens: 768,
        zodSchema: AssumptionsSchema,
        schema: {
          name: "Assumptions",
          description: "Identified assumptions in the content",
          properties: {
            assumptions: {
              type: "array",
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  content: { type: "string", maxLength: 300 },
                  isExplicit: { type: "boolean" },
                  importance: { type: "string", enum: ["critical", "moderate", "minor"] },
                  rationale: { type: "string", maxLength: 150 },
                },
                required: ["content", "isExplicit", "importance", "rationale"],
              },
            },
          },
          required: ["assumptions"],
        },
      });

      logger.info({ count: result.assumptions.length }, "Assumptions identified");
      return result.assumptions;
    },

    // ─── Story 5.8: Contradiction Detection ───────────────────────────────────

    /**
     * Detect contradictions between units in a context
     */
    async detectContradictions(
      units: Array<{ id: string; content: string; unitType: string }>,
      _ctx: AIServiceContext
    ): Promise<ContradictionPair[]> {
      if (units.length < 2) return [];

      const unitsDesc = units
        .map((u) => `[${u.id}] (${u.unitType}) "${sanitizeUserContent(u.content, 150)}"`)
        .join("\n");

      const prompt = `Analyze these thought units for contradictions or tensions.

Units:
${unitsDesc}

Identify pairs that:
- Directly contradict each other
- Have logical tension
- Make incompatible assumptions`;

      const result = await provider.generateStructured<{ contradictions: ContradictionPair[] }>(prompt, {
        temperature: 0.3,
        maxTokens: 1024,
        zodSchema: ContradictionsSchema,
        schema: {
          name: "Contradictions",
          description: "Detected contradictions between units",
          properties: {
            contradictions: {
              type: "array",
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  unitAId: { type: "string" },
                  unitBId: { type: "string" },
                  description: { type: "string", maxLength: 200 },
                  severity: { type: "string", enum: ["direct", "tension", "potential"] },
                  suggestedResolution: { type: "string", maxLength: 200 },
                },
                required: ["unitAId", "unitBId", "description", "severity", "suggestedResolution"],
              },
            },
          },
          required: ["contradictions"],
        },
      });

      logger.info({ count: result.contradictions.length }, "Contradictions detected");
      return result.contradictions;
    },

    // ─── Story 5.9: Merge Suggestion ──────────────────────────────────────────

    /**
     * Suggest units that could be merged
     */
    async suggestMerge(
      units: Array<{ id: string; content: string; unitType: string }>,
      _ctx: AIServiceContext
    ): Promise<MergeSuggestion[]> {
      if (units.length < 2) return [];

      const unitsDesc = units
        .map((u) => `[${u.id}] (${u.unitType}) "${sanitizeUserContent(u.content, 150)}"`)
        .join("\n");

      const prompt = `Analyze these thought units for potential merges.

Units:
${unitsDesc}

Identify groups that:
- Express the same idea differently
- Would be clearer as a single unit
- Are redundant or overlapping`;

      const result = await provider.generateStructured<{ suggestions: MergeSuggestion[] }>(prompt, {
        temperature: 0.4,
        maxTokens: 1024,
        zodSchema: MergeSuggestionsSchema,
        schema: {
          name: "MergeSuggestions",
          description: "Suggestions for merging units",
          properties: {
            suggestions: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  unitIds: { type: "array", items: { type: "string" }, minItems: 2 },
                  mergedContent: { type: "string", maxLength: 500 },
                  mergedType: {
                    type: "string",
                    enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"],
                  },
                  rationale: { type: "string", maxLength: 150 },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                },
                required: ["unitIds", "mergedContent", "mergedType", "rationale", "confidence"],
              },
            },
          },
          required: ["suggestions"],
        },
      });

      logger.info({ count: result.suggestions.length }, "Merge suggestions generated");
      return result.suggestions;
    },

    // ─── Story 5.10: Completeness Analysis ────────────────────────────────────

    /**
     * Analyze completeness of an argument or context
     */
    async analyzeCompleteness(
      units: Array<{ id: string; content: string; unitType: string }>,
      _ctx: AIServiceContext
    ): Promise<CompletenessAnalysis> {
      const unitsDesc = units
        .map((u) => `[${u.id}] (${u.unitType}) "${sanitizeUserContent(u.content, 150)}"`)
        .join("\n");

      const prompt = `Analyze the completeness of this set of thought units as an argument or analysis.

Units:
${unitsDesc}

Provide TWO separate scores (0-1 each):
1. structureScore: How well-structured is the argument? (evidence coverage, counter-arguments, definitions, logical flow)
2. depthScore: How epistemically mature? (assumptions surfaced, questions resolved, confidence justified)

Also identify missing elements and suggest improvements.`;

      const result = await provider.generateStructured<CompletenessAnalysis>(prompt, {
        temperature: 0.4,
        maxTokens: 1024,
        zodSchema: CompletenessAnalysisSchema,
        schema: {
          name: "CompletenessAnalysis",
          description: "Dual-score completeness analysis per DEC-2026-002 §4",
          properties: {
            structureScore: { type: "number", minimum: 0, maximum: 1 },
            depthScore: { type: "number", minimum: 0, maximum: 1 },
            missingElements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["evidence", "counterargument", "definition", "example", "assumption"] },
                  description: { type: "string", maxLength: 200 },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["type", "description", "priority"],
              },
            },
            suggestions: { type: "array", items: { type: "string", maxLength: 200 } },
          },
          required: ["structureScore", "depthScore", "missingElements", "suggestions"],
        },
      });

      logger.info({ structureScore: result.structureScore, depthScore: result.depthScore }, "Completeness analyzed");
      return result;
    },

    // ─── Story 5.11: Context Summary ──────────────────────────────────────

    async summarizeContext(
      units: Array<{ id: string; content: string; unitType: string }>,
      _ctx: AIServiceContext
    ): Promise<ContextSummary> {
      const unitsDesc = units
        .map((u) => `[${u.unitType}] ${sanitizeUserContent(u.content, 150)}`)
        .join("\n");

      const prompt = `Summarize the following set of thought units into a coherent context summary.

Units:
${unitsDesc}

Provide:
- A main thesis statement
- Key points
- Open questions
- Conflicting views`;

      const result = await provider.generateStructured<ContextSummary>(prompt, {
        temperature: 0.4,
        maxTokens: 1024,
        zodSchema: ContextSummarySchema,
        schema: {
          name: "ContextSummary",
          description: "Summary of context units",
          properties: {
            mainThesis: { type: "string", maxLength: 300 },
            keyPoints: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 5 },
            openQuestions: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 5 },
            conflictingViews: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 3 },
          },
          required: ["mainThesis", "keyPoints", "openQuestions", "conflictingViews"],
        },
      });

      logger.info("Context summarized");
      return result;
    },

    // ─── Story 5.12: Question Generation ────────────────────────────────────

    async generateQuestions(
      units: Array<{ id: string; content: string; unitType: string }>,
      _ctx: AIServiceContext
    ): Promise<GeneratedQuestion[]> {
      const unitsDesc = units
        .map((u) => `[${u.unitType}] ${sanitizeUserContent(u.content, 150)}`)
        .join("\n");

      const prompt = `Generate probing questions to deepen understanding of these thought units.

Units:
${unitsDesc}

Generate questions that:
- Clarify ambiguities
- Challenge assumptions
- Explore connections
- Push reasoning deeper`;

      const result = await provider.generateStructured<{ questions: GeneratedQuestion[] }>(prompt, {
        temperature: 0.6,
        maxTokens: 768,
        zodSchema: GeneratedQuestionsSchema,
        schema: {
          name: "GeneratedQuestions",
          description: "Questions to deepen understanding",
          properties: {
            questions: {
              type: "array",
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  content: { type: "string", maxLength: 200 },
                  type: { type: "string", enum: ["clarifying", "challenging", "exploratory", "connecting"] },
                  rationale: { type: "string", maxLength: 150 },
                  relatedUnitIds: { type: "array", items: { type: "string" } },
                },
                required: ["content", "type", "rationale"],
              },
            },
          },
          required: ["questions"],
        },
      });

      logger.info({ count: result.questions.length }, "Questions generated");
      return result.questions;
    },

    // ─── Story 5.13: Next Steps ─────────────────────────────────────────────

    async suggestNextSteps(
      units: Array<{ id: string; content: string; unitType: string }>,
      _ctx: AIServiceContext
    ): Promise<NextStepSuggestion[]> {
      const unitsDesc = units
        .map((u) => `[${u.unitType}] ${sanitizeUserContent(u.content, 150)}`)
        .join("\n");

      const prompt = `Suggest actionable next steps for developing this argument or analysis.

Units:
${unitsDesc}

Suggest steps that:
- Address gaps in reasoning
- Strengthen existing claims
- Explore new directions`;

      const result = await provider.generateStructured<{ steps: NextStepSuggestion[] }>(prompt, {
        temperature: 0.5,
        maxTokens: 768,
        zodSchema: NextStepsSchema,
        schema: {
          name: "NextSteps",
          description: "Suggested next steps",
          properties: {
            steps: {
              type: "array",
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  action: { type: "string", maxLength: 200 },
                  type: { type: "string", enum: ["research", "define", "challenge", "connect", "expand", "resolve"] },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  rationale: { type: "string", maxLength: 150 },
                },
                required: ["action", "type", "priority", "rationale"],
              },
            },
          },
          required: ["steps"],
        },
      });

      logger.info({ count: result.steps.length }, "Next steps suggested");
      return result.steps;
    },

    // ─── Story 5.14: Key Term Extraction ────────────────────────────────────

    async extractKeyTerms(
      units: Array<{ id: string; content: string; unitType: string }>,
      _ctx: AIServiceContext
    ): Promise<ExtractedTerm[]> {
      const allContent = units.map((u) => u.content).join(" ");

      const prompt = `Extract key terms from this content that may need definition or clarification.

Content: ${allContent.slice(0, 1500)}

Identify terms that:
- Are central to the argument
- May have specialized meaning
- Could be ambiguous
- Should be explicitly defined`;

      const result = await provider.generateStructured<{ terms: ExtractedTerm[] }>(prompt, {
        temperature: 0.3,
        maxTokens: 768,
        zodSchema: ExtractedTermsSchema,
        schema: {
          name: "ExtractedTerms",
          description: "Key terms extracted from content",
          properties: {
            terms: {
              type: "array",
              maxItems: 10,
              items: {
                type: "object",
                properties: {
                  term: { type: "string", maxLength: 100 },
                  definition: { type: "string", maxLength: 200 },
                  occurrences: { type: "number", minimum: 1 },
                  importance: { type: "string", enum: ["key", "supporting", "peripheral"] },
                  suggestDefine: { type: "boolean" },
                },
                required: ["term", "occurrences", "importance", "suggestDefine"],
              },
            },
          },
          required: ["terms"],
        },
      });

      logger.info({ count: result.terms.length }, "Key terms extracted");
      return result.terms;
    },

    // ─── Story 5.15: Stance Classification ──────────────────────────────────

    async classifyStance(
      unitContent: string,
      targetContent: string,
      _ctx: AIServiceContext
    ): Promise<StanceClassification> {
      const prompt = `Classify the stance of one thought unit relative to another.

Unit A: ${unitContent.slice(0, 400)}

Unit B (target): ${targetContent.slice(0, 400)}

Determine whether Unit A supports, opposes, is neutral to, or is exploring Unit B's position.`;

      const result = await provider.generateStructured<StanceClassification>(prompt, {
        temperature: 0.3,
        maxTokens: 512,
        zodSchema: StanceClassificationSchema,
        schema: {
          name: "StanceClassification",
          description: "Classification of stance between units",
          properties: {
            stance: { type: "string", enum: ["support", "oppose", "neutral", "exploring"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            rationale: { type: "string", maxLength: 200 },
            keyIndicators: { type: "array", items: { type: "string", maxLength: 100 }, maxItems: 3 },
          },
          required: ["stance", "confidence", "rationale", "keyIndicators"],
        },
      });

      logger.info({ stance: result.stance, confidence: result.confidence }, "Stance classified");
      return result;
    },

    // ─── Story 5.11: Scope Jump Detection ────────────────────────────────────

    /**
     * Detect if incoming text is a scope jump relative to existing context units.
     */
    async detectScopeJump(
      text: string,
      existingUnits: Array<{ content: string; unitType: string }>,
      _ctx: AIServiceContext
    ): Promise<{ isJump: boolean; currentScope: string; suggestedScope: string; confidence: number }> {
      if (existingUnits.length === 0) {
        return { isJump: false, currentScope: "", suggestedScope: "", confidence: 0 };
      }

      const sample = existingUnits
        .slice(0, 10)
        .map((u) => `- (${u.unitType}) "${sanitizeUserContent(u.content, 100)}"`)
        .join("\n");

      const prompt = `You are analyzing whether a new thought belongs to the same topic as an existing set of thoughts.

EXISTING THOUGHTS (sample):
${sample}

NEW TEXT: "${sanitizeUserContent(text, 300)}"

Determine:
1. What topic/scope do the existing thoughts cover? (currentScope — concise phrase)
2. What topic/scope does the new text cover? (suggestedScope — concise phrase)
3. Is the new text a significant topic shift? (isJump — true only if clearly different, not just a subtopic)
4. How confident are you? (confidence 0-1)`;

      try {
        const result = await provider.generateStructured<{
          isJump: boolean;
          currentScope: string;
          suggestedScope: string;
          confidence: number;
        }>(prompt, {
          temperature: 0.2,
          maxTokens: 256,
          zodSchema: ScopeJumpSchema,
          schema: {
            name: "ScopeJump",
            description: "Scope jump detection result",
            properties: {
              isJump: { type: "boolean" },
              currentScope: { type: "string", maxLength: 200 },
              suggestedScope: { type: "string", maxLength: 200 },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["isJump", "currentScope", "suggestedScope", "confidence"],
          },
        });

        logger.info({ isJump: result.isJump, confidence: result.confidence }, "Scope jump detection completed");
        return result;
      } catch {
        return { isJump: false, currentScope: "", suggestedScope: "", confidence: 0 };
      }
    },

    // ─── Story 6.7: Natural Language Query Intent Extraction ─────────────────

    /**
     * Extract search intent from a natural language query.
     */
    async extractNLQIntent(
      query: string,
      _ctx: AIServiceContext
    ): Promise<{ keywords: string[]; unitTypes?: string[]; summary: string }> {
      const prompt = `Extract search intent from this natural language query about a knowledge base of thought units.

Query: "${sanitizeUserContent(query, 300)}"

Thought unit types available: claim, question, evidence, counterargument, observation, idea, definition, assumption, action

Extract:
1. keywords — key terms to search for (2-8 words/phrases)
2. unitTypes — relevant unit types if the query implies specific types (optional, omit if not implied)
3. summary — one sentence describing what the user is looking for`;

      try {
        const result = await provider.generateStructured<{
          keywords: string[];
          unitTypes?: string[];
          summary: string;
        }>(prompt, {
          temperature: 0.2,
          maxTokens: 256,
          zodSchema: NLQIntentSchema,
          schema: {
            name: "NLQIntent",
            description: "Extracted intent from a natural language query",
            properties: {
              keywords: { type: "array", items: { type: "string", maxLength: 100 }, maxItems: 10 },
              unitTypes: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "claim", "question", "evidence", "counterargument",
                    "observation", "idea", "definition", "assumption", "action",
                  ],
                },
              },
              summary: { type: "string", maxLength: 300 },
            },
            required: ["keywords", "summary"],
          },
        });

        logger.info({ keywordCount: result.keywords.length }, "NLQ intent extracted");
        return result;
      } catch {
        // Fallback: treat the whole query as keywords
        return {
          keywords: query.split(/\s+/).filter((w) => w.length > 2).slice(0, 8),
          summary: `Search for: ${query}`,
        };
      }
    },

    /**
     * Access to safety guard for direct checks
     */
    safetyGuard,
  };
}

export type AIService = ReturnType<typeof createAIService>;
