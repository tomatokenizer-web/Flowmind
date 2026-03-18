"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Feather } from "lucide-react";
import { useCaptureStore } from "~/stores/capture-store";
import { announceToScreenReader } from "~/lib/accessibility";

/**
 * Minimal floating bar at the bottom of the screen.
 * Clicking it opens Capture Mode.
 */
export function CaptureBar() {
  const open = useCaptureStore((s) => s.open);
  const isOpen = useCaptureStore((s) => s.isOpen);

  // Don't render bar when capture overlay is already open
  if (isOpen) return null;

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
    >
      <button
        onClick={() => {
          open();
          announceToScreenReader("Capture mode activated");
        }}
        className="group flex items-center gap-2.5 rounded-full border border-[#D2D2D7] bg-white/90 px-5 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-150 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        aria-label="Open capture mode (Cmd+N)"
      >
        <Feather
          className="h-4 w-4 text-[#0071E3] transition-transform duration-150 group-hover:scale-110 motion-reduce:group-hover:scale-100"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-[#1D1D1F]">
          Capture a thought
        </span>
        <kbd className="ml-1 rounded bg-[#F5F5F7] px-1.5 py-0.5 text-xs text-[#AEAEB2]">
          ⌘N
        </kbd>
      </button>
    </motion.div>
  );
}
