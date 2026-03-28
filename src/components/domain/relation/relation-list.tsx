"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { DestructiveDialog } from "~/components/ui/dialog";
import { Skeleton } from "~/components/shared/skeleton";
import { EmptyState } from "~/components/shared/empty-state";
import { RelationBadge, LAYER_COLORS } from "./relation-badge";

/* ─── Types ─── */

interface RelationListProps {
  /** The unit whose relations to display */
  unitId: string;
  /** Callback when "add relation" is clicked */
  onAddRelation?: () => void;
  /** Callback when a related unit is clicked */
  onNavigateToUnit?: (unitId: string) => void;
  className?: string;
}

/* ─── Component ─── */

export function RelationList({
  unitId,
  onAddRelation,
  onNavigateToUnit,
  className,
}: RelationListProps) {
  const utils = api.useUtils();

  const relationsQuery = api.relation.list.useQuery({ unitId });
  const deleteMutation = api.relation.delete.useMutation({
    onSuccess: () => {
      void utils.relation.list.invalidate({ unitId });
    },
  });

  const [collapsedTypes, setCollapsedTypes] = React.useState<Set<string>>(
    new Set(),
  );
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const relations = relationsQuery.data ?? [];

  /* ─── Group by relation type ─── */

  const grouped = React.useMemo(() => {
    const map = new Map<
      string,
      {
        layer: string;
        relations: typeof relations;
      }
    >();
    for (const rel of relations) {
      const key = rel.type;
      if (!map.has(key)) {
        map.set(key, { layer: "L1", relations: [] });
      }
      map.get(key)!.relations.push(rel);
    }
    return map;
  }, [relations]);

  function toggleType(type: string) {
    setCollapsedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleDelete() {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget });
      setDeleteTarget(null);
    }
  }

  /* ─── Loading ─── */

  if (relationsQuery.isLoading) {
    return (
      <div className={cn("flex flex-col gap-3 p-4", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="48px" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          Relations ({relations.length})
        </h3>
        {onAddRelation && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 text-xs"
            onClick={onAddRelation}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {relations.length === 0 ? (
          <EmptyState
            headline="No relations yet"
            description="Connect this unit to others to build your knowledge graph."
            actionLabel={onAddRelation ? "Add a relation" : undefined}
            onAction={onAddRelation}
            className="py-8"
          />
        ) : (
          <div className="flex flex-col gap-1 px-2 pb-4">
            {[...grouped.entries()].map(([type, { layer, relations: rels }]) => {
              const collapsed = collapsedTypes.has(type);
              const layerColor =
                LAYER_COLORS[layer] ?? { bg: "var(--bg-secondary)", text: "var(--text-secondary)" };

              return (
                <div key={type}>
                  {/* Type group header */}
                  <button
                    onClick={() => toggleType(type)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5",
                      "hover:bg-bg-hover transition-colors duration-fast",
                    )}
                    aria-expanded={!collapsed}
                  >
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 shrink-0 text-text-tertiary transition-transform duration-fast",
                        collapsed && "-rotate-90",
                      )}
                      aria-hidden="true"
                    />
                    <RelationBadge type={type} layer={layer} />
                    <span className="ml-auto text-xs text-text-tertiary tabular-nums">
                      {rels.length}
                    </span>
                  </button>

                  {/* Relation items */}
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1 pl-5 pr-1 py-1">
                          {rels.map((rel) => {
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
                                  "flex items-start gap-2 rounded-lg border border-border bg-bg-primary px-3 py-2",
                                  "hover:bg-bg-hover transition-colors duration-fast group",
                                )}
                              >
                                {/* Strength indicator bar */}
                                <div
                                  className="w-0.5 h-full min-h-[24px] rounded-full shrink-0 self-stretch"
                                  style={{ backgroundColor: layerColor.text }}
                                  aria-label={`Strength: ${((rel.strength ?? 0.5) * 100).toFixed(0)}%`}
                                />

                                {/* Content */}
                                <button
                                  onClick={() => onNavigateToUnit?.(targetId)}
                                  className="flex-1 min-w-0 text-left"
                                  disabled={!onNavigateToUnit}
                                >
                                  <p className="text-sm text-text-primary line-clamp-2">
                                    {targetContent ?? "Unknown unit"}
                                  </p>
                                  {targetType && (
                                    <span
                                      className="inline-block mt-1 text-xs rounded px-1 py-0.5 font-medium capitalize"
                                      style={{
                                        backgroundColor: `var(--unit-${targetType}-bg, var(--bg-secondary))`,
                                        color: `var(--unit-${targetType}-accent, var(--text-secondary))`,
                                      }}
                                    >
                                      {targetType}
                                    </span>
                                  )}
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => setDeleteTarget(rel.id)}
                                  className={cn(
                                    "shrink-0 p-1 rounded text-text-tertiary",
                                    "opacity-0 group-hover:opacity-100",
                                    "hover:text-accent-error hover:bg-accent-error/10",
                                    "transition-all duration-fast",
                                  )}
                                  aria-label="Delete relation"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Delete confirmation */}
      <DestructiveDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete relation"
        description="This will permanently remove this relation between the two units. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
