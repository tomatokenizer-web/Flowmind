"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// ─── Shape metadata ────────────────────────────────────────────────
const SHAPE_META: Record<
  string,
  { label: string; icon: string; color: string; description: string }
> = {
  convergent: {
    label: "Convergent",
    icon: "▼",
    color: "text-blue-400",
    description: "Multiple units point to a single conclusion",
  },
  divergent: {
    label: "Divergent",
    icon: "▲",
    color: "text-green-400",
    description: "One unit generates multiple derived ideas",
  },
  parallel: {
    label: "Parallel",
    icon: "═",
    color: "text-yellow-400",
    description: "Multiple units at same level with shared basis",
  },
  cyclic: {
    label: "Cyclic",
    icon: "↻",
    color: "text-orange-400",
    description: "Directed cycle — iterative refinement or circular reasoning",
  },
  dialectical: {
    label: "Dialectical",
    icon: "⇋",
    color: "text-red-400",
    description: "Unresolved tension between opposing units",
  },
  bridge: {
    label: "Bridge",
    icon: "⌇",
    color: "text-purple-400",
    description: "Key unit connecting otherwise disconnected clusters",
  },
  reframing: {
    label: "Reframing",
    icon: "⟳",
    color: "text-cyan-400",
    description: "Same concept interpreted through a new frame",
  },
  mesh: {
    label: "Mesh",
    icon: "◇",
    color: "text-text-tertiary",
    description: "Densely connected with no dominant pattern — early exploration",
  },
  mixed: {
    label: "Mixed",
    icon: "⊞",
    color: "text-text-secondary",
    description: "Multiple rhetorical patterns coexist",
  },
};

// ─── Props ──────────────────────────────────────────────────────────
interface RhetoricalShapeIndicatorProps {
  projectId: string;
  contextId: string;
  className?: string;
  /** Compact mode: only show the icon + label */
  compact?: boolean;
}

export function RhetoricalShapeIndicator({
  projectId,
  contextId,
  className,
  compact = false,
}: RhetoricalShapeIndicatorProps) {
  const { data, isLoading } = api.graphQuery.rhetoricalShape.useQuery(
    { projectId, contextId },
    { enabled: !!projectId && !!contextId, staleTime: 30_000 },
  );

  if (isLoading || !data) {
    return (
      <div className={cn("animate-pulse rounded bg-bg-secondary h-6 w-24", className)} />
    );
  }

  const dominant = data.dominant;
  const meta = SHAPE_META[dominant.shape] ?? SHAPE_META.mesh!;
  const confidencePct = Math.round(dominant.confidence * 100);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-bg-secondary border border-border cursor-default",
                meta.color,
                className,
              )}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium">{meta.label} ({confidencePct}%)</p>
            <p className="text-xs text-text-secondary mt-1">{meta.description}</p>
            <p className="text-xs text-text-tertiary mt-1">{dominant.details}</p>
            {data.secondary.length > 0 && (
              <div className="mt-2 border-t border-border pt-1">
                <p className="text-xs text-text-tertiary">
                  Also: {data.secondary.map((s) => SHAPE_META[s.shape]?.label ?? s.shape).join(", ")}
                </p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-bg-secondary p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("text-lg", meta.color)}>{meta.icon}</span>
          <div>
            <p className={cn("text-sm font-medium", meta.color)}>
              {meta.label}
            </p>
            <p className="text-xs text-text-tertiary">{meta.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono text-text-secondary">{confidencePct}%</p>
          <p className="text-xs text-text-tertiary">
            {data.unitCount} units · {data.relationCount} relations
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-2 h-1.5 w-full rounded-full bg-bg-primary">
        <div
          className={cn("h-full rounded-full transition-all", {
            "bg-blue-400": dominant.shape === "convergent",
            "bg-green-400": dominant.shape === "divergent",
            "bg-yellow-400": dominant.shape === "parallel",
            "bg-orange-400": dominant.shape === "cyclic",
            "bg-red-400": dominant.shape === "dialectical",
            "bg-purple-400": dominant.shape === "bridge",
            "bg-cyan-400": dominant.shape === "reframing",
            "bg-gray-400": dominant.shape === "mesh" || dominant.shape === "mixed",
          })}
          style={{ width: `${confidencePct}%` }}
        />
      </div>

      {/* Details */}
      <p className="mt-2 text-xs text-text-secondary">{dominant.details}</p>

      {/* Metrics */}
      {Object.keys(dominant.metrics).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(dominant.metrics).map(([key, val]) => (
            <span
              key={key}
              className="rounded bg-bg-primary px-1.5 py-0.5 text-xs font-mono text-text-tertiary"
            >
              {key}: {typeof val === "number" ? val.toFixed(2) : val}
            </span>
          ))}
        </div>
      )}

      {/* Secondary shapes */}
      {data.secondary.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-xs font-medium text-text-tertiary mb-1">
            Secondary patterns
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.secondary.map((s) => {
              const sMeta = SHAPE_META[s.shape] ?? SHAPE_META.mesh!;
              return (
                <span
                  key={s.shape}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-bg-primary",
                    sMeta.color,
                  )}
                >
                  {sMeta.icon} {sMeta.label} ({Math.round(s.confidence * 100)}%)
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
