import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizablePanelOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  direction: "left" | "right";
  onWidthChange?: (width: number) => void;
}

interface UseResizablePanelReturn {
  width: number;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Hook for drag-to-resize panels with min/max constraints.
 * Direction "left" means dragging the left edge (right panel),
 * "right" means dragging the right edge (left panel / sidebar).
 */
export function useResizablePanel(
  options: UseResizablePanelOptions,
): UseResizablePanelReturn {
  const { initialWidth, minWidth, maxWidth, direction, onWidthChange } = options;

  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const onWidthChangeRef = useRef(onWidthChange);

  // Keep callback ref up to date without re-running effects
  onWidthChangeRef.current = onWidthChange;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width],
  );

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const delta = e.clientX - startXRef.current;
      const newWidth =
        direction === "right"
          ? startWidthRef.current + delta
          : startWidthRef.current - delta;

      const clamped = Math.min(maxWidth, Math.max(minWidth, newWidth));
      setWidth(clamped);
      onWidthChangeRef.current?.(clamped);
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Prevent text selection while dragging
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, direction, minWidth, maxWidth]);

  // Sync with external width changes (e.g., store rehydration)
  useEffect(() => {
    setWidth(initialWidth);
  }, [initialWidth]);

  return { width, isDragging, handleMouseDown };
}
