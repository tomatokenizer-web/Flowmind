"use client";

import * as React from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Skeleton, SkeletonCard } from "~/components/shared/skeleton";
import { ProjectDashboard } from "~/components/domain/dashboard";

export default function DashboardPage() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton height="32px" width="200px" />
        <div className="grid grid-cols-4 gap-3">
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (!activeProjectId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <h2 className="text-xl font-semibold text-text-primary">
          No project selected
        </h2>
        <p className="text-sm text-text-secondary max-w-md">
          Select a project from the sidebar to view its dashboard.
        </p>
      </div>
    );
  }

  return <ProjectDashboard />;
}
