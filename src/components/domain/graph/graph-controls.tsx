"use client";

import * as React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Layers,
  Eye,
  EyeOff,
  Archive,
  Circle,
  GitBranch,
  Orbit,
  type LucideIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { GraphFilterState, GraphLayoutMode } from "./graph-types";
import {
  ALL_UNIT_TYPES,
  ALL_LAYERS,
  UNIT_TYPE_ACCENT_COLORS,
  LAYER_EDGE_COLORS,
  DEFAULT_NODE_COLOR,
  DEFAULT_EDGE_COLOR,
} from "./graph-types";

/* ─── Props ─── */

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  filter: GraphFilterState;
  onFilterChange: (filter: GraphFilterState) => void;
  layout: GraphLayoutMode;
  onLayoutChange: (layout: GraphLayoutMode) => void;
  className?: string;
}

/* ─── Layout Icons ─── */

const LAYOUT_OPTIONS: { mode: GraphLayoutMode; label: string; Icon: LucideIcon }[] = [
  { mode: "force", label: "Force-directed", Icon: GitBranch },
  { mode: "radial", label: "Radial", Icon: Orbit },
  { mode: "hierarchical", label: "Hierarchical", Icon: Layers },
];

/* ─── Component ─── */

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  filter,
  onFilterChange,
  layout,
  onLayoutChange,
  className,
}: GraphControlsProps) {
  const [filterOpen, setFilterOpen] = React.useState(false);

  const toggleUnitType = React.useCallback(
    (type: string) => {
      const next = new Set(filter.visibleUnitTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      onFilterChange({ ...filter, visibleUnitTypes: next });
    },
    [filter, onFilterChange],
  );

  const toggleLayer = React.useCallback(
    (layer: string) => {
      const next = new Set(filter.visibleLayers);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      onFilterChange({ ...filter, visibleLayers: next });
    },
    [filter, onFilterChange],
  );

  return (
    <div
      className={cn(
        "absolute flex flex-col gap-1.5",
        "top-3 right-3",
        className,
      )}
      role="toolbar"
      aria-label="Graph controls"
    >
      {/* Zoom controls */}
      <div className="flex flex-col rounded-lg overflow-hidden shadow-resting" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-default)" }}>
        <ControlButton icon={ZoomIn} label="Zoom in" onClick={onZoomIn} />
        <ControlButton icon={ZoomOut} label="Zoom out" onClick={onZoomOut} />
        <ControlButton icon={Maximize2} label="Fit to screen" onClick={onFitToScreen} />
      </div>

      {/* Filter toggle */}
      <div className="flex flex-col rounded-lg overflow-hidden shadow-resting" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-default)" }}>
        <ControlButton
          icon={Filter}
          label="Toggle filters"
          onClick={() => setFilterOpen((o) => !o)}
          active={filterOpen}
        />
      </div>

      {/* Layout selector */}
      <div className="flex flex-col rounded-lg overflow-hidden shadow-resting" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-default)" }}>
        {LAYOUT_OPTIONS.map(({ mode, label, Icon }) => (
          <ControlButton
            key={mode}
            icon={Icon}
            label={label}
            onClick={() => onLayoutChange(mode)}
            active={layout === mode}
          />
        ))}
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <FilterPanel
          filter={filter}
          onFilterChange={onFilterChange}
          onToggleUnitType={toggleUnitType}
          onToggleLayer={toggleLayer}
        />
      )}
    </div>
  );
}

/* ─── Control Button ─── */

function ControlButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center justify-center w-8 h-8",
        "transition-colors duration-fast",
        "hover:bg-bg-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-inset",
        active && "bg-bg-hover",
      )}
      style={{ color: active ? "var(--accent-primary)" : "var(--text-secondary)" }}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/* ─── Filter Panel ─── */

