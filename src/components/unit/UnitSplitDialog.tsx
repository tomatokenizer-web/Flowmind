"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { Loader2, Scissors, ArrowRight } from "lucide-react";
import type { SplitReattributionProposal } from "~/server/ai";

interface UnitSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: {
    id: string;
    content: string;
    unitType: string;
  };
  onConfirm: (params: {
    contentA: string;
    contentB: string;
    proposals: SplitReattributionProposal[];
  }) => void;
}

export function UnitSplitDialog({
  open,
  onOpenChange,
  unit,
  onConfirm,
}: UnitSplitDialogProps) {
  const [splitPosition, setSplitPosition] = React.useState(
    Math.floor(unit.content.length / 2)
  );
  const [proposals, setProposals] = React.useState<SplitReattributionProposal[]>([]);

  const contentA = unit.content.slice(0, splitPosition).trim();
  const contentB = unit.content.slice(splitPosition).trim();

  const proposeSplit = api.ai.proposeSplitReattribution.useMutation({
    onSuccess: (data) => {
      setProposals(data.proposals);
    },
  });

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSplitPosition(Math.floor(unit.content.length / 2));
      setProposals([]);
    }
  }, [open, unit.content.length]);

  const handleAnalyze = () => {
    if (contentA.length > 0 && contentB.length > 0) {
      proposeSplit.mutate({
        unitId: unit.id,
        contentA,
        contentB,
      });
    }
  };

  const handleConfirm = () => {
    onConfirm({ contentA, contentB, proposals });
    onOpenChange(false);
  };

  const isValidSplit = contentA.length > 0 && contentB.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Split Unit
          </DialogTitle>
          <DialogDescription>
            Drag the slider to choose where to split. AI will suggest how to
            reassign existing relations.
          </DialogDescription>
        </DialogHeader>

        {/* Split position slider */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="range"
              min={1}
              max={unit.content.length - 1}
              value={splitPosition}
              onChange={(e) => setSplitPosition(Number(e.target.value))}
              className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>

          {/* Preview panels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Part A
              </div>
              <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm min-h-[100px] max-h-[200px] overflow-auto">
                {contentA || (
                  <span className="text-text-tertiary italic">Empty</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Part B
              </div>
              <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm min-h-[100px] max-h-[200px] overflow-auto">
                {contentB || (
                  <span className="text-text-tertiary italic">Empty</span>
                )}
              </div>
            </div>
          </div>

          {/* Relation reattribution proposals */}
          {proposals.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Relation Reassignment
              </div>
              <div className="rounded-lg border border-border divide-y divide-border">
                {proposals.map((p) => (
                  <div
                    key={p.relationId}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="text-text-secondary truncate flex-1">
                      {p.rationale}
                    </span>
                    <span className="ml-2 flex items-center gap-1 text-xs font-medium">
                      <ArrowRight className="h-3 w-3" />
                      Part {p.assignTo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={!isValidSplit || proposeSplit.isPending}
          >
            {proposeSplit.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Analyze Relations
          </Button>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={!isValidSplit}>
            Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
