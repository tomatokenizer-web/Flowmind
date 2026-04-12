import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { initEmbeddingService } from "@/server/services/embeddingService";
import { initWebhookDelivery } from "@/server/services/webhookService";
import { initEventSubscribers } from "@/server/events/subscribers";
import { createSafetyGuard } from "@/server/ai/safetyGuard";
import { db } from "@/lib/db";

// Register embedding event handlers once when the tRPC route module is loaded.
initEmbeddingService();

// Register webhook delivery handlers to forward events to registered webhooks.
initWebhookDelivery(db);

// Register all B.9-spec event subscribers (salience, compass, rules, proactive, compounding).
initEventSubscribers(db);

// Schedule periodic safety guard session cleanup (every 30 minutes).
// Prevents unbounded SafetyGuardSession table growth.
let cleanupScheduled = false;
if (!cleanupScheduled) {
  cleanupScheduled = true;
  const guard = createSafetyGuard(db);
  setInterval(() => {
    guard.cleanupExpiredSessions().catch(() => {});
  }, 30 * 60 * 1000);
}

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
  });

export { handler as GET, handler as POST };
