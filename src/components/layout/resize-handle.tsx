"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  onResizeEnd?: () => void;
}

export function ResizeHandle({ onResize, onResizeEnd }: ResizeHandleProps) {
  const [dragging, setDragging] = React.useState(false);
  const startXRef = React.useRef(0);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      startXRef.current = e.clientX;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const delta = startXRef.current - e.clientX;
      startXRef.current = e.clientX;
      onResize(delta);
    },
    [dragging, onResize],
  );

  const handlePointerUp = React.useCallback(() => {
    setDragging(false);
    onResizeEnd?.();
  }, [onResizeEnd]);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        "absolute left-0 top-0 bottom-0 z-10 w-1 cursor-col-resize",
        "hover:bg-accent-primary/30 active:bg-accent-primary/50",
        "transition-colors duration-150",
        dragging && "bg-accent-primary/50",
      )}
    />
  );
}
