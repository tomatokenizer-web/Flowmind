"use client";

import * as React from "react";
import { Sparkles, CheckCircle2, FileQuestion, Quote, Lightbulb, FlaskConical, Scale, Target, BookOpen, Flag, Eye, Puzzle, HelpCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

// ─── Compounding Candidate Review Panel ────────────────────────────
//
// Surfaces the output of `assembly.extractCompoundingCandidates`
// per DEC-2026-002 §19: after an assembly is exported, scan the
// rendered artifact for candidate Units that don't yet exist in the
// graph. Users can preview candidates and promote them into
// `kind='compounding'` proposals with a single click.

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  claim: Quote,
  question: FileQuestion,
  evidence: FlaskConical,
  counterargument: Scale,
  observation: Eye,
  idea: Lightbulb,
  definition: BookOpen,
  assumption: HelpCircle,
  action: Target,
  interpretation: Puzzle,
  example: Sparkles,
  decision: Flag,
};

interface CompoundingPanelProps {
  assemblyId: string;
  /** Called after the user promotes the candidates to proposals. */
  onPromoted?: (count: number) => void;
}

export function CompoundingPanel({ assemblyId, onPromoted }: CompoundingPanelProps) {
  const [enabled, setEnabled] = React.useState(false);
  const [promotedCount, setPromotedCount] = React.useState<number | null>(null);

  const { data, isLoading } = api.assembly.extractCompoundingCandidates.useQuery(
    { assemblyId, format: "markdown" },
    { enabled },
  );

  const utils = api.useUtils();
  const promoteMutation = api.assembly.compoundFromExport.useMutation({
    onSuccess: (result) => {
      setPromotedCount(result.proposalsCreated);
      void utils.proposal.list.invalidate();
      void utils.proposal.countPending.invalidate();
      void utils.proactive.getBudgetStatus.invalidate();
      onPromoted?.(result.proposalsCreated);
    },
  });

  const candidates = data?.candidates ?? [];

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg-primary p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent-primary" />
              <p className="text-sm font-medium text-text-primary">
                Compound knowledge
              </p>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              Scan this export for new candidate units you could promote back into your graph.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEnabled(true)}>
            Scan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-primary p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-accent-primary" />
          <p className="text-sm font-medium text-text-primary">
            Compounding candidates
          </p>
        </div>
        {candidates.length > 0 && promotedCount === null && (
          <Button
            size="sm"
            disabled={promoteMutation.isPending}
            onClick={() =>
              promoteMutation.mutate({ assemblyId, format: "markdown" })
            }
          >
            {promoteMutation.isPending
              ? "Promoting..."
              : `Promote ${candidates.length}`}
          </Button>
        )}
        {promotedCount !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {promotedCount} promoted
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-bg-secondary"
            />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-xs text-text-tertiary">
          No new candidates found — everything in this export is already in your graph.
        </p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {candidates.map((c, idx) => {
            const Icon = TYPE_ICONS[c.suggestedType] ?? Sparkles;
            const confidencePct = Math.round(c.confidence * 100);
            return (
              <li
                key={`${c.sourcePosition.start}-${idx}`}
                className="rounded-lg border border-border bg-bg-surface px-2.5 py-2"
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-text-tertiary" />
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      "border-accent-primary/30 bg-accent-primary/10 text-accent-primary",
                    )}
                  >
                    {c.suggestedType}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {confidencePct}%
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-text-secondary">
                  {c.suggestedContent}
                </p>
                <p className="mt-0.5 text-[10px] italic text-text-tertiary">
                  {c.extractionReason}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
