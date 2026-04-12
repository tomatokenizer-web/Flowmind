import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createEmbeddingDualReadService } from "@/server/services/embeddingDualReadService";

// ─── DEC-2026-002 §13: Embedding Dual-Read Router ─────────────────
//
// Read-only view into the embedding-model registry. Mutation
// endpoints (registerModel, deactivateModel, markForReembed) were
// intentionally omitted from this commit: they operate on global
// state not scoped to the caller, and this codebase has no
// adminProcedure gate yet. Mutations will be reintroduced in a
// follow-up commit behind a real admin gate; until then, run them
// via a server-side script / CLI.

export const embeddingRouter = createTRPCRouter({
  /**
   * Full dual-read status snapshot: active models + their unit
   * counts + pending re-embed count. Read-only, safe for any
   * authenticated user.
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    const svc = createEmbeddingDualReadService(ctx.db);
    return svc.getStatus();
  }),
});
