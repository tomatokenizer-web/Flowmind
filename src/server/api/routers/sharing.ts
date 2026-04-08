import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAccessResolverService } from "@/server/services/accessResolverService";

export const sharingRouter = createTRPCRouter({
  /** Check access level for the current user on a project */
  checkAccess: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const svc = createAccessResolverService(ctx.db);
      return svc.resolve(ctx.session.user.id!, input.projectId);
    }),

  /** Share a project with another user by email */
  shareByEmail: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      email: z.string().email(),
      role: z.enum(["viewer", "editor"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = createAccessResolverService(ctx.db);
      const isOwner = await svc.isOwner(ctx.session.user.id!, input.projectId);
      if (!isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can share" });
      }
      return svc.shareByEmail(input.projectId, input.email, input.role);
    }),

  /** Update an existing share's role */
  updateRole: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
      role: z.enum(["viewer", "editor"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = createAccessResolverService(ctx.db);
      const isOwner = await svc.isOwner(ctx.session.user.id!, input.projectId);
      if (!isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can modify shares" });
      }
      return svc.shareProject(input.projectId, input.userId, input.role);
    }),

  /** Revoke a user's access to a project */
  revoke: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = createAccessResolverService(ctx.db);
      const isOwner = await svc.isOwner(ctx.session.user.id!, input.projectId);
      if (!isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can revoke access" });
      }
      return svc.revokeShare(input.projectId, input.userId);
    }),

  /** List all shares for a project */
  listShares: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const svc = createAccessResolverService(ctx.db);
      const isOwner = await svc.isOwner(ctx.session.user.id!, input.projectId);
      if (!isOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can view shares" });
      }
      return svc.listShares(input.projectId);
    }),
});
