import type { Prisma, PrismaClient, InquiryStatus, InquiryFormation, PursuitStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Pursuit Input Types ───────────────────────────────────────────

export interface CreatePursuitInput {
  name: string;
  description?: string;
  projectId: string;
  templateId?: string;
  status?: PursuitStatus;
}

export interface UpdatePursuitInput {
  name?: string;
  description?: string;
  status?: PursuitStatus;
}

// ─── Inquiry Input Types ───────────────────────────────────────────

export interface CreateInquiryInput {
  title: string;
  pursuitId: string;
  templateId?: string;
  secondaryTemplates?: string[];
  formation?: InquiryFormation;
  status?: InquiryStatus;
  startingQuestions?: string[];
}

export interface UpdateInquiryInput {
  title?: string;
  templateId?: string;
  secondaryTemplates?: string[];
  formation?: InquiryFormation;
  status?: InquiryStatus;
  startingQuestions?: string[];
  compass?: Record<string, unknown>;
}

// ─── Pivot Event Input ─────────────────────────────────────────────

export interface CreatePivotEventInput {
  inquiryId: string;
  reason: string;
  fromGoal?: string;
  toGoal?: string;
}

// ─── Service ───────────────────────────────────────────────────────

export function createInquiryService(db: PrismaClient) {
  return {
    // ─── Pursuit CRUD ────────────────────────────────────────────

    async createPursuit(input: CreatePursuitInput) {
      return db.pursuit.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          projectId: input.projectId,
          templateId: input.templateId ?? null,
          status: input.status ?? "active_pursuit",
        },
      });
    },

    async getPursuit(id: string) {
      return db.pursuit.findUnique({
        where: { id },
        include: {
          inquiries: { orderBy: { createdAt: "desc" } },
          contexts: { select: { id: true, name: true } },
        },
      });
    },

    async listPursuits(projectId: string) {
      return db.pursuit.findMany({
        where: { projectId },
        include: {
          inquiries: { select: { id: true, title: true, status: true } },
          _count: { select: { contexts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    },

    async updatePursuit(id: string, input: UpdatePursuitInput) {
      return db.pursuit.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
    },

    async deletePursuit(id: string) {
      return db.pursuit.delete({ where: { id } });
    },

    // ─── Inquiry CRUD ────────────────────────────────────────────

    async createInquiry(input: CreateInquiryInput) {
      // Verify pursuit exists
      const pursuit = await db.pursuit.findUnique({
        where: { id: input.pursuitId },
        select: { id: true },
      });
      if (!pursuit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pursuit not found",
        });
      }

      return db.inquiry.create({
        data: {
          title: input.title,
          pursuitId: input.pursuitId,
          templateId: input.templateId ?? null,
          secondaryTemplates: input.secondaryTemplates ?? [],
          formation: input.formation ?? "organic",
          status: input.status ?? "exploring",
          startingQuestions: input.startingQuestions ?? undefined,
        },
      });
    },

    async getInquiry(id: string) {
      return db.inquiry.findUnique({
        where: { id },
        include: {
          pursuit: { select: { id: true, name: true, projectId: true } },
          contexts: { select: { id: true, name: true } },
          pivotEvents: { orderBy: { createdAt: "desc" } },
        },
      });
    },

    async listInquiries(pursuitId: string) {
      return db.inquiry.findMany({
        where: { pursuitId },
        include: {
          _count: { select: { contexts: true, pivotEvents: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    },

    async updateInquiry(id: string, input: UpdateInquiryInput) {
      return db.inquiry.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.templateId !== undefined
            ? { template: { connect: { id: input.templateId } } }
            : {}),
          ...(input.secondaryTemplates !== undefined ? { secondaryTemplates: input.secondaryTemplates } : {}),
          ...(input.formation !== undefined ? { formation: input.formation } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.startingQuestions !== undefined ? { startingQuestions: input.startingQuestions } : {}),
          ...(input.compass !== undefined ? { compass: input.compass as Prisma.InputJsonValue } : {}),
        },
      });
    },

    async deleteInquiry(id: string) {
      return db.inquiry.delete({ where: { id } });
    },

    // ─── Pivot Events ────────────────────────────────────────────

    async createPivotEvent(input: CreatePivotEventInput) {
      // Verify inquiry exists
      const inquiry = await db.inquiry.findUnique({
        where: { id: input.inquiryId },
        select: { id: true },
      });
      if (!inquiry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inquiry not found",
        });
      }

      return db.pivotEvent.create({
        data: {
          inquiryId: input.inquiryId,
          reason: input.reason,
          fromGoal: input.fromGoal ?? null,
          toGoal: input.toGoal ?? null,
        },
      });
    },

    async listPivotEvents(inquiryId: string) {
      return db.pivotEvent.findMany({
        where: { inquiryId },
        orderBy: { createdAt: "desc" },
      });
    },
  };
}

export type InquiryService = ReturnType<typeof createInquiryService>;
