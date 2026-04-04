"use client";

import * as React from "react";
import { Plus, Minus, Maximize2, List, BookOpen, Filter } from "lucide-react";
import { useGraphStore } from "~/stores/graphStore";
import { useLayoutStore } from "~/stores/layout-store";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { usePrefersReducedMotion } from "~/hooks/use-prefers-reduced-motion";
import { RelationGlossary } from "./RelationGlossary";

// ─── Unit type config ─────────────────────────────────────────────

const UNIT_TYPES = [
  { key: "claim", label: "Claim", color: "#3B82F6" },
  { key: "question", label: "Question", color: "#F59E0B" },
  { key: "evidence", label: "Evidence", color: "#10B981" },
  { key: "counterargument", label: "Counter", color: "#EF4444" },
  { key: "observation", label: "Observation", color: "#8B5CF6" },
  { key: "idea", label: "Idea", color: "#F97316" },
  { key: "definition", label: "Definition", color: "#06B6D4" },
  { key: "assumption", label: "Assumption", color: "#EC4899" },
  { key: "action", label: "Action", color: "#84CC16" },
] as const;

// ─── Relation type config ─────────────────────────────────────────

const RELATION_CATEGORIES = [
  { key: "supports", label: "Supports", color: "#10B981" },
  { key: "contradicts", label: "Contradicts", color: "#EF4444" },
  { key: "derives_from", label: "Derives", color: "#3B82F6" },
  { key: "expands", label: "Expands", color: "#8B5CF6" },
  { key: "references", label: "References", color: "#6B7280" },
  { key: "exemplifies", label: "Exemplifies", color: "#F59E0B" },
  { key: "defines", label: "Defines", color: "#06B6D4" },
  { key: "questions", label: "Questions", color: "#F97316" },
] as const;

function sanitizeContent(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ");
}

export function GraphControls() {
  const layer = useGraphStore((s) => s.layer);
  const localHubId = useGraphStore((s) => s.localHubId);
  const localHubLabel = useGraphStore((s) => s.localHubLabel);
  const zoomLevel = useGraphStore((s) => s.zoomLevel);
  const setZoom = useGraphStore((s) => s.setZoom);
  const _setPan = useGraphStore((s) => s.setPan);
  const filters = useGraphStore((s) => s.filters);
  const toggleUnitTypeFilter = useGraphStore((s) => s.toggleUnitTypeFilter);
  const toggleRelationCategoryFilter = useGraphStore(
    (s) => s.toggleRelationCategoryFilter,
  );
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const _prefersReducedMotion = usePrefersReducedMotion();
  const [glossaryOpen, setGlossaryOpen] = React.useState(false);

  const handleFitAll = React.useCallback(() => {
    // Dispatch a custom event so the canvas can calculate the bounding box
    window.dispatchEvent(new CustomEvent("flowmind:fit-all"));
  }, []);

  return (
    <>
      {/* Top-right: layer indicator + thread toggle */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <div className="rounded-lg bg-bg-secondary/90 px-3 py-1.5 text-sm font-medium text-text-primary shadow-md backdrop-blur-sm border border-border">
          {layer === "global"
            ? "Global Overview"
            : `Local: ${localHubLabel ? sanitizeContent(localHubLabel).slice(0, 30) + (localHubLabel.length > 30 ? "..." : "") : localHubId?.slice(0, 8) + "..."}`}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-bg-secondary/90 backdrop-blur-sm"
                onClick={() => setGlossaryOpen(true)}
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Glossary</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Relation Type Glossary</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-bg-secondary/90 backdrop-blur-sm"
                onClick={() => setViewMode("thread")}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Thread</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch to Thread View (linear reading)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Top-left: compact filter popovers */}
      {layer === "global" && (
        <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5">
          {/* Unit types filter popover */}
          <FilterPopover
            label="Types"
            items={UNIT_TYPES}
            hiddenKeys={filters.unitTypes}
            onToggle={toggleUnitTypeFilter}
            renderSwatch={(item, hidden) => (
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: item.color,
                  opacity: hidden ? 0.3 : 1,
                }}
              />
            )}
          />

          {/* Relation types filter popover */}
          <FilterPopover
            label="Relations"
            items={RELATION_CATEGORIES}
            hiddenKeys={filters.relationCategories}
            onToggle={toggleRelationCategoryFilter}
            renderSwatch={(item, hidden) => (
              <span
                className="inline-block h-2 w-4 shrink-0 rounded-sm"
                style={{
                  backgroundColor: item.color,
                  opacity: hidden ? 0.3 : 0.8,
                }}
              />
            )}
          />
        </div>
      )}

      {/* Bottom-right: zoom controls */}
      {layer === "global" && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-bg-secondary/90 backdrop-blur-sm"
            onClick={() => setZoom(zoomLevel * 1.2)}
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-bg-secondary/90 backdrop-blur-sm"
            onClick={() => setZoom(zoomLevel / 1.2)}
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-bg-secondary/90 backdrop-blur-sm"
                  onClick={handleFitAll}
                  aria-label="Fit all nodes into view"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fit all nodes into view</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="mt-1 text-center text-[10px] text-text-tertiary">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      )}

      {/* Bottom-left: mini-map */}
      {layer === "global" && <MiniMap />}

      {/* Relation glossary dialog */}
      <RelationGlossary
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />
    </>
  );
}

// ─── Filter popover ──────────────────────────────────────────────

