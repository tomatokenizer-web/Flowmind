"use client";

import * as React from "react";
import { ChevronDown, Map } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

// ─── Color mapping ────────────────────────────────────────────────

const ORIGIN_COLORS: Record<string, { bar: string; badge: string; label: string }> = {
  human: {
    bar: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    label: "Human",
  },
  ai: {
    bar: "bg-purple-500",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    label: "AI",
  },
  import: {
    bar: "bg-green-500",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    label: "Import",
  },
  decomposition: {
    bar: "bg-orange-500",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    label: "Decomposition",
  },
};

// ─── Props ────────────────────────────────────────────────────────

interface SourceMapPanelProps {
  assemblyId: string;
}

// ─── Component ────────────────────────────────────────────────────

export function SourceMapPanel({ assemblyId }: SourceMapPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const { data, isLoading } = api.assembly.getSourceMap.useQuery(
    { assemblyId },
    { enabled: isOpen },
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Map className="h-4 w-4" />
          Source Map
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-3 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-bg-secondary" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-bg-secondary" />
            </div>
          ) : !data || data.totalUnits === 0 ? (
            <p className="text-xs text-text-tertiary">No units in this assembly.</p>
          ) : (
            <>
              {/* Stacked bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-secondary">
                {data.sources.map((src) => {
                  const colors = ORIGIN_COLORS[src.origin];
                  return (
                    <div
                      key={src.origin}
                      title={`${colors?.label ?? src.origin}: ${src.count} units (${src.percentage}%)`}
                      className={cn("h-full transition-all", colors?.bar ?? "bg-gray-400")}
                      style={{ width: `${src.percentage}%` }}
                    />
                  );
                })}
              </div>

              {/* Legend rows */}
              <ul className="space-y-1.5">
                {data.sources.map((src) => {
                  const colors = ORIGIN_COLORS[src.origin];
                  return (
                    <li key={src.origin} className="flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-medium",
                          colors?.badge ?? "bg-bg-secondary text-text-secondary",
                        )}
                      >
                        {colors?.label ?? src.origin}
                      </span>
                      <span className="text-text-tertiary">
                        {src.count} unit{src.count !== 1 ? "s" : ""} &middot; {src.percentage}%
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="text-xs text-text-tertiary">
                Total: {data.totalUnits} unit{data.totalUnits !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
