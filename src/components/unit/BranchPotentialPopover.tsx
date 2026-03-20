"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Loader2, ArrowRight } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useProjectId } from "~/contexts/project-context";

interface BranchPotentialPopoverProps {
  unitId: string;
  score: number;
  children: React.ReactNode;
}

export function BranchPotentialPopover({ unitId, score, children }: BranchPotentialPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const projectId = useProjectId();
  const utils = api.useUtils();

  const { data, isLoading } = api.ai.suggestExplorationDirections?.useQuery?.(
    { unitId, contextId: activeContextId! },
    { enabled: open && !!activeContextId },
  ) ?? { data: null, isLoading: false };

  const createUnit = api.capture.submit.useMutation({
    onSuccess: () => { void utils.unit.list.invalidate(); setOpen(false); },
  });

  const createRelation = api.relation.create.useMutation();

  const handleExplore = async (direction: { prompt: string; expectedType: string }) => {
    if (!projectId) return;
    const newUnit = await createUnit.mutateAsync({
      content: direction.prompt,
      projectId,
      mode: "capture",
    });
    if (newUnit?.id) {
      void createRelation.mutate({
        sourceUnitId: unitId,
        targetUnitId: newUnit.id,
        type: "inspires",
        strength: 0.7,
        direction: "one_way",
        purpose: ["exploration"],
      });
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-xl border border-border bg-bg-surface p-4 shadow-lg"
          sideOffset={6}
        >
          <p className="mb-3 text-sm font-medium text-text-primary">
            Exploration Directions
          </p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
            </div>
          ) : data?.directions?.length ? (
            <div className="space-y-2">
              {data.directions.map((d: { prompt: string; expectedType: string }, i: number) => (
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
            <p className="text-sm text-text-tertiary">No exploration directions yet for this unit.</p>
          )}
          <Popover.Arrow className="fill-bg-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
