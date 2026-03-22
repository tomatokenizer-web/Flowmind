"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Loader2, ArrowRight } from "lucide-react";
import { api } from "~/trpc/react";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useProjectId } from "~/contexts/project-context";
import { cn } from "~/lib/utils";

interface BranchPotentialPopoverProps {
  unitId: string;
  /** Render prop: called with the computed score (0-4) and reasons */
  children: (score: number, reasons: string[]) => React.ReactNode;
}

// ─── Dots indicator ─────────────────────────────────────────────────

export function BranchPotentialDots({
  score,
  reasons,
}: {
  score: number;
  reasons?: string[];
}) {
  const title =
    reasons && reasons.length > 0
      ? `Branch potential: ${score}/4\n${reasons.join("\n")}`
      : `Branch potential: ${score} of 4`;

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Branch potential: ${score} of 4`}
      title={title}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "text-xs leading-none",
            i < score ? "text-text-primary" : "text-text-tertiary",
          )}
          aria-hidden="true"
        >
          {i < score ? "●" : "○"}
        </span>
      ))}
    </span>
  );
}

// ─── Popover ─────────────────────────────────────────────────────────

export function BranchPotentialPopover({ unitId, children }: BranchPotentialPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const projectId = useProjectId();
  const utils = api.useUtils();

  // Fetch branch potential score eagerly on mount so the dots are live
  const { data: branchData } = api.ai.computeBranchPotential.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  const computedScore = branchData?.score ?? 0;
  const reasons = branchData?.reasons ?? [];

  // Fetch exploration directions only when popover is open (AI call)
  const { data: directionsData, isLoading: isDirectionsLoading } =
    api.ai.suggestExplorationDirections.useQuery(
      { unitId, contextId: activeContextId ?? undefined },
      { enabled: open },
    );

  const createUnit = api.capture.submit.useMutation({
    onSuccess: () => { void utils.unit.list.invalidate(); setOpen(false); },
  });

  const createRelation = api.relation.create.useMutation();

  const handleExplore = async (direction: { prompt: string; expectedType: string }) => {
    if (!projectId) return;
    try {
      const newUnit = await createUnit.mutateAsync({
        content: direction.prompt,
        projectId,
        mode: "capture",
      });
      if (newUnit?.id && activeContextId) {
        void createRelation.mutate({
          sourceUnitId: unitId,
          targetUnitId: newUnit.id,
          type: "inspires",
          strength: 0.7,
          direction: "one_way",
          purpose: ["exploration"],
        });
      }
    } catch (e) {
      console.error("Failed to create exploration unit", e);
    }
  };

  const directions =
    (directionsData as { directions?: { prompt: string; expectedType: string }[] } | undefined)
      ?.directions ?? [];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {/* Render prop gives caller access to live score + reasons */}
        {children(computedScore, reasons) as React.ReactElement}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-xl border border-border bg-bg-surface p-4 shadow-lg"
          sideOffset={6}
        >
          {/* Score summary */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">Branch Potential</p>
            <BranchPotentialDots score={computedScore} />
          </div>

          {/* Reasons */}
          {reasons.length > 0 && (
            <ul className="mb-3 space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0 text-accent-primary">+1</span>
                  {r}
                </li>
              ))}
            </ul>
          )}

          <p className="mb-3 text-sm font-medium text-text-primary border-t border-border pt-3">
            Exploration Directions
          </p>
          {isDirectionsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
            </div>
          ) : directions.length > 0 ? (
            <div className="space-y-2">
              {directions.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void handleExplore(d)}
                  className="flex w-full items-start gap-2 rounded-lg border border-border p-3 text-left hover:bg-bg-hover transition-colors"
                >
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
                  <div>
                    <p className="text-xs font-medium capitalize text-accent-primary">{d.expectedType}</p>
                    <p className="text-sm text-text-primary">{d.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">Click to get AI exploration suggestions.</p>
          )}
          <Popover.Arrow className="fill-bg-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
