"use client";

import * as React from "react";
import { use } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Skeleton, SkeletonCard } from "~/components/shared/skeleton";
import { ProjectOverview } from "~/components/domain/project";

/* ─── Loading skeleton ─── */

function ProjectSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton height="32px" width="220px" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton height="64px" />
        <Skeleton height="64px" />
        <Skeleton height="64px" />
      </div>
      <div className="grid gap-3 mt-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

  React.useEffect(() => {
    setActiveProject(id);
    return () => setActiveProject(null);
  }, [id, setActiveProject]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <ProjectSkeleton />;

  return <ProjectOverview projectId={id} />;
}
