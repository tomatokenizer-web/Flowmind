"use client";

import * as React from "react";
import type { UnitType } from "@prisma/client";
import { Layers } from "lucide-react";
import { cn } from "~/lib/utils";
import { useContextUnits } from "~/hooks/use-context-units";
import { useContextBriefing } from "~/hooks/use-context-briefing";
import { usePanelStore } from "~/stores/panel-store";
import type { LifecycleState } from "~/components/unit/lifecycle-indicator";
import { UnitCard, type UnitCardUnit } from "~/components/unit/unit-card";
import { UnitCardSkeleton } from "~/components/unit/unit-card-skeleton";
import { EmptyState } from "~/components/shared/empty-state";
import { ContextHeader, ContextHeaderSkeleton } from "./context-header";
import { ContextBriefing } from "./context-briefing";

// ─── Props ───────────────────────────────────────────────────────────

interface ContextViewProps {
  projectId: string | undefined;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────

export function ContextView({ projectId, className }: ContextViewProps) {
  const {
    context,
    units,
    perspectiveMap,
    activeContextId,
    isLoading,
    isContextLoading,
  } = useContextUnits({ projectId });

  const openPanel = usePanelStore((s) => s.openPanel);

  const { briefing, isLoading: isBriefingLoading } =
    useContextBriefing(activeContextId);

  const handleUnitClick = React.useCallback(
    (unit: UnitCardUnit) => {
      openPanel(unit.id);
    },
    [openPanel],
  );

  const handleContinueWhereLeftOff = React.useCallback(() => {
    if (briefing?.lastViewedUnitId) {
      const el = document.getElementById(
        `unit-${briefing.lastViewedUnitId}`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [briefing?.lastViewedUnitId]);

  const handleStartFresh = React.useCallback(() => {
    // Briefing dismisses itself internally; no extra action needed
  }, []);

  // Map units to UnitCardUnit, applying perspective overrides
  const cardUnits: UnitCardUnit[] = React.useMemo(() => {
    return units.map((unit) => {
      const perspective = activeContextId
        ? perspectiveMap.get(unit.id)
        : undefined;

      return {
        id: unit.id,
        content: unit.content,
        unitType: ((perspective as { type?: string | null } | undefined)?.type as UnitType) ?? unit.unitType,
        lifecycle: unit.lifecycle as LifecycleState,
        createdAt: unit.createdAt,
        branchPotential: (unit as { branchPotential?: number }).branchPotential,
        relationCount: (unit as { _count?: { perspectives?: number } })._count?.perspectives,
        originType: unit.originType ?? undefined,
        sourceSpan: (unit as { sourceSpan?: string | null }).sourceSpan,
      };
    });
  }, [units, perspectiveMap, activeContextId]);

  return (
    <div className={cn("flex flex-col gap-space-4 p-space-4", className)}>
      {/* Context header — only when a context is active */}
      {activeContextId && (
        isContextLoading ? (
          <ContextHeaderSkeleton />
        ) : context ? (
          <ContextHeader
            name={context.name}
            snapshot={context.snapshot ?? ""}
            unitCount={context._count?.unitContexts ?? 0}
            perspectiveCount={context._count?.perspectives ?? 0}
          />
        ) : null
      )}

      {/* Context briefing — auto-displays on re-entry */}
      {activeContextId && !isBriefingLoading && briefing && (
        <ContextBriefing
          briefing={briefing}
          onContinue={handleContinueWhereLeftOff}
          onStartFresh={handleStartFresh}
        />
      )}

      {/* Unit list */}
      {isLoading ? (
        <div className="flex flex-col gap-space-3" role="list" aria-label="Loading units">
          {Array.from({ length: 5 }, (_, i) => (
            <UnitCardSkeleton key={i} />
          ))}
        </div>
      ) : cardUnits.length === 0 ? (
        <EmptyState
          icon={Layers}
          headline={
            activeContextId
              ? "No units in this context"
              : "No thought units yet"
          }
          description={
            activeContextId
              ? "Add units to this context to see them here."
              : "Capture your first thought to get started."
          }
        />
      ) : (
        <div
          className="flex flex-col gap-space-3"
          role="list"
          aria-label={
            activeContextId && context
              ? `Units in ${context.name}`
              : "All units"
          }
        >
          {cardUnits.map((unit) => (
            <div key={unit.id} id={`unit-${unit.id}`} role="listitem">
              <UnitCard
                unit={unit}
                onClick={handleUnitClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
