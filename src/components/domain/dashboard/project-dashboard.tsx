"use client";

import * as React from "react";
import {
  Layers,
  FolderOpen,
  HelpCircle,
  FileText,
  Link2,
  Sparkles,
  Activity,
  Clock,
  Unlink,
  AlertTriangle,
  Swords,
  Bot,
  Play,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/shared/skeleton";
import { MetricCard } from "./metric-card";
import { HealthOverview } from "./health-overview";
import { ActivityFeed, type ActivityEvent } from "./activity-feed";
import { SparkLine } from "./spark-line";

/* ─── Types ─── */

interface ProjectDashboardProps {
  /** Navigate to a filtered search view */
  onNavigateToSearch?: (filter: string) => void;
  /** Navigate to a specific entity */
  onNavigateToEntity?: (entityId: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function ProjectDashboard({
  onNavigateToSearch,
  onNavigateToEntity,
  className,
}: ProjectDashboardProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  /* ─── Data queries ─── */
  const unitsQuery = api.unit.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );
  const contextsQuery = api.context.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );
  const inquiriesQuery = api.inquiry.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );
  const orphansQuery = api.search.orphanUnits.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );
  const recentQuery = api.search.recentUnits.useQuery(
    { projectId: activeProjectId!, limit: 50 },
    { enabled: !!activeProjectId },
  );

  const isLoading =
    unitsQuery.isLoading ||
    contextsQuery.isLoading ||
    inquiriesQuery.isLoading;

  /* ─── Derived metrics ─── */
  const units = unitsQuery.data?.items ?? [];
  const contexts = contextsQuery.data ?? [];
  const inquiries = inquiriesQuery.data ?? [];
  const orphans = orphansQuery.data ?? [];
  const recentUnits = recentQuery.data ?? [];

  const totalUnits = units.length;
  const totalContexts = Array.isArray(contexts) ? contexts.length : 0;
  const totalInquiries = Array.isArray(inquiries) ? inquiries.length : 0;

  // Health metrics
  const orphanCount = Array.isArray(orphans) ? orphans.length : 0;
  const claims = units.filter(
    (u) => (u as Record<string, unknown>).primaryType === "claim" || (u as Record<string, unknown>).type === "claim",
  );
  const unsupportedClaims = claims.filter(
    (u) => ((u as Record<string, unknown>)._count as Record<string, number>)?.relations === 0,
  );
  const openQuestions = units.filter(
    (u) =>
      ((u as Record<string, unknown>).primaryType === "question" || (u as Record<string, unknown>).type === "question") &&
      ((u as Record<string, unknown>).lifecycle === "pending" || (u as Record<string, unknown>).lifecycle === "draft"),
  );
  const contradictions = units.filter(
    (u) => (u as Record<string, unknown>).primaryType === "counterargument" || (u as Record<string, unknown>).type === "counterargument",
  );

  // AI metrics
  const aiGeneratedUnits = units.filter(
    (u) => (u as Record<string, unknown>).aiTrustLevel === "inferred",
  );
  const aiRatio =
    totalUnits > 0 ? (aiGeneratedUnits.length / totalUnits) * 100 : 0;
  const pendingDrafts = units.filter(
    (u) => (u as Record<string, unknown>).lifecycle === "draft",
  );

  // Activity: recent 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentlyCreated = units.filter(
    (u) => new Date((u as Record<string, unknown>).createdAt as string | Date).getTime() > sevenDaysAgo,
  );
  const recentlyModified = units.filter(
    (u) => new Date((u as Record<string, unknown>).modifiedAt as string | Date).getTime() > sevenDaysAgo,
  );

  // Sparkline: unit creation per day over last 7 days
  const sparkData = React.useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      day.setHours(0, 0, 0, 0);
      return day.getTime();
    });

    return days.map((dayStart) => {
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      return units.filter((u) => {
        const t = new Date((u as Record<string, unknown>).createdAt as string | Date).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
    });
  }, [units]);

  // Build activity events from recent units
  const activityEvents: ActivityEvent[] = React.useMemo(() => {
    return (Array.isArray(recentUnits) ? recentUnits : [])
      .slice(0, 50)
      .map((u: Record<string, unknown>) => ({
        id: u.id as string,
        type: "unit_created" as const,
        description: `Created ${((u.primaryType as string) ?? (u.type as string) ?? "unit").toLowerCase()}: "${((u.content as string) ?? "").slice(0, 60)}"`,
        entityId: u.id as string,
        entityLabel: ((u.content as string) ?? "").slice(0, 40),
        timestamp: new Date(u.createdAt as string | Date),
      }));
  }, [recentUnits]);

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-4 p-6", className)}>
        <Skeleton height="32px" width="200px" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height="120px" />
          ))}
        </div>
      </div>
    );
  }

  /* ─── No project selected ─── */
  if (!activeProjectId) {
    return (
      <div className={cn("flex flex-col items-center py-16 text-center", className)}>
        <FolderOpen className="h-12 w-12 text-text-tertiary mb-4" strokeWidth={1.5} />
        <h3 className="text-lg font-medium text-text-secondary">No project selected</h3>
        <p className="text-sm text-text-tertiary mt-1">
          Select a project to view its dashboard
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-6 p-6">
        {/* ─── Overview Section ─── */}
        <section>
          <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">
            Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              icon={FileText}
              label="Total Units"
              value={totalUnits}
              accent="var(--accent-primary)"
              sparkData={sparkData}
              onNavigate={onNavigateToSearch ? () => onNavigateToSearch("") : undefined}
            />
            <MetricCard
              icon={Layers}
              label="Contexts"
              value={totalContexts}
              accent="var(--accent-success)"
            />
            <MetricCard
              icon={HelpCircle}
              label="Inquiries"
              value={totalInquiries}
              accent="var(--info)"
            />
            <MetricCard
              icon={Link2}
              label="Assemblies"
              value={0}
              accent="var(--text-secondary)"
              subLabel="Coming soon"
            />
            <MetricCard
              icon={FileText}
              label="Documents"
              value={0}
              accent="var(--text-secondary)"
              subLabel="Coming soon"
            />
          </div>
        </section>

        {/* ─── Health Section ─── */}
        <section>
          <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">
            Knowledge Health
          </h2>
          <HealthOverview
            orphanCount={orphanCount}
            unsupportedClaimsCount={unsupportedClaims.length}
            openQuestionsCount={openQuestions.length}
            contradictionsCount={contradictions.length}
            onNavigate={onNavigateToSearch}
          />
        </section>

        {/* ─── Activity Section ─── */}
        <section>
          <h2 className="flex items-center gap-2 text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Activity (Last 7 Days)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <MetricCard
              icon={FileText}
              label="Created"
              value={recentlyCreated.length}
              accent="var(--accent-primary)"
              subLabel="Last 7 days"
              sparkData={sparkData}
            />
            <MetricCard
              icon={Clock}
              label="Modified"
              value={recentlyModified.length}
              accent="var(--text-secondary)"
              subLabel="Last 7 days"
            />
            <MetricCard
              icon={Unlink}
              label="Orphans"
              value={orphanCount}
              accent="var(--accent-warning)"
              onNavigate={
                onNavigateToSearch
                  ? () => onNavigateToSearch("is:orphan")
                  : undefined
              }
            />
          </div>

          <ActivityFeed
            events={activityEvents}
            onEventClick={onNavigateToEntity}
            className="max-h-[400px]"
          />
        </section>

        {/* ─── AI Section ─── */}
        <section>
          <h2 className="flex items-center gap-2 text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard
              icon={Bot}
              label="AI-Generated Ratio"
              value={`${aiRatio.toFixed(0)}%`}
              accent="var(--accent-primary)"
              progress={aiRatio / 100}
            />
            <MetricCard
              icon={FileText}
              label="Pending Drafts"
              value={pendingDrafts.length}
              accent="var(--accent-warning)"
              onNavigate={
                onNavigateToSearch
                  ? () => onNavigateToSearch("status:draft by:ai")
                  : undefined
              }
            />
            <MetricCard
              icon={Play}
              label="Pipeline Runs Today"
              value={0}
              accent="var(--text-tertiary)"
              subLabel="No runs recorded"
            />
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}

ProjectDashboard.displayName = "ProjectDashboard";
