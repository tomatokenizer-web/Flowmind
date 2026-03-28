import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const compassRouter = createTRPCRouter({
  getByInquiry: protectedProcedure
    .input(z.object({ inquiryId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const compass = await ctx.db.inquiryCompass.findFirst({
        where: {
          inquiryId: input.inquiryId,
          inquiry: { project: { userId: ctx.session.user.id } },
        },
        select: {
          id: true,
          inquiryId: true,
          requiredFormalTypes: true,
          currentState: true,
          completeness: true,
          openQuestions: true,
          blockers: true,
        },
      });

      if (!compass) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Compass not found for this inquiry",
        });
      }

      return compass;
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        inquiryId: z.string().uuid(),
        requiredFormalTypes: z.array(z.string()).optional(),
        currentState: z.record(z.unknown()).optional(),
        completeness: z.number().min(0).max(1).optional(),
        openQuestions: z.array(z.string()).optional(),
        blockers: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify inquiry ownership
      const inquiry = await ctx.db.inquiry.findFirst({
        where: {
          id: input.inquiryId,
          project: { userId: ctx.session.user.id },
        },
        select: { id: true },
      });

      if (!inquiry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inquiry not found",
        });
      }

      const compass = await ctx.db.inquiryCompass.upsert({
        where: { inquiryId: input.inquiryId },
        create: {
          inquiryId: input.inquiryId,
          requiredFormalTypes: input.requiredFormalTypes ?? [],
          currentState: (input.currentState ?? {}) as Prisma.InputJsonValue,
          completeness: input.completeness ?? 0,
          openQuestions: input.openQuestions ?? [],
          blockers: input.blockers ?? [],
        },
        update: {
          ...(input.requiredFormalTypes !== undefined && {
            requiredFormalTypes: input.requiredFormalTypes,
          }),
          ...(input.currentState !== undefined && {
            currentState: input.currentState as Prisma.InputJsonValue,
          }),
          ...(input.completeness !== undefined && {
            completeness: input.completeness,
          }),
          ...(input.openQuestions !== undefined && {
            openQuestions: input.openQuestions,
          }),
          ...(input.blockers !== undefined && { blockers: input.blockers }),
        },
        select: {
          id: true,
          inquiryId: true,
          completeness: true,
          openQuestions: true,
          blockers: true,
        },
      });

      return compass;
    }),
});
