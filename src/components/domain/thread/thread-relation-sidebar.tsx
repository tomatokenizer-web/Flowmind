"use client";

import * as React from "react";
import { ExternalLink, Network } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { RelationBadge } from "~/components/domain/relation/relation-badge";
import { Skeleton } from "~/components/shared/skeleton";

/* ─── Types ─── */

interface ThreadRelationSidebarProps {
  /** The unit whose cross-thread relations to show */
  unitId: string;
  /** Set of unit IDs currently in the thread (to filter OUT) */
  threadUnitIds: Set<string>;
  /** Number of cross-thread relations (for the trigger badge) */
  crossRelationCount: number;
  /** Navigate to a unit */
  onNavigateToUnit?: (unitId: string) => void;
  /** Open unit in graph view */
  onOpenInGraph?: (unitId: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function ThreadRelationSidebar({
  unitId,
  threadUnitIds,
  crossRelationCount,
  onNavigateToUnit,
  onOpenInGraph,
  className,
}: ThreadRelationSidebarProps) {
  const [open, setOpen] = React.useState(false);

  // Lazy-load relations only when popover is opened
  const relationsQuery = api.relation.list.useQuery(
    { unitId },
    { enabled: open },
  );

  const relations = relationsQuery.data ?? [];

  // Filter to cross-thread relations only
  const crossRelations = React.useMemo(() => {
    return relations.filter((rel) => {
      const isSource = rel.sourceUnitId === unitId;
      const targetId = isSource ? rel.targetUnitId : rel.sourceUnitId;
      return !threadUnitIds.has(targetId);
    });
  }, [relations, unitId, threadUnitIds]);

  // Group by relation type
  const grouped = React.useMemo(() => {
    const map = new Map<
      string,
      {
        layer: string;
        items: typeof crossRelations;
      }
    >();
    for (const rel of crossRelations) {
      const key = rel.type;
      if (!map.has(key)) {
        map.set(key, { layer: "L1", items: [] });
      }
      map.get(key)!.items.push(rel);
    }
    return map;
  }, [crossRelations]);

  if (crossRelationCount === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
            "text-[10px] font-medium leading-tight",
            "bg-accent-primary/10 text-accent-primary",
            "transition-all duration-fast",
            "hover:bg-accent-primary/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            className,
          )}
          aria-label={`${crossRelationCount} cross-thread relation${crossRelationCount !== 1 ? "s" : ""}`}
        >
          <Network className="h-3 w-3" aria-hidden="true" />
          {crossRelationCount}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        className="w-80 p-0"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border">
          <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            Cross-thread relations
          </h4>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-64">
          {relationsQuery.isLoading ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height="40px" />
              ))}
            </div>
          ) : crossRelations.length === 0 ? (
            <p className="p-3 text-sm text-text-tertiary">
              No cross-thread relations found.
            </p>
          ) : (
            <div className="flex flex-col gap-2 p-2">
              {[...grouped.entries()].map(([type, { layer, items }]) => (
                <div key={type}>
                  {/* Type header */}
                  <div className="px-1 py-1">
                    <RelationBadge type={type} layer={layer} />
                  </div>

                  {/* Relation items */}
                  <div className="flex flex-col gap-1">
                    {items.map((rel) => {
                      const isSource = rel.sourceUnitId === unitId;
                      const targetId = isSource
                        ? rel.targetUnitId
                        : rel.sourceUnitId;
                      const targetContent = isSource
                        ? rel.targetUnit?.content
                        : rel.sourceUnit?.content;
                      const targetType = isSource
                        ? rel.targetUnit?.primaryType
                        : rel.sourceUnit?.primaryType;

                      return (
                        <div
                          key={rel.id}
                          className={cn(
                            "flex items-start gap-2 rounded-lg px-2 py-1.5",
                            "hover:bg-bg-hover transition-colors duration-fast group",
                          )}
                        >
                          {/* Content preview */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary line-clamp-2">
                              {targetContent ?? "Unknown unit"}
                            </p>
                            {targetType && (
                              <span
                                className="inline-block mt-0.5 text-[10px] font-medium capitalize rounded px-1 py-0.5"
                                style={{
                                  backgroundColor: `var(--unit-${targetType}-bg, var(--bg-secondary))`,
                                  color: `var(--unit-${targetType}-accent, var(--text-secondary))`,
                                }}
                              >
                                {targetType}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
                            {onNavigateToUnit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onNavigateToUnit(targetId)}
                                aria-label="Open unit"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                            {onOpenInGraph && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onOpenInGraph(targetId)}
                                aria-label="Open in graph"
                              >
                                <Network className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

ThreadRelationSidebar.displayName = "ThreadRelationSidebar";
