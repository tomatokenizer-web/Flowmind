"use client";

import * as React from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { toast } from "~/lib/toast";
import { useProjectId } from "~/contexts/project-context";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { BranchProjectDialog } from "~/components/project/BranchProjectDialog";

// ─── Props ────────────────────────────────────────────────────────────

interface AttentionPanelProps {
  projectId: string;
  activeContextId?: string | null;
  collapsed?: boolean;
}

// ─── Main component ───────────────────────────────────────────────────

export function AttentionPanel({
  projectId,
  activeContextId,
  collapsed = false,
}: AttentionPanelProps) {
  const [expanded, setExpanded] = React.useState(false);

  // ─── Data queries ─────────────────────────────────────────────────

  const internalProjectId = useProjectId();
  const effectiveProjectId = projectId ?? internalProjectId;

  const { data: incubationUnits, isLoading: incubationLoading } =
    api.incubation.list.useQuery();

  const { data: contexts } = api.context.list.useQuery(
    { projectId: effectiveProjectId },
    { enabled: !!effectiveProjectId },
  );

  const { data: orphans = [], isLoading: orphansLoading } =
    api.feedback.getOrphanUnits.useQuery(
      { projectId: effectiveProjectId },
      { enabled: !!effectiveProjectId && !!activeContextId },
    );

  const { data: similarData, isLoading: similarLoading } =
    api.feedback.detectSimilarUnits.useQuery(
      { projectId: effectiveProjectId },
      { enabled: !!effectiveProjectId && !!activeContextId },
    );

  const { data: driftUnits = [], isLoading: driftLoading } =
    api.feedback.getDriftUnits.useQuery(
      { projectId: effectiveProjectId, threshold: 0.7 },
      { enabled: !!effectiveProjectId && !!activeContextId },
    );

  // Filter incubation by project
  const filteredIncubation = React.useMemo(() => {
    if (!effectiveProjectId || !incubationUnits) return [];
    return incubationUnits.filter((u) => u.projectId === effectiveProjectId);
  }, [incubationUnits, effectiveProjectId]);

  const [dismissedPairs, setDismissedPairs] = React.useState<Set<string>>(
    new Set(),
  );
  const activeSimilarPairs = (similarData?.pairs ?? []).filter(
    (p) => !dismissedPairs.has(`${p.unitA.id}:${p.unitB.id}`),
  );

  // ─── Total badge count ────────────────────────────────────────────

  const totalCount =
    filteredIncubation.length +
    orphans.length +
    activeSimilarPairs.length +
    driftUnits.length;

  const isAnyLoading =
    incubationLoading || orphansLoading || similarLoading || driftLoading;

  // Render null only when we know everything is empty (not loading)
  if (!isAnyLoading && totalCount === 0) return null;

  // ─── Collapsed mode ───────────────────────────────────────────────

  if (collapsed) {
    if (totalCount === 0) return null;
    return (
      <div className="border-t border-border flex items-center justify-center py-2">
        <div
          className="relative"
          title={`${totalCount} item${totalCount !== 1 ? "s" : ""} need attention`}
        >
          <Bell className="h-5 w-5 text-accent-warning" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-warning text-[10px] font-medium text-white">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        </div>
      </div>
    );
  }

  // ─── Expanded panel ───────────────────────────────────────────────

  return (
    <div className="border-t border-border">
      {/* Panel header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover transition-colors"
      >
        <Bell className="h-3.5 w-3.5 shrink-0 text-accent-warning" />
        <span className="flex-1 text-left font-medium text-text-primary">
          Attention
        </span>
        {totalCount > 0 && (
          <span className="rounded-full bg-accent-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-warning">
            {totalCount}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <ScrollArea className="max-h-[420px]">
              <div className="pb-2">
                {/* Incubating section */}
                {filteredIncubation.length > 0 && (
                  <AttentionSection
                    icon={<Sparkles className="h-3.5 w-3.5 text-accent-secondary" />}
                    label="Incubating"
                    count={filteredIncubation.length}
                  >
                    <IncubationSection
                      units={filteredIncubation}
                      contexts={contexts ?? []}
                      projectId={effectiveProjectId}
                    />
                  </AttentionSection>
                )}

                {/* Orphans section */}
                {orphans.length > 0 && (
                  <AttentionSection
                    icon={<Unlink className="h-3.5 w-3.5 text-text-tertiary" />}
                    label="Orphans"
                    count={orphans.length}
                  >
                    <OrphansSection
                      orphans={orphans}
                      projectId={effectiveProjectId}
                    />
                  </AttentionSection>
                )}

                {/* Similar section */}
                {activeSimilarPairs.length > 0 && (
                  <AttentionSection
                    icon={<Copy className="h-3.5 w-3.5 text-accent-primary" />}
                    label="Similar"
                    count={activeSimilarPairs.length}
                  >
                    <SimilarSection
                      pairs={activeSimilarPairs}
                      projectId={effectiveProjectId}
                      onDismiss={(aId, bId) =>
                        setDismissedPairs(
                          (prev) => new Set([...prev, `${aId}:${bId}`]),
                        )
                      }
                    />
                  </AttentionSection>
                )}

                {/* Drift section */}
                {driftUnits.length > 0 && (
                  <AttentionSection
                    icon={
                      <AlertTriangle className="h-3.5 w-3.5 text-accent-warning" />
                    }
                    label="Drift"
                    count={driftUnits.length}
                  >
                    <DriftSection
                      driftUnits={driftUnits}
                      projectId={effectiveProjectId}
                    />
                  </AttentionSection>
                )}

                {/* Loading placeholder */}
                {isAnyLoading && totalCount === 0 && (
                  <div className="px-3 py-3 space-y-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-8 animate-pulse rounded-lg bg-bg-secondary"
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────

function AttentionSection({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-text-tertiary hover:bg-bg-hover/50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left font-medium uppercase tracking-wide">
          {label}
        </span>
        <span className="rounded-full bg-bg-tertiary px-1.5 py-0.5 text-[10px]">
          {count}
        </span>
        {open ? (
          <ChevronDown className="h-3 w-3 opacity-50" />
        ) : (
          <ChevronRight className="h-3 w-3 opacity-50" />
        )}
      </button>
      {open && <div className="px-3 pb-2">{children}</div>}
    </div>
  );
}

// ─── Incubation section ───────────────────────────────────────────────

type IncubationUnit = {
  id: string;
  content: string;
  unitType:
    | "claim"
    | "question"
    | "evidence"
    | "counterargument"
    | "observation"
    | "idea"
    | "definition"
    | "assumption"
    | "action";
  createdAt: Date;
  projectId: string;
};

function IncubationSection({
  units,
  contexts,
  projectId: _projectId2,
}: {
  units: IncubationUnit[];
  contexts: Array<{ id: string; name: string; parentId: string | null }>;
  projectId: string;
}) {
  const utils = api.useUtils();

  const promoteMutation = api.incubation.promote.useMutation({
    onSuccess: () => {
      void utils.incubation.list.invalidate();
      void utils.context.list.invalidate();
    },
  });

  const snoozeMutation = api.incubation.snooze.useMutation({
    onSuccess: () => void utils.incubation.list.invalidate(),
  });

  const discardMutation = api.incubation.discard.useMutation({
    onSuccess: () => void utils.incubation.list.invalidate(),
  });

  const isActioning =
    promoteMutation.isPending ||
    snoozeMutation.isPending ||
    discardMutation.isPending;

  return (
    <div className="space-y-1.5">
      <AnimatePresence initial={false}>
        {units.map((unit) => {
          const preview =
            unit.content.length > 80
              ? unit.content.slice(0, 80) + "..."
              : unit.content;

          return (
            <motion.div
              key={unit.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className={cn(
                "rounded-lg border border-border bg-bg-primary p-2 text-xs",
                isActioning && "opacity-50 pointer-events-none",
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <UnitTypeBadge unitType={unit.unitType} />
                <span className="text-[10px] text-text-tertiary">
                  {formatDistanceToNow(new Date(unit.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-text-secondary line-clamp-2 mb-2">{preview}</p>
              <div className="flex items-center gap-1">
                <PromotePopover
                  contexts={contexts}
                  onPromote={(ctxId) =>
                    promoteMutation.mutate({ unitId: unit.id, contextId: ctxId })
                  }
                  disabled={isActioning}
                />
                <MiniButton
                  icon={<Clock className="h-3 w-3" />}
                  label="Snooze"
                  onClick={() => snoozeMutation.mutate({ unitId: unit.id })}
                  disabled={isActioning}
                />
                <MiniButton
                  icon={<Trash2 className="h-3 w-3" />}
                  label=""
                  onClick={() => discardMutation.mutate({ unitId: unit.id })}
                  disabled={isActioning}
                  danger
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function PromotePopover({
  contexts,
  onPromote,
  disabled,
}: {
  contexts: Array<{ id: string; name: string; parentId: string | null }>;
  onPromote: (ctxId: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-[10px] px-1.5"
          disabled={disabled}
        >
          <ArrowUpCircle className="h-3 w-3" />
          Promote
          <ChevronDown className="h-2.5 w-2.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-52 p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="text-xs font-medium text-text-secondary mb-1.5 px-1">
          Select Context
        </div>
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {contexts.length === 0 ? (
            <div className="px-2 py-2 text-xs text-text-tertiary text-center">
              No contexts available
            </div>
          ) : (
            contexts.map((ctx) => (
              <button
                key={ctx.id}
                type="button"
                onClick={() => {
                  onPromote(ctx.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-secondary text-left hover:bg-bg-hover hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                <Layers className="h-3 w-3 text-text-tertiary shrink-0" />
                <span className="truncate">{ctx.name}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Orphan section ───────────────────────────────────────────────────

type OrphanUnit = {
  id: string;
  content: string;
  unitType: string;
  createdAt: Date | string;
  isolationScore: number;
};

function OrphansSection({
  orphans,
  projectId,
}: {
  orphans: OrphanUnit[];
  projectId: string;
}) {
  const utils = api.useUtils();

  const recoverOrphan = api.feedback.recoverOrphan.useMutation({
    onSuccess: (result) => {
      void utils.feedback.getOrphanUnits.invalidate({ projectId });
      void utils.incubation.list.invalidate();
      const labels: Record<string, string> = {
        archive: "Archived",
        delete: "Deleted",
        incubate: "Sent to incubation",
        context: "Moved to context",
      };
      toast.success(labels[result.action] ?? "Done", {
        description: "Orphan unit handled.",
      });
    },
    onError: () => toast.error("Action failed"),
  });

  return (
    <ul className="space-y-1.5">
      {orphans.map((unit) => {
        const createdAt =
          typeof unit.createdAt === "string"
            ? new Date(unit.createdAt)
            : unit.createdAt;
        return (
          <li
            key={unit.id}
            className="rounded-lg border border-border bg-bg-elevated p-2 text-xs"
          >
            <p className="mb-1 line-clamp-2 text-text-secondary">
              {unit.content}
            </p>
            <div className="mb-1.5 flex items-center gap-1.5 text-text-tertiary">
              <span className="capitalize">{unit.unitType}</span>
              <span>·</span>
              <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
              {unit.isolationScore >= 1 && (
                <>
                  <span>·</span>
                  <span className="text-accent-warning">fully isolated</span>
                </>
              )}
            </div>
            <div className="flex gap-1">
              <SmallActionButton
                label="Incubate"
                icon={<Sparkles className="h-3 w-3" />}
                disabled={recoverOrphan.isPending}
                onClick={() =>
                  recoverOrphan.mutate({ unitId: unit.id, action: "incubate" })
                }
              />
              <SmallActionButton
                label="Archive"
                icon={<Archive className="h-3 w-3" />}
                disabled={recoverOrphan.isPending}
                onClick={() =>
                  recoverOrphan.mutate({ unitId: unit.id, action: "archive" })
                }
              />
              <SmallActionButton
                label="Delete"
                icon={<Trash2 className="h-3 w-3" />}
                disabled={recoverOrphan.isPending}
                danger
                onClick={() =>
                  recoverOrphan.mutate({ unitId: unit.id, action: "delete" })
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Similar section ──────────────────────────────────────────────────

type SimilarPair = {
  unitA: { id: string; content: string };
  unitB: { id: string; content: string };
  similarity: number;
};

function SimilarSection({
  pairs,
  projectId,
  onDismiss,
}: {
  pairs: SimilarPair[];
  projectId: string;
  onDismiss: (aId: string, bId: string) => void;
}) {
  const utils = api.useUtils();

  const compressClaims = api.feedback.compressClaims.useMutation({
    onSuccess: () => {
      void utils.feedback.detectSimilarUnits.invalidate({ projectId });
      toast.success("Units merged", {
        description: "Similar units compressed into one.",
      });
    },
    onError: () => toast.error("Merge failed"),
  });

  return (
    <ul className="space-y-1.5">
      {pairs.map((pair) => (
        <li
          key={`${pair.unitA.id}:${pair.unitB.id}`}
          className="rounded-lg border border-border bg-bg-elevated p-2 text-xs"
        >
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded-full bg-accent-primary/10 px-1.5 py-0.5 font-medium text-accent-primary">
              {Math.round(pair.similarity * 100)}% similar
            </span>
          </div>
          <p className="mb-1 line-clamp-2 text-text-secondary">
            {pair.unitA.content}
          </p>
          <p className="mb-2 line-clamp-2 text-text-tertiary">
            {pair.unitB.content}
          </p>
          <div className="flex gap-1">
            <SmallActionButton
              label="Merge"
              icon={<GitMerge className="h-3 w-3" />}
              disabled={compressClaims.isPending}
              onClick={() => {
                const coreContent =
                  pair.unitA.content.length <= pair.unitB.content.length
                    ? pair.unitA.content
                    : pair.unitB.content;
                compressClaims.mutate({
                  unitIds: [pair.unitA.id, pair.unitB.id],
                  coreContent,
                  projectId,
                });
              }}
            />
            <SmallActionButton
              label="Keep Both"
              icon={<Check className="h-3 w-3" />}
              disabled={compressClaims.isPending}
              onClick={() => onDismiss(pair.unitA.id, pair.unitB.id)}
            />
            <SmallActionButton
              label="Dismiss"
              icon={<X className="h-3 w-3" />}
              disabled={false}
              onClick={() => onDismiss(pair.unitA.id, pair.unitB.id)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Drift section ────────────────────────────────────────────────────

type DriftUnit = {
  id: string;
  content: string;
  unitType: string;
  driftScore: number | null;
};

function DriftSection({
  driftUnits,
  projectId,
}: {
  driftUnits: DriftUnit[];
  projectId: string;
}) {
  const [branchDialogOpen, setBranchDialogOpen] = React.useState(false);
  const [branchUnitIds, setBranchUnitIds] = React.useState<string[]>([]);
  const utils = api.useUtils();

  const resolveDrift = api.feedback.resolveDrift.useMutation({
    onSuccess: (result) => {
      void utils.feedback.getDriftUnits.invalidate({ projectId });
      const labels: Record<string, string> = {
        keep: "Kept in place",
        move: "Moved",
        branch: "Branched",
      };
      toast.success(labels[result.action] ?? "Resolved", {
        description: "Drift resolved for unit.",
      });
    },
    onError: () => toast.error("Failed to resolve drift"),
  });

  return (
    <div>
      {driftUnits.length > 1 && (
        <button
          type="button"
          onClick={() => {
            setBranchUnitIds(driftUnits.map((u) => u.id));
            setBranchDialogOpen(true);
          }}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-accent-warning/50 py-1.5 text-[10px] font-medium text-accent-warning transition-colors hover:border-accent-warning hover:bg-accent-warning/5"
        >
          <GitBranch className="h-3 w-3" />
          Branch all {driftUnits.length} drifting units
        </button>
      )}
      <ul className="space-y-1.5">
        {driftUnits.map((unit) => (
          <li
            key={unit.id}
            className="rounded-lg border border-border bg-bg-elevated p-2 text-xs"
          >
            <p className="mb-1.5 line-clamp-2 text-text-secondary">
              {unit.content}
            </p>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-medium",
                  unit.driftScore !== null && unit.driftScore >= 0.85
                    ? "bg-accent-danger/10 text-accent-danger"
                    : "bg-accent-warning/10 text-accent-warning",
                )}
              >
                {unit.driftScore !== null
                  ? Math.round(unit.driftScore * 100)
                  : "?"}
                % drift
              </span>
              <span className="text-text-tertiary capitalize">
                {unit.unitType}
              </span>
            </div>
            <div className="flex gap-1">
              <SmallActionButton
                label="Keep"
                disabled={resolveDrift.isPending}
                onClick={() =>
                  resolveDrift.mutate({ unitId: unit.id, action: "keep" })
                }
              />
              <SmallActionButton
                label="Move back"
                disabled={resolveDrift.isPending}
                onClick={() =>
                  resolveDrift.mutate({ unitId: unit.id, action: "move" })
                }
              />
              <SmallActionButton
                label="Branch"
                disabled={resolveDrift.isPending}
                onClick={() => {
                  setBranchUnitIds([unit.id]);
                  setBranchDialogOpen(true);
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <BranchProjectDialog
        open={branchDialogOpen}
        onOpenChange={setBranchDialogOpen}
        sourceProjectId={projectId}
        preselectedUnitIds={branchUnitIds}
        onSuccess={() => {
          void utils.feedback.getDriftUnits.invalidate({ projectId });
        }}
      />
    </div>
  );
}

// ─── Shared mini buttons ──────────────────────────────────────────────

function MiniButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 gap-1 text-[10px] px-1.5",
        danger && "text-status-error hover:text-status-error",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </Button>
  );
}

function SmallActionButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon?: React.ReactNode;
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
        "flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary transition-colors disabled:opacity-40",
        danger
          ? "hover:border-accent-danger hover:text-accent-danger"
          : "hover:border-accent-primary hover:text-accent-primary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