interface FilterItem {
  readonly key: string;
  readonly label: string;
  readonly color: string;
}

function FilterPopover<T extends FilterItem>({
  label,
  items,
  hiddenKeys,
  onToggle,
  renderSwatch,
}: {
  label: string;
  items: readonly T[];
  hiddenKeys: string[];
  onToggle: (key: string) => void;
  renderSwatch: (item: T, hidden: boolean) => React.ReactNode;
}) {
  const total = items.length;
  const activeCount = total - hiddenKeys.length;
  const allVisible = hiddenKeys.length === 0;
  const noneVisible = hiddenKeys.length === total;

  const handleToggleAll = React.useCallback(() => {
    if (allVisible) {
      // Hide all: toggle each visible item
      for (const item of items) {
        if (!hiddenKeys.includes(item.key)) onToggle(item.key);
      }
    } else {
      // Show all: toggle each hidden item
      for (const item of items) {
        if (hiddenKeys.includes(item.key)) onToggle(item.key);
      }
    }
  }, [allVisible, hiddenKeys, items, onToggle]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
            "border border-border bg-bg-secondary/90 backdrop-blur-sm",
            "hover:bg-bg-secondary transition-colors",
            "text-text-primary shadow-sm",
          )}
          aria-label={`Filter ${label}`}
        >
          <Filter className="h-3 w-3 text-text-tertiary" />
          {label}
          {!allVisible && (
            <span className="rounded bg-accent-primary/15 px-1 py-px text-[10px] font-semibold text-accent-primary">
              {activeCount}/{total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-52 p-2"
      >
        {/* Show all / Hide all toggle */}
        <button
          type="button"
          onClick={handleToggleAll}
          className="mb-1.5 w-full rounded px-2 py-1 text-left text-[11px] font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
        >
          {allVisible ? "Hide all" : noneVisible ? "Show all" : "Show all"}
        </button>
        <div className="h-px bg-border mb-1.5" />
        {/* Filter items */}
        <div className="flex flex-col gap-0.5" role="group" aria-label={`Filter by ${label.toLowerCase()}`}>
          {items.map((item) => {
            const isHidden = hiddenKeys.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onToggle(item.key)}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors",
                  "hover:bg-bg-secondary",
                  isHidden ? "text-text-tertiary" : "text-text-primary",
                )}
                aria-pressed={!isHidden}
                aria-label={`${isHidden ? "Show" : "Hide"} ${item.label}`}
              >
                {/* Checkbox indicator */}
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                    isHidden
                      ? "border-border bg-transparent"
                      : "border-accent-primary bg-accent-primary",
                  )}
                >
                  {!isHidden && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {/* Color swatch */}
                {renderSwatch(item, isHidden)}
                {/* Label */}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Unit type colors for mini-map dots ───────────────────────────

const MINIMAP_COLORS: Record<string, string> = {
  claim: "#3B82F6",
  question: "#F59E0B",
  evidence: "#10B981",
  counterargument: "#EF4444",
  observation: "#8B5CF6",
  idea: "#F97316",
  definition: "#06B6D4",
  assumption: "#EC4899",
  action: "#84CC16",
};

// ─── Mini-map ─────────────────────────────────────────────────────

function MiniMap() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const zoomLevel = useGraphStore((s) => s.zoomLevel);
  const panOffset = useGraphStore((s) => s.panOffset);
  const miniMapNodes = useGraphStore((s) => s.miniMapNodes);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(0, 0, w, h);

    if (miniMapNodes.length === 0) return;

    // Compute bounding box of all nodes to determine scale
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const n of miniMapNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    const padding = 12;
    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);
    const scale = Math.min(
      (w - padding * 2) / rangeX,
      (h - padding * 2) / rangeY,
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Draw each node as a small colored dot
    for (const n of miniMapNodes) {
      const sx = w / 2 + (n.x - cx) * scale;
      const sy = h / 2 + (n.y - cy) * scale;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fillStyle = MINIMAP_COLORS[n.unitType] ?? "#6B7280";
      ctx.fill();
    }

    // Viewport rectangle
    // Main canvas transform: screenX = canvasW/2 + panOffset.x + graphX * zoomLevel
    // Visible graph-space: graphX in [(-canvasW/2 - panOffset.x)/zoom, (canvasW/2 - panOffset.x)/zoom]
    // Use approximate main canvas size for the viewport indicator
    const mainW = 800;
    const mainH = 600;
    const vpGraphLeft = (-mainW / 2 - panOffset.x) / zoomLevel;
    const vpGraphRight = (mainW / 2 - panOffset.x) / zoomLevel;
    const vpGraphTop = (-mainH / 2 - panOffset.y) / zoomLevel;
    const vpGraphBottom = (mainH / 2 - panOffset.y) / zoomLevel;

    const vpLeft = w / 2 + (vpGraphLeft - cx) * scale;
    const vpTop = h / 2 + (vpGraphTop - cy) * scale;
    const vpW2 = (vpGraphRight - vpGraphLeft) * scale;
    const vpH2 = (vpGraphBottom - vpGraphTop) * scale;

    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpLeft, vpTop, vpW2, vpH2);
  }, [zoomLevel, panOffset, miniMapNodes]);

  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-border bg-bg-secondary/90 p-1 shadow-md backdrop-blur-sm">
      <canvas
        ref={canvasRef}
        width={120}
        height={90}
        className="rounded"
      />
    </div>
  );
}
