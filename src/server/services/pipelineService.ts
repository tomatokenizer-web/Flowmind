import type { Prisma, PrismaClient, UnitType } from "@prisma/client";
import { getAIProvider } from "@/server/ai/provider";
import {
  TypeSuggestionSchema,
  AttributeEnrichmentSchema,
  TypeSpecificAttributesSchema,
  LayeredRelationSuggestionsSchema,
  ScopeJumpSchema,
  SalienceScoreSchema,
  IntegrityCheckSchema,
} from "@/server/ai/schemas";
import { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "@/server/ai/utils";
import { createUnitService, DuplicateUnitContentError } from "@/server/services/unitService";
import { eventBus } from "@/server/events/eventBus";
import { z } from "zod";

const RefinementJudgmentSchema = z.object({
  refined: z.string(),
  shouldDecompose: z.boolean(),
  reason: z.string(),
});

// ─── Types ─────────────────────────────────────────────────────────

export type PassName =
  | "decomposition"
  | "classification"
  | "enrichment"
  | "relations"
  | "context_placement"
  | "salience"
  | "integrity";

export type PassStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface PassResult {
  pass: PassName;
  status: PassStatus;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export interface PipelineResult {
  unitId: string;
  passes: PassResult[];
  success: boolean;
  totalDurationMs: number;
}

export interface PipelineInput {
  content: string;
  projectId: string;
  contextId?: string;
  mode?: "full" | "quick";
}

// ─── Pipeline Service ──────────────────────────────────────────────

export function createPipelineService(db: PrismaClient) {
  const provider = getAIProvider();
  const unitService = createUnitService(db);

  async function runPass<T>(
    name: PassName,
    fn: () => Promise<T>,
  ): Promise<PassResult & { data?: T }> {
    const start = Date.now();
    try {
      const data = await fn();
      return { pass: name, status: "completed", data, durationMs: Date.now() - start };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { pass: name, status: "failed", error: message, durationMs: Date.now() - start };
    }
  }

  return {
    /**
     * Execute the 7-pass processing pipeline on raw text input.
     * Creates a unit and enriches it through each pass.
     * Partial results are saved — if pass N fails, passes 1..N-1 are kept.
     */
    async processInput(input: PipelineInput, userId: string): Promise<PipelineResult> {
      const totalStart = Date.now();
      const passes: PassResult[] = [];
      const isQuick = input.mode === "quick";

      // ── Pass 1: Refinement ──────────────────────────────────
      // Refine the raw text for clarity and coherence. Decomposition
      // (segmenting into multiple units) is handled exclusively by
      // the organize-mode flow (ai.decomposeText → DecompositionReview)
      // where the user reviews proposals before any units are created.
      let primaryContent: string;

      if (!isQuick && input.content.length >= 80) {
        const refineResult = await runPass("decomposition", async () => {
          return provider.generateStructured<z.infer<typeof RefinementJudgmentSchema>>(
            `${PROMPT_INJECTION_GUARD}

You are processing raw user input for a thought management tool.

REFINE the text: fix grammar, improve clarity, tighten prose. Preserve the original meaning and voice. Do not add new ideas or remove existing ones.

Text to process:
${sanitizeUserContent(input.content.slice(0, 2000))}

Respond with:
- refined: the cleaned-up version of the full text
- shouldDecompose: always false (decomposition is handled separately by user review)
- reason: brief note on what you refined`,
            {
              temperature: 0.3,
              maxTokens: 2048,
              zodSchema: RefinementJudgmentSchema,
              schema: {
                name: "RefinementJudgment",
                description: "Refined text",
                properties: {
                  refined: { type: "string" },
                  shouldDecompose: { type: "boolean" },
                  reason: { type: "string", maxLength: 200 },
                },
                required: ["refined", "shouldDecompose", "reason"],
              },
            },
          );
        });
        passes.push(refineResult);

        primaryContent = refineResult.status === "completed" && refineResult.data
          ? refineResult.data.refined
          : input.content;
      } else {
        passes.push({ pass: "decomposition", status: "skipped", durationMs: 0 });
        primaryContent = input.content;
      }

      // ── Pass 2: Type Classification ───────────────────────────
      let classifiedType: UnitType = "observation";

      const classResult = await runPass("classification", async () => {
        return provider.generateStructured<{ unitType: string; confidence: number; reasoning: string }>(
          `Classify this text into its primary cognitive function.\n\nText: "${primaryContent.slice(0, 500)}"\n\nAvailable types: claim, question, evidence, counterargument, observation, idea, definition, assumption, action, interpretation, example, decision`,
          {
            temperature: 0.3,
            maxTokens: 256,
            zodSchema: TypeSuggestionSchema,
            schema: {
              name: "TypeSuggestion",
              description: "Classify unit type",
              properties: {},
              required: ["unitType", "confidence", "reasoning"],
            },
          },
        );
      });
      passes.push(classResult);

      if (classResult.status === "completed" && classResult.data) {
        classifiedType = classResult.data.unitType as UnitType;
      }

      // Create the unit via unitService → fires unit.created event
      // (triggers embedding, rules, proactive subscribers per B.9 spec)
      let unit;
      try {
        unit = await unitService.create(
          {
            content: primaryContent,
            unitType: classifiedType,
            lifecycle: "draft",
            lifecycleState: "draft",
            originType: "direct_write",
            voice: "original",
            aiTrustLevel: "user_authored",
            projectId: input.projectId,
          },
          userId,
        );
      } catch (error) {
        if (error instanceof DuplicateUnitContentError) {
          // Pipeline-created units skip duplicate check — retrieve existing
          const existing = await db.unit.findFirst({
            where: { projectId: input.projectId, content: primaryContent },
          });
          if (!existing) throw error;
          unit = existing;
        } else {
          throw error;
        }
      }

      // ── Pass 3: Attribute Enrichment ──────────────────────────
      const enrichResult = await runPass("enrichment", async () => {
        return provider.generateStructured<{
          epistemicAct: string | null;
          epistemicOrigin: string | null;
          applicabilityScope: string | null;
          temporalValidity: string | null;
          revisability: string | null;
          voice: string;
          confidence: number;
          reasoning: string;
        }>(
          `Analyze this knowledge unit and determine its epistemic properties.\n\nType: ${classifiedType}\nContent: "${primaryContent.slice(0, 1000)}"\n\nDetermine:\n- epistemicAct: What cognitive act is being performed? (assert, hypothesize, predict, ask, challenge, endorse, critique, concede, refute, define, distinguish, classify, decompose, synthesize, generalize, specialize, reframe, analogize, retract, revise)\n- epistemicOrigin: Where does this knowledge come from? (first_person_experience, first_person_inference, received_testimony, institutional_record, consensus_knowledge, formal_derivation)\n- applicabilityScope: How broadly does this apply? (universal, domain_universal, context_conditional, instance_specific, personal)\n- temporalValidity: Is this time-bound? (atemporal, durable, current, time_bounded, historical, recurrent)\n- revisability: Can this be revised? (immutable, evidence_revisable, authority_revisable, convention_revisable, personally_revisable)\n- voice: Who is speaking? (original, ai_assisted, ai_refined, ai_sourced, external, imported)`,
          {
            temperature: 0.3,
            maxTokens: 512,
            zodSchema: AttributeEnrichmentSchema,
            schema: {
              name: "AttributeEnrichment",
              description: "Enrich unit with v3.14 epistemic attributes",
              properties: {},
              required: ["epistemicAct", "epistemicOrigin", "applicabilityScope", "temporalValidity", "revisability", "voice", "confidence", "reasoning"],
            },
          },
        );
      });
      passes.push(enrichResult);

      if (enrichResult.status === "completed" && enrichResult.data) {
        const e = enrichResult.data;
        await db.unit.update({
          where: { id: unit.id },
          data: {
            primaryEpistemicAct: e.epistemicAct as Prisma.UnitUpdateInput["primaryEpistemicAct"],
            epistemicOrigin: e.epistemicOrigin as Prisma.UnitUpdateInput["epistemicOrigin"],
            applicabilityScope: e.applicabilityScope as Prisma.UnitUpdateInput["applicabilityScope"],
            temporalValidity: e.temporalValidity as Prisma.UnitUpdateInput["temporalValidity"],
            revisability: e.revisability as Prisma.UnitUpdateInput["revisability"],
            voice: e.voice as Prisma.UnitUpdateInput["voice"],
          },
        });

        // Type-specific attribute enrichment (second AI call within Pass 3)
        const needsTypeSpecific =
          classifiedType === "claim" ||
          classifiedType === "counterargument" ||
          classifiedType === "question" ||
          classifiedType === "evidence" ||
          classifiedType === "idea";

        if (needsTypeSpecific) {
          try {
            let typeSpecificPrompt: string;
            if (classifiedType === "claim" || classifiedType === "counterargument") {
              typeSpecificPrompt = `Rate the argument weight (0-1) of this ${classifiedType}.\n\nContent: "${primaryContent.slice(0, 500)}"\n\nargumentWeight: how logically forceful/persuasive is the argument? 0=weak, 1=very strong.`;
            } else if (classifiedType === "question") {
              typeSpecificPrompt = `Classify the scope of this question.\n\nContent: "${primaryContent.slice(0, 500)}"\n\nquestionScope options:\n- clarifying: seeks clarification of existing point\n- exploratory: opens new territory\n- challenging: contests a claim\n- connecting: links disparate ideas`;
            } else if (classifiedType === "evidence") {
              typeSpecificPrompt = `Rate the evidence strength (0-1) of this evidence unit.\n\nContent: "${primaryContent.slice(0, 500)}"\n\nevidenceStrength: how strong/reliable is this evidence? 0=anecdotal/weak, 1=empirical/rigorous.`;
            } else {
              typeSpecificPrompt = `Rate the novelty score (0-1) of this idea.\n\nContent: "${primaryContent.slice(0, 500)}"\n\nnoveltyScore: how novel/original is this idea? 0=common/derivative, 1=highly novel/original.`;
            }

            const typeAttrs = await provider.generateStructured<{
              argumentWeight?: number;
              questionScope?: "clarifying" | "exploratory" | "challenging" | "connecting";
              evidenceStrength?: number;
              noveltyScore?: number;
            }>(
              typeSpecificPrompt,
              {
                temperature: 0.3,
                maxTokens: 128,
                zodSchema: TypeSpecificAttributesSchema,
                schema: {
                  name: "TypeSpecificAttributes",
                  description: "Type-specific attribute enrichment",
                  properties: {},
                  required: [],
                },
              },
            );

            // Store non-empty attributes in unit meta
            const hasAttrs = Object.values(typeAttrs).some((v) => v !== undefined);
            if (hasAttrs) {
              await db.unit.update({
                where: { id: unit.id },
                data: { meta: typeAttrs as Prisma.InputJsonValue },
              });
            }
          } catch {
            // Type-specific enrichment failure does not fail the pass
          }
        }
      }

      // ── Pass 4: Relation Detection ────────────────────────────
      const relResult = await runPass("relations", async () => {
        // Get existing units in the same context for relation detection
        const existingUnits = await db.unit.findMany({
          where: {
            projectId: input.projectId,
            id: { not: unit.id },
            lifecycle: { not: "archived" },
          },
          select: { id: true, content: true, unitType: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        });

        if (existingUnits.length === 0) return { relations: [] };

        const existingContext = existingUnits
          .map((u) => `[${u.id}] (${u.unitType}): ${u.content.slice(0, 100)}`)
          .join("\n");

        return provider.generateStructured<{ relations: Array<{ targetUnitId: string; layer: string; subtype: string; strength: number; nsDirection: string; reasoning: string }> }>(
          `Given this new unit and existing units, suggest relations with layer classification.\n\nNew unit (${classifiedType}): "${primaryContent.slice(0, 300)}"\n\nExisting units:\n${existingContext}\n\nFor each relation provide:\n- targetUnitId: the ID of the related unit\n- layer: one of structural, evidential, dialogical, generative, temporal, compositional, analytical, meta\n- subtype: specific relation subtype (e.g., supports, contradicts, derives_from, expands, exemplifies)\n- strength: 0-1 confidence\n- nsDirection: nucleus_to_satellite, satellite_to_nucleus, or multinuclear\n\nSuggest up to 5 relations.`,
          {
            temperature: 0.3,
            maxTokens: 512,
            zodSchema: LayeredRelationSuggestionsSchema,
            schema: {
              name: "LayeredRelationSuggestions",
              description: "Suggest layered relations to existing units",
              properties: {},
              required: ["relations"],
            },
          },
        );
      });
      passes.push(relResult);

      // Store proposed relations as pending (not auto-created — user confirms)
      if (relResult.status === "completed" && relResult.data) {
        for (const rel of relResult.data.relations) {
          // Verify target exists before creating
          const target = await db.unit.findUnique({
            where: { id: rel.targetUnitId },
            select: { id: true },
          });
          if (target) {
            await db.proposal.create({
              data: {
                kind: "relation_suggest",
                targetUnitId: unit.id,
                userId,
                status: "pending",
                payload: {
                  sourceUnitId: unit.id,
                  targetUnitId: rel.targetUnitId,
                  layer: rel.layer,
                  subtype: rel.subtype,
                  strength: rel.strength,
                  nsDirection: rel.nsDirection,
                  reasoning: rel.reasoning,
                } as Prisma.InputJsonValue,
                rationale: rel.reasoning,
              },
            });
          }
        }
      }

      // ── Pass 5: Context Placement + Scope Jump Detection ──────
      if (input.contextId) {
        const ctxStart = Date.now();
        await db.unitContext.create({
          data: { unitId: unit.id, contextId: input.contextId },
        });

        // Scope jump detection: compare new unit against recent units in context
        try {
          const recentUnits = await db.unit.findMany({
            where: {
              id: { not: unit.id },
              unitContexts: { some: { contextId: input.contextId } },
            },
            select: { content: true, unitType: true },
            orderBy: { createdAt: "desc" },
            take: 3,
          });

          if (recentUnits.length >= 2) {
            const recentSummary = recentUnits
              .map((u) => `(${u.unitType}): ${u.content.slice(0, 100)}`)
              .join("\n");

            const scopeResult = await provider.generateStructured<{
              isJump: boolean;
              currentScope: string;
              suggestedScope: string;
              confidence: number;
            }>(
              `Does this new unit represent a scope jump (topic shift) compared to recent context?\n\nNew unit (${classifiedType}): "${primaryContent.slice(0, 300)}"\n\nRecent units in context:\n${recentSummary}\n\nDetermine if the new unit shifts topic significantly.`,
              {
                temperature: 0.2,
                maxTokens: 256,
                zodSchema: ScopeJumpSchema,
                schema: {
                  name: "ScopeJump",
                  description: "Detect scope jump",
                  properties: {},
                  required: ["isJump", "currentScope", "suggestedScope", "confidence"],
                },
              },
            );

            if (scopeResult.isJump && scopeResult.confidence >= 0.7) {
              const existingMeta = (unit.meta as Record<string, unknown>) ?? {};
              await db.unit.update({
                where: { id: unit.id },
                data: {
                  meta: {
                    ...existingMeta,
                    scopeJump: {
                      from: scopeResult.currentScope,
                      to: scopeResult.suggestedScope,
                      confidence: scopeResult.confidence,
                    },
                  } as Prisma.InputJsonValue,
                },
              });
            }
          }
        } catch {
          // Scope jump detection failure is non-fatal
        }

        passes.push({ pass: "context_placement", status: "completed", durationMs: Date.now() - ctxStart });
      } else {
        passes.push({ pass: "context_placement", status: "skipped", durationMs: 0 });
      }

      // ── Pass 6: Salience Scoring ──────────────────────────────
      if (!isQuick) {
        const salienceResult = await runPass("salience", async () => {
          return provider.generateStructured<{ salience: number; factors: Array<{ factor: string; weight: number; reasoning: string }> }>(
            `Rate the salience (importance/relevance) of this knowledge unit on a 0-1 scale.\n\nType: ${classifiedType}\nContent: "${primaryContent.slice(0, 500)}"\n\nConsider: relation density, type importance in context, uniqueness, centrality potential.`,
            {
              temperature: 0.2,
              maxTokens: 256,
              zodSchema: SalienceScoreSchema,
              schema: {
                name: "SalienceScore",
                description: "Calculate salience score",
                properties: {},
                required: ["salience", "factors"],
              },
            },
          );
        });
        passes.push(salienceResult);

        if (salienceResult.status === "completed" && salienceResult.data) {
          await db.unit.update({
            where: { id: unit.id },
            data: { importance: salienceResult.data.salience },
          });
        }
      } else {
        passes.push({ pass: "salience", status: "skipped", durationMs: 0 });
      }

      // ── Pass 7: Integrity Check ───────────────────────────────
      if (!isQuick) {
        const integrityResult = await runPass("integrity", async () => {
          return provider.generateStructured<{ passed: boolean; issues: Array<{ type: string; severity: string; description: string; relatedUnitIds: string[] }> }>(
            `Verify the integrity of this newly created knowledge unit.\n\nType: ${classifiedType}\nContent: "${primaryContent.slice(0, 500)}"\n\nCheck for:\n1. Are all essential attributes populated?\n2. Does the type classification match the content?\n3. Any potential issues with the unit?`,
            {
              temperature: 0.2,
              maxTokens: 256,
              zodSchema: IntegrityCheckSchema,
              schema: {
                name: "IntegrityCheck",
                description: "Verify unit integrity",
                properties: {},
                required: ["passed", "issues"],
              },
            },
          );
        });
        passes.push(integrityResult);

        // Flag unit for review if integrity issues found
        if (integrityResult.status === "completed" && integrityResult.data && !integrityResult.data.passed) {
          await db.unit.update({
            where: { id: unit.id },
            data: { aiReviewPending: true },
          });
        }
      } else {
        passes.push({ pass: "integrity", status: "skipped", durationMs: 0 });
      }

      const allPassed = passes.every((p) => p.status === "completed" || p.status === "skipped");

      // Emit unit.updated after all enrichment passes so downstream
      // subscribers (salience, compass, rules) see the fully-enriched unit
      await eventBus.emit({
        type: "unit.updated",
        payload: { unitId: unit.id, userId },
        timestamp: new Date(),
      });

      return {
        unitId: unit.id,
        passes,
        success: allPassed,
        totalDurationMs: Date.now() - totalStart,
      };
    },

    /**
     * Re-run a single pass on an existing unit.
     */
    async rerunPass(unitId: string, passName: PassName, userId: string): Promise<PassResult> {
      const unit = await db.unit.findFirst({
        where: { id: unitId, project: { userId } },
      });
      if (!unit) {
        return { pass: passName, status: "failed", error: "Unit not found", durationMs: 0 };
      }

      switch (passName) {
        case "decomposition":
        case "context_placement":
          return { pass: passName, status: "skipped", durationMs: 0 };

        case "classification": {
          return runPass("classification", async () => {
            const result = await provider.generateStructured<{ unitType: string; confidence: number; reasoning: string }>(
              `Classify this text: "${unit.content.slice(0, 500)}"\n\nAvailable types: claim, question, evidence, counterargument, observation, idea, definition, assumption, action, interpretation, example, decision`,
              {
                temperature: 0.3,
                maxTokens: 256,
                zodSchema: TypeSuggestionSchema,
                schema: {
                  name: "TypeSuggestion",
                  description: "Classify unit type",
                  properties: {},
                  required: ["unitType", "confidence", "reasoning"],
                },
              },
            );
            if (result.confidence >= 0.5) {
              await db.unit.update({
                where: { id: unitId },
                data: { unitType: result.unitType as UnitType, primaryType: result.unitType as UnitType },
              });
            }
            return result;
          });
        }

        case "enrichment": {
          return runPass("enrichment", async () => {
            const result = await provider.generateStructured<{
              epistemicAct: string | null; epistemicOrigin: string | null;
              applicabilityScope: string | null; temporalValidity: string | null;
              revisability: string | null; voice: string; confidence: number; reasoning: string;
            }>(
              `Analyze this knowledge unit and determine its epistemic properties.\n\nType: ${unit.unitType}\nContent: "${unit.content.slice(0, 1000)}"\n\nDetermine: epistemicAct, epistemicOrigin, applicabilityScope, temporalValidity, revisability, voice`,
              {
                temperature: 0.3,
                maxTokens: 512,
                zodSchema: AttributeEnrichmentSchema,
                schema: {
                  name: "AttributeEnrichment",
                  description: "Enrich unit with epistemic attributes",
                  properties: {},
                  required: ["epistemicAct", "epistemicOrigin", "applicabilityScope", "temporalValidity", "revisability", "voice", "confidence", "reasoning"],
                },
              },
            );
            await db.unit.update({
              where: { id: unitId },
              data: {
                primaryEpistemicAct: result.epistemicAct as Prisma.UnitUpdateInput["primaryEpistemicAct"],
                epistemicOrigin: result.epistemicOrigin as Prisma.UnitUpdateInput["epistemicOrigin"],
                applicabilityScope: result.applicabilityScope as Prisma.UnitUpdateInput["applicabilityScope"],
                temporalValidity: result.temporalValidity as Prisma.UnitUpdateInput["temporalValidity"],
                revisability: result.revisability as Prisma.UnitUpdateInput["revisability"],
                voice: result.voice as Prisma.UnitUpdateInput["voice"],
              },
            });
            return result;
          });
        }

        case "relations": {
          return runPass("relations", async () => {
            const existingUnits = await db.unit.findMany({
              where: {
                projectId: unit.projectId,
                id: { not: unitId },
                lifecycle: { not: "archived" },
              },
              select: { id: true, content: true, unitType: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            });
            if (existingUnits.length === 0) return { relations: [] };
            const existingContext = existingUnits
              .map((u) => `[${u.id}] (${u.unitType}): ${u.content.slice(0, 100)}`)
              .join("\n");
            const result = await provider.generateStructured<{ relations: Array<{ targetUnitId: string; layer: string; subtype: string; strength: number; nsDirection: string; reasoning: string }> }>(
              `Given this unit and existing units, suggest layered relations.\n\nUnit (${unit.unitType}): "${unit.content.slice(0, 300)}"\n\nExisting units:\n${existingContext}`,
              {
                temperature: 0.3,
                maxTokens: 512,
                zodSchema: LayeredRelationSuggestionsSchema,
                schema: {
                  name: "LayeredRelationSuggestions",
                  description: "Suggest layered relations",
                  properties: {},
                  required: ["relations"],
                },
              },
            );
            for (const rel of result.relations) {
              const target = await db.unit.findUnique({ where: { id: rel.targetUnitId }, select: { id: true } });
              if (target) {
                await db.proposal.create({
                  data: {
                    kind: "relation_suggest",
                    targetUnitId: unitId,
                    userId,
                    status: "pending",
                    payload: { sourceUnitId: unitId, targetUnitId: rel.targetUnitId, layer: rel.layer, subtype: rel.subtype, strength: rel.strength, nsDirection: rel.nsDirection, reasoning: rel.reasoning } as Prisma.InputJsonValue,
                    rationale: rel.reasoning,
                  },
                });
              }
            }
            return result;
          });
        }

        case "salience": {
          return runPass("salience", async () => {
            const result = await provider.generateStructured<{ salience: number; factors: Array<{ factor: string; weight: number; reasoning: string }> }>(
              `Rate the salience of this knowledge unit on a 0-1 scale.\n\nType: ${unit.unitType}\nContent: "${unit.content.slice(0, 500)}"`,
              {
                temperature: 0.2,
                maxTokens: 256,
                zodSchema: SalienceScoreSchema,
                schema: {
                  name: "SalienceScore",
                  description: "Calculate salience score",
                  properties: {},
                  required: ["salience", "factors"],
                },
              },
            );
            await db.unit.update({
              where: { id: unitId },
              data: { importance: result.salience },
            });
            return result;
          });
        }

        case "integrity": {
          return runPass("integrity", async () => {
            const result = await provider.generateStructured<{ passed: boolean; issues: Array<{ type: string; severity: string; description: string; relatedUnitIds: string[] }> }>(
              `Verify the integrity of this knowledge unit.\n\nType: ${unit.unitType}\nContent: "${unit.content.slice(0, 500)}"\n\nCheck: essential attributes populated, type matches content, any issues.`,
              {
                temperature: 0.2,
                maxTokens: 256,
                zodSchema: IntegrityCheckSchema,
                schema: {
                  name: "IntegrityCheck",
                  description: "Verify unit integrity",
                  properties: {},
                  required: ["passed", "issues"],
                },
              },
            );
            if (!result.passed) {
              await db.unit.update({
                where: { id: unitId },
                data: { aiReviewPending: true },
              });
            }
            return result;
          });
        }
      }
    },
  };
}

export type PipelineService = ReturnType<typeof createPipelineService>;
