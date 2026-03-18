"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { Layers, Plus } from "lucide-react";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "~/lib/utils";
import { useDragDrop } from "~/hooks/use-drag-drop";
import { useContextTree } from "~/hooks/use-context-tree";
import { useSidebarStore } from "~/stores/sidebar-store";
import { ContextTreeItem } from "./context-tree-item";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";

// ─── Default project placeholder ────────────────────────────────────
// TODO: Epic 9 — real project selector
const DEFAULT_PROJECT_ID: string | undefined = undefined;

// ─── Props ──────────────────────────────────────────────────────────

interface ContextTreeProps {
  projectId?: string;
  collapsed: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export function ContextTree({
  projectId = DEFAULT_PROJECT_ID,
  collapsed,
}: ContextTreeProps) {
  const {
    flatNodes,
    isLoading,
    activeContextId,
    expandedNodes,
    setActiveContext,
    toggleNode,
    createContext,
    renameContext,
    deleteContext,
  } = useContextTree({ projectId });

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  // DnD setup
  const { dndContextProps, itemIds } = useDragDrop({
    items: flatNodes,
    onReorder: () => {
      // TODO: persist reorder via trpc.context.update when sortOrder field exists
    },
  });

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
      // For sub-context, prompt inline — for now create with default name
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
        {flatNodes.map((node) => (
          <ContextTreeItem
            key={node.id}
            node={node}
            isActive={activeContextId === node.id}
            isExpanded={expandedNodes.has(node.id)}
            collapsed
            onSelect={setActiveContext}
            onToggleExpand={toggleNode}
            onRename={renameContext}
            onDelete={deleteContext}
            onAddSubContext={handleAddSubContext}
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
              {flatNodes.map((node) => (
                <ContextTreeItem
                  key={node.id}
                  node={node}
                  isActive={activeContextId === node.id}
                  isExpanded={expandedNodes.has(node.id)}
                  collapsed={false}
                  onSelect={setActiveContext}
                  onToggleExpand={toggleNode}
                  onRename={renameContext}
                  onDelete={deleteContext}
                  onAddSubContext={handleAddSubContext}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Empty state */}
          {flatNodes.length === 0 && !isCreating && (
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
    </div>
  );
}
