import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { unitRouter } from "@/server/api/routers/unit";
import { unitTypeRouter } from "@/server/api/routers/unit-type";
import { captureRouter } from "@/server/api/routers/capture";
import { resourceRouter } from "@/server/api/routers/resource";

export const appRouter = createTRPCRouter({
  unit: unitRouter,
  unitType: unitTypeRouter,
  capture: captureRouter,
  resource: resourceRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
