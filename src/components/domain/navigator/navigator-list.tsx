"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Copy,
  MoreHorizontal,
  Route,
  Clock,
  Hash,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { EmptyState } from "~/components/shared/empty-state";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";

/* ─── Types ─── */

interface NavigatorConfig {
  id: string;
  name: string;
  pathType: string;
  traversalMode: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface NavigatorListProps {
  onSelect: (id: string) => void;
  className?: string;
}

/* ─── Path type labels ─── */

const PATH_TYPE_LABELS: Record<string, string> = {
  argument: "Argument",
  causal: "Causal",
  temporal: "Temporal",
  associative: "Associative",
  containment: "Containment",
  "cross-context": "Cross-Context",
};

/* ─── Component ─── */

export function NavigatorList({ onSelect, className }: NavigatorListProps) {
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const navigatorsQuery = api.navigator.list.useQuery(
    { contextId: activeContextId! },
    { enabled: !!activeContextId },
  );
  const createMutation = api.navigator.create.useMutation({
    onSuccess: () => navigatorsQuery.refetch(),
  });

  const navigators = (navigatorsQuery.data ?? []) as unknown as NavigatorConfig[];

  const handleCreate = React.useCallback(() => {
    if (!activeContextId) return;
    createMutation.mutate({
      name: `New navigator ${navigators.length + 1}`,
      contextId: activeContextId,
      mode: "path",
      pathType: "argument",
      traversalMode: "relation",
    });
  }, [createMutation, navigators.length]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Saved Navigators
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-2">
          {navigatorsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-bg-secondary"
                />
              ))}
            </div>
          ) : navigators.length > 0 ? (
            <div className="space-y-1.5" role="list" aria-label="Saved navigators">
              <AnimatePresence>
                {navigators.map((nav) => (
                  <NavigatorListItem
                    key={nav.id}
                    navigator={nav}
                    onSelect={() => onSelect(nav.id)}
                    onRefetch={() => navigatorsQuery.refetch()}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState
              icon={Route}
              headline="No saved navigators"
              description="Create a navigator to save your exploration paths."
              actionLabel="Create navigator"
              onAction={handleCreate}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── NavigatorListItem ─── */

function NavigatorListItem({
  navigator: nav,
  onSelect,
  onRefetch,
}: {
  navigator: NavigatorConfig;
  onSelect: () => void;
  onRefetch: () => void;
}) {
  const updateMutation = api.navigator.update.useMutation({
    onSuccess: onRefetch,
  });

  const pathTypeLabel = PATH_TYPE_LABELS[nav.pathType] ?? nav.pathType;

  const formattedDate = React.useMemo(() => {
    const d = new Date(nav.updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }, [nav.updatedAt]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      role="listitem"
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group flex w-full items-start gap-3 rounded-lg p-3 text-left",
          "border border-border bg-bg-primary",
          "transition-all duration-fast ease-default",
          "hover:shadow-hover hover:border-border-focus/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        )}
      >
        {/* Icon */}
        <Route
          className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
          aria-hidden="true"
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">
            {nav.name}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-text-tertiary">
            <span className="inline-flex items-center gap-0.5">
              <Route className="h-3 w-3" aria-hidden="true" />
              {pathTypeLabel}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Hash className="h-3 w-3" aria-hidden="true" />
              {nav.itemCount} items
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
              onClick={(e) => e.stopPropagation()}
              aria-label="Navigator actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={(e) => {
                e.stopPropagation();
                // Duplicate functionality
              }}
            >
              <Copy className="mr-2 h-4 w-4 text-text-tertiary" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-accent-error focus:text-accent-error"
              onSelect={(e) => {
                e.stopPropagation();
                // Delete functionality
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </button>
    </motion.div>
  );
}
