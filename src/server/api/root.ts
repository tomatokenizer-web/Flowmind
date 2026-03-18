import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { unitRouter } from "@/server/api/routers/unit";

export const appRouter = createTRPCRouter({
  unit: unitRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
