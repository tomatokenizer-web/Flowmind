import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createUnitService, DuplicateUnitContentError } from "@/server/services/unitService";
import { inferUnitType } from "@/server/services/typeHeuristicService";
import { TRPCError } from "@trpc/server";

const captureSubmitSchema = z.object({
  content: z.string().min(1, "Content is required"),
  projectId: z.string().uuid(),
  /** "capture" stores as-is, "organize" flags for AI decomposition (Epic 5) */
  mode: z.enum(["capture", "organize"]).default("capture"),
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

        // Fire-and-forget: upgrade classification with AI if available
        void (async () => {
          try {
            const { getAIProvider } = await import("@/server/ai/provider");
            const provider = getAIProvider();
            const result = await provider.generateStructured<{
              unitType: string;
              confidence: number;
              reasoning: string;
            }>(
              `Analyze this text and determine its primary cognitive function.\n\nText: "${input.content.slice(0, 500)}"\n\nAvailable types: claim, question, evidence, counterargument, observation, idea, definition, assumption, action`,
              {
                temperature: 0.3,
                maxTokens: 256,
                zodSchema: (await import("@/server/ai/schemas")).TypeSuggestionSchema,
                schema: {
                  name: "TypeSuggestion",
                  description: "AI unit type classification",
                  properties: {
                    unitType: { type: "string", enum: ["claim", "question", "evidence", "counterargument", "observation", "idea", "definition", "assumption", "action"] },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    reasoning: { type: "string", maxLength: 200 },
                  },
                  required: ["unitType", "confidence", "reasoning"],
                },
              },
            );
            // Only upgrade if AI is confident and suggests a different type
            if (result.confidence >= 0.7 && result.unitType !== classifiedType) {
              await ctx.db.unit.update({
                where: { id: unit.id },
                data: { unitType: result.unitType as import("@prisma/client").UnitType },
              });
            }
          } catch {
            // AI unavailable — heuristic classification stands
          }
        })();

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
});
