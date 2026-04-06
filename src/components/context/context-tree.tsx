"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { Layers, Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/lib/toast";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { cn } from "~/lib/utils";
import { useLayoutStore } from "~/stores/layout-store";
import { useDragDrop } from "~/hooks/use-drag-drop";
import { useContextTree } from "~/hooks/use-context-tree";
import type { FlattenedNode } from "~/hooks/use-context-tree";
import { ContextTreeItem } from "./context-tree-item";
import { ContextSplitDialog } from "./context-split-dialog";
import { ContextMergeDialog } from "./context-merge-dialog";
import { ContextMoveDialog } from "./context-move-dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";

// ─── Props ──────────────────────────────────────────────────────────

interface ContextTreeProps {
  projectId: string | undefined;
  collapsed: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export function ContextTree({ projectId, collapsed }: ContextTreeProps) {
  const {
    tree,
    flatNodes,
    isLoading,
    activeContextId,
    expandedNodes,
    setActiveContext,
    toggleNode,
    createContext,
    renameContext,
    deleteContext,
    reorderContexts,
    moveContext,
  } = useContextTree({ projectId });

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  // Split/merge dialog state
  const [splitTargetId, setSplitTargetId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  // Move dialog state
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);

  const splitTarget = splitTargetId ? flatNodes.find((n) => n.id === splitTargetId) : null;
  const mergeSource = mergeSourceId ? flatNodes.find((n) => n.id === mergeSourceId) : null;
  const mergeTarget = mergeTargetId ? flatNodes.find((n) => n.id === mergeTargetId) : null;
  const moveTarget = moveTargetId ? flatNodes.find((n) => n.id === moveTargetId) : null;

  const handleSplit = useCallback((id: string) => {
    setSplitTargetId(id);
  }, []);

  const handleMergeStart = useCallback((id: string) => {
    // First invocation sets source; subsequent invocation with a different id sets target
    if (mergeSourceId && mergeSourceId !== id) {
      setMergeTargetId(id);
    } else {
      setMergeSourceId(id);
      setMergeTargetId(null);
    }
  }, [mergeSourceId]);

  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const viewMode = useLayoutStore((s) => s.viewMode);

  // When merge source is set, intercept select to use it as merge target
  const handleSelectWithMerge = useCallback(
    (id: string) => {
      if (mergeSourceId && mergeSourceId !== id) {
        setMergeTargetId(id);
      } else {
        setActiveContext(id);
        // If in attention/navigate mode, switch back to canvas when a context is selected
        if (viewMode === "attention" || viewMode === "navigate") {
          setViewMode("canvas");
        }
      }
    },
    [mergeSourceId, setActiveContext, viewMode, setViewMode],
  );

  const handleCloseMerge = useCallback(() => {
    setMergeSourceId(null);
    setMergeTargetId(null);
  }, []);

  const handleMoveStart = useCallback((id: string) => {
    setMoveTargetId(id);
  }, []);

  const handleMoveConfirm = useCallback(
    async (contextId: string, newParentId: string | null) => {
      await moveContext(contextId, newParentId);
      setMoveTargetId(null);
    },
    [moveContext],
  );

  // ─── Reset Relations ──────────────────────────────────────────
  const resetRelationsMutation = api.ai.resetContextRelations.useMutation({
    onSuccess: (data) => {
      if (data) {
        toast.success("Relations reset", {
          description: `Deleted ${data.deleted}, created ${data.created} new relations`,
        });
      }
    },
    onError: () => toast.error("Failed to reset relations"),
  });

  const handleResetRelations = useCallback((id: string) => {
    if (window.confirm("Reset all relations between units in this context? Existing relations will be deleted and recreated by AI.")) {
      resetRelationsMutation.mutate({ contextId: id });
    }
  }, [resetRelationsMutation]);

  // ─── Reorder helpers ─────────────────────────────────────────────

  /**
   * Get sibling IDs for a given node (nodes sharing the same parentId).
   * Returns only IDs of visible (flattened) siblings at the same depth.
   */
  const getSiblingIds = useCallback(
    (node: FlattenedNode): string[] => {
      return flatNodes
        .filter((n) => n.parentId === node.parentId && n.depth === node.depth)
        .map((n) => n.id);
    },
    [flatNodes],
  );

  const handleKeyboardReorder = useCallback(
    async (nodeId: string, direction: "up" | "down") => {
      const node = flatNodes.find((n) => n.id === nodeId);
      if (!node) return;

      const siblingIds = getSiblingIds(node);
      const currentIndex = siblingIds.indexOf(nodeId);
      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= siblingIds.length) return;

      const newOrder = arrayMove(siblingIds, currentIndex, newIndex);
      await reorderContexts(newOrder, node.parentId);
    },
    [flatNodes, getSiblingIds, reorderContexts],
  );

