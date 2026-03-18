"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCaptureStore } from "~/stores/capture-store";
import { useCaptureMode } from "~/hooks/use-capture-mode";
import { announceToScreenReader } from "~/lib/accessibility";
import { CaptureBar } from "./capture-bar";

interface CaptureOverlayProps {
  projectId: string;
}

export function CaptureOverlay({ projectId }: CaptureOverlayProps) {
  const isOpen = useCaptureStore((s) => s.isOpen);

  return (
    <AnimatePresence>
      {isOpen && <CaptureMode projectId={projectId} />}
    </AnimatePresence>
  );
}

function CaptureMode({ projectId }: { projectId: string }) {
  const {
    mode,
    pendingText,
    isSubmitting,
    close,
    toggleMode,
    setText,
    submit,
  } = useCaptureMode({ projectId });

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  React.useEffect(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    announceToScreenReader("Capture mode opened. Type your thought.");
  }, []);

  // Auto-resize textarea
  const handleInput = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    [setText],
  );

  // Keyboard handling: Escape to close, Cmd+Enter to submit
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        announceToScreenReader("Capture mode closed");
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+Enter: submit
      if (e.key === "Enter" && isMod) {
        e.preventDefault();
        void submit();
        return;
      }

      // Enter without Shift: submit single-line thought
      if (e.key === "Enter" && !e.shiftKey && !isMod) {
        e.preventDefault();
        void submit();
        return;
      }

      // Cmd+Shift+N: toggle mode
      if (e.key === "n" && isMod && e.shiftKey) {
        e.preventDefault();
        toggleMode();
        return;
      }
    },
    [close, submit, toggleMode],
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="Capture mode"
    >
      {/* Close button */}
      <button
        onClick={() => {
          close();
          announceToScreenReader("Capture mode closed");
        }}
        className="absolute right-6 top-6 rounded-lg p-2 text-[#6E6E73] transition-colors duration-150 hover:bg-[#F0F0F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2"
        aria-label="Close capture mode"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Mode toggle */}
      <div className="absolute left-1/2 top-6 -translate-x-1/2">
        <ModeToggle mode={mode} onToggle={toggleMode} />
      </div>

      {/* Center input area */}
      <div className="w-full max-w-2xl px-6">
        <textarea
          ref={textareaRef}
          value={pendingText}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="What are you thinking about?"
          className="w-full resize-none bg-transparent text-xl leading-relaxed text-[#1D1D1F] placeholder-[#AEAEB2] caret-[#0071E3] outline-none motion-reduce:transition-none"
          style={{ fontFamily: "var(--font-primary, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif)" }}
          rows={1}
          disabled={isSubmitting}
          aria-label="Thought input"
        />

        {/* Hint text */}
        <p className="mt-4 text-sm text-[#AEAEB2]">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded bg-[#F5F5F7] px-1.5 py-0.5 text-xs font-medium text-[#6E6E73]">
              Enter
            </kbd>
            <span>to capture</span>
          </span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded bg-[#F5F5F7] px-1.5 py-0.5 text-xs font-medium text-[#6E6E73]">
              Shift+Enter
            </kbd>
            <span>new line</span>
          </span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded bg-[#F5F5F7] px-1.5 py-0.5 text-xs font-medium text-[#6E6E73]">
              Esc
            </kbd>
            <span>close</span>
          </span>
        </p>
      </div>
    </motion.div>
  );
}

/* ── Mode Toggle ── */

function ModeToggle({
  mode,
  onToggle,
}: {
  mode: "capture" | "organize";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="group flex items-center gap-2 rounded-full border border-[#D2D2D7] bg-white px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-[#F0F0F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2"
      aria-label={`Current mode: ${mode === "capture" ? "Capture (No AI)" : "Organize (AI-Assisted)"}. Click to toggle.`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-colors duration-150 ${
          mode === "capture" ? "bg-[#34C759]" : "bg-[#0071E3]"
        }`}
        aria-hidden="true"
      />
      <span className="font-medium text-[#1D1D1F]">
        {mode === "capture" ? "Capture" : "Organize"}
      </span>
      <span className="text-[#AEAEB2]">
        {mode === "capture" ? "No AI" : "AI-Assisted"}
      </span>
    </button>
  );
}
