import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { projectRouter } from "@/server/api/routers/project";
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
import { relationRouter } from "@/server/api/routers/relation";
import { customRelationTypeRouter } from "@/server/api/routers/customRelationType";
import { relationTypeRouter } from "@/server/api/routers/relation-type";
import { aiRouter } from "@/server/api/routers/ai";
import { searchRouter } from "@/server/api/routers/search";
import { assemblyRouter } from "@/server/api/routers/assembly";
import { incubationRouter } from "@/server/api/routers/incubation";

export const appRouter = createTRPCRouter({
  project: projectRouter,
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
  relation: relationRouter,
  customRelationType: customRelationTypeRouter,
  relationType: relationTypeRouter,
  ai: aiRouter,
  search: searchRouter,
  assembly: assemblyRouter,
  incubation: incubationRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
