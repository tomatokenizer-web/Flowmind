"use client";

import * as React from "react";
import {
  Link2,
  FolderOpen,
  Compass,
  Package,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { usePanelStore } from "~/stores/panel-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useLayoutStore } from "~/stores/layout-store";
import { RELATION_TYPE_COLORS } from "~/components/graph/graph-constants";

// ─── Types ──────────────────────────────────────────────────────────

interface ConnectionsTabProps {
  unitId: string;
  projectId: string;
  contextId?: string;
}

// ─── Collapsible Section ────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-lg border border-border bg-bg-primary overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-bg-hover transition-colors"
        aria-expanded={open}
      >
        <Chevron className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
        <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
        <span className="text-xs font-medium text-text-primary flex-1">{title}</span>
        <span className="text-[10px] tabular-nums text-text-tertiary">{count}</span>
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 space-y-1">
          {count === 0 ? (
            <p className="text-xs text-text-tertiary py-1">None</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

// ─── Strength bar ───────────────────────────────────────────────────

function StrengthBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-12 rounded-full bg-bg-secondary overflow-hidden shrink-0">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── Relations Section ──────────────────────────────────────────────

function RelationsSection({ unitId }: { unitId: string }) {
  const openPanel = usePanelStore((s) => s.openPanel);

  const { data: relations = [], isLoading } = api.relation.listByUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  // Group relations by type, sorted by strongest first within each group
  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof relations>();
    for (const rel of relations) {
      const arr = map.get(rel.type) ?? [];
      arr.push(rel);
      map.set(rel.type, arr);
    }
    // Sort each group by strength descending
    for (const [, arr] of map) {
      arr.sort((a, b) => b.strength - a.strength);
    }
    return [...map.entries()].sort(
      (a, b) => Math.max(...b[1].map((r) => r.strength)) - Math.max(...a[1].map((r) => r.strength)),
    );
  }, [relations]);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title="Relations"
      icon={Link2}
      count={relations.length}
      defaultOpen={relations.length > 0}
    >
      {grouped.map(([type, rels]) => (
        <div key={type} className="space-y-1">
          <div className="flex items-center gap-1.5 pt-1">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${RELATION_TYPE_COLORS[type] ?? "#6B7280"}20`,
                color: RELATION_TYPE_COLORS[type] ?? "#6B7280",
              }}
            >
              {type.replace(/_/g, " ")}
            </span>
          </div>
          {rels.map((rel) => {
            const other =
              rel.sourceUnitId === unitId ? rel.targetUnit : rel.sourceUnit;
            const color = RELATION_TYPE_COLORS[rel.type] ?? "#6B7280";
            return (
              <button
                key={rel.id}
                type="button"
                onClick={() => other && openPanel(other.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-bg-hover transition-colors group"
              >
                <span className="flex-1 text-xs text-text-primary truncate">
                  {other?.content?.slice(0, 30) ?? "Unknown unit"}
                  {(other?.content?.length ?? 0) > 30 ? "..." : ""}
                </span>
                <StrengthBar value={rel.strength} color={color} />
              </button>
            );
          })}
        </div>
      ))}
    </CollapsibleSection>
  );
}

// ─── Contexts Section ───────────────────────────────────────────────

function ContextsSection({ unitId }: { unitId: string }) {
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);

  const { data: contexts = [], isLoading } = api.unit.getContextsForUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title="Contexts"
      icon={FolderOpen}
      count={contexts.length}
      defaultOpen={contexts.length > 0}
    >
      {contexts.map((ctx) => {
        const isCurrent = ctx.id === activeContextId;
        return (
          <button
            key={ctx.id}
            type="button"
            onClick={() => setActiveContext(ctx.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-bg-hover transition-colors",
              isCurrent && "border-l-2 border-accent-primary pl-1.5",
            )}
          >
            <FolderOpen className="h-3 w-3 shrink-0 text-text-tertiary" aria-hidden="true" />
            <span className={cn("flex-1 text-xs truncate", isCurrent ? "text-accent-primary font-medium" : "text-text-primary")}>
              {ctx.name}
            </span>
            <span className="text-[10px] tabular-nums text-text-tertiary">
              {ctx.unitCount} units
            </span>
          </button>
        );
      })}
    </CollapsibleSection>
  );
}

// ─── Navigators Section ─────────────────────────────────────────────

const PURPOSE_BADGE_COLORS: Record<string, string> = {
  argument: "#3B82F6",
  derivation: "#8B5CF6",
  evidence: "#F59E0B",
  exploration: "#10B981",
  "ai-generated": "#06B6D4",
};

function NavigatorsSection({ unitId }: { unitId: string }) {
  const setViewMode = useLayoutStore((s) => s.setViewMode);

  const { data: navigators = [], isLoading } = api.navigator.listByUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title="Navigators"
      icon={Compass}
      count={navigators.length}
      defaultOpen={navigators.length > 0}
    >
      {navigators.map((nav) => {
        const stepIndex = nav.path.indexOf(unitId);
        const stepLabel = stepIndex >= 0 ? `Step ${stepIndex + 1} of ${nav.path.length}` : "";
        const purposeColor = PURPOSE_BADGE_COLORS[nav.purpose ?? ""] ?? "#6B7280";

        return (
          <button
            key={nav.id}
            type="button"
            onClick={() => setViewMode("navigate")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-bg-hover transition-colors"
          >
            <Compass className="h-3 w-3 shrink-0 text-text-tertiary" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-text-primary truncate block">{nav.name}</span>
              <span className="text-[10px] text-text-tertiary">{stepLabel}</span>
            </div>
            {nav.purpose && (
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                style={{
                  backgroundColor: `${purposeColor}20`,
                  color: purposeColor,
                }}
              >
                {nav.purpose}
              </span>
            )}
          </button>
        );
      })}
    </CollapsibleSection>
  );
}

// ─── Assemblies Section ─────────────────────────────────────────────

function AssembliesSection({ unitId }: { unitId: string }) {
  const setViewMode = useLayoutStore((s) => s.setViewMode);

  const { data: assemblies = [], isLoading } = api.assembly.listByUnit.useQuery(
    { unitId },
    { enabled: !!unitId },
  );

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title="Assemblies"
      icon={Package}
      count={assemblies.length}
      defaultOpen={assemblies.length > 0}
    >
      {assemblies.map((asm) => {
        const position = asm.items[0]?.position;
        return (
          <button
            key={asm.id}
            type="button"
            onClick={() => setViewMode("assembly")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-bg-hover transition-colors"
          >
            <Package className="h-3 w-3 shrink-0 text-text-tertiary" aria-hidden="true" />
            <span className="flex-1 text-xs text-text-primary truncate">{asm.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {asm.templateType && (
                <span className="text-[10px] text-text-tertiary">{asm.templateType}</span>
              )}
              {position !== undefined && (
                <span className="text-[10px] tabular-nums text-text-tertiary">
                  #{position + 1}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </CollapsibleSection>
  );
}

// ─── ConnectionsTab ─────────────────────────────────────────────────

export function ConnectionsTab({ unitId, projectId: _projectId, contextId: _contextId }: ConnectionsTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <RelationsSection unitId={unitId} />
      <ContextsSection unitId={unitId} />
      <NavigatorsSection unitId={unitId} />
      <AssembliesSection unitId={unitId} />
    </div>
  );
}
