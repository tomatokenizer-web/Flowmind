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
import { feedbackRouter } from "@/server/api/routers/feedback";
import { incubationRouter } from "@/server/api/routers/incubation";
import { relationRouter } from "@/server/api/routers/relation";
import { customRelationTypeRouter } from "@/server/api/routers/customRelationType";
import { relationTypeRouter } from "@/server/api/routers/relation-type";
import { aiRouter } from "@/server/api/routers/ai";
import { searchRouter } from "@/server/api/routers/search";
import { assemblyRouter } from "@/server/api/routers/assembly";
import { domainTemplateRouter } from "@/server/api/routers/domain-template";
import { apiKeyRouter } from "@/server/api/routers/api-key";
import { navigatorRouter } from "@/server/api/routers/navigator";
import { chunkRouter } from "@/server/api/routers/chunk";
import { contextReferenceRouter } from "@/server/api/routers/context-reference";
import { userRouter } from "@/server/api/routers/user";
import { tagRouter } from "@/server/api/routers/tag";
import { webhookRouter } from "@/server/api/routers/webhook";
import { exportHistoryRouter } from "@/server/api/routers/export-history";

import { reasoningChainRouter } from "@/server/api/routers/reasoning-chain";
import { formalizeRouter } from "@/server/api/routers/formalize";
import { inquiryRouter } from "@/server/api/routers/inquiry";
import { proposalRouter } from "@/server/api/routers/proposal";
import { viewRouter } from "@/server/api/routers/view";
import { graphQueryRouter } from "@/server/api/routers/graph-query";

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
  feedback: feedbackRouter,
  incubation: incubationRouter,
  relation: relationRouter,
  customRelationType: customRelationTypeRouter,
  relationType: relationTypeRouter,
  ai: aiRouter,
  search: searchRouter,
  assembly: assemblyRouter,
  domainTemplate: domainTemplateRouter,
  apiKey: apiKeyRouter,
  navigator: navigatorRouter,
  chunk: chunkRouter,
  contextReference: contextReferenceRouter,
  user: userRouter,
  tag: tagRouter,
  webhook: webhookRouter,
  exportHistory: exportHistoryRouter,

  reasoningChain: reasoningChainRouter,
  formalize: formalizeRouter,
  inquiry: inquiryRouter,
  proposal: proposalRouter,
  view: viewRouter,
  graphQuery: graphQueryRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
