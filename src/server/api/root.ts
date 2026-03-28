import { createCallerFactory, createTRPCRouter } from "./trpc";
import { projectRouter } from "./routers/project";
import { inquiryRouter } from "./routers/inquiry";
import { contextRouter } from "./routers/context";
import { unitRouter } from "./routers/unit";
import { relationRouter } from "./routers/relation";
import { assemblyRouter } from "./routers/assembly";
import { documentRouter } from "./routers/document";
import { navigatorRouter } from "./routers/navigator";
import { searchRouter } from "./routers/search";
import { compassRouter } from "./routers/compass";
import { pipelineRouter } from "./routers/pipeline";
import { perspectiveRouter } from "./routers/perspective";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  inquiry: inquiryRouter,
  context: contextRouter,
  unit: unitRouter,
  relation: relationRouter,
  assembly: assemblyRouter,
  document: documentRouter,
  navigator: navigatorRouter,
  search: searchRouter,
  compass: compassRouter,
  pipeline: pipelineRouter,
  perspective: perspectiveRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