  // DnD setup — optimisticItems reflects drag result immediately (before server confirms)
  const { dndContextProps, itemIds, optimisticItems } = useDragDrop({
    items: flatNodes,
    onReorder: (reorderedItems, activeId, _fromIndex, _toIndex) => {
      // Find the dragged node to determine its parentId
      const draggedNode = flatNodes.find((n) => n.id === activeId);
      if (!draggedNode) return;

      // Extract sibling IDs from the reordered list (same parent + depth)
      const siblingIds = reorderedItems
        .filter((n) => n.parentId === draggedNode.parentId && n.depth === draggedNode.depth)
        .map((n) => n.id);

      void reorderContexts(siblingIds, draggedNode.parentId);
    },
  });

  // Use optimistic order for rendering so the UI updates instantly on drag end
  const visibleNodes = optimisticItems;

  // ─── New context creation ──────────────────────────────────────

  const startCreate = useCallback(() => {
    setIsCreating(true);
    setNewName("");
    // Focus after render
    requestAnimationFrame(() => {
      newInputRef.current?.focus();
    });
  }, []);

  const confirmCreate = useCallback(async () => {
    const trimmed = newName.trim();
    if (trimmed) {
      await createContext(trimmed);
    }
    setIsCreating(false);
    setNewName("");
  }, [newName, createContext]);

