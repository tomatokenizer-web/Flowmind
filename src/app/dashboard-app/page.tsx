"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { ProjectOverview } from "~/components/dashboard/project-overview";
import type { ContextSummaryData } from "~/components/dashboard/context-summary-card";

export default function DashboardPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading } = api.dashboard.getData.useQuery();

  const summaryData: ContextSummaryData[] = useMemo(() => {
    if (!data?.contexts) return [];
    return data.contexts.map((ctx) => ({
      id: ctx.id,
      name: ctx.name,
      description: ctx.description,
      parentName: ctx.parentName,
      unitCount: ctx.unitCount,
      unresolvedQuestionCount: ctx.unresolvedQuestionCount,
      updatedAt: ctx.lastModifiedAt,
    }));
  }, [data]);

  return (
    <ProjectOverview
      contexts={summaryData}
      isLoading={isLoading}
      onNewContext={() => setShowCreateDialog(true)}
    />
  );
}
