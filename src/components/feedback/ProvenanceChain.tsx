"use client";

import * as React from "react";
import { GitCommitHorizontal, ArrowUp, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { EmptyState } from "~/components/shared/empty-state";

interface ProvenanceChainProps {
  unitId: string;
  onNavigate?: (unitId: string) => void;
}

export function ProvenanceChain({ unitId, onNavigate }: ProvenanceChainProps) {
  const { data, isLoading } = api.feedback.getProvenance.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const chain = data?.chain ?? [];

  if (chain.length === 0) {
    return (
      <EmptyState
        icon={GitCommitHorizontal}
        headline="No provenance found"
        description="This unit has no tracked derivation history."
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-1 py-2">
      <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider px-1">
        Derivation history
      </p>
      {chain.map((node, idx) => (
        <div key={node.id} className="relative flex gap-2">
          {/* Vertical connector line */}
          {idx < chain.length - 1 && (
            <div className="absolute left-[15px] top-6 bottom-0 w-px bg-border" />
          )}

          {/* Node icon */}
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg-secondary">
            <ArrowUp className="h-3 w-3 text-text-tertiary" />
          </div>

          {/* Node content */}
          <button
            type="button"
            onClick={() => onNavigate?.(node.id)}
            className={cn(
              "mb-2 flex-1 rounded-lg border border-border bg-bg-primary p-2 text-left text-xs",
              "transition-colors hover:border-accent-primary hover:bg-bg-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <UnitTypeBadge unitType={node.unitType as never} />
              <span className="text-[10px] text-text-tertiary capitalize">
                {node.relation.replace(/_/g, " ")}
              </span>
              <span className="ml-auto text-[10px] text-text-tertiary">
                depth {node.depth}
              </span>
            </div>
            <p className="line-clamp-2 text-text-secondary">{node.content}</p>
          </button>
        </div>
      ))}
    </div>
  );
}
