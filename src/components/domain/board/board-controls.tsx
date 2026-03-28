"use client";

import * as React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  LayoutGrid,
  Tag,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { SimpleTooltip } from "~/components/ui/tooltip";

/* ─── Types ─── */

export interface BoardSettings {
  showRelationLabels: boolean;
  showTypeIndicators: boolean;
  snapToGrid: boolean;
}

interface BoardControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onAutoLayout: () => void;
  onSnapToRelation: () => void;
  onAddUnit?: () => void;
  settings: BoardSettings;
  onSettingsChange: (settings: BoardSettings) => void;
  scale: number;
  unitCount: number;
  className?: string;
}

/* ─── Unit count warning threshold ─── */

const UNIT_WARN_THRESHOLD = 35;
const UNIT_MAX_THRESHOLD = 40;

/* ─── Component ─── */

export function BoardControls({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onAutoLayout,
  onSnapToRelation,
  onAddUnit,
  settings,
  onSettingsChange,
  scale,
  unitCount,
  className,
}: BoardControlsProps) {
  const scalePercent = Math.round(scale * 100);

  const toggleSetting = React.useCallback(
    <K extends keyof BoardSettings>(key: K) => {
      onSettingsChange({ ...settings, [key]: !settings[key] });
    },
    [settings, onSettingsChange],
  );

  return (
    <div
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 z-20",
        "flex items-center gap-1 rounded-xl border border-border px-2 py-1.5",
        "bg-bg-primary/90 backdrop-blur-sm shadow-elevated",
        className,
      )}
      role="toolbar"
      aria-label="Board controls"
    >
      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <SimpleTooltip content="Zoom out" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onZoomOut}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>

        <span
          className="w-10 text-center text-xs tabular-nums text-text-secondary select-none"
          aria-label={`Zoom level: ${scalePercent}%`}
        >
          {scalePercent}%
        </span>

        <SimpleTooltip content="Zoom in" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onZoomIn}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>

        <SimpleTooltip content="Fit to screen" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onFitToScreen}
            aria-label="Fit to screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border mx-1" aria-hidden="true" />

      {/* Layout controls */}
      <div className="flex items-center gap-0.5">
        <SimpleTooltip content="Snap to relation (re-arrange by connections)" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSnapToRelation}
            aria-label="Snap to relation"
          >
            <Magnet className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>

        <SimpleTooltip content="Auto-layout (force simulation)" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAutoLayout}
            aria-label="Auto layout"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border mx-1" aria-hidden="true" />

      {/* Display toggles */}
      <div className="flex items-center gap-0.5">
        <SimpleTooltip
          content={
            settings.showRelationLabels
              ? "Hide relation labels"
              : "Show relation labels"
          }
          side="top"
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              settings.showRelationLabels && "bg-bg-hover text-accent-primary",
            )}
            onClick={() => toggleSetting("showRelationLabels")}
            aria-label="Toggle relation labels"
            aria-pressed={settings.showRelationLabels}
          >
            <Tag className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>

        <SimpleTooltip
          content={
            settings.showTypeIndicators
              ? "Hide type badges"
              : "Show type badges"
          }
          side="top"
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              settings.showTypeIndicators && "bg-bg-hover text-accent-primary",
            )}
            onClick={() => toggleSetting("showTypeIndicators")}
            aria-label="Toggle type indicators"
            aria-pressed={settings.showTypeIndicators}
          >
            {settings.showTypeIndicators ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
        </SimpleTooltip>
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border mx-1" aria-hidden="true" />

      {/* Add unit */}
      {onAddUnit && (
        <SimpleTooltip content="Add unit to board" side="top">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAddUnit}
            aria-label="Add unit to board"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>
      )}

      {/* Unit count warning */}
      {unitCount >= UNIT_WARN_THRESHOLD && (
        <>
          <div className="h-5 w-px bg-border mx-1" aria-hidden="true" />
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              unitCount >= UNIT_MAX_THRESHOLD
                ? "bg-accent-error/10 text-accent-error"
                : "bg-yellow-500/10 text-yellow-600",
            )}
            role="status"
            aria-live="polite"
          >
            {unitCount}/{UNIT_MAX_THRESHOLD} units
          </span>
        </>
      )}
    </div>
  );
}

BoardControls.displayName = "BoardControls";
