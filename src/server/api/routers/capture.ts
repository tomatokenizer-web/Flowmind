import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createUnitService, DuplicateUnitContentError } from "@/server/services/unitService";
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

      try {
        return await service.create(
          {
            content: input.content,
            projectId: input.projectId,
            unitType: "observation",
            lifecycle: "draft",
            originType: "direct_write",
            aiTrustLevel: "user_authored",
            // Flag for AI decomposition pipeline (Epic 5)
            meta: input.mode === "organize" ? { pendingDecomposition: true } : undefined,
          },
          ctx.session.user.id!,
        );
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
