"use client";

import { useState, useMemo, useEffect } from "react";
import { Merge, Loader2, Sparkles, RefreshCw, Check } from "lucide-react";
import { cn } from "~/lib/utils";
import { toast } from "~/lib/toast";
import { api } from "~/trpc/react";
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

type Stage = "config" | "post-merge";

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
  const { mergeContexts, isMerging, useMergeConflicts, suggestTitle, isSuggestingTitle } =
    useContextActions(projectId);

  const utils = api.useUtils();

  const defaultName = `${contextNameA} + ${contextNameB}`.slice(0, 200);
  const [mergedName, setMergedName] = useState(defaultName);
  const [resolutions, setResolutions] = useState<Map<string, "A" | "B">>(new Map());

  // Post-merge state
  const [stage, setStage] = useState<Stage>("config");
  const [mergedContextId, setMergedContextId] = useState<string | null>(null);
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setMergedName(`${contextNameA} + ${contextNameB}`.slice(0, 200));
      setResolutions(new Map());
      setStage("config");
      setMergedContextId(null);
      setSuggestedTitle(null);
      setEditingTitle("");
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

    try {
      const result = await mergeContexts(input);
      if (result?.id) {
        setMergedContextId(result.id);
        setStage("post-merge");
        // Fire AI title suggestion (dry run)
        suggestTitle(result.id)
          .then((data) => {
            if (data?.title) {
              setSuggestedTitle(data.title);
              setEditingTitle(data.title);
            }
          })
          .catch(() => {
            setSuggestedTitle(null);
          });
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Merge failed";
      toast.error("Failed to merge contexts", { description: message });
    }
  };

  // ── Post-merge: apply suggested title ──

  const renameMutation = api.context.update.useMutation({
    onSuccess: () => {
      void utils.context.list.invalidate();
      toast.success("Context title updated");
    },
    onError: (err) => toast.error("Failed to update title", { description: err.message }),
  });

  const handleApplyTitle = () => {
    if (!mergedContextId || !editingTitle.trim()) return;
    renameMutation.mutate({ id: mergedContextId, name: editingTitle.trim().slice(0, 100) });
  };

  // ── Post-merge: reset relations ──

  const resetRelationsMutation = api.ai.resetContextRelations.useMutation({
    onSuccess: (data) => {
      if (data) {
        toast.success("Relations rebuilt", {
          description: `Deleted ${data.deleted}, created ${data.created} new relations`,
        });
      }
    },
    onError: () => toast.error("Failed to reset relations"),
  });

  const handleResetRelations = () => {
    if (!mergedContextId) return;
    resetRelationsMutation.mutate({ contextId: mergedContextId });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {stage === "config" ? (
          <>
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
                maxLength={200}
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
          </>
        ) : (
          /* ─── Post-Merge Stage ─────────────────────────────────── */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-accent-primary" />
                Merge Complete
              </DialogTitle>
              <DialogDescription>
                Contexts merged successfully. Customize the result below.
              </DialogDescription>
            </DialogHeader>

            {/* AI Title Suggestion */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
                AI-Suggested Title
              </div>

              {isSuggestingTitle ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-tertiary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating title...
                </div>
              ) : suggestedTitle ? (
                renameMutation.isSuccess ? (
                  <p className="text-xs text-accent-primary font-medium">
                    Title applied: &ldquo;{editingTitle}&rdquo;
                  </p>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingTitle}
                      maxLength={100}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className={cn(
                        "w-full rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-3 py-2",
                        "text-sm text-text-primary outline-none",
                        "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleApplyTitle}
                        disabled={renameMutation.isPending || !editingTitle.trim()}
                      >
                        {renameMutation.isPending ? "Applying..." : "Apply Title"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSuggestedTitle(null)}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-xs text-text-tertiary">
                  {renameMutation.isSuccess ? "Title applied." : "No suggestion available — title kept as is."}
                </p>
              )}
            </div>

            {/* Relation Options */}
            <div className="space-y-2 pt-3">
              <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                <RefreshCw className="h-3.5 w-3.5 text-accent-primary" />
                Unit Relations
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Keep Existing Relations
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetRelations}
                  disabled={resetRelationsMutation.isPending || resetRelationsMutation.isSuccess}
                  className="flex-1"
                >
                  {resetRelationsMutation.isPending
                    ? "Rebuilding..."
                    : resetRelationsMutation.isSuccess
                      ? "Relations Rebuilt"
                      : "Reset with AI"}
                </Button>
              </div>
              {resetRelationsMutation.isSuccess && (
                <p className="text-xs text-text-tertiary">
                  Deleted {resetRelationsMutation.data?.deleted}, created {resetRelationsMutation.data?.created} new relations.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
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
