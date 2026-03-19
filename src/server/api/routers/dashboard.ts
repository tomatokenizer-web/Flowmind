import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createDashboardService } from "@/server/services/dashboardService";

export const dashboardRouter = createTRPCRouter({
  getData: protectedProcedure.query(async ({ ctx }) => {
    const service = createDashboardService(ctx.db);
    return service.getDashboardData(ctx.session.user.id!);
  }),
});
