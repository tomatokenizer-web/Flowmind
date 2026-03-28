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

  if (isOpen) return null;

  return (
    <motion.div
      className="flex justify-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
    >
      <div className="flex items-center gap-1.5 rounded-2xl border border-border/60 bg-bg-surface/95 p-1.5 shadow-lg backdrop-blur-xl">
        {/* Main capture button */}
        <button
          onClick={() => {
            open();
            announceToScreenReader("Capture mode activated");
          }}
          className="group flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label="Open capture mode (Cmd+N)"
        >
          <Feather
            className="h-4 w-4 text-accent-primary transition-transform duration-150 group-hover:scale-110 motion-reduce:group-hover:scale-100"
            aria-hidden="true"
          />
          <span>Capture a thought</span>
          <kbd className="ml-0.5 rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
            ⌘N
          </kbd>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-border/60" />

        {/* Audio capture button */}
        <button
          onClick={() => {
            openWithAudio();
            announceToScreenReader("Audio capture mode activated");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-tertiary transition-all hover:bg-bg-hover hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label="Start audio capture"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
