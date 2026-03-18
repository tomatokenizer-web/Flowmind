"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight, SkipForward } from "lucide-react";
import { ONBOARDING_STEPS } from "~/lib/onboarding-config";

/* ─── First-Time Capture Experience ─── */

interface FirstCaptureProps {
  onSubmit: (text: string) => void;
  isSubmitting: boolean;
}

export function FirstCaptureExperience({
  onSubmit,
  isSubmitting,
}: FirstCaptureProps) {
  const [text, setText] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const handleInput = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    [],
  );

  const handleSubmit = React.useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;
    onSubmit(trimmed);
  }, [text, isSubmitting, onSubmit]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="flex w-full max-w-lg flex-col items-center px-6">
        {/* Logo / brand */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-10"
        >
          <h1
            className="text-lg font-semibold tracking-tight text-[#1D1D1F]"
            style={{
              fontFamily:
                "var(--font-heading, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif)",
            }}
          >
            Flowmind
          </h1>
        </motion.div>

        {/* Prompt */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-8 text-center text-sm text-[#6E6E73]"
        >
          Write down one thought in your head right now
        </motion.p>

        {/* Input area */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="w-full"
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="What are you thinking about?"
            disabled={isSubmitting}
            rows={1}
            className="w-full resize-none bg-transparent text-center text-xl leading-relaxed text-[#1D1D1F] placeholder-[#AEAEB2] caret-[#0071E3] outline-none motion-reduce:transition-none"
            style={{
              fontFamily:
                "var(--font-primary, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif)",
            }}
            aria-label="Your first thought"
          />
        </motion.div>

        {/* Submit hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: text.trim() ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-[#0071E3] px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-[#0077ED] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2"
            aria-label="Capture this thought"
          >
            {isSubmitting ? "Capturing..." : "Capture"}
            {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </motion.div>

        {/* Keyboard hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 text-xs text-[#AEAEB2]"
        >
          Press{" "}
          <kbd className="rounded bg-[#F5F5F7] px-1.5 py-0.5 text-xs font-medium text-[#6E6E73]">
            Enter
          </kbd>{" "}
          to capture
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ─── AI Decomposition Hint ─── */

interface AIHintProps {
  onDismiss: () => void;
}

export function AIDecompositionHint({ onDismiss }: AIHintProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="mx-auto mt-3 flex max-w-md items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3"
      role="status"
      data-onboarding="ai-hint"
    >
      <Sparkles
        className="mt-0.5 h-4 w-4 shrink-0 text-[#0071E3]"
        aria-hidden="true"
      />
      <p className="flex-1 text-sm leading-relaxed text-[#1D1D1F]">
        Later, AI will help you break this down into connected ideas
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-[#6E6E73] transition-colors duration-150 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
        aria-label="Dismiss AI hint"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

/* ─── Tour Tooltip ─── */

interface TourTooltipProps {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TourTooltip({
  step,
  totalSteps,
  onNext,
  onSkip,
}: TourTooltipProps) {
  const config = ONBOARDING_STEPS[step];
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
    targetRect: DOMRect | null;
  }>({ top: 0, left: 0, targetRect: null });

  // Position tooltip relative to target element
  React.useEffect(() => {
    if (!config) return;

    const positionTooltip = () => {
      const target = document.querySelector(config.targetSelector);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const gap = 12;

      let top = 0;
      let left = 0;

      switch (config.placement) {
        case "bottom":
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2;
          break;
        case "top":
          top = rect.top - gap;
          left = rect.left + rect.width / 2;
          break;
        case "right":
          top = rect.top + rect.height / 2;
          left = rect.right + gap;
          break;
        case "left":
          top = rect.top + rect.height / 2;
          left = rect.left - gap;
          break;
      }

      setPosition({ top, left, targetRect: rect });
    };

    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    return () => window.removeEventListener("resize", positionTooltip);
  }, [config]);

  if (!config) return null;

  const isLast = step === totalSteps - 1;

  return (
    <>
      {/* Backdrop overlay with spotlight cutout */}
      <motion.div
        className="fixed inset-0 z-[60]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        aria-hidden="true"
      >
        <svg className="h-full w-full">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {position.targetRect && (
                <rect
                  x={position.targetRect.left - 6}
                  y={position.targetRect.top - 6}
                  width={position.targetRect.width + 12}
                  height={position.targetRect.height + 12}
                  rx={10}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.4)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </motion.div>

      {/* Tooltip card */}
      <motion.div
        className="fixed z-[61] w-72 rounded-xl border border-[#D2D2D7] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
        style={{
          top: position.top,
          left: position.left,
          transform:
            config.placement === "bottom" || config.placement === "top"
              ? "translateX(-50%)"
              : config.placement === "right"
                ? "translateY(-50%)"
                : "translate(-100%, -50%)",
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        role="dialog"
        aria-label={config.title}
      >
        {/* Step indicator */}
        <div className="mb-3 flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-200 ${
                i === step
                  ? "w-4 bg-[#0071E3]"
                  : i < step
                    ? "w-1.5 bg-[#0071E3]/40"
                    : "w-1.5 bg-[#D2D2D7]"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        <h3 className="mb-1.5 text-sm font-semibold text-[#1D1D1F]">
          {config.title}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-[#6E6E73]">
          {config.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs text-[#AEAEB2] transition-colors duration-150 hover:text-[#6E6E73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:rounded-sm"
            aria-label="Skip tour"
          >
            <span className="inline-flex items-center gap-1">
              <SkipForward className="h-3 w-3" aria-hidden="true" />
              Skip
            </span>
          </button>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-3.5 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-[#0077ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2"
            aria-label={isLast ? "Finish tour" : "Next step"}
          >
            {isLast ? "Got it" : "Next"}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </>
  );
}
