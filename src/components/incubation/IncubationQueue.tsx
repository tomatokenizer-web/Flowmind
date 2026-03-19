"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Sparkles,
  ArrowUpCircle,
  Clock,
  Trash2,
  ChevronDown,
  Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useProjectId } from "~/contexts/project-context";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { EmptyState } from "~/components/shared/empty-state";

// ─── Props ───────────────────────────────────────────────────────────

interface IncubationQueueProps {
  collapsed?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────

export function IncubationQueue({ collapsed, className }: IncubationQueueProps) {
  const projectId = useProjectId();
  const utils = api.useUtils();

  // Fetch incubating units
  const { data: units, isLoading } = api.incubation.list.useQuery();

  // Fetch contexts for the promote popover
  const { data: contexts } = api.context.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  // Mutations
  const promoteMutation = api.incubation.promote.useMutation({
    onSuccess: () => {
      void utils.incubation.list.invalidate();
      void utils.context.list.invalidate();
    },
  });

  const snoozeMutation = api.incubation.snooze.useMutation({
    onSuccess: () => {
      void utils.incubation.list.invalidate();
    },
  });

  const discardMutation = api.incubation.discard.useMutation({
    onSuccess: () => {
      void utils.incubation.list.invalidate();
    },
  });

  // Filter units by current project
  const filteredUnits = React.useMemo(() => {
    if (!projectId || !units) return [];
    return units.filter((u) => u.projectId === projectId);
  }, [units, projectId]);

  // ─── Loading state ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={cn("space-y-2 p-2", className)} role="status" aria-label="Loading incubation queue">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-bg-secondary"
          />
        ))}
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────

  if (filteredUnits.length === 0) {
    if (collapsed) {
      return (
        <div className={cn("flex items-center justify-center p-2", className)}>
          <Sparkles className="h-5 w-5 text-text-tertiary" aria-label="No incubating ideas" />
        </div>
      );
    }

    return (
      <EmptyState
        icon={Sparkles}
        headline="No incubating ideas"
        description="Thoughts marked for incubation will appear here."
        className={cn("py-8", className)}
      />
    );
  }

  // ─── Collapsed state ─────────────────────────────────────────────

  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center gap-1 p-2", className)}>
        <div className="relative">
          <Sparkles className="h-5 w-5 text-accent-secondary" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[10px] font-medium text-white">
            {filteredUnits.length > 9 ? "9+" : filteredUnits.length}
          </span>
        </div>
      </div>
    );
  }

  // ─── Expanded state ──────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Sparkles className="h-4 w-4 text-accent-secondary" />
        <span className="text-sm font-medium text-text-primary">Incubating</span>
        <span className="ml-auto rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary">
          {filteredUnits.length}
        </span>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          <AnimatePresence initial={false}>
            {filteredUnits.map((unit) => (
              <IncubationItem
                key={unit.id}
                unit={unit}
                contexts={contexts ?? []}
                onPromote={(contextId) =>
                  promoteMutation.mutate({ unitId: unit.id, contextId })
                }
                onSnooze={() => snoozeMutation.mutate({ unitId: unit.id })}
                onDiscard={() => discardMutation.mutate({ unitId: unit.id })}
                isPromoting={promoteMutation.isPending}
                isSnoozing={snoozeMutation.isPending}
                isDiscarding={discardMutation.isPending}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Incubation Item ─────────────────────────────────────────────────

interface IncubationItemProps {
  unit: {
    id: string;
    content: string;
    unitType: "claim" | "question" | "evidence" | "counterargument" | "observation" | "idea" | "definition" | "assumption" | "action";
    createdAt: Date;
  };
  contexts: Array<{ id: string; name: string; parentId: string | null }>;
  onPromote: (contextId: string) => void;
  onSnooze: () => void;
  onDiscard: () => void;
  isPromoting: boolean;
  isSnoozing: boolean;
  isDiscarding: boolean;
}

function IncubationItem({
  unit,
  contexts,
  onPromote,
  onSnooze,
  onDiscard,
  isPromoting,
  isSnoozing,
  isDiscarding,
}: IncubationItemProps) {
  const [promoteOpen, setPromoteOpen] = useState(false);

  const handlePromote = useCallback(
    (contextId: string) => {
      onPromote(contextId);
      setPromoteOpen(false);
    },
    [onPromote],
  );

  // Truncate content for preview
  const preview =
    unit.content.length > 100
      ? unit.content.slice(0, 100) + "..."
      : unit.content;

  const isActioning = isPromoting || isSnoozing || isDiscarding;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "rounded-lg border border-border bg-bg-primary p-3",
        "transition-colors duration-fast",
        "hover:border-border-hover",
        isActioning && "opacity-50 pointer-events-none",
      )}
    >
      {/* Header: type badge + date */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <UnitTypeBadge unitType={unit.unitType} />
        <span className="text-xs text-text-tertiary">
          {formatDistanceToNow(new Date(unit.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Content preview */}
      <p className="text-sm text-text-secondary line-clamp-2 mb-3">{preview}</p>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Promote button with context selector */}
        <Popover open={promoteOpen} onOpenChange={setPromoteOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              disabled={isActioning}
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Promote
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-56 p-2"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="text-xs font-medium text-text-secondary mb-2 px-2">
              Select Context
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {contexts.length === 0 ? (
                <div className="px-2 py-3 text-xs text-text-tertiary text-center">
                  No contexts available
                </div>
              ) : (
                contexts.map((ctx) => (
                  <button
                    key={ctx.id}
                    type="button"
                    onClick={() => handlePromote(ctx.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
                      "text-sm text-text-secondary text-left",
                      "transition-colors duration-fast",
                      "hover:bg-bg-hover hover:text-text-primary",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    )}
                  >
                    <Layers className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    <span className="truncate">{ctx.name}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Snooze */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={onSnooze}
          disabled={isActioning}
          title="Snooze - resurface later"
        >
          <Clock className="h-3.5 w-3.5" />
          Snooze
        </Button>

        {/* Discard */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-status-error hover:text-status-error"
          onClick={onDiscard}
          disabled={isActioning}
          title="Discard - archive this thought"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