  const cancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewName("");
  }, []);

  const handleCreateKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void confirmCreate();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelCreate();
      }
    },
    [confirmCreate, cancelCreate],
  );

  const handleAddSubContext = useCallback(
    async (parentId: string) => {
      // For sub-context, prompt inline -- for now create with default name
      const name = "New Sub-Context";
      await createContext(name, parentId);
    },
    [createContext],
  );

  // ─── Loading skeleton ─────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-1 p-space-2" role="status" aria-label="Loading contexts">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-lg bg-bg-secondary"
          />
        ))}
      </div>
    );
  }

  // ─── Collapsed state: icon-only ───────────────────────────────

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-space-1 py-space-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={startCreate}
          aria-label="New Context"
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {visibleNodes.map((node) => (
          <ContextTreeItem
            key={node.id}
            node={node}
            isActive={activeContextId === node.id}
            isExpanded={expandedNodes.has(node.id)}
            collapsed
            isMergeSource={node.id === mergeSourceId}
            isMergeTarget={!!mergeSourceId && node.id !== mergeSourceId}
            onSelect={handleSelectWithMerge}
            onToggleExpand={toggleNode}
            onRename={renameContext}
            onDelete={deleteContext}
            onAddSubContext={handleAddSubContext}
            onSplit={handleSplit}
            onMerge={handleMergeStart}
            onMove={handleMoveStart}
            onResetRelations={handleResetRelations}
            onKeyboardReorder={handleKeyboardReorder}
          />
        ))}
      </div>
    );
  }

  // ─── Expanded state ───────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col overflow-hidden" role="tree" aria-label="Context tree">
      {/* New Context button */}
      <div className="flex items-center gap-space-2 px-space-3 py-space-2">
        <button
          type="button"
          onClick={startCreate}
          className={cn(
            "flex w-full items-center gap-space-2 rounded-lg px-space-2 py-[6px]",
            "text-sm text-text-secondary",
            "transition-colors duration-fast ease-default",
            "hover:bg-bg-hover hover:text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
            "motion-reduce:transition-none",
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>New Context</span>
        </button>
      </div>

      {/* Inline create input */}
      {isCreating && (
        <div className="px-space-3 pb-space-1">
          <input
            ref={newInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => void confirmCreate()}
            onKeyDown={handleCreateKeyDown}
            placeholder="Context name..."
            className={cn(
              "w-full rounded border border-accent-primary bg-bg-primary px-space-2 py-1",
              "text-sm text-text-primary placeholder:text-text-tertiary outline-none",
            )}
            aria-label="New context name"
          />
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="px-space-2 pb-space-2">
          {/* "All Units" option */}
          <button
            type="button"
            role="treeitem"
            aria-selected={activeContextId === null}
            onClick={() => setActiveContext(null)}
            className={cn(
              "flex w-full items-center gap-space-1 rounded-lg px-space-2 py-[6px]",
              "text-sm text-text-secondary",
              "transition-colors duration-fast ease-default",
              "hover:bg-bg-hover hover:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
              "motion-reduce:transition-none",
              activeContextId === null && "border-l-2 border-l-accent-primary bg-bg-hover text-text-primary",
              activeContextId !== null && "border-l-2 border-l-transparent",
            )}
          >
            <Layers className="h-4 w-4 shrink-0 text-text-tertiary" />
            <span>All Units</span>
          </button>

          {/* Tree items with DnD */}
          <DndContext
            sensors={dndContextProps.sensors}
            collisionDetection={dndContextProps.collisionDetection}
            modifiers={dndContextProps.modifiers}
            onDragStart={dndContextProps.onDragStart}
            onDragEnd={dndContextProps.onDragEnd}
            onDragCancel={dndContextProps.onDragCancel}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {visibleNodes.map((node) => (
                <ContextTreeItem
                  key={node.id}
                  node={node}
                  isActive={activeContextId === node.id}
                  isExpanded={expandedNodes.has(node.id)}
                  collapsed={false}
                  isMergeSource={node.id === mergeSourceId}
                  isMergeTarget={!!mergeSourceId && node.id !== mergeSourceId}
                  onSelect={handleSelectWithMerge}
                  onToggleExpand={toggleNode}
                  onRename={renameContext}
                  onDelete={deleteContext}
                  onAddSubContext={handleAddSubContext}
                  onSplit={handleSplit}
                  onMerge={handleMergeStart}
                  onMove={handleMoveStart}
                  onResetRelations={handleResetRelations}
                  onKeyboardReorder={handleKeyboardReorder}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Empty state */}
          {visibleNodes.length === 0 && !isCreating && (
            <div className="flex flex-col items-center gap-space-3 py-space-8 text-center">
              <Layers className="h-10 w-10 text-text-tertiary" />
              <p className="text-sm text-text-secondary">No contexts yet</p>
              <Button variant="ghost" size="sm" onClick={startCreate}>
                Create your first context
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Merge selection banner */}
      {mergeSourceId && !mergeTargetId && (
        <div className="border-t border-border bg-bg-surface px-space-3 py-space-2">
          <p className="text-xs text-text-secondary">
            Click another context to merge with &ldquo;{mergeSource?.name}&rdquo;
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseMerge}
            className="mt-1 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Split Dialog */}
      {splitTarget && projectId && (
        <ContextSplitDialog
          open={!!splitTargetId}
          onOpenChange={(v) => { if (!v) setSplitTargetId(null); }}
          contextId={splitTarget.id}
          contextName={splitTarget.name}
          projectId={projectId}
        />
      )}

      {/* Merge Dialog */}
      {mergeSource && mergeTarget && projectId && (
        <ContextMergeDialog
          open={!!mergeTargetId}
          onOpenChange={(v) => { if (!v) handleCloseMerge(); }}
          contextIdA={mergeSource.id}
          contextNameA={mergeSource.name}
          contextIdB={mergeTarget.id}
          contextNameB={mergeTarget.name}
          projectId={projectId}
        />
      )}

      {/* Move Dialog */}
      {moveTarget && projectId && (
        <ContextMoveDialog
          open={!!moveTargetId}
          onOpenChange={(v) => { if (!v) setMoveTargetId(null); }}
          contextId={moveTarget.id}
          contextName={moveTarget.name}
          currentParentId={moveTarget.parentId}
          tree={tree}
          onConfirm={handleMoveConfirm}
        />
      )}
    </div>
  );
}
