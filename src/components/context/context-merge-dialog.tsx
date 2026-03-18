"use client";

import { useState, useMemo, useEffect } from "react";
import { Merge } from "lucide-react";
import { cn } from "~/lib/utils";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { useContextActions, type MergeInput } from "~/hooks/use-context-actions";

// ─── Types ───────────────────────────────────────────────────────────

interface ContextMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextIdA: string;
  contextNameA: string;
  contextIdB: string;
  contextNameB: string;
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function ContextMergeDialog({
  open,
  onOpenChange,
  contextIdA,
  contextNameA,
  contextIdB,
  contextNameB,
  projectId,
}: ContextMergeDialogProps) {
  const { mergeContexts, isMerging, useMergeConflicts } = useContextActions(projectId);

  const defaultName = `${contextNameA} + ${contextNameB}`;
  const [mergedName, setMergedName] = useState(defaultName);
  const [resolutions, setResolutions] = useState<Map<string, "A" | "B">>(new Map());

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setMergedName(`${contextNameA} + ${contextNameB}`);
      setResolutions(new Map());
    }
  }, [open, contextNameA, contextNameB]);

  const { data: conflicts, isLoading: isLoadingConflicts } = useMergeConflicts(
    open ? contextIdA : null,
    open ? contextIdB : null,
  );

  const allConflictsResolved = useMemo(() => {
    if (!conflicts || conflicts.length === 0) return true;
    return conflicts.every((c) => resolutions.has(c.unitId));
  }, [conflicts, resolutions]);

  const canSubmit =
    mergedName.trim().length > 0 && allConflictsResolved && !isMerging;

  const handleResolve = (unitId: string, keepFrom: "A" | "B") => {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(unitId, keepFrom);
      return next;
    });
  };

  const handleSubmit = async () => {
    const input: MergeInput = {
      contextIdA,
      contextIdB,
      mergedName: mergedName.trim(),
      conflictResolutions: [...resolutions.entries()].map(([unitId, keepFrom]) => ({
        unitId,
        keepFrom,
      })),
    };

    await mergeContexts(input);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 text-text-secondary" />
            Merge Contexts
          </DialogTitle>
          <DialogDescription>
            Combine &ldquo;{contextNameA}&rdquo; and &ldquo;{contextNameB}&rdquo; into one context. Both originals will be removed.
          </DialogDescription>
        </DialogHeader>

        {/* Context names side by side */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg bg-bg-surface px-3 py-2">
            <p className="text-xs font-medium text-text-tertiary">Context A</p>
            <p className="truncate text-sm font-medium text-text-primary">{contextNameA}</p>
          </div>
          <div className="rounded-lg bg-bg-surface px-3 py-2">
            <p className="text-xs font-medium text-text-tertiary">Context B</p>
            <p className="truncate text-sm font-medium text-text-primary">{contextNameB}</p>
          </div>
        </div>

        {/* Merged name */}
        <div className="pt-1">
          <label
            htmlFor="merge-name"
            className="mb-1 block text-xs font-medium text-text-secondary"
          >
            Merged context name
          </label>
          <input
            id="merge-name"
            type="text"
            value={mergedName}
            onChange={(e) => setMergedName(e.target.value)}
            className={cn(
              "w-full rounded-lg border border-border bg-bg-primary px-3 py-2",
              "text-sm text-text-primary placeholder:text-text-tertiary",
              "outline-none transition-colors duration-fast",
              "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
            )}
          />
        </div>

        {/* Perspective conflicts */}
        {isLoadingConflicts ? (
          <div className="space-y-2 pt-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-bg-secondary"
              />
            ))}
          </div>
        ) : conflicts && conflicts.length > 0 ? (
          <div className="pt-2">
            <p className="mb-2 text-xs font-medium text-accent-warning">
              {conflicts.length} perspective conflict{conflicts.length > 1 ? "s" : ""} — choose which to keep
            </p>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <ConflictRow
                    key={conflict.unitId}
                    conflict={conflict}
                    contextNameA={contextNameA}
                    contextNameB={contextNameB}
                    resolution={resolutions.get(conflict.unitId)}
                    onResolve={(keepFrom) => handleResolve(conflict.unitId, keepFrom)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : conflicts ? (
          <p className="pt-2 text-center text-xs text-text-tertiary">
            No perspective conflicts detected
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isMerging ? "Merging..." : "Merge Contexts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Conflict Row ───────────────────────────────────────────────────

interface ConflictData {
  unitId: string;
  unitContent: string;
  unitType: string;
  perspectiveA: { type: string | null; stance: string; importance: number } | null;
  perspectiveB: { type: string | null; stance: string; importance: number } | null;
}

function ConflictRow({
  conflict,
  contextNameA,
  contextNameB,
  resolution,
  onResolve,
}: {
  conflict: ConflictData;
  contextNameA: string;
  contextNameB: string;
  resolution: "A" | "B" | undefined;
  onResolve: (keepFrom: "A" | "B") => void;
}) {
  return (
    <div className="rounded-lg border border-accent-warning/30 bg-bg-surface p-3">
      <p className="mb-2 truncate text-sm text-text-primary">
        {conflict.unitContent.slice(0, 100)}
        {conflict.unitContent.length > 100 ? "..." : ""}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onResolve("A")}
          className={cn(
            "rounded-md border px-2 py-1.5 text-left text-xs transition-colors duration-fast",
            resolution === "A"
              ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
              : "border-border text-text-secondary hover:border-accent-primary/50",
          )}
          aria-label={`Keep perspective from ${contextNameA}`}
        >
          <span className="mb-0.5 block font-medium">{contextNameA}</span>
          {conflict.perspectiveA ? (
            <span className="text-text-tertiary">
              {conflict.perspectiveA.stance} · {Math.round(conflict.perspectiveA.importance * 100)}%
            </span>
          ) : (
            <span className="text-text-tertiary">No perspective</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onResolve("B")}
          className={cn(
            "rounded-md border px-2 py-1.5 text-left text-xs transition-colors duration-fast",
            resolution === "B"
              ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
              : "border-border text-text-secondary hover:border-accent-primary/50",
          )}
          aria-label={`Keep perspective from ${contextNameB}`}
        >
          <span className="mb-0.5 block font-medium">{contextNameB}</span>
          {conflict.perspectiveB ? (
            <span className="text-text-tertiary">
              {conflict.perspectiveB.stance} · {Math.round(conflict.perspectiveB.importance * 100)}%
            </span>
          ) : (
            <span className="text-text-tertiary">No perspective</span>
          )}
        </button>
      </div>
    </div>
  );
}
