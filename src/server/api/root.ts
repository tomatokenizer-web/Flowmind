import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { unitRouter } from "@/server/api/routers/unit";
import { unitTypeRouter } from "@/server/api/routers/unit-type";
import { captureRouter } from "@/server/api/routers/capture";
import { resourceRouter } from "@/server/api/routers/resource";
import { versionRouter } from "@/server/api/routers/version";
import { audioRouter } from "@/server/api/routers/audio";
import { contextRouter } from "@/server/api/routers/context";
import { perspectiveRouter } from "@/server/api/routers/perspective";
import { contextVisitRouter } from "@/server/api/routers/context-visit";
import { dashboardRouter } from "@/server/api/routers/dashboard";

export const appRouter = createTRPCRouter({
  unit: unitRouter,
  unitType: unitTypeRouter,
  capture: captureRouter,
  resource: resourceRouter,
  version: versionRouter,
  audio: audioRouter,
  context: contextRouter,
  perspective: perspectiveRouter,
  contextVisit: contextVisitRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
