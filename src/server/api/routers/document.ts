import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const documentRouter = createTRPCRouter({
  /**
   * List documents by project ID.
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return ctx.db.document.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Get document by ID with its shadow unit.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.document.findUnique({
        where: { id: input.id },
        include: {
          project: { select: { userId: true } },
          shadowUnit: {
            select: {
              id: true,
              content: true,
              primaryType: true,
              lifecycle: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }
      if (document.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { project: _project, ...rest } = document;
      return rest;
    }),

  /**
   * Create a document with an auto-generated shadow unit.
   * Shadow unit content = title, primaryType = 'definition', lifecycle = 'confirmed'.
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        content: z.string(),
        projectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return ctx.db.$transaction(async (tx) => {
        // Create the shadow unit first
        const shadowUnit = await tx.unit.create({
          data: {
            content: input.title,
            userId: ctx.session.user.id!,
            projectId: input.projectId,
            primaryType: "definition",
            lifecycle: "confirmed",
          },
        });

        // Create the document linked to the shadow unit
        const document = await tx.document.create({
          data: {
            title: input.title,
            content: input.content,
            projectId: input.projectId,
            shadowUnitId: shadowUnit.id,
          },
          include: {
            shadowUnit: {
              select: {
                id: true,
                content: true,
                primaryType: true,
                lifecycle: true,
              },
            },
          },
        });

        return document;
      });
    }),

  /**
   * Update document title and/or content.
   * When content changes, marks sourceValid=false on all units
   * whose parentInputId points to this document.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.document.findUnique({
        where: { id: input.id },
        include: { project: { select: { userId: true } } },
      });
      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }
      if (document.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.document.update({
          where: { id: input.id },
          data: {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.content !== undefined && { content: input.content }),
          },
        });

        // Invalidate derived units when content changes
        if (input.content !== undefined) {
          await tx.unit.updateMany({
            where: { parentInputId: input.id },
            data: { sourceValid: false },
          });
        }

        // Update shadow unit content if title changed
        if (input.title !== undefined && document.shadowUnitId) {
          await tx.unit.update({
            where: { id: document.shadowUnitId },
            data: { content: input.title },
          });
        }

        return updated;
      });
    }),

  /**
   * Delete a document. Marks its shadow unit as discarded
   * (units are never hard-deleted per Salience-Storage spec).
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.document.findUnique({
        where: { id: input.id },
        include: { project: { select: { userId: true } } },
      });
      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }
      if (document.project.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.$transaction(async (tx) => {
        // Mark shadow unit as discarded
        if (document.shadowUnitId) {
          await tx.unit.update({
            where: { id: document.shadowUnitId },
            data: { lifecycle: "discarded" },
          });
        }

        await tx.document.delete({ where: { id: input.id } });
        return { success: true };
      });
    }),
});
