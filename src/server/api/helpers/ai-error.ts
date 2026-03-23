import { TRPCError } from "@trpc/server";

/**
 * Shared error handler for AI provider calls in the AI router.
 *
 * Maps common Anthropic SDK / provider errors to appropriate tRPC error codes:
 * - credit/balance/billing -> PAYMENT_REQUIRED
 * - authentication/api_key/401 -> UNAUTHORIZED
 * - rate_limit/429 -> TOO_MANY_REQUESTS
 * - everything else -> INTERNAL_SERVER_ERROR
 */
export function handleAIError(err: unknown, operation: string): never {
  const msg = err instanceof Error ? err.message : String(err);
  const errStr = typeof err === "object" && err !== null ? JSON.stringify(err) : msg;
  console.error(`[${operation}] AI call failed:`, msg);

  if (
    msg.includes("credit") ||
    msg.includes("balance") ||
    msg.includes("billing") ||
    errStr.includes("credit") ||
    errStr.includes("balance")
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Anthropic API credit balance is too low. Please add credits at console.anthropic.com.",
    });
  }

  if (
    msg.includes("authentication") ||
    msg.includes("invalid_api_key") ||
    msg.includes("api_key") ||
    msg.includes("401")
  ) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "AI provider authentication failed. Check ANTHROPIC_API_KEY in your .env file.",
    });
  }

  if (msg.includes("rate_limit") || msg.includes("429")) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Anthropic API rate limit reached. Please wait a moment and try again.",
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `${operation} failed: ${msg}`,
  });
}
