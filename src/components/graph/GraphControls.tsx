"use client";

import * as React from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { useGraphStore } from "~/stores/graphStore";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

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

export function GraphControls() {
  const layer = useGraphStore((s) => s.layer);
  const localHubId = useGraphStore((s) => s.localHubId);
  const zoomLevel = useGraphStore((s) => s.zoomLevel);
  const setZoom = useGraphStore((s) => s.setZoom);
  const setPan = useGraphStore((s) => s.setPan);
  const filters = useGraphStore((s) => s.filters);
  const toggleUnitTypeFilter = useGraphStore((s) => s.toggleUnitTypeFilter);

  const handleFitAll = React.useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [setZoom, setPan]);

  return (
    <>
      {/* Top-right: layer indicator */}
      <div className="absolute right-4 top-4 z-10 rounded-lg bg-bg-secondary/90 px-3 py-1.5 text-sm font-medium text-text-primary shadow-md backdrop-blur-sm border border-border">
        {layer === "global"
          ? "Global Overview"
          : `Local: ${localHubId?.slice(0, 8) ?? ""}...`}
      </div>

      {/* Top: filter pills */}
      {layer === "global" && (
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1.5">
          {UNIT_TYPES.map((ut) => {
            const isHidden = filters.unitTypes.includes(ut.key);
            return (
              <button
                key={ut.key}
                type="button"
                onClick={() => toggleUnitTypeFilter(ut.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                  "border border-border hover:shadow-sm",
                  isHidden
                    ? "bg-bg-secondary text-text-tertiary opacity-50"
                    : "bg-bg-primary text-text-primary",
                )}
                aria-pressed={!isHidden}
                aria-label={`${isHidden ? "Show" : "Hide"} ${ut.label} units`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: ut.color,
                    opacity: isHidden ? 0.3 : 1,
                  }}
                />
                {ut.label}
              </button>
            );
          })}
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
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-bg-secondary/90 backdrop-blur-sm"
            onClick={handleFitAll}
            aria-label="Fit all"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <span className="mt-1 text-center text-[10px] text-text-tertiary">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      )}

      {/* Bottom-left: mini-map */}
      {layer === "global" && <MiniMap />}
    </>
  );
}

// ─── Mini-map ─────────────────────────────────────────────────────

function MiniMap() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const zoomLevel = useGraphStore((s) => s.zoomLevel);
  const panOffset = useGraphStore((s) => s.panOffset);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, w, h);

    // Viewport rectangle
    const vpW = Math.min(w, w / zoomLevel);
    const vpH = Math.min(h, h / zoomLevel);
    const vpX = w / 2 - vpW / 2 - (panOffset.x / zoomLevel) * (w / 800);
    const vpY = h / 2 - vpH / 2 - (panOffset.y / zoomLevel) * (h / 600);

    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      Math.max(0, vpX),
      Math.max(0, vpY),
      Math.min(vpW, w),
      Math.min(vpH, h),
    );
  }, [zoomLevel, panOffset]);

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
