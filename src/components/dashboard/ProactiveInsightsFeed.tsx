"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Loader2, Zap, Check, X, Clock, ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";

interface ProactiveInsightsFeedProps {
  onNavigateToUnit?: (unitId: string) => void;
}

const KIND_LABELS: Record<string, { label: string; color: string }> = {
  reframe: { label: "Reframe", color: "text-purple-400" },
  counter: { label: "Counter", color: "text-red-400" },
  maturation: { label: "Maturation", color: "text-blue-400" },
  rule_action: { label: "Rule Action", color: "text-amber-400" },
  import_merge: { label: "Merge", color: "text-green-400" },
  compounding: { label: "Compounding", color: "text-cyan-400" },
  type_suggest: { label: "Type", color: "text-zinc-400" },
  relation_suggest: { label: "Relation", color: "text-orange-400" },
};

export function ProactiveInsightsFeed({ onNavigateToUnit }: ProactiveInsightsFeedProps) {
  const [showResolved, setShowResolved] = React.useState(false);
  const utils = api.useUtils();

  const pendingQuery = api.proposal.list.useQuery(
    { status: "pending", limit: 20 },
  );

  const budgetQuery = api.proactive.getBudgetStatus.useQuery({});

  const resolveMutation = api.proposal.resolve.useMutation({
    onSuccess: () => {
      void utils.proposal.list.invalidate();
      void utils.proposal.countPending.invalidate();
      void utils.proactive.getBudgetStatus.invalidate();
    },
  });

  if (pendingQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const proposals = pendingQuery.data?.items ?? [];
  const budget = budgetQuery.data;

  return (
    <div className="space-y-4">
      {/* Header + Budget */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Proactive Insights</h2>
          {proposals.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              {proposals.length} pending
            </span>
          )}
        </div>
        {budget && (
          <div className="text-xs text-text-secondary">
            Budget: {budget.budgetRemaining}/{budget.budgetTotal} remaining
          </div>
        )}
      </div>

      {/* Proposals */}
      {proposals.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No pending insights. Check back later!
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map((proposal) => {
            const kindConfig = KIND_LABELS[proposal.kind] ?? { label: proposal.kind, color: "text-text-secondary" };
            const payload = proposal.payload as Record<string, unknown> | null;

            return (
              <div
                key={proposal.id}
                className="p-3 border border-border rounded bg-bg-secondary"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs font-medium", kindConfig.color)}>
                        {kindConfig.label}
                      </span>
                      {proposal.targetUnitId && (
                        <button
                          onClick={() => onNavigateToUnit?.(proposal.targetUnitId!)}
                          className="text-xs text-accent hover:underline"
                        >
                          View unit
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-text-primary">
                      {proposal.rationale ?? (typeof payload?.suggestion === "string" ? payload.suggestion : null) ?? "AI-generated insight"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resolveMutation.mutate({ id: proposal.id, status: "accepted" })}
                      disabled={resolveMutation.isPending}
                      className="h-7 w-7 p-0 text-green-500 hover:bg-green-500/10"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resolveMutation.mutate({ id: proposal.id, status: "rejected" })}
                      disabled={resolveMutation.isPending}
                      className="h-7 w-7 p-0 text-red-400 hover:bg-red-400/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
