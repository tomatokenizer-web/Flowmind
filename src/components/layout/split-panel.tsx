"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { useWorkspaceStore } from "~/stores/workspace-store";

/* ─── Cross-panel context ─── */

interface SplitPanelContextValue {
  highlightedUnitId: string | null;
  setHighlight: (id: string | null) => void;
}

export const SplitPanelContext = React.createContext<SplitPanelContextValue>({
  highlightedUnitId: null,
  setHighlight: () => undefined,
});

export function useSplitPanelHighlight() {
  return React.useContext(SplitPanelContext);
}

/* ─── Constants ─── */

const MIN_FRACTION = 0.3;
const MAX_FRACTION = 0.7;
const DEFAULT_FRACTION = 0.5;

/* ─── Props ─── */

interface SplitPanelProps {
  leftView: React.ReactNode;
  rightView: React.ReactNode;
  onClose: () => void;
  className?: string;
}

/* ─── Component ─── */

export function SplitPanel({ leftView, rightView, onClose, className }: SplitPanelProps) {
  const { splitPanelHighlightId, setSplitPanelHighlight } = useWorkspaceStore();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [fraction, setFraction] = React.useState(DEFAULT_FRACTION);
  const isDragging = React.useRef(false);

  // Sync cross-panel highlight with store
  const setHighlight = React.useCallback(
    (id: string | null) => {
      setSplitPanelHighlight(id);
    },
    [setSplitPanelHighlight],
  );

  const contextValue = React.useMemo<SplitPanelContextValue>(
    () => ({ highlightedUnitId: splitPanelHighlightId, setHighlight }),
    [splitPanelHighlightId, setHighlight],
  );

  /* ── Divider drag ── */

  const handleDividerMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  React.useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const raw = (e.clientX - rect.left) / rect.width;
      setFraction(Math.min(MAX_FRACTION, Math.max(MIN_FRACTION, raw)));
    }

    function handleMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const leftPct = `${(fraction * 100).toFixed(2)}%`;
  const rightPct = `${((1 - fraction) * 100).toFixed(2)}%`;

  return (
    <SplitPanelContext.Provider value={contextValue}>
      <motion.div
        ref={containerRef}
        className={cn("relative flex h-full w-full overflow-hidden", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {/* Left panel */}
        <motion.div
          className="relative flex h-full flex-col overflow-hidden"
          style={{ width: leftPct }}
          initial={{ x: "-8%" }}
          animate={{ x: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {leftView}
        </motion.div>

        {/* Divider */}
        <div
          className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center"
          style={{ backgroundColor: "var(--border-default)" }}
          onMouseDown={handleDividerMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
        >
          {/* Drag handle pill */}
          <div
            className={cn(
              "absolute h-8 w-1 rounded-full transition-colors",
              "group-hover:bg-[var(--accent-primary)] group-active:bg-[var(--accent-primary)]",
            )}
            style={{ backgroundColor: "var(--border-strong)" }}
          />
        </div>

        {/* Right panel */}
        <motion.div
          className="relative flex h-full flex-col overflow-hidden"
          style={{ width: rightPct }}
          initial={{ x: "8%" }}
          animate={{ x: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {rightView}
        </motion.div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded",
            "transition-colors hover:bg-[var(--bg-tertiary)]",
          )}
          style={{ color: "var(--text-secondary)" }}
          aria-label="Close split view"
        >
          <X size={14} />
        </button>
      </motion.div>
    </SplitPanelContext.Provider>
  );
}
