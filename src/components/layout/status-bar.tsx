"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useUnitSelectionStore } from "@/stores/unit-selection-store";
import { usePipelineStore, type PassStatus } from "@/stores/pipeline-store";
import { useThemeStore } from "@/stores/theme-store";
import { useActiveContext } from "@/hooks/use-active-context";

// ---------------------------------------------------------------------------
// Pipeline progress
// ---------------------------------------------------------------------------

function PipelineProgress() {
  const isProcessing = usePipelineStore((s) => s.isProcessing);
  const currentPass = usePipelineStore((s) => s.currentPass);
  const passProgress = usePipelineStore((s) => s.passProgress);

  if (!isProcessing) return null;

  const completedCount = Object.values(passProgress).filter(
    (s) => s === "complete",
  ).length;

  const statusColor: Record<PassStatus, string> = {
    pending: "bg-[var(--text-tertiary)]/30",
    running: "bg-[var(--accent-primary)]",
    complete: "bg-[var(--accent-success)]",
    error: "bg-[var(--accent-error)]",
  };

  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-primary)]" />
      <span className="text-[var(--text-xs)] text-[var(--text-secondary)]">
        Pipeline pass {currentPass}/7
      </span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 7 }, (_, i) => {
          const status = passProgress[i + 1] ?? "pending";
          return (
            <div
              key={i}
              className={cn(
                "h-1.5 w-3 rounded-full transition-colors duration-[var(--duration-fast)]",
                statusColor[status],
                status === "running" && "animate-pulse",
              )}
              title={`Pass ${i + 1}: ${status}`}
            />
          );
        })}
      </div>
      <span className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
        {completedCount}/7
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

export function StatusBar() {
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const selectedUnitIds = useUnitSelectionStore((s) => s.selectedUnitIds);
  const expertiseLevel = useThemeStore((s) => s.expertiseLevel);
  const { units } = useActiveContext();

  const selectionCount = selectedUnitIds.size;
  const unitCount = units.length;

  const expertiseLabels = {
    novice: "Novice",
    intermediate: "Intermediate",
    expert: "Expert",
  } as const;

  const expertiseColors = {
    novice: "text-[var(--accent-success)]",
    intermediate: "text-[var(--accent-primary)]",
    expert: "text-[var(--accent-warning)]",
  } as const;

  return (
    <footer
      className={cn(
        "flex h-7 items-center justify-between gap-4",
        "border-t border-[var(--border-default)] bg-[var(--bg-secondary)]",
        "px-4",
      )}
      role="status"
      aria-label="Status bar"
    >
      {/* Left: Unit count + selection */}
      <div className="flex items-center gap-3">
        {activeContextId && (
          <span className="text-[var(--text-xs)] text-[var(--text-secondary)]">
            {unitCount} {unitCount === 1 ? "unit" : "units"}
          </span>
        )}
        {selectionCount > 0 && (
          <span className="text-[var(--text-xs)] text-[var(--accent-primary)]">
            {selectionCount} selected
          </span>
        )}
      </div>

      {/* Center: Pipeline progress */}
      <PipelineProgress />

      {/* Right: Expertise level */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[var(--text-xs)] font-medium",
            expertiseColors[expertiseLevel],
          )}
        >
          {expertiseLabels[expertiseLevel]}
        </span>
      </div>
    </footer>
  );
}
