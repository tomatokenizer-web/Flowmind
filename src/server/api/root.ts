import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { unitRouter } from "@/server/api/routers/unit";
import { unitTypeRouter } from "@/server/api/routers/unit-type";
import { captureRouter } from "@/server/api/routers/capture";

export const appRouter = createTRPCRouter({
  unit: unitRouter,
  unitType: unitTypeRouter,
  capture: captureRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
