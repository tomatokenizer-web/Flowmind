"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { GitMerge, X, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

interface MergeUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceUnitId: string;
  targetUnitId: string;
  onMerged?: (targetUnitId: string) => void;
}

/**
 * Merge two semantically identical units.
 * Shows a preview of what will change, lets user pick which content to keep.
 */
export function MergeUnitsDialog({
  open,
  onOpenChange,
  sourceUnitId,
  targetUnitId,
  onMerged,
}: MergeUnitsDialogProps) {
  const [keepContent, setKeepContent] = React.useState<"source" | "target">("target");

  const { data: preview, isLoading: previewLoading } = api.relation.mergePreview.useQuery(
    { sourceUnitId, targetUnitId },
    { enabled: open && !!sourceUnitId && !!targetUnitId },
  );

  const utils = api.useUtils();
  const mergeMutation = api.relation.merge.useMutation({
    onSuccess: async (data) => {
      await utils.unit.list.invalidate();
      onMerged?.(data.targetUnitId);
      onOpenChange(false);
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-bg-surface p-6 shadow-xl",
            "focus:outline-none",
          )}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-accent-primary" />
              <Dialog.Title className="font-heading text-lg font-semibold text-text-primary">
                Merge Units
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="mb-5 text-sm text-text-secondary">
            Merge two semantically identical units into one. All relations, perspectives, and
            assembly references will be transferred to the surviving unit.
          </Dialog.Description>

          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Content choice */}
              <div>
                <p className="mb-2 text-sm font-medium text-text-primary">Which content to keep?</p>
                <div className="space-y-2">
                  {(["target", "source"] as const).map((choice) => {
                    const unit = choice === "target" ? preview.targetUnit : preview.sourceUnit;
                    const label = choice === "target" ? "Keep target (survives)" : "Keep source content";
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setKeepContent(choice)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                          keepContent === choice
                            ? "border-accent-primary bg-accent-primary/5 text-text-primary"
                            : "border-border bg-bg-primary text-text-secondary hover:border-border-hover",
                        )}
                      >
                        <span className="mb-1 block text-xs font-medium text-text-tertiary">{label}</span>
                        <span className="line-clamp-2">{unit.content}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Impact summary */}
              <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm">
                <p className="mb-1.5 font-medium text-text-primary">What will change:</p>
                <ul className="space-y-1 text-text-secondary">
                  <li>↗ {preview.relationsToTransfer} relation{preview.relationsToTransfer !== 1 ? "s" : ""} transferred</li>
                  <li>📋 {preview.assemblyItemsToUpdate} assembly reference{preview.assemblyItemsToUpdate !== 1 ? "s" : ""} updated</li>
                  <li>🎯 {preview.perspectivesToTransfer} perspective{preview.perspectivesToTransfer !== 1 ? "s" : ""} transferred</li>
                  {preview.duplicateRelations > 0 && (
                    <li className="text-accent-warning">
                      ⚠ {preview.duplicateRelations} duplicate relation{preview.duplicateRelations !== 1 ? "s" : ""} will be skipped (higher strength kept)
                    </li>
                  )}
                  <li className="text-accent-danger">🗄 Source unit will be archived</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <Button variant="ghost">Cancel</Button>
                </Dialog.Close>
                <Button
                  onClick={() =>
                    mergeMutation.mutate({ sourceUnitId, targetUnitId, keepContent })
                  }
                  disabled={mergeMutation.isPending}
                  className="bg-accent-primary text-white hover:bg-accent-primary/90"
                >
                  {mergeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitMerge className="h-4 w-4" />
                  )}
                  Merge Units
                </Button>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
