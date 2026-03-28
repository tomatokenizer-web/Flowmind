"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Clock,
  Layers,
  Plus,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/shared/skeleton";
import { EmptyContexts } from "~/components/shared/empty-state";

/* ─── Types ─── */

interface ContextListProps {
  /** Callback to create a new context */
  onCreateNew?: () => void;
  className?: string;
}

/* ─── Component ─── */

export function ContextList({ onCreateNew, className }: ContextListProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const setActiveContext = useWorkspaceStore((s) => s.setActiveContext);

  const contextsQuery = api.context.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId },
  );

  const contexts = contextsQuery.data ?? [];
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(
    new Set(),
  );

  /* ─── Group by inquiry ─── */

  const grouped = React.useMemo(() => {
    const map = new Map<
      string,
      { inquiryId: string | null; contexts: typeof contexts }
    >();
    for (const c of contexts) {
      const key = c.inquiryId ?? "Ungrouped";
      if (!map.has(key)) {
        map.set(key, { inquiryId: c.inquiryId ?? null, contexts: [] });
      }
      map.get(key)!.contexts.push(c);
    }
    return map;
  }, [contexts]);

  function toggleGroup(name: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function formatRelativeTime(date: string | Date | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /* ─── Loading ─── */

  if (contextsQuery.isLoading) {
    return (
      <div className={cn("flex flex-col gap-2 p-3", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="40px" />
        ))}
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className={className}>
        <EmptyContexts onAction={onCreateNew} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Create button */}
      {onCreateNew && (
        <div className="px-3 py-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onCreateNew}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New context
          </Button>
        </div>
      )}

      {/* Grouped list */}
      <ScrollArea className="flex-1">
        <nav aria-label="Context list" className="px-1 pb-2">
          {[...grouped.entries()].map(([inquiryName, { contexts: ctxs }]) => {
            const collapsed = collapsedGroups.has(inquiryName);
            return (
              <div key={inquiryName} className="mb-1">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(inquiryName)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5",
                    "text-xs font-medium text-text-tertiary uppercase tracking-wide",
                    "hover:bg-bg-hover transition-colors duration-fast",
                  )}
                  aria-expanded={!collapsed}
                >
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 shrink-0 transition-transform duration-fast",
                      collapsed && "-rotate-90",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{inquiryName}</span>
                  <span className="ml-auto text-text-tertiary tabular-nums">
                    {ctxs.length}
                  </span>
                </button>

                {/* Context items */}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      {ctxs.map((ctx) => {
                        const isActive = ctx.id === activeContextId;
                        return (
                          <button
                            key={ctx.id}
                            onClick={() => setActiveContext(ctx.id)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-3 py-2 ml-1",
                              "text-sm text-left transition-colors duration-fast",
                              isActive
                                ? "bg-accent-primary/10 text-accent-primary font-medium"
                                : "text-text-primary hover:bg-bg-hover",
                              ctx.status === "archived" && "opacity-50",
                            )}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Layers
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive ? "text-accent-primary" : "text-text-tertiary",
                              )}
                              aria-hidden="true"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="block truncate">{ctx.name}</span>
                              <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
                                <span>{ctx.counts?.units ?? 0} units</span>
                                {ctx.updatedAt && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                    {formatRelativeTime(ctx.updatedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
