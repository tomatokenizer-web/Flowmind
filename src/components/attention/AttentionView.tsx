"use client";

import * as React from "react";
import {
  Sparkles,
  Unlink,
  Copy,
  AlertTriangle,
  ArrowUpCircle,
  Clock,
  Trash2,
  Archive,
  GitMerge,
  Check,
  X,
  GitBranch,
  Layers,
  ChevronDown,
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

// ─── Props ───────────────────────────────────────────────────────────

interface AttentionViewProps {
  projectId: string;
}

// ─── Tab type ────────────────────────────────────────────────────────

type AttentionTab = "incubating" | "orphans" | "similar" | "drift";

// ─── Main Component ─────────────────────────────────────────────────

export function AttentionView({ projectId }: AttentionViewProps) {
  const [activeTab, setActiveTab] = React.useState<AttentionTab>("incubating");
  const openPanel = usePanelStore((s) => s.openPanel);

  const { data: incubationUnits = [], isLoading: incLoading } =
    api.incubation.list.useQuery();

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

  const filteredIncubation = React.useMemo(
    () => incubationUnits.filter((u) => u.projectId === projectId),
    [incubationUnits, projectId],
  );

  const [dismissedPairs, setDismissedPairs] = React.useState<Set<string>>(new Set());
  const activeSimilarPairs = (similarData?.pairs ?? []).filter(
    (p) => !dismissedPairs.has(`${p.unitA.id}:${p.unitB.id}`),
  );

  const tabs: Array<{ key: AttentionTab; label: string; count: number; icon: React.ReactNode; loading: boolean }> = [
    { key: "incubating", label: "Incubating", count: filteredIncubation.length, icon: <Sparkles className="h-4 w-4" />, loading: incLoading },
    { key: "orphans", label: "Orphans", count: orphans.length, icon: <Unlink className="h-4 w-4" />, loading: orphLoading },
    { key: "similar", label: "Similar", count: activeSimilarPairs.length, icon: <Copy className="h-4 w-4" />, loading: simLoading },
    { key: "drift", label: "Drift", count: driftUnits.length, icon: <AlertTriangle className="h-4 w-4" />, loading: driftLoading },
  ];

  const { data: contexts = [] } = api.context.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  return (
    <section aria-label="Attention view" className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary mb-3">Attention Required</h1>

        {/* Tab bar */}
        <div className="flex gap-1">
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
          {activeTab === "incubating" && (
            <IncubatingList
              units={filteredIncubation}
              contexts={contexts}
              projectId={projectId}
              isLoading={incLoading}
              onUnitClick={openPanel}
            />
          )}
          {activeTab === "orphans" && (
            <OrphanList
              orphans={orphans}
              projectId={projectId}
              isLoading={orphLoading}
              onUnitClick={openPanel}
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
        </div>
      </div>
    </section>
  );
}

// ─── Empty / Loading states ──────────────────────────────────────────

function LoadingCards() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-secondary" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Icon className="h-10 w-10 text-text-tertiary" />
      <p className="text-sm text-text-tertiary">{message}</p>
    </div>
  );
}

// ─── Incubating List ─────────────────────────────────────────────────

function IncubatingList({
  units,
  contexts,
  projectId,
  isLoading,
  onUnitClick,
}: {
  units: Array<{ id: string; content: string; unitType: string; createdAt: Date; projectId: string }>;
  contexts: Array<{ id: string; name: string; parentId: string | null }>;
  projectId: string;
  isLoading: boolean;
  onUnitClick: (id: string) => void;
}) {
  const utils = api.useUtils();
  const promoteMutation = api.incubation.promote.useMutation({
    onSuccess: () => {
      void utils.incubation.list.invalidate();
      void utils.context.list.invalidate({ projectId });
      toast.success("Unit promoted to context");
    },
  });
  const snoozeMutation = api.incubation.snooze.useMutation({
    onSuccess: () => {
      void utils.incubation.list.invalidate();
      toast.success("Unit snoozed");
    },
  });
  const discardMutation = api.incubation.discard.useMutation({
    onSuccess: () => {
      void utils.incubation.list.invalidate();
      toast.success("Unit discarded");
    },
  });

  const isActioning = promoteMutation.isPending || snoozeMutation.isPending || discardMutation.isPending;

  if (isLoading) return <LoadingCards />;
  if (units.length === 0) return <EmptyState icon={Sparkles} message="No incubating units. New ideas will appear here." />;

  return (
    <AnimatePresence initial={false}>
      {units.map((unit) => (
        <motion.div
          key={unit.id}
          layout
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className={cn(
            "rounded-xl border border-border bg-bg-primary p-4 transition-shadow hover:shadow-hover",
            isActioning && "opacity-50 pointer-events-none",
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <UnitTypeBadge unitType={unit.unitType as UnitType} />
            <span className="text-xs text-text-tertiary">
              {formatDistanceToNow(new Date(unit.createdAt), { addSuffix: true })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUnitClick(unit.id)}
            className="text-left w-full mb-3"
          >
            <p className="text-sm text-text-primary leading-relaxed line-clamp-3 hover:text-accent-primary transition-colors">
              {unit.content}
            </p>
          </button>
          <div className="flex items-center gap-2">
            <ContextPicker
              contexts={contexts}
              onSelect={(ctxId) => promoteMutation.mutate({ unitId: unit.id, contextId: ctxId })}
              disabled={isActioning}
            />
            <ActionButton
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Snooze"
              onClick={() => snoozeMutation.mutate({ unitId: unit.id })}
              disabled={isActioning}
            />
            <ActionButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Discard"
              onClick={() => discardMutation.mutate({ unitId: unit.id })}
              disabled={isActioning}
              danger
            />
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// ─── Context Picker ──────────────────────────────────────────────────

function ContextPicker({
  contexts,
  onSelect,
  disabled,
}: {
  contexts: Array<{ id: string; name: string }>;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-3 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors disabled:opacity-40"
      >
        <ArrowUpCircle className="h-3.5 w-3.5" />
        Promote
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-52 rounded-lg border border-border bg-bg-surface p-1.5 shadow-lg">
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
            Select Context
          </p>
          <div className="max-h-48 overflow-y-auto">
            {contexts.length === 0 ? (
              <p className="px-2 py-3 text-xs text-text-tertiary text-center">No contexts</p>
            ) : (
              contexts.map((ctx) => (
                <button
                  key={ctx.id}
                  type="button"
                  onClick={() => { onSelect(ctx.id); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                >
                  <Layers className="h-3 w-3 text-text-tertiary shrink-0" />
                  <span className="truncate">{ctx.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Orphan List ─────────────────────────────────────────────────────

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

  if (isLoading) return <LoadingCards />;
  if (orphans.length === 0) return <EmptyState icon={Unlink} message="No orphan units. All units are connected." />;

  return (
    <div className="space-y-3">
      {orphans.map((unit) => {
        const createdAt = typeof unit.createdAt === "string" ? new Date(unit.createdAt) : unit.createdAt;
        return (
          <div
            key={unit.id}
            className="rounded-xl border border-border bg-bg-primary p-4 hover:shadow-hover transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UnitTypeBadge unitType={unit.unitType as UnitType} />
                {unit.isolationScore >= 1 && (
                  <span className="rounded-full bg-accent-warning/10 px-2 py-0.5 text-[10px] font-medium text-accent-warning">
                    fully isolated
                  </span>
                )}
              </div>
              <span className="text-xs text-text-tertiary">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUnitClick(unit.id)}
              className="text-left w-full mb-3"
            >
              <p className="text-sm text-text-primary leading-relaxed line-clamp-3 hover:text-accent-primary transition-colors">
                {unit.content}
              </p>
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <ContextPicker
                contexts={contexts}
                onSelect={(ctxId) => recoverOrphan.mutate({ unitId: unit.id, action: "context", contextId: ctxId })}
                disabled={recoverOrphan.isPending || createContext.isPending}
              />
              <ActionButton
                icon={<Layers className="h-3.5 w-3.5" />}
                label="New Context"
                onClick={() => handleCreateContextForOrphan(unit.id, unit.content)}
                disabled={recoverOrphan.isPending || createContext.isPending}
              />
              <ActionButton
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="Incubate"
                onClick={() => recoverOrphan.mutate({ unitId: unit.id, action: "incubate" })}
                disabled={recoverOrphan.isPending}
              />
              <ActionButton
                icon={<Archive className="h-3.5 w-3.5" />}
                label="Archive"
                onClick={() => recoverOrphan.mutate({ unitId: unit.id, action: "archive" })}
                disabled={recoverOrphan.isPending}
              />
              <ActionButton
                icon={<Trash2 className="h-3.5 w-3.5" />}
                label="Delete"
                onClick={() => recoverOrphan.mutate({ unitId: unit.id, action: "delete" })}
                disabled={recoverOrphan.isPending}
                danger
              />
            </div>
          </div>
        );
      })}
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

// ─── Shared Action Button ────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40",
        danger
          ? "border-border text-text-secondary hover:border-accent-danger hover:text-accent-danger"
          : "border-border text-text-secondary hover:border-accent-primary hover:text-accent-primary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
