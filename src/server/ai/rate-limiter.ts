import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Configuration ───────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Sliding window size in seconds */
  windowSeconds: number;
}

/**
 * Per-endpoint rate limit configuration.
 * Keys are endpoint names (tRPC procedure names).
 * The "*" key is the default fallback for any unlisted endpoint.
 */
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // AI mutation endpoints - stricter limits
  "ai.suggestType": { maxRequests: 15, windowSeconds: 60 },
  "ai.suggestRelations": { maxRequests: 10, windowSeconds: 60 },
  "ai.decomposeText": { maxRequests: 5, windowSeconds: 60 },
  "ai.proposeSplitReattribution": { maxRequests: 10, windowSeconds: 60 },
  "ai.generateAlternativeFraming": { maxRequests: 10, windowSeconds: 60 },
  "ai.suggestCounterArguments": { maxRequests: 10, windowSeconds: 60 },
  "ai.identifyAssumptions": { maxRequests: 10, windowSeconds: 60 },
  "ai.detectContradictions": { maxRequests: 5, windowSeconds: 60 },
  "ai.suggestMerge": { maxRequests: 5, windowSeconds: 60 },
  "ai.analyzeCompleteness": { maxRequests: 5, windowSeconds: 60 },
  "ai.generateQuestions": { maxRequests: 10, windowSeconds: 60 },
  "ai.suggestNextSteps": { maxRequests: 10, windowSeconds: 60 },
  "ai.extractKeyTerms": { maxRequests: 10, windowSeconds: 60 },
  "ai.classifyStance": { maxRequests: 15, windowSeconds: 60 },
  "ai.suggestExplorationDirections": { maxRequests: 15, windowSeconds: 60 },
  "ai.refineUnit": { maxRequests: 10, windowSeconds: 60 },
  "ai.generatePrompt": { maxRequests: 10, windowSeconds: 60 },
  // AI query endpoints - slightly more lenient
  "ai.summarizeContext": { maxRequests: 10, windowSeconds: 60 },
  "ai.getContributionRatio": { maxRequests: 20, windowSeconds: 60 },
  // Default for any AI endpoint not listed above
  "*": { maxRequests: 10, windowSeconds: 60 },
};

/**
 * Get the rate limit config for a given endpoint.
 */
export function getRateLimitConfig(endpoint: string): RateLimitConfig {
  return RATE_LIMITS[endpoint] ?? RATE_LIMITS["*"]!;
}

// ─── Sliding Window Rate Limiter (DB-backed) ─────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

/**
 * Check and record a rate limit entry for a user + endpoint.
 *
 * Uses a sliding window approach backed by Prisma/PostgreSQL:
 * 1. Delete expired entries older than the window
 * 2. Count entries within the current window
 * 3. If under the limit, insert a new entry and allow
 * 4. If at/over the limit, deny with retry-after info
 *
 * This is designed for serverless environments where in-memory
 * rate limiting would not work across function invocations.
 */
export async function checkRateLimit(
  db: PrismaClient,
  userId: string,
  endpoint: string,
  configOverride?: RateLimitConfig
): Promise<RateLimitResult> {
  const config = configOverride ?? getRateLimitConfig(endpoint);
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000);

  // Clean up old entries and count current window in a single transaction
  const [, count] = await db.$transaction([
    // Prune expired entries for this user+endpoint
    db.rateLimitEntry.deleteMany({
      where: {
        userId,
        endpoint,
        timestamp: { lt: windowStart },
      },
    }),
    // Count entries in the current window
    db.rateLimitEntry.count({
      where: {
        userId,
        endpoint,
        timestamp: { gte: windowStart },
      },
    }),
  ]);

  const remaining = Math.max(0, config.maxRequests - count);

  if (count >= config.maxRequests) {
    // Find the oldest entry in the window to compute retry-after
    const oldestEntry = await db.rateLimitEntry.findFirst({
      where: {
        userId,
        endpoint,
        timestamp: { gte: windowStart },
      },
      orderBy: { timestamp: "asc" },
      select: { timestamp: true },
    });

    const resetAt = oldestEntry
      ? new Date(oldestEntry.timestamp.getTime() + config.windowSeconds * 1000)
      : new Date(Date.now() + config.windowSeconds * 1000);

    const retryAfterSeconds = Math.ceil(
      (resetAt.getTime() - Date.now()) / 1000
    );

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  // Record this request
  await db.rateLimitEntry.create({
    data: {
      userId,
      endpoint,
    },
  });

  // Compute when the window resets (when the oldest entry expires)
  const resetAt = new Date(Date.now() + config.windowSeconds * 1000);

  return {
    allowed: true,
    remaining: remaining - 1, // -1 because we just recorded one
    resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Check rate limit and throw a TRPCError with code TOO_MANY_REQUESTS
 * if the limit is exceeded. Includes retry-after information in the
 * error message for clients to parse.
 */
export async function enforceRateLimit(
  db: PrismaClient,
  userId: string,
  endpoint: string,
  configOverride?: RateLimitConfig
): Promise<void> {
  const result = await checkRateLimit(db, userId, endpoint, configOverride);

  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${result.retryAfterSeconds} seconds.`,
      cause: {
        retryAfterSeconds: result.retryAfterSeconds,
        resetAt: result.resetAt.toISOString(),
      },
    });
  }
}
