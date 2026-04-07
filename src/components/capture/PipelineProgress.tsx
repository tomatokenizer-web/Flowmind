"use client";

import { cn } from "~/lib/utils";
import { Check, X, Loader2, Minus } from "lucide-react";

interface PassInfo {
  pass: string;
  status: string;
  durationMs: number;
  data?: unknown;
}

interface PipelineProgressProps {
  passes: PassInfo[];
  className?: string;
}

const PASS_LABELS: Record<string, string> = {
  decomposition: "Decompose",
  classification: "Classify",
  enrichment: "Enrich",
  relations: "Relations",
  context_placement: "Place",
  salience: "Score",
  integrity: "Verify",
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Check className="h-3.5 w-3.5 text-green-500" />;
    case "failed":
      return <X className="h-3.5 w-3.5 text-red-500" />;
    case "running":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />;
    case "skipped":
      return <Minus className="h-3.5 w-3.5 text-text-tertiary" />;
    default:
      return <div className="h-3.5 w-3.5 rounded-full border border-border" />;
  }
}

export function PipelineProgress({ passes, className }: PipelineProgressProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {passes.map((p) => (
        <div
          key={p.pass}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm",
            p.status === "running" && "bg-accent-primary/5",
            p.status === "failed" && "bg-red-500/5",
          )}
        >
          <StatusIcon status={p.status} />
          <span
            className={cn(
              "flex-1 font-medium",
              p.status === "completed" && "text-text-primary",
              p.status === "failed" && "text-red-500",
              p.status === "running" && "text-accent-primary",
              p.status === "skipped" && "text-text-tertiary",
              p.status === "pending" && "text-text-tertiary/60",
            )}
          >
            {PASS_LABELS[p.pass] ?? p.pass}
          </span>
          {p.durationMs > 0 && (
            <span className="text-xs tabular-nums text-text-tertiary">
              {p.durationMs < 1000
                ? `${p.durationMs}ms`
                : `${(p.durationMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
