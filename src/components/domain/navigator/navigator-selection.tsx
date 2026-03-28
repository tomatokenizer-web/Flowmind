"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointerClick,
  Compass,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { EmptyState } from "~/components/shared/empty-state";
import { UnitCard, type UnitCardUnit } from "~/components/domain/unit";
import { RelationBadge } from "~/components/domain/relation";
import type { UseNavigatorReturn, PathNode } from "~/hooks/use-navigator";
import { PATH_TYPE_RELATIONS } from "~/hooks/use-navigator";
import { useUnitSelectionStore } from "~/stores/unit-selection-store";
import { api } from "~/trpc/react";

/* ─── Types ─── */

interface NavigatorSelectionProps {
  navigator: UseNavigatorReturn;
  className?: string;
}

interface NeighborGroup {
  relationType: string;
  layer?: string;
  neighbors: NeighborUnit[];
}

interface NeighborUnit {
  unitId: string;
  relationType: string;
  layer?: string;
  unit?: UnitCardUnit;
}

/* ─── NavigationHistory ─── */

function NavigationHistory({
  history,
  onJumpTo,
}: {
  history: { unitId: string; label: string }[];
  onJumpTo: (index: number) => void;
}) {
  if (history.length === 0) return null;

  return (
    <nav aria-label="Exploration history" className="px-4 py-2 border-b border-border">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
        History
      </p>
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {history.map((item, i) => (
          <React.Fragment key={`${item.unitId}-${i}`}>
            {i > 0 && (
              <ChevronRight
                className="h-3 w-3 shrink-0 text-text-tertiary"
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={() => onJumpTo(i)}
              className={cn(
                "shrink-0 rounded px-2 py-0.5",
                "text-[11px] text-text-secondary whitespace-nowrap",
                "transition-colors duration-fast",
                "hover:bg-bg-hover hover:text-text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                i === history.length - 1 && "font-medium text-text-primary",
              )}
            >
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

/* ─── NeighborGroupSection ─── */

function NeighborGroupSection({
  group,
  onSelectNeighbor,
}: {
  group: NeighborGroup;
  onSelectNeighbor: (neighbor: NeighborUnit) => void;
}) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
          "text-left transition-colors duration-fast",
          "hover:bg-bg-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        )}
        aria-expanded={expanded}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform duration-fast",
            expanded && "rotate-90",
          )}
          aria-hidden="true"
        />
        <RelationBadge type={group.relationType} layer={group.layer} />
        <span className="text-[10px] text-text-tertiary">
          ({group.neighbors.length})
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-6 space-y-1.5 overflow-hidden pb-2"
          >
            {group.neighbors.map((neighbor) => (
              <button
                key={neighbor.unitId}
                type="button"
                onClick={() => onSelectNeighbor(neighbor)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg p-2 text-left",
                  "transition-all duration-fast ease-default",
                  "hover:bg-bg-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                )}
              >
                <div className="min-w-0 flex-1">
                  {neighbor.unit ? (
                    <UnitCard unit={neighbor.unit} variant="compact" />
                  ) : (
                    <div className="h-12 animate-pulse rounded-card bg-bg-secondary" />
                  )}
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
                  aria-hidden="true"
                />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── NavigatorSelection Component ─── */

export function NavigatorSelection({
  navigator,
  className,
}: NavigatorSelectionProps) {
  const selectedUnitIds = useUnitSelectionStore((s) => s.selectedUnitIds);
  const [explorationHistory, setExplorationHistory] = React.useState<
    { unitId: string; label: string }[]
  >([]);
  const [currentExploringId, setCurrentExploringId] = React.useState<
    string | null
  >(null);
  const [neighborGroups, setNeighborGroups] = React.useState<NeighborGroup[]>(
    [],
  );

  // Query for the currently exploring unit
  const exploringUnitQuery = api.unit.getById.useQuery(
    { id: currentExploringId ?? "" },
    { enabled: !!currentExploringId },
  );

  // Query for relations from the current unit
  const relationsQuery = api.relation.list.useQuery(
    { unitId: currentExploringId! },
    { enabled: !!currentExploringId },
  );

  // Build neighbor groups when relations load
  React.useEffect(() => {
    if (!relationsQuery.data || !currentExploringId) {
      setNeighborGroups([]);
      return;
    }

    const relations = relationsQuery.data as Array<{
      id: string;
      type: string;
      layer?: string;
      sourceUnitId: string;
      targetUnitId: string;
    }>;

    // Filter to relevant path type relations
    const relevantTypes = new Set(
      PATH_TYPE_RELATIONS[navigator.pathType] ?? [],
    );

    const grouped = new Map<string, NeighborUnit[]>();

    for (const rel of relations) {
      if (
        rel.sourceUnitId !== currentExploringId &&
        rel.targetUnitId !== currentExploringId
      ) {
        continue;
      }

      // If we have path type filtering, apply it
      if (relevantTypes.size > 0 && !relevantTypes.has(rel.type)) {
        continue;
      }

      const neighborId =
        rel.sourceUnitId === currentExploringId
          ? rel.targetUnitId
          : rel.sourceUnitId;

      const key = rel.type;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push({
        unitId: neighborId,
        relationType: rel.type,
        layer: rel.layer,
      });
    }

    const groups: NeighborGroup[] = Array.from(grouped.entries()).map(
      ([type, neighbors]) => ({
        relationType: type,
        layer: neighbors[0]?.layer,
        neighbors,
      }),
    );

    setNeighborGroups(groups);
  }, [relationsQuery.data, currentExploringId, navigator.pathType]);

  const handleExploreFromSelection = React.useCallback(() => {
    const ids = Array.from(selectedUnitIds);
    if (ids.length === 0) return;

    const firstId = ids[0]!;
    setCurrentExploringId(firstId);
    setExplorationHistory([{ unitId: firstId, label: `Unit ${firstId.slice(0, 6)}...` }]);

    // Also start the navigator path
    navigator.startNavigation(ids);
  }, [selectedUnitIds, navigator]);

  const handleSelectNeighbor = React.useCallback(
    (neighbor: NeighborUnit) => {
      const newNode: PathNode = {
        unitId: neighbor.unitId,
        relationFromPrevious: neighbor.relationType,
        relationLayer: neighbor.layer,
        visited: true,
        branches: [],
      };

      navigator.appendToPath(newNode);
      setCurrentExploringId(neighbor.unitId);
      setExplorationHistory((prev) => [
        ...prev,
        {
          unitId: neighbor.unitId,
          label: `Unit ${neighbor.unitId.slice(0, 6)}...`,
        },
      ]);
    },
    [navigator],
  );

  const handleHistoryJump = React.useCallback(
    (index: number) => {
      const item = explorationHistory[index];
      if (!item) return;

      setCurrentExploringId(item.unitId);
      setExplorationHistory((prev) => prev.slice(0, index + 1));
      navigator.goToStep(index);
    },
    [explorationHistory, navigator],
  );

  const exploringUnit = exploringUnitQuery.data as UnitCardUnit | undefined;
  const selectionArray = Array.from(selectedUnitIds);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Navigation history */}
      <NavigationHistory
        history={explorationHistory}
        onJumpTo={handleHistoryJump}
      />

      <ScrollArea className="flex-1">
        <div className="px-4 py-3">
          {/* No selection state */}
          {selectionArray.length === 0 && !currentExploringId && (
            <EmptyState
              icon={MousePointerClick}
              headline="No units selected"
              description="Select one or more units from your context to start exploring connections."
            />
          )}

          {/* Selected units + explore button */}
          {selectionArray.length > 0 && !currentExploringId && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-text-tertiary">
                  {selectionArray.length} unit{selectionArray.length > 1 ? "s" : ""} selected
                </p>
                <Button
                  size="sm"
                  onClick={handleExploreFromSelection}
                  className="gap-1.5"
                >
                  <Compass className="h-3.5 w-3.5" />
                  Explore from here
                </Button>
              </div>

              <div className="space-y-2">
                {selectionArray.map((id) => (
                  <SelectedUnitPreview key={id} unitId={id} />
                ))}
              </div>
            </div>
          )}

          {/* Exploring mode: current unit + neighbors */}
          {currentExploringId && (
            <div>
              {/* Current unit */}
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                  Currently exploring
                </p>
                {exploringUnit ? (
                  <UnitCard unit={exploringUnit} variant="default" />
                ) : exploringUnitQuery.isLoading ? (
                  <div className="h-24 animate-pulse rounded-card bg-bg-secondary" />
                ) : null}
              </div>

              {/* Neighbor groups */}
              <div>
                <p className="mb-2 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                  Connections ({navigator.pathType})
                </p>

                {neighborGroups.length > 0 ? (
                  <div className="space-y-1">
                    {neighborGroups.map((group) => (
                      <NeighborGroupSection
                        key={group.relationType}
                        group={group}
                        onSelectNeighbor={handleSelectNeighbor}
                      />
                    ))}
                  </div>
                ) : relationsQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded-lg bg-bg-secondary"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-tertiary py-4 text-center">
                    No {navigator.pathType} connections found from this unit.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── SelectedUnitPreview ─── */

function SelectedUnitPreview({ unitId }: { unitId: string }) {
  const unitQuery = api.unit.getById.useQuery(
    { id: unitId },
    { enabled: !!unitId },
  );

  const unit = unitQuery.data as UnitCardUnit | undefined;

  if (unitQuery.isLoading) {
    return <div className="h-16 animate-pulse rounded-card bg-bg-secondary" />;
  }

  if (!unit) {
    return (
      <div className="rounded-card border border-dashed border-border p-3">
        <p className="text-xs text-text-tertiary">Unit not found</p>
      </div>
    );
  }

  return <UnitCard unit={unit} variant="compact" />;
}
