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
import { useUndoStore } from "~/stores/undo-store";
import type { UnitSnapshot } from "~/lib/undo-actions";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The unit to delete — content is shown as preview */
  unit: {
    id: string;
    content: string;
    unitType: string;
    lifecycle: string;
    projectId: string;
  };
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  unit,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const pushAction = useUndoStore((s) => s.pushAction);

  const preview =
    unit.content.length > 80
      ? unit.content.slice(0, 80) + "…"
      : unit.content;

  const handleConfirm = () => {
    // Push to undo stack before deleting
    const snapshot: UnitSnapshot = {
      id: unit.id,
      content: unit.content,
      unitType: unit.unitType,
      lifecycle: unit.lifecycle,
      projectId: unit.projectId,
    };

    pushAction({
      type: "unit.delete",
      unitId: unit.id,
      snapshot,
      description: `Deleted: "${preview}"`,
    });

    onConfirm();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.isDefaultPrevented()) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Delete unit?</DialogTitle>
          <DialogDescription>
            This will delete the following unit. You can undo this action.
          </DialogDescription>
        </DialogHeader>

        {/* Content preview */}
        <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary italic">
          &ldquo;{preview}&rdquo;
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
