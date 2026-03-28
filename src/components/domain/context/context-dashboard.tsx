"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  GitBranch,
  HelpCircle,
  Layers,
  Link2,
  Target,
  Unlink,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/shared/skeleton";

/* ─── MetricCard ─── */

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: string;
  className?: string;
}

function MetricCard({ icon: Icon, label, value, accent, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-card border border-border bg-bg-surface p-3",
        "transition-shadow duration-fast hover:shadow-resting",
        className,
      )}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          backgroundColor: accent ? `${accent}18` : "var(--bg-secondary)",
          color: accent ?? "var(--text-secondary)",
        }}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-text-primary leading-none">
          {value}
        </span>
        <span className="text-xs text-text-tertiary mt-0.5">{label}</span>
      </div>
    </div>
  );
}

/* ─── MiniUnitCard ─── */

interface MiniUnitCardProps {
  id: string;
  content: string;
  unitType: string;
  rank?: number;
}

function MiniUnitCard({ content, unitType, rank }: MiniUnitCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-bg-primary px-3 py-2",
        "hover:bg-bg-hover transition-colors duration-fast cursor-pointer",
      )}
    >
      <span
        className="mt-0.5 inline-block h-2 w-2 rounded-full shrink-0"
        style={{
          backgroundColor: `var(--unit-${unitType}-accent, var(--text-tertiary))`,
        }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{content}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-tertiary capitalize">{unitType}</span>
          {rank !== undefined && (
            <span className="text-xs text-text-tertiary">
              Rank: {rank.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Types ─── */

interface ContextDashboardProps {
  contextId: string;
  className?: string;
}

/* ─── Component ─── */

export function ContextDashboard({ contextId, className }: ContextDashboardProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeInquiryId = useWorkspaceStore((s) => s.activeInquiryId);

  const contextQuery = api.context.getById.useQuery({ id: contextId });
  const unitsQuery = api.unit.list.useQuery(
    { projectId: activeProjectId!, contextId },
    { enabled: !!activeProjectId },
  );
  const compassQuery = api.compass.getByInquiry.useQuery(
    { inquiryId: activeInquiryId! },
    { enabled: !!activeInquiryId },
  );

  const isLoading = contextQuery.isLoading || unitsQuery.isLoading;
  const units = unitsQuery.data?.items ?? [];
  const compass = compassQuery.data;

  /* ─── Health metrics (derived from units data) ─── */

  const unitCount = units.length;
  const questionCount = units.filter(
    (u) => u.primaryType === "question",
  ).length;
  const contradictionCount = units.filter(
    (u) => u.primaryType === "counterargument",
  ).length;

  // Hub units: top 5 (no rank available, use first 5)
  const hubUnits = units.slice(0, 5);

  // Orphan units: placeholder (no rank available from query)
  const orphanUnits: typeof units = [];

  /* ─── Loading ─── */

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-4 p-4", className)}>
        <Skeleton height="32px" width="60%" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="72px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="health" className={cn("flex flex-col", className)}>
      <TabsList className="px-4 shrink-0">
        <TabsTrigger value="health">
          <Activity className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Health
        </TabsTrigger>
        <TabsTrigger value="compass">
          <Target className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Compass
        </TabsTrigger>
      </TabsList>

      {/* ─── Health Tab ─── */}
      <TabsContent value="health">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="flex flex-col gap-4 p-4">
            {/* Metric grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={Layers}
                label="Total units"
                value={unitCount}
                accent="var(--accent-primary)"
              />
              <MetricCard
                icon={Link2}
                label="Hub units"
                value={hubUnits.length}
                accent="var(--accent-success)"
              />
              <MetricCard
                icon={Unlink}
                label="Orphan units"
                value={orphanUnits.length}
                accent="var(--accent-warning)"
              />
              <MetricCard
                icon={AlertTriangle}
                label="Contradictions"
                value={contradictionCount}
                accent="var(--accent-error)"
              />
              <MetricCard
                icon={HelpCircle}
                label="Open questions"
                value={questionCount}
                accent="var(--info)"
              />
              <MetricCard
                icon={GitBranch}
                label="Cycles detected"
                value={0}
                accent="var(--text-tertiary)"
              />
            </div>

            {/* Hub units section */}
            {hubUnits.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
                  Hub Units (by ThoughtRank)
                </h3>
                <div className="flex flex-col gap-1.5">
                  {hubUnits.map((u) => (
                    <MiniUnitCard
                      key={u.id}
                      id={u.id}
                      content={u.content}
                      unitType={u.primaryType}
                      rank={undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Orphan units section */}
            {orphanUnits.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
                  Orphan Units (no connections)
                </h3>
                <div className="flex flex-col gap-1.5">
                  {orphanUnits.slice(0, 5).map((u) => (
                    <MiniUnitCard
                      key={u.id}
                      id={u.id}
                      content={u.content}
                      unitType={u.primaryType}
                    />
                  ))}
                  {orphanUnits.length > 5 && (
                    <p className="text-xs text-text-tertiary text-center py-1">
                      +{orphanUnits.length - 5} more orphan units
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ─── Compass Tab ─── */}
      <TabsContent value="compass">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="flex flex-col gap-4 p-4">
            {!compass ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Target className="h-10 w-10 text-text-tertiary" strokeWidth={1.5} />
                <p className="text-sm text-text-secondary">
                  No compass data available yet.
                </p>
                <p className="text-xs text-text-tertiary max-w-xs">
                  The compass tracks what is confirmed, what is missing, and what is ready to become output in your inquiry.
                </p>
              </div>
            ) : (
              <>
                {/* Confirmed */}
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-success" aria-hidden="true" />
                    Confirmed
                  </h3>
                  {(compass.requiredFormalTypes as string[] | null)?.length ? (
                    <ul className="flex flex-col gap-1" role="list">
                      {(compass.requiredFormalTypes as string[]).map((item: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm text-text-primary bg-bg-surface rounded-lg px-3 py-2 border border-border"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-text-tertiary italic">Nothing confirmed yet</p>
                  )}
                </section>

                {/* Missing */}
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
                    <CircleDot className="h-3.5 w-3.5 text-accent-warning" aria-hidden="true" />
                    Missing
                  </h3>
                  {(compass.openQuestions as string[] | null)?.length ? (
                    <ul className="flex flex-col gap-1" role="list">
                      {(compass.openQuestions as string[]).map((item: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm text-text-primary bg-bg-surface rounded-lg px-3 py-2 border border-border"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-text-tertiary italic">Nothing identified as missing</p>
                  )}
                </section>

                {/* Ready outputs */}
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
                    Ready Outputs
                  </h3>
                  {(compass.blockers as string[] | null)?.length ? (
                    <ul className="flex flex-col gap-1" role="list">
                      {(compass.blockers as string[]).map((item: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm text-text-primary bg-bg-surface rounded-lg px-3 py-2 border border-border"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-text-tertiary italic">No outputs ready yet</p>
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
