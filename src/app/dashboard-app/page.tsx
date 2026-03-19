"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { ProjectOverview } from "~/components/dashboard/project-overview";
import type { ContextSummaryData } from "~/components/dashboard/context-summary-card";

// TODO: Replace with real project ID from session/route once multi-project is implemented
const DEFAULT_PROJECT_ID: string | undefined = undefined;

export default function DashboardPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: contexts, isLoading } = api.context.list.useQuery(
    { projectId: DEFAULT_PROJECT_ID! },
    { enabled: !!DEFAULT_PROJECT_ID },
  );

  // Build a parentId → name map for card labels
  const contextMap = useMemo(() => {
    const map = new Map<string, string>();
    if (contexts) {
      for (const ctx of contexts) {
        map.set(ctx.id, ctx.name);
      }
    }
    return map;
  }, [contexts]);

  // Transform tRPC data into ContextSummaryData[]
  const summaryData: ContextSummaryData[] = useMemo(() => {
    if (!contexts) return [];
    return contexts
      .map((ctx) => {
        const openQuestions = Array.isArray(ctx.openQuestions)
          ? (ctx.openQuestions as unknown[])
          : [];
        return {
          id: ctx.id,
          name: ctx.name,
          description: ctx.description,
          parentName: ctx.parentId ? (contextMap.get(ctx.parentId) ?? null) : null,
          unitCount: ctx._count.unitContexts,
          unresolvedQuestionCount: openQuestions.length,
          updatedAt: ctx.updatedAt,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [contexts, contextMap]);

  return (
    <ProjectOverview
      contexts={summaryData}
      isLoading={isLoading && !!DEFAULT_PROJECT_ID}
      onNewContext={() => setShowCreateDialog(true)}
    />
  );
}
