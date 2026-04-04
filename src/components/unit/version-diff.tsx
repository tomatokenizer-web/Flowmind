"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { RotateCcw } from "lucide-react";
import { computeLineDiff } from "@/server/services/versionService";

// ─── Types ──────────────────────────────────────────────────────────

interface VersionDiffViewProps {
  versionContent: string;
  currentContent: string;
  onRestore?: () => void;
  isRestoring?: boolean;
  versionNumber: number;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function VersionDiffView({
  versionContent,
  currentContent,
  onRestore,
  isRestoring = false,
  versionNumber,
  className,
}: VersionDiffViewProps) {
  const diffLines = React.useMemo(
    () => computeLineDiff(versionContent, currentContent),
    [versionContent, currentContent],
  );

  const hasChanges = diffLines.some((line) => line.type !== "unchanged");

  return (
    <div className={cn("space-y-3", className)}>
      {/* Diff display */}
      <div
        className="rounded-lg border border-[--border-default] bg-[--bg-surface] overflow-hidden"
        role="region"
        aria-label={`Changes from version ${versionNumber} to current`}
      >
        <div className="divide-y divide-[--border-default]">
          {diffLines.length > 0 ? (
            <div className="font-mono text-xs leading-relaxed">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-3 py-0.5 flex",
                    line.type === "added" &&
                      "bg-[--accent-success]/10 text-[--accent-success]",
                    line.type === "removed" &&
                      "bg-[--accent-error]/10 text-[--accent-error] line-through",
                    line.type === "unchanged" && "text-[--text-secondary]",
                  )}
                >
                  <span
                    className="select-none w-5 shrink-0 text-[--text-tertiary] text-right mr-2"
                    aria-hidden="true"
                  >
                    {line.type === "added"
                      ? "+"
                      : line.type === "removed"
                        ? "−"
                        : " "}
                  </span>
                  <span className="whitespace-pre-wrap break-words min-w-0">
                    {line.text || "\u00A0"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-[--text-tertiary]">
              No content to compare
            </div>
          )}
        </div>
      </div>

      {/* Summary + Restore */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[--text-tertiary]">
          {hasChanges
            ? `Comparing v${versionNumber} → current`
            : "No differences"}
        </span>

        {onRestore && hasChanges && (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5",
              "text-xs font-medium transition-colors duration-fast",
              "text-[--accent-primary] hover:bg-[--accent-primary]/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--border-focus] focus-visible:ring-offset-2",
              "motion-reduce:transition-none",
              "disabled:opacity-50 disabled:pointer-events-none",
              "min-h-[32px]",
            )}
            onClick={onRestore}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRestore();
              }
            }}
            disabled={isRestoring}
            aria-label={`Restore version ${versionNumber}`}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {isRestoring ? "Restoring…" : `Restore v${versionNumber}`}
          </button>
        )}
      </div>
    </div>
  );
}
