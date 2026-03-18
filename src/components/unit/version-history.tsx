"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VersionDiffView } from "./version-diff";
import { useVersionHistory } from "~/hooks/use-version-history";

// ─── Types ──────────────────────────────────────────────────────────

interface VersionHistoryProps {
  unitId: string;
  currentContent: string;
  className?: string;
}

// ─── Relative Date ──────────────────────────────────────────────────

function relativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Component ──────────────────────────────────────────────────────

export function VersionHistory({
  unitId,
  currentContent,
  className,
}: VersionHistoryProps) {
  const { versions, isLoading, expandedVersion, toggleExpanded, restore, isRestoring } =
    useVersionHistory(unitId);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-[--bg-secondary] h-14"
          />
        ))}
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-4 py-16 text-center",
          className,
        )}
      >
        <History
          className="h-12 w-12 text-[--text-tertiary]"
          aria-hidden="true"
        />
        <h3 className="text-[--text-secondary] font-medium">
          No version history
        </h3>
        <p className="text-sm text-[--text-tertiary] max-w-[240px]">
          Versions are created automatically when you edit this unit.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)} role="list" aria-label="Version history">
      {versions.map((version) => {
        const isExpanded = expandedVersion === version.id;

        return (
          <div key={version.id} role="listitem">
            {/* Version row */}
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                "transition-colors duration-fast",
                "hover:bg-[--bg-hover] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--border-focus] focus-visible:ring-offset-2",
                "motion-reduce:transition-none",
                isExpanded && "bg-[--bg-secondary]",
              )}
              onClick={() => toggleExpanded(version.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpanded(version.id);
                }
              }}
              aria-expanded={isExpanded}
              aria-label={`Version ${version.version}, ${relativeDate(version.createdAt)}`}
            >
              {/* Timeline dot */}
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border-2 border-[--accent-primary]",
                    version.version === versions[0]?.version
                      ? "bg-[--accent-primary]"
                      : "bg-white",
                  )}
                />
              </div>

              {/* Version info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[--text-primary]">
                    v{version.version}
                  </span>
                  <span className="text-xs text-[--text-tertiary]">
                    {relativeDate(version.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {version.diffSummary && (
                    <span className="text-xs text-[--text-secondary]">
                      {version.diffSummary}
                    </span>
                  )}
                  {version.changeReason &&
                    version.changeReason !== "auto-version before edit" && (
                      <span className="text-xs text-[--text-tertiary] italic truncate">
                        {version.changeReason}
                      </span>
                    )}
                </div>
              </div>

              {/* Expand chevron */}
              {isExpanded ? (
                <ChevronUp
                  className="h-4 w-4 text-[--text-tertiary] shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className="h-4 w-4 text-[--text-tertiary] shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* Expanded diff view */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pl-8 pr-3 pb-3">
                    <VersionDiffView
                      versionContent={version.content}
                      currentContent={currentContent}
                      onRestore={() => restore(version.version)}
                      isRestoring={isRestoring}
                      versionNumber={version.version}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
