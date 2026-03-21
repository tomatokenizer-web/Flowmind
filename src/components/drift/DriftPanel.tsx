"use client";

import * as React from "react";
import { AlertTriangle, ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { toast } from "~/lib/toast";
import { BranchProjectDialog } from "~/components/project/BranchProjectDialog";

interface DriftPanelProps {
  projectId: string;
  collapsed?: boolean;
}

export function DriftPanel({ projectId, collapsed = false }: DriftPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = React.useState(false);
  const [branchUnitIds, setBranchUnitIds] = React.useState<string[]>([]);
  const utils = api.useUtils();

  const { data: driftUnits = [], isLoading } = api.feedback.getDriftUnits.useQuery(
    { projectId, threshold: 0.7 },
    { enabled: !!projectId },
  );

  const resolveDrift = api.feedback.resolveDrift.useMutation({
    onSuccess: (result) => {
      void utils.feedback.getDriftUnits.invalidate({ projectId });
      const labels: Record<string, string> = { keep: "Kept in place", move: "Moved", branch: "Branched" };
      toast.success(labels[result.action] ?? "Resolved", { description: "Drift resolved for unit." });
    },
    onError: () => {
      toast.error("Failed to resolve drift");
    },
  });

  const driftCount = driftUnits.length;

  if (collapsed) {
    if (driftCount === 0) return null;
    return (
      <div className="border-t border-border flex items-center justify-center py-2">
        <div className="relative" title={`${driftCount} drifting unit${driftCount !== 1 ? "s" : ""}`}>
          <AlertTriangle className="h-5 w-5 text-accent-warning" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-warning text-[10px] font-medium text-white">
            {driftCount > 9 ? "9+" : driftCount}
          </span>
        </div>
      </div>
    );
  }

  // Expanded mode
  if (driftCount === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="border-t border-border">
      {/* Header row — collapsible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-accent-warning hover:bg-bg-hover transition-colors"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left font-medium">
          {isLoading ? "Checking drift…" : `${driftCount} drifting unit${driftCount !== 1 ? "s" : ""}`}
        </span>
        {driftCount > 0 && (
          open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </button>

      {/* Expanded list */}
      {open && driftCount > 0 && (
        <div className="px-3 pb-3">
          {/* Branch all drifting units at once */}
          <button
            type="button"
            onClick={() => {
              setBranchUnitIds(driftUnits.map((u) => u.id));
              setBranchDialogOpen(true);
            }}
            className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-accent-warning/50 py-1.5 text-[10px] font-medium text-accent-warning transition-colors hover:border-accent-warning hover:bg-accent-warning/5"
          >
            <GitBranch className="h-3 w-3" />
            Branch all {driftCount} drifting units to new project
          </button>
          <ul className="space-y-1">
            {driftUnits.map((unit) => (
              <li key={unit.id} className="rounded-lg border border-border bg-bg-elevated p-2 text-xs">
                {/* Content preview */}
                <p className="mb-1.5 line-clamp-2 text-text-secondary">
                  {unit.content}
                </p>

                {/* Drift score pill */}
                <div className="mb-2 flex items-center gap-1.5">
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 font-medium",
                    unit.driftScore !== null && unit.driftScore >= 0.85
                      ? "bg-accent-danger/10 text-accent-danger"
                      : "bg-accent-warning/10 text-accent-warning",
                  )}>
                    {unit.driftScore !== null ? Math.round(unit.driftScore * 100) : "?"}% drift
                  </span>
                  <span className="text-text-tertiary capitalize">{unit.unitType}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <ActionButton
                    label="Keep"
                    disabled={resolveDrift.isPending}
                    onClick={() => resolveDrift.mutate({ unitId: unit.id, action: "keep" })}
                  />
                  <ActionButton
                    label="Move back"
                    disabled={resolveDrift.isPending}
                    onClick={() => resolveDrift.mutate({ unitId: unit.id, action: "move" })}
                  />
                  <ActionButton
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
        </div>
      )}

      {/* Branch Project Dialog */}
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

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary transition-colors hover:border-accent-warning hover:text-accent-warning disabled:opacity-40"
    >
      {label}
    </button>
  );
}
