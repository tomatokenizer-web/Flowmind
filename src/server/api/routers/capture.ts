import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createUnitService } from "@/server/services/unitService";

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

      return service.create(
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
    }),
});