function FilterPanel({
  filter,
  onFilterChange,
  onToggleUnitType,
  onToggleLayer,
}: {
  filter: GraphFilterState;
  onFilterChange: (filter: GraphFilterState) => void;
  onToggleUnitType: (type: string) => void;
  onToggleLayer: (layer: string) => void;
}) {
  return (
    <div
      className="rounded-lg p-3 shadow-elevated"
      style={{
        backgroundColor: "var(--bg-primary)",
        border: "1px solid var(--border-default)",
        width: 220,
      }}
      role="region"
      aria-label="Graph filters"
    >
      {/* Unit types */}
      <h4
        className="text-[10px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        Unit Types
      </h4>
      <div className="flex flex-wrap gap-1 mb-3">
        {ALL_UNIT_TYPES.map((type) => {
          const visible = filter.visibleUnitTypes.has(type);
          const color = UNIT_TYPE_ACCENT_COLORS[type] ?? DEFAULT_NODE_COLOR;
          return (
            <button
              key={type}
              onClick={() => onToggleUnitType(type)}
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                "text-[10px] font-medium capitalize",
                "transition-all duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                visible ? "opacity-100" : "opacity-30",
              )}
              style={{
                backgroundColor: visible ? `${color}20` : "var(--bg-secondary)",
                color: visible ? color : "var(--text-tertiary)",
              }}
              aria-pressed={visible}
              aria-label={`${visible ? "Hide" : "Show"} ${type} units`}
            >
              <Circle className="h-2 w-2" style={{ fill: color }} aria-hidden="true" />
              {type}
            </button>
          );
        })}
      </div>

      {/* Relation layers */}
      <h4
        className="text-[10px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        Relation Layers
      </h4>
      <div className="flex flex-wrap gap-1 mb-3">
        {ALL_LAYERS.map((layer) => {
          const visible = filter.visibleLayers.has(layer);
          const color = LAYER_EDGE_COLORS[layer] ?? DEFAULT_EDGE_COLOR;
          return (
            <button
              key={layer}
              onClick={() => onToggleLayer(layer)}
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                "text-[10px] font-medium",
                "transition-all duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                visible ? "opacity-100" : "opacity-30",
              )}
              style={{
                backgroundColor: visible ? `${color}20` : "var(--bg-secondary)",
                color: visible ? color : "var(--text-tertiary)",
              }}
              aria-pressed={visible}
              aria-label={`${visible ? "Hide" : "Show"} ${layer} relations`}
            >
              {layer}
            </button>
          );
        })}
      </div>

      {/* Toggle switches */}
      <div className="flex flex-col gap-1.5">
        <ToggleRow
          label="Show orphans"
          checked={filter.showOrphans}
          onChange={() =>
            onFilterChange({ ...filter, showOrphans: !filter.showOrphans })
          }
        />
        <ToggleRow
          label="Show archived"
          checked={filter.showArchived}
          onChange={() =>
            onFilterChange({ ...filter, showArchived: !filter.showArchived })
          }
          icon={filter.showArchived ? Eye : EyeOff}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--border-default)" }}>
        <h4
          className="text-[10px] font-medium uppercase tracking-wide mb-1.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          Legend
        </h4>
        <div className="flex flex-col gap-1">
          <LegendItem>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              Node size = ThoughtRank
            </span>
          </LegendItem>
          <LegendItem>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              Edge width = relation strength
            </span>
          </LegendItem>
          <LegendItem>
            <Archive className="h-2.5 w-2.5 shrink-0" style={{ color: "var(--text-tertiary)" }} aria-hidden="true" />
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              Faded = archived or draft
            </span>
          </LegendItem>
        </div>
      </div>
    </div>
  );
}

/* ─── Toggle Row ─── */

function ToggleRow({
  label,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "flex items-center gap-2 w-full rounded px-1.5 py-1",
        "text-[11px] text-left",
        "hover:bg-bg-hover transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
      )}
      style={{ color: "var(--text-secondary)" }}
      role="switch"
      aria-checked={checked}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span className="flex-1">{label}</span>
      <span
        className={cn(
          "w-6 h-3.5 rounded-full relative transition-colors duration-fast",
          checked ? "bg-accent-primary" : "bg-text-tertiary/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform duration-fast shadow-sm",
            checked ? "translate-x-2.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

/* ─── Legend Item ─── */

function LegendItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {children}
    </div>
  );
}

GraphControls.displayName = "GraphControls";
