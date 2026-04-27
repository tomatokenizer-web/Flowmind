"use client";

import * as React from "react";
import {
  Sparkles,
  Unlink,
  Copy,
  AlertTriangle,
  Clock,
  Trash2,
  GitMerge,
  Check,
  X,
  GitBranch,
  Layers,
  ArrowUpCircle,
  Star,
  Hourglass,
  Swords,
  HelpCircle,
  Zap,
  SlidersHorizontal,
  LayoutList,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { UnitType } from "@prisma/client";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { toast } from "~/lib/toast";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { usePanelStore } from "~/stores/panel-store";
import { BranchProjectDialog } from "~/components/project/BranchProjectDialog";
import { LoadingCards, EmptyState, ContextPicker, ActionButton } from "./shared";
import { OrphanCard } from "./OrphanCard";
import { ProactiveInsightsFeed } from "~/components/dashboard/ProactiveInsightsFeed";

// ─── Props ───────────────────────────────────────────────────────────

interface AttentionViewProps {
  projectId: string;
}

// ─── Tab type ────────────────────────────────────────────────────────

type AttentionTab = "unassigned" | "similar" | "drift" | "high_salience" | "stale" | "conflicting" | "unanswered" | "proactive" | "custom";

// ─── Main Component ─────────────────────────────────────────────────

type ViewMode = "list" | "grid";

export function AttentionView({ projectId }: AttentionViewProps) {
  const [activeTab, setActiveTab] = React.useState<AttentionTab>("unassigned");
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const openPanel = usePanelStore((s) => s.openPanel);

  const { data: orphans = [], isLoading: orphLoading } =
    api.feedback.getOrphanUnits.useQuery(
      { projectId },
      { enabled: !!projectId },
    );

  const { data: similarData, isLoading: simLoading } =
    api.feedback.detectSimilarUnits.useQuery(
      { projectId },
      { enabled: !!projectId },
    );

  const { data: driftUnits = [], isLoading: driftLoading } =
    api.feedback.getDriftUnits.useQuery(
      { projectId, threshold: 0.7 },
      { enabled: !!projectId },
    );

  const { data: highSalienceUnits = [], isLoading: hsLoading } =
    api.view.attention.useQuery(
      { name: "high_salience", projectId },
      { enabled: !!projectId },
    );

  const { data: staleUnits = [], isLoading: staleLoading } =
    api.view.attention.useQuery(
      { name: "stale", projectId },
      { enabled: !!projectId },
    );

  const { data: conflictingUnits = [], isLoading: conflictLoading } =
    api.view.attention.useQuery(
      { name: "conflicting", projectId },
      { enabled: !!projectId },
    );

  const { data: unansweredUnits = [], isLoading: unansweredLoading } =
    api.view.attention.useQuery(
      { name: "unanswered_questions", projectId },
      { enabled: !!projectId },
    );

  const [dismissedPairs, setDismissedPairs] = React.useState<Set<string>>(new Set());
  const activeSimilarPairs = (similarData?.pairs ?? []).filter(
    (p) => !dismissedPairs.has(`${p.unitA.id}:${p.unitB.id}`),
  );

  const tabs: Array<{ key: AttentionTab; label: string; count: number; icon: React.ReactNode; loading: boolean }> = [
    { key: "unassigned", label: "Unassigned", count: orphans.length, icon: <Unlink className="h-4 w-4" />, loading: orphLoading },
    { key: "high_salience", label: "High Salience", count: highSalienceUnits.length, icon: <Star className="h-4 w-4" />, loading: hsLoading },
    { key: "stale", label: "Stale", count: staleUnits.length, icon: <Hourglass className="h-4 w-4" />, loading: staleLoading },
    { key: "conflicting", label: "Conflicting", count: conflictingUnits.length, icon: <Swords className="h-4 w-4" />, loading: conflictLoading },
    { key: "unanswered", label: "Unanswered", count: unansweredUnits.length, icon: <HelpCircle className="h-4 w-4" />, loading: unansweredLoading },
    { key: "similar", label: "Similar", count: activeSimilarPairs.length, icon: <Copy className="h-4 w-4" />, loading: simLoading },
    { key: "drift", label: "Drift", count: driftUnits.length, icon: <AlertTriangle className="h-4 w-4" />, loading: driftLoading },
    { key: "proactive", label: "Proactive", count: 0, icon: <Zap className="h-4 w-4" />, loading: false },
    { key: "custom", label: "Custom", count: 0, icon: <SlidersHorizontal className="h-4 w-4" />, loading: false },
  ];

  const { data: contexts = [] } = api.context.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  return (
    <section aria-label="Attention view" className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-text-primary">Attention Required</h1>
          <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "list" ? "bg-bg-hover text-text-primary" : "text-text-tertiary hover:text-text-secondary",
              )}
              aria-label="List view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "grid" ? "bg-bg-hover text-text-primary" : "text-text-tertiary hover:text-text-secondary",
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  activeTab === tab.key
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "bg-bg-secondary text-text-tertiary",
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {activeTab === "unassigned" && (
            <OrphanList
              orphans={orphans}
              projectId={projectId}
              isLoading={orphLoading}
              onUnitClick={openPanel}
            />
          )}
          {activeTab === "high_salience" && (
            <ViewResultList
              units={highSalienceUnits}
              isLoading={hsLoading}
              emptyIcon={Star}
              emptyMessage="No high-salience units yet. Units gain salience through connections and activity."
              onUnitClick={openPanel}
              viewMode={viewMode}
            />
          )}
          {activeTab === "stale" && (
            <ViewResultList
              units={staleUnits}
              isLoading={staleLoading}
              emptyIcon={Hourglass}
              emptyMessage="No stale units. All units have been recently updated."
              onUnitClick={openPanel}
              viewMode={viewMode}
            />
          )}
          {activeTab === "conflicting" && (
            <ViewResultList
              units={conflictingUnits}
              isLoading={conflictLoading}
              emptyIcon={Swords}
              emptyMessage="No conflicting units. No contradictions detected."
              onUnitClick={openPanel}
              viewMode={viewMode}
            />
          )}
          {activeTab === "unanswered" && (
            <ViewResultList
              units={unansweredUnits}
              isLoading={unansweredLoading}
              emptyIcon={HelpCircle}
              emptyMessage="No unanswered questions. All questions have linked answers."
              onUnitClick={openPanel}
              viewMode={viewMode}
            />
          )}
          {activeTab === "similar" && (
            <SimilarList
              pairs={activeSimilarPairs}
              projectId={projectId}
              isLoading={simLoading}
              onDismiss={(a, b) => setDismissedPairs((s) => new Set([...s, `${a}:${b}`]))}
              onUnitClick={openPanel}
            />
          )}
          {activeTab === "drift" && (
            <DriftList
              driftUnits={driftUnits}
              projectId={projectId}
              isLoading={driftLoading}
              onUnitClick={openPanel}
            />
          )}
          {activeTab === "proactive" && (
            <ProactiveInsightsFeed onNavigateToUnit={openPanel} />
          )}
          {activeTab === "custom" && (
            <CustomFilterView projectId={projectId} onUnitClick={openPanel} viewMode={viewMode} />
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Unassigned List (merged Orphan + Incubating) ───────────────────

function OrphanList({
  orphans,
  projectId,
  isLoading,
  onUnitClick,
}: {
  orphans: Array<{ id: string; content: string; unitType: string; createdAt: Date | string; isolationScore: number }>;
  projectId: string;
  isLoading: boolean;
  onUnitClick: (id: string) => void;
}) {
  const utils = api.useUtils();

  const { data: contexts = [] } = api.context.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const recoverOrphan = api.feedback.recoverOrphan.useMutation({
    onSuccess: (result) => {
      void utils.feedback.getOrphanUnits.invalidate({ projectId });
      void utils.incubation.list.invalidate();
      void utils.context.list.invalidate({ projectId });
      const labels: Record<string, string> = {
        archive: "Archived",
        delete: "Deleted",
        incubate: "Sent to incubation",
        context: "Moved to context",
      };
      toast.success(labels[result.action] ?? "Done");
    },
    onError: () => toast.error("Action failed"),
  });

  const createContext = api.context.create.useMutation({
    onSuccess: (newCtx) => {
      void utils.context.list.invalidate({ projectId });
      toast.success("Context created", { description: newCtx.name });
    },
    onError: () => toast.error("Failed to create context"),
  });

  const handleCreateContextForOrphan = (unitId: string, unitContent: string) => {
    const name = unitContent.slice(0, 60).trim() || "New Context";
    createContext.mutate(
      { name, projectId },
      {
        onSuccess: (newCtx) => {
          recoverOrphan.mutate({ unitId, action: "context", contextId: newCtx.id });
        },
      },
    );
  };

  // AI grouping suggestions
  const suggestGroupings = api.ai.suggestOrphanGroupings.useMutation();
  const [dismissedGroups, setDismissedGroups] = React.useState<Set<number>>(new Set());
  const [creatingGroupIdx, setCreatingGroupIdx] = React.useState<number | null>(null);
  const autoCreateContext = api.ai.autoCreateContext.useMutation({
    onSuccess: (result) => {
      void utils.feedback.getOrphanUnits.invalidate({ projectId });
      void utils.context.list.invalidate({ projectId });
      if (creatingGroupIdx !== null) {
        setDismissedGroups((prev) => new Set(prev).add(creatingGroupIdx));
        setCreatingGroupIdx(null);
      }
      toast.success(`Context "${result.contextName}" created`, {
        description: `${result.unitsAdded} units grouped`,
      });
    },
    onError: () => {
      setCreatingGroupIdx(null);
      toast.error("Failed to create context");
    },
  });

  const activeGroups = (suggestGroupings.data?.groups ?? []).filter(
    (_, i) => !dismissedGroups.has(i),
  );

  if (isLoading) return <LoadingCards />;
  if (orphans.length === 0) return <EmptyState icon={Unlink} message="No orphan units. All units are connected." />;

  return (
    <div className="space-y-3">
      {/* Suggest Groupings button */}
      {orphans.length >= 2 && (
        <button
          type="button"
          onClick={() => {
            setDismissedGroups(new Set());
            suggestGroupings.mutate({ projectId });
          }}
          disabled={suggestGroupings.isPending}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-xs font-medium transition-colors",
            suggestGroupings.isPending
              ? "border-accent-primary/30 text-text-tertiary"
              : "border-accent-primary/50 text-accent-primary hover:border-accent-primary hover:bg-accent-primary/5",
          )}
        >
          {suggestGroupings.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing groupings...
            </>
          ) : (
            <>
              <Layers className="h-4 w-4" />
              {activeGroups.length > 0 ? "Re-analyze Groupings" : `Suggest Groupings for ${orphans.length} orphans`}
            </>
          )}
        </button>
      )}

      {/* Grouping suggestions */}
      {activeGroups.length > 0 && (
        <div className="space-y-2">
          {activeGroups.map((group, groupIdx) => {
            const originalIdx = suggestGroupings.data!.groups.indexOf(group);
            return (
              <div
                key={originalIdx}
                className="rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-accent-primary" />
                    <span className="text-sm font-medium text-text-primary">{group.contextName}</span>
                    <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                      {group.units.length} units
                    </span>
                  </div>
                </div>
                {group.description && (
                  <p className="text-xs text-text-secondary mb-2">{group.description}</p>
                )}
                <div className="space-y-1 mb-3">
                  {group.units.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onUnitClick(u.id)}
                      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent-primary/10 transition-colors"
                    >
                      <UnitTypeBadge unitType={u.unitType as UnitType} />
                      <p className="text-xs text-text-primary line-clamp-1 flex-1">{u.content}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-text-tertiary italic mb-3">{group.reasoning}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingGroupIdx(originalIdx);
                      autoCreateContext.mutate({
                        projectId,
                        unitIds: group.units.map((u) => u.id),
                      });
                    }}
                    disabled={autoCreateContext.isPending}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      creatingGroupIdx === originalIdx && autoCreateContext.isPending
                        ? "bg-accent-primary/20 text-accent-primary"
                        : "bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20",
                    )}
                  >
                    {creatingGroupIdx === originalIdx && autoCreateContext.isPending ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Creating...</>
                    ) : (
                      <><Check className="h-3 w-3" /> Create Context</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedGroups((prev) => new Set(prev).add(originalIdx))}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-text-tertiary hover:bg-bg-hover transition-colors"
                  >
                    <X className="h-3 w-3" /> Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Individual orphan cards */}
      {orphans.map((unit) => (
        <OrphanCard
          key={unit.id}
          unit={unit}
          projectId={projectId}
          contexts={contexts}
          onUnitClick={onUnitClick}
          onRecover={(action, contextId) =>
            recoverOrphan.mutate({ unitId: unit.id, action, contextId })
          }
          onCreateContext={() => handleCreateContextForOrphan(unit.id, unit.content)}
          isActioning={recoverOrphan.isPending || createContext.isPending}
        />
      ))}
    </div>
  );
}

// ─── Similar List ────────────────────────────────────────────────────

function SimilarList({
  pairs,
  projectId,
  isLoading,
  onDismiss,
  onUnitClick,
}: {
  pairs: Array<{ unitA: { id: string; content: string }; unitB: { id: string; content: string }; similarity: number }>;
  projectId: string;
  isLoading: boolean;
  onDismiss: (aId: string, bId: string) => void;
  onUnitClick: (id: string) => void;
}) {
  const utils = api.useUtils();
  const compressClaims = api.feedback.compressClaims.useMutation({
    onSuccess: () => {
      void utils.feedback.detectSimilarUnits.invalidate({ projectId });
      toast.success("Units merged");
    },
    onError: () => toast.error("Merge failed"),
  });

  if (isLoading) return <LoadingCards />;
  if (pairs.length === 0) return <EmptyState icon={Copy} message="No similar units detected." />;

  return (
    <div className="space-y-3">
      {pairs.map((pair) => (
        <div
          key={`${pair.unitA.id}:${pair.unitB.id}`}
          className="rounded-xl border border-border bg-bg-primary p-4 hover:shadow-hover transition-shadow"
        >
          <div className="mb-3">
            <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
              {Math.round(pair.similarity * 100)}% similar
            </span>
          </div>
          <div className="space-y-2 mb-3">
            <button type="button" onClick={() => onUnitClick(pair.unitA.id)} className="text-left w-full">
              <p className="text-sm text-text-primary line-clamp-2 hover:text-accent-primary transition-colors">
                {pair.unitA.content}
              </p>
            </button>
            <div className="border-t border-dashed border-border" />
            <button type="button" onClick={() => onUnitClick(pair.unitB.id)} className="text-left w-full">
              <p className="text-sm text-text-secondary line-clamp-2 hover:text-accent-primary transition-colors">
                {pair.unitB.content}
              </p>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <ActionButton
              icon={<GitMerge className="h-3.5 w-3.5" />}
              label="Merge"
              onClick={() => {
                const core = pair.unitA.content.length <= pair.unitB.content.length
                  ? pair.unitA.content : pair.unitB.content;
                compressClaims.mutate({ unitIds: [pair.unitA.id, pair.unitB.id], coreContent: core, projectId });
              }}
              disabled={compressClaims.isPending}
            />
            <ActionButton
              icon={<Check className="h-3.5 w-3.5" />}
              label="Keep Both"
              onClick={() => onDismiss(pair.unitA.id, pair.unitB.id)}
            />
            <ActionButton
              icon={<X className="h-3.5 w-3.5" />}
              label="Dismiss"
              onClick={() => onDismiss(pair.unitA.id, pair.unitB.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Custom Filter View ─────────────────────────────────────────────

const UNIT_TYPES = [
  "claim", "question", "evidence", "counterargument", "observation",
  "idea", "definition", "assumption", "action", "interpretation", "example", "decision",
] as const;

const LIFECYCLE_VALUES = [
  "draft", "pending", "confirmed", "deferred", "complete", "archived", "discarded",
] as const;

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "salience", label: "Salience" },
  { value: "relation_count", label: "Relations" },
  { value: "type", label: "Type" },
] as const;

function CustomFilterView({
  projectId,
  onUnitClick,
  viewMode,
}: {
  projectId: string;
  onUnitClick: (id: string) => void;
  viewMode: ViewMode;
}) {
  const [unitType, setUnitType] = React.useState("");
  const [lifecycle, setLifecycle] = React.useState("");
  const [sort, setSort] = React.useState<string>("date");
  const [order, setOrder] = React.useState<string>("desc");

  const { data: results = [], isLoading } = api.view.custom.useQuery(
    {
      projectId,
      filter: {
        ...(unitType ? { unitType } : {}),
        ...(lifecycle ? { lifecycle } : {}),
      },
      sort: sort as "date" | "salience" | "relation_count" | "type",
      order: order as "asc" | "desc",
      limit: 50,
    },
    { enabled: !!projectId },
  );

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-bg-secondary p-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Type</label>
          <select
            value={unitType}
            onChange={(e) => setUnitType(e.target.value)}
            className="rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
          >
            <option value="">All types</option>
            {UNIT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Lifecycle</label>
          <select
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value)}
            className="rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
          >
            <option value="">All</option>
            {LIFECYCLE_VALUES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Sort by</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Order</label>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <ViewResultList
        units={results}
        isLoading={isLoading}
        emptyIcon={SlidersHorizontal}
        emptyMessage="No units match the current filters."
        onUnitClick={onUnitClick}
        viewMode={viewMode}
      />
    </div>
  );
}

// ─── View Result List (generic for view.attention tabs) ─────────────

function ViewResultList({
  units,
  isLoading,
  emptyIcon,
  emptyMessage,
  onUnitClick,
  viewMode = "list",
}: {
  units: Array<{ id: string; content: string; unitType: string; lifecycle: string; importance: number; createdAt: Date | string; modifiedAt: Date | string; relationCount: number }>;
  isLoading: boolean;
  emptyIcon: React.ElementType;
  emptyMessage: string;
  onUnitClick: (id: string) => void;
  viewMode?: ViewMode;
}) {
  if (isLoading) return <LoadingCards />;
  if (units.length === 0) return <EmptyState icon={emptyIcon} message={emptyMessage} />;

  const isGrid = viewMode === "grid";

  return (
    <div className={isGrid ? "grid grid-cols-2 gap-3" : "space-y-3"}>
      {units.map((unit) => (
        <div
          key={unit.id}
          className={cn(
            "rounded-xl border border-border bg-bg-primary hover:shadow-hover transition-shadow",
            isGrid ? "p-3" : "p-4",
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <UnitTypeBadge unitType={unit.unitType as UnitType} />
            <div className={cn("flex items-center gap-2 text-text-tertiary", isGrid ? "text-[10px]" : "text-xs")}>
              {unit.importance > 0 && (
                <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 font-medium text-accent-primary">
                  {Math.round(unit.importance * 100)}%
                </span>
              )}
              {!isGrid && <span>{unit.relationCount} rel</span>}
              <span>{formatDistanceToNow(new Date(unit.modifiedAt), { addSuffix: true })}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUnitClick(unit.id)}
            className="text-left w-full"
          >
            <p className={cn(
              "text-text-primary leading-relaxed hover:text-accent-primary transition-colors",
              isGrid ? "text-xs line-clamp-4" : "text-sm line-clamp-3",
            )}>
              {unit.content}
            </p>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Drift List ──────────────────────────────────────────────────────

function DriftList({
  driftUnits,
  projectId,
  isLoading,
  onUnitClick,
}: {
  driftUnits: Array<{ id: string; content: string; unitType: string; driftScore: number | null }>;
  projectId: string;
  isLoading: boolean;
  onUnitClick: (id: string) => void;
}) {
  const [branchDialogOpen, setBranchDialogOpen] = React.useState(false);
  const [branchUnitIds, setBranchUnitIds] = React.useState<string[]>([]);
  const utils = api.useUtils();

  const resolveDrift = api.feedback.resolveDrift.useMutation({
    onSuccess: (result) => {
      void utils.feedback.getDriftUnits.invalidate({ projectId });
      const labels: Record<string, string> = { keep: "Kept", move: "Moved", branch: "Branched" };
      toast.success(labels[result.action] ?? "Resolved");
    },
    onError: () => toast.error("Failed to resolve drift"),
  });

  if (isLoading) return <LoadingCards />;
  if (driftUnits.length === 0) return <EmptyState icon={AlertTriangle} message="No drifting units detected." />;

  return (
    <div className="space-y-3">
      {driftUnits.length > 1 && (
        <button
          type="button"
          onClick={() => { setBranchUnitIds(driftUnits.map((u) => u.id)); setBranchDialogOpen(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent-warning/50 py-2.5 text-xs font-medium text-accent-warning hover:border-accent-warning hover:bg-accent-warning/5 transition-colors"
        >
          <GitBranch className="h-4 w-4" />
          Branch all {driftUnits.length} drifting units
        </button>
      )}

      {driftUnits.map((unit) => (
        <div
          key={unit.id}
          className="rounded-xl border border-border bg-bg-primary p-4 hover:shadow-hover transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UnitTypeBadge unitType={unit.unitType as UnitType} />
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                (unit.driftScore ?? 0) >= 0.85
                  ? "bg-accent-danger/10 text-accent-danger"
                  : "bg-accent-warning/10 text-accent-warning",
              )}>
                {unit.driftScore != null ? Math.round(unit.driftScore * 100) : "?"}% drift
              </span>
            </div>
          </div>
          <button type="button" onClick={() => onUnitClick(unit.id)} className="text-left w-full mb-3">
            <p className="text-sm text-text-primary leading-relaxed line-clamp-3 hover:text-accent-primary transition-colors">
              {unit.content}
            </p>
          </button>
          <div className="flex items-center gap-2">
            <ActionButton label="Keep" onClick={() => resolveDrift.mutate({ unitId: unit.id, action: "keep" })} disabled={resolveDrift.isPending} />
            <ActionButton label="Move back" onClick={() => resolveDrift.mutate({ unitId: unit.id, action: "move" })} disabled={resolveDrift.isPending} />
            <ActionButton
              icon={<GitBranch className="h-3.5 w-3.5" />}
              label="Branch"
              onClick={() => { setBranchUnitIds([unit.id]); setBranchDialogOpen(true); }}
              disabled={resolveDrift.isPending}
            />
          </div>
        </div>
      ))}

      <BranchProjectDialog
        open={branchDialogOpen}
        onOpenChange={setBranchDialogOpen}
        sourceProjectId={projectId}
        preselectedUnitIds={branchUnitIds}
        onSuccess={() => void utils.feedback.getDriftUnits.invalidate({ projectId })}
      />
    </div>
  );
}
