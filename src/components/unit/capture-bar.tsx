"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Feather, Mic } from "lucide-react";
import { useCaptureStore } from "~/stores/capture-store";
import { announceToScreenReader } from "~/lib/accessibility";

/**
 * Minimal floating bar at the bottom of the screen.
 * Clicking it opens Capture Mode. Mic button starts audio recording.
 */
export function CaptureBar() {
  const open = useCaptureStore((s) => s.open);
  const openWithAudio = useCaptureStore((s) => s.openWithAudio);
  const isOpen = useCaptureStore((s) => s.isOpen);

  // Don't render bar when capture overlay is already open
  if (isOpen) return null;

  return (
    <motion.div
      className="flex justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
    >
      <div className="flex items-center gap-2">
        {/* Main capture button */}
        <button
          onClick={() => {
            open();
            announceToScreenReader("Capture mode activated");
          }}
          className="group flex items-center gap-2.5 rounded-full border border-border bg-bg-surface/90 px-5 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-150 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          aria-label="Open capture mode (Cmd+N)"
        >
          <Feather
            className="h-4 w-4 text-accent-primary transition-transform duration-150 group-hover:scale-110 motion-reduce:group-hover:scale-100"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-text-primary">
            Capture a thought
          </span>
          <kbd className="ml-1 rounded bg-bg-secondary px-1.5 py-0.5 text-xs text-text-tertiary">
            ⌘N
          </kbd>
        </button>

        {/* Audio capture button */}
        <button
          onClick={() => {
            openWithAudio();
            announceToScreenReader("Audio capture mode activated");
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-surface/90 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md transition-all duration-150 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          aria-label="Start audio capture"
        >
          <Mic className="h-4 w-4 text-accent-primary" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
