"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, Hash, Pencil, Trash2, Plus, Move, Scissors, Merge, RefreshCw, Sparkles } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "~/lib/utils";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "~/components/ui/context-menu";
import type { FlattenedNode } from "~/hooks/use-context-tree";

// ─── Props ──────────────────────────────────────────────────────────

interface ContextTreeItemProps {
  node: FlattenedNode;
  isActive: boolean;
  isExpanded: boolean;
  collapsed: boolean;
  isMergeSource?: boolean;
  isMergeTarget?: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddSubContext: (parentId: string) => void;
  onSplit?: (id: string) => void;
  onMerge?: (id: string) => void;
  onMove?: (id: string) => void;
  onResetRelations?: (id: string) => void;
  onAIRename?: (id: string) => void;
  onKeyboardReorder?: (id: string, direction: "up" | "down") => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function ContextTreeItem({
  node,
  isActive,
  isExpanded,
  collapsed,
  isMergeSource,
  isMergeTarget,
  onSelect,
  onToggleExpand,
  onRename,
  onDelete,
  onAddSubContext,
  onSplit,
  onMerge,
  onMove,
  onResetRelations,
  onAIRename,
  onKeyboardReorder,
}: ContextTreeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRenameConfirm = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.name) {
      onRename(node.id, trimmed);
    }
    setIsEditing(false);
  }, [editValue, node.id, node.name, onRename]);

  const handleRenameCancel = useCallback(() => {
    setEditValue(node.name);
    setIsEditing(false);
  }, [node.name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditing) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleRenameConfirm();
        } else if (e.key === "Escape") {
          e.preventDefault();
          handleRenameCancel();
        }
        return;
      }

      // Alt+Up / Alt+Down: keyboard reorder
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && onKeyboardReorder) {
        e.preventDefault();
        e.stopPropagation();
        void onKeyboardReorder(node.id, e.key === "ArrowUp" ? "up" : "down");
        return;
      }

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect(node.id);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (node.hasChildren && !isExpanded) {
            onToggleExpand(node.id);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (node.hasChildren && isExpanded) {
            onToggleExpand(node.id);
          }
          break;
      }
    },
    [isEditing, isExpanded, node, onSelect, onToggleExpand, onKeyboardReorder, handleRenameConfirm, handleRenameCancel],
  );

  const startRename = useCallback(() => {
    setEditValue(node.name);
    setIsEditing(true);
  }, [node.name]);

  // Collapsed sidebar: show only icon
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          "flex w-full items-center justify-center rounded-lg py-space-2",
          "text-text-secondary transition-colors duration-fast ease-default",
          "hover:bg-bg-hover hover:text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
          "motion-reduce:transition-none",
          isActive && "bg-bg-hover text-accent-primary",
        )}
        aria-label={node.name}
        title={node.name}
      >
        <Hash className="h-4 w-4 shrink-0" />
      </button>
    );
  }

  // During merge mode, suppress context menu — clicks go directly to merge target selection
  if (isMergeSource || isMergeTarget) {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        role="treeitem"
        tabIndex={0}
        aria-expanded={node.hasChildren ? isExpanded : undefined}
        aria-selected={isActive}
        aria-level={node.depth + 1}
        onClick={() => onSelect(node.id)}
        onContextMenu={(e) => {
          if (isMergeTarget) {
            e.preventDefault();
            onSelect(node.id);
          }
        }}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-space-1 rounded-lg py-[6px] pr-space-2",
          "text-sm text-text-secondary",
          "transition-colors duration-fast ease-default",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
          "motion-reduce:transition-none",
          isMergeSource && "border-l-2 border-l-accent-primary bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/30",
          isMergeTarget && "border-l-2 border-l-transparent hover:bg-accent-primary/10 hover:text-accent-primary",
          isDragging && "z-10 opacity-50",
        )}
        style={{
          ...style,
          paddingLeft: `${node.depth * 16 + 8}px`,
        }}
      >
        {node.hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded",
              "text-text-tertiary hover:text-text-secondary",
              "transition-colors duration-fast",
            )}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-fast",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {isMergeTarget && (
          <Merge className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
        )}

        <span className="min-w-0 flex-1 truncate">{node.name}</span>

        {node.unitCount > 0 && (
          <span
            className={cn(
              "ml-auto shrink-0 rounded-full bg-bg-secondary px-1.5 py-0.5",
              "text-[11px] font-medium leading-none text-text-tertiary",
              isMergeSource && "opacity-100",
            )}
          >
            {node.unitCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          role="treeitem"
          tabIndex={0}
          aria-expanded={node.hasChildren ? isExpanded : undefined}
          aria-selected={isActive}
          aria-level={node.depth + 1}
          onKeyDown={handleKeyDown}
          onClick={() => {
            if (!isEditing) onSelect(node.id);
          }}
          className={cn(
            "group flex w-full cursor-pointer items-center gap-space-1 rounded-lg py-[6px] pr-space-2",
            "text-sm text-text-secondary",
            "transition-colors duration-fast ease-default",
            "hover:bg-bg-hover hover:text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
            "motion-reduce:transition-none",
            isMergeSource && "border-l-2 border-l-accent-primary bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/30",
            isMergeTarget && "border-l-2 border-l-transparent hover:bg-accent-primary/10 hover:text-accent-primary cursor-pointer",
            !isMergeSource && !isMergeTarget && isActive && "border-l-2 border-l-accent-primary bg-bg-hover text-text-primary",
            !isMergeSource && !isMergeTarget && !isActive && "border-l-2 border-l-transparent",
            isDragging && "z-10 opacity-50",
          )}
          style={{
            ...style,
            paddingLeft: `${node.depth * 16 + 8}px`,
          }}
        >
          {/* Expand/collapse chevron */}
          {node.hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                "text-text-tertiary hover:text-text-secondary",
                "transition-colors duration-fast",
              )}
              aria-label={isExpanded ? "Collapse" : "Expand"}
              tabIndex={-1}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-fast",
                  isExpanded && "rotate-90",
                )}
              />
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          {/* Merge target indicator */}
          {isMergeTarget && (
            <Merge className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
          )}

          {/* Context name or inline edit */}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRenameConfirm}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex-1 rounded border border-accent-primary bg-bg-primary px-1 py-0.5",
                "text-sm text-text-primary outline-none",
                "min-w-0",
              )}
              aria-label="Rename context"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
          )}

          {/* Unit count badge */}
          {!isEditing && node.unitCount > 0 && (
            <span
              className={cn(
                "ml-auto shrink-0 rounded-full bg-bg-secondary px-1.5 py-0.5",
                "text-[11px] font-medium leading-none text-text-tertiary",
                "opacity-0 transition-opacity duration-fast group-hover:opacity-100",
                isActive && "opacity-100",
              )}
            >
              {node.unitCount}
            </span>
          )}
        </div>
      </ContextMenuTrigger>

      {/* Right-click context menu */}
      <ContextMenuContent>
        <ContextMenuItem onSelect={startRename}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        {onAIRename && (
          <ContextMenuItem onSelect={() => onAIRename(node.id)}>
            <Sparkles className="mr-2 h-4 w-4 text-accent-primary" />
            AI Rename
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => onAddSubContext(node.id)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Sub-Context
        </ContextMenuItem>
        {onMove && (
          <ContextMenuItem onSelect={() => onMove(node.id)}>
            <Move className="mr-2 h-4 w-4" />
            Move
          </ContextMenuItem>
        )}
        {onSplit && (
          <ContextMenuItem onSelect={() => onSplit(node.id)}>
            <Scissors className="mr-2 h-4 w-4" />
            Split Context
          </ContextMenuItem>
        )}
        {onMerge && (
          <ContextMenuItem onSelect={() => onMerge(node.id)}>
            <Merge className="mr-2 h-4 w-4" />
            Merge With...
          </ContextMenuItem>
        )}
        {onResetRelations && (
          <ContextMenuItem onSelect={() => onResetRelations(node.id)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Relations (AI)
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => onDelete(node.id)}
          className="text-accent-error focus:text-accent-error"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
