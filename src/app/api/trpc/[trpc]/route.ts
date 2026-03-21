import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { initEmbeddingService } from "@/server/services/embeddingService";
import { initWebhookDelivery } from "@/server/services/webhookService";
import { db } from "@/lib/db";

// Register embedding event handlers once when the tRPC route module is loaded.
initEmbeddingService();

// Register webhook delivery handlers to forward events to registered webhooks.
initWebhookDelivery(db);

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
  });

export { handler as GET, handler as POST };
