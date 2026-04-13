import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    db,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Admin procedure gate — DEC-2026-002 §13.
 * Checks ADMIN_USER_IDS env var (comma-separated list of user IDs).
 * Falls back to the first user created (single-tenant default).
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userId = ctx.session.user.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing user ID" });
  }
  const adminIds = process.env.ADMIN_USER_IDS?.split(",").map((s) => s.trim());

  if (adminIds && adminIds.length > 0) {
    if (!adminIds.includes(userId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
  } else {
    // Single-tenant fallback: first user by creation time is admin.
    const firstUser = await ctx.db.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (firstUser?.id !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
  }

  return next({ ctx });
});
