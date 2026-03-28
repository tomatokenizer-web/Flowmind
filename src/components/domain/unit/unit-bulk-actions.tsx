"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Check,
  Layers,
  Plus,
  Tag,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { useUnitSelectionStore } from "@/stores/unit-selection-store";
import { UNIT_TYPE_CONFIG } from "./unit-type-badge";

/* ─── Types ─── */

interface UnitBulkActionsProps {
  /** Called when "Confirm all" is clicked */
  onConfirmAll?: (ids: string[]) => void;
  /** Called when "Archive all" is clicked */
  onArchiveAll?: (ids: string[]) => void;
  /** Called when "Add to context" is clicked */
  onAddToContext?: (ids: string[]) => void;
  /** Called when "Add to assembly" is clicked */
  onAddToAssembly?: (ids: string[]) => void;
  /** Called when type change is selected */
  onChangeType?: (ids: string[], type: string) => void;
  className?: string;
}

/* ─── UnitBulkActions Component ─── */

export function UnitBulkActions({
  onConfirmAll,
  onArchiveAll,
  onAddToContext,
  onAddToAssembly,
  onChangeType,
  className,
}: UnitBulkActionsProps) {
  const { selectedUnitIds, clearSelection } = useUnitSelectionStore();
  const count = selectedUnitIds.size;
  const visible = count > 0;

  const getIds = React.useCallback(
    () => Array.from(selectedUnitIds),
    [selectedUnitIds],
  );

  /* Keyboard shortcut: Delete to archive */
  React.useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onArchiveAll?.(getIds());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onArchiveAll, getIds]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
            "flex items-center gap-1.5 rounded-card border border-border",
            "bg-bg-primary px-3 py-2",
            "shadow-elevated",
            className,
          )}
          role="toolbar"
          aria-label={`Bulk actions for ${count} selected units`}
        >
          {/* Selection count */}
          <span className="text-sm font-medium text-text-primary tabular-nums mr-1">
            {count} selected
          </span>

          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

          {/* Confirm all */}
          {onConfirmAll && (
            <SimpleTooltip content="Confirm all" side="top">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-accent-success hover:text-accent-success"
                onClick={() => onConfirmAll(getIds())}
              >
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Confirm</span>
              </Button>
            </SimpleTooltip>
          )}

          {/* Archive all */}
          {onArchiveAll && (
            <SimpleTooltip content="Archive all (Del)" side="top">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onArchiveAll(getIds())}
              >
                <Archive className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Archive</span>
              </Button>
            </SimpleTooltip>
          )}

          {/* Add to context */}
          {onAddToContext && (
            <SimpleTooltip content="Add to context" side="top">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onAddToContext(getIds())}
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Context</span>
              </Button>
            </SimpleTooltip>
          )}

          {/* Add to assembly */}
          {onAddToAssembly && (
            <SimpleTooltip content="Add to assembly" side="top">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => onAddToAssembly(getIds())}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Assembly</span>
              </Button>
            </SimpleTooltip>
          )}

          {/* Change type */}
          {onChangeType && (
            <DropdownMenu>
              <SimpleTooltip content="Change type" side="top">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Type</span>
                  </Button>
                </DropdownMenuTrigger>
              </SimpleTooltip>
              <DropdownMenuContent align="center" side="top" sideOffset={8}>
                <DropdownMenuLabel>Change type to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(UNIT_TYPE_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem
                      key={key}
                      onSelect={() => onChangeType(getIds(), key)}
                    >
                      <Icon className={cn("mr-2 h-4 w-4", config.accentClass)} />
                      {config.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />

          {/* Clear selection */}
          <SimpleTooltip content="Clear selection (Esc)" side="top">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-text-tertiary"
              onClick={clearSelection}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

UnitBulkActions.displayName = "UnitBulkActions";
