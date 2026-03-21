"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { ChevronRight, FolderTree } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import type { ContextTreeNode } from "~/hooks/use-context-tree";

// ─── Props ──────────────────────────────────────────────────────────

interface ContextMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextId: string;
  contextName: string;
  currentParentId: string | null;
  tree: ContextTreeNode[];
  onConfirm: (contextId: string, newParentId: string | null) => void;
}

// ─── Flatten tree for selection, excluding the context itself and its descendants ──

interface SelectableNode {
  id: string | null;
  name: string;
  depth: number;
}

function flattenForSelection(
  nodes: ContextTreeNode[],
  excludeId: string,
  depth = 0,
): SelectableNode[] {
  const result: SelectableNode[] = [];
  for (const node of nodes) {
    if (node.id === excludeId) continue; // Skip self and all descendants
    result.push({
      id: node.id,
      name: node.name,
      depth,
    });
    result.push(...flattenForSelection(node.children, excludeId, depth + 1));
  }
  return result;
}

// ─── Component ──────────────────────────────────────────────────────

export function ContextMoveDialog({
  open,
  onOpenChange,
  contextId,
  contextName,
  currentParentId,
  tree,
  onConfirm,
}: ContextMoveDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(currentParentId);

  // Build list of valid move targets (excludes self and descendants)
  const selectableNodes = useMemo(() => {
    const nodes = flattenForSelection(tree, contextId);
    // Add root option at the beginning
    return [{ id: null, name: "Root (top level)", depth: 0 }, ...nodes] as SelectableNode[];
  }, [tree, contextId]);

  const handleConfirm = useCallback(() => {
    if (selectedParentId === currentParentId) {
      onOpenChange(false);
      return;
    }
    onConfirm(contextId, selectedParentId);
  }, [contextId, selectedParentId, currentParentId, onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Move Context</DialogTitle>
          <DialogDescription>
            Choose a new parent for &ldquo;{contextName}&rdquo;. Select &ldquo;Root&rdquo; to place it at the top level.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto rounded-md border border-border">
          {selectableNodes.map((node) => {
            const isSelected = selectedParentId === node.id;
            const isCurrent = currentParentId === node.id;

            return (
              <button
                key={node.id ?? "__root__"}
                type="button"
                onClick={() => setSelectedParentId(node.id)}
                className={cn(
                  "flex w-full items-center gap-space-2 px-space-3 py-space-2 text-left text-sm",
                  "transition-colors duration-fast",
                  "hover:bg-bg-hover",
                  isSelected && "bg-accent-primary/10 text-accent-primary",
                  !isSelected && "text-text-secondary",
                )}
                style={{ paddingLeft: `${node.depth * 16 + 12}px` }}
                aria-selected={isSelected}
                role="option"
              >
                {node.id === null ? (
                  <FolderTree className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                )}
                <span className="truncate">{node.name}</span>
                {isCurrent && (
                  <span className="ml-auto shrink-0 text-[11px] text-text-tertiary">(current)</span>
                )}
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedParentId === currentParentId}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
