"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, AlertCircle, AlertTriangle, Feather, Sparkles } from "lucide-react";
import { useCaptureStore } from "~/stores/capture-store";
import { useCaptureMode } from "~/hooks/use-capture-mode";
import { announceToScreenReader } from "~/lib/accessibility";
import { useAIIntensity, isAtLeastBalanced } from "~/hooks/useAIIntensity";
import { DecompositionReview } from "~/components/ai/decomposition-review";
import { AudioRecorder } from "./audio-recorder";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import type { AudioRecorderResult } from "~/hooks/use-audio-recorder";

interface CaptureOverlayProps {
  projectId: string;
  contextId: string;
}

export function CaptureOverlay({ projectId, contextId }: CaptureOverlayProps) {
  const isOpen = useCaptureStore((s) => s.isOpen);

  return (
    <AnimatePresence>
      {isOpen && <CaptureMode projectId={projectId} contextId={contextId} />}
    </AnimatePresence>
  );
}

function CaptureMode({ projectId, contextId }: { projectId: string; contextId: string }) {
  const {
    mode,
    phase,
    pendingText,
    decompositionData,
    errorMessage,
    isSubmitting,
    isDecomposing: _isDecomposing,
    close,
    toggleMode,
    setText,
    submit,
    handleDecompositionComplete,
    cancelDecomposition,
  } = useCaptureMode({ projectId, contextId });

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // ── AI intensity gate ─────────────────────────────────────────────────────
  const { level: aiLevel } = useAIIntensity();
  const aiAutoSuggestEnabled = isAtLeastBalanced(aiLevel);

  // ── Scope jump detection ──────────────────────────────────────────────────
  const [scopeJumpVisible, setScopeJumpVisible] = React.useState(false);
  const [scopeJumpMsg, setScopeJumpMsg] = React.useState("");
  const scopeJumpDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidContextId = contextId && uuidRegex.test(contextId);

  const detectScopeJump = api.ai.detectScopeJump.useMutation({
    onSuccess: (result) => {
      if (result.isJump && result.confidence >= 0.7) {
        setScopeJumpMsg(
          result.suggestedScope
            ? `This seems like a different topic ("${result.suggestedScope}"). Consider creating a new context.`
            : "This seems like a different topic. Consider switching contexts."
        );
        setScopeJumpVisible(true);
      } else {
        setScopeJumpVisible(false);
      }
    },
    onError: () => {
      setScopeJumpVisible(false);
    },
  });

  const handleScopeJumpCheck = React.useCallback(
    (text: string) => {
      if (!aiAutoSuggestEnabled || !isValidContextId || text.length < 20) return;
      if (scopeJumpDebounceRef.current) clearTimeout(scopeJumpDebounceRef.current);
      scopeJumpDebounceRef.current = setTimeout(() => {
        detectScopeJump.mutate({ text, contextId });
      }, 2000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aiAutoSuggestEnabled, isValidContextId, contextId]
  );

  React.useEffect(() => {
    return () => {
      if (scopeJumpDebounceRef.current) clearTimeout(scopeJumpDebounceRef.current);
    };
  }, []);

  // ── Audio recording ──────────────────────────────────────────────────────
  const showAudioRecorder = useCaptureStore((s) => s.showAudioRecorder);
  const hideAudioRecorder = useCaptureStore((s) => s.hideAudioRecorder);
  const [isTranscribing, setIsTranscribing] = React.useState(false);

  const utils = api.useUtils();
  const uploadAudio = api.audio.upload.useMutation();
  const transcribeAudio = api.audio.transcribe.useMutation();
  const submitCapture = api.capture.submit.useMutation({
    onSuccess: () => void utils.unit.list.invalidate(),
  });

  const handleAudioRecordingComplete = React.useCallback(
    async (result: AudioRecorderResult) => {
      setIsTranscribing(true);
      try {
        const arrayBuffer = await result.blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        const uploadResult = await uploadAudio.mutateAsync({
          base64,
          mimeType: result.mimeType,
          duration: result.duration,
        });

        const transcribeResult = await transcribeAudio.mutateAsync({
          resourceId: uploadResult.id,
          projectId,
          decompose: false,
        });

        const transcription = transcribeResult as unknown as { transcription?: { text?: string } };
        if (transcription.transcription?.text) {
          await submitCapture.mutateAsync({
            content: transcription.transcription.text,
            projectId,
            mode: "capture",
          });
          announceToScreenReader("Audio transcribed and captured successfully");
          close();
        }
      } catch (error) {
        console.error("Audio transcription failed:", error);
        announceToScreenReader("Audio transcription failed");
      } finally {
        setIsTranscribing(false);
        hideAudioRecorder();
      }
    },
    [uploadAudio, transcribeAudio, submitCapture, projectId, close, hideAudioRecorder]
  );

  const handleAudioCancel = React.useCallback(() => {
    hideAudioRecorder();
  }, [hideAudioRecorder]);

  // ── Auto-focus ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    announceToScreenReader("Capture mode opened. Type your thought.");
  }, []);

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  const handleInput = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setText(value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      setScopeJumpVisible(false);
      handleScopeJumpCheck(value);
    },
    [setText, handleScopeJumpCheck],
  );

  // ── Global ESC handler (works even when textarea isn't focused) ──────────
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [close]);

  // ── Keyboard (textarea-specific) ────────────────────────────────────────
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        announceToScreenReader("Capture mode closed");
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      if (e.key === "Enter" && isMod) {
        e.preventDefault();
        void submit();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !isMod) {
        const hasMultipleLines = pendingText.includes("\n");
        if (!hasMultipleLines && pendingText.trim().length > 0) {
          e.preventDefault();
          void submit();
          return;
        }
      }

      if (e.key === "n" && isMod && e.shiftKey) {
        e.preventDefault();
        toggleMode();
        return;
      }
    },
    [close, submit, toggleMode, pendingText],
  );

  const wordCount = pendingText.trim() ? pendingText.trim().split(/\s+/).length : 0;
  const charCount = pendingText.length;
  const paragraphCount = pendingText.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const isMultiParagraph = paragraphCount >= 2;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center bg-bg-primary/97 backdrop-blur-xl overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="Capture mode"
    >
      {/* ── Top bar ── */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5">
        {/* Mode toggle */}
        {phase === "input" && (
          <ModeToggle mode={mode} onToggle={toggleMode} />
        )}
        {phase !== "input" && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-primary/5 px-3.5 py-1.5 text-sm font-medium text-accent-primary"
          >
            {phase === "decomposing" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing...
              </>
            )}
            {phase === "reviewing" && "Review Decomposition"}
          </motion.span>
        )}

        {/* Close */}
        <button
          onClick={() => {
            close();
            announceToScreenReader("Capture mode closed");
          }}
          className="rounded-xl p-2.5 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label="Close capture mode"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* ── Content ── */}
      <div className={cn(
        "w-full max-w-2xl px-8",
        phase === "input" ? "my-auto" : "mt-20 mb-8",
      )}>
        <AnimatePresence mode="wait">
          {/* Input phase */}
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col"
            >
              {/* Writing area */}
              <div className="rounded-2xl border border-border/60 bg-bg-surface p-6 shadow-sm transition-shadow focus-within:border-accent-primary/30 focus-within:shadow-[0_0_0_3px_rgba(var(--accent-primary-rgb,0,113,227),0.08)]">
                <textarea
                  ref={textareaRef}
                  value={pendingText}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="What are you thinking about?"
                  className="w-full resize-none bg-transparent text-base leading-relaxed text-text-primary placeholder-text-tertiary caret-accent-primary outline-none max-h-[50vh] overflow-y-auto"
                  rows={4}
                  disabled={isSubmitting}
                  aria-label="Thought input"
                />

                {/* Bottom bar inside card */}
                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                  {/* Word count */}
                  <span className={cn(
                    "text-xs tabular-nums transition-colors",
                    wordCount > 0 ? "text-text-tertiary" : "text-transparent",
                  )}>
                    {charCount} chars &middot; {wordCount} word{wordCount !== 1 ? "s" : ""}
                  </span>

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={isSubmitting || !pendingText.trim()}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                      mode === "organize"
                        ? "bg-accent-primary text-white hover:bg-accent-primary/90"
                        : "bg-text-primary text-bg-primary hover:opacity-90",
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : mode === "organize" ? (
                      <Sparkles className="h-3.5 w-3.5" />
                    ) : (
                      <Feather className="h-3.5 w-3.5" />
                    )}
                    {mode === "organize" ? "Decompose" : "Capture"}
                  </button>
                </div>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    className="mt-3 flex items-start gap-2 rounded-xl border border-accent-danger/20 bg-accent-danger/5 px-4 py-3 text-sm text-accent-danger"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scope jump warning */}
              <AnimatePresence>
                {scopeJumpVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    className="mt-3 flex items-start gap-2 rounded-xl border border-accent-warning/20 bg-accent-warning/5 px-4 py-3 text-sm text-accent-warning"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{scopeJumpMsg}</span>
                    <button
                      type="button"
                      onClick={() => setScopeJumpVisible(false)}
                      className="ml-2 text-accent-warning/60 hover:text-accent-warning focus-visible:outline-none"
                      aria-label="Dismiss scope jump warning"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Multi-paragraph hint */}
              <AnimatePresence>
                {isMultiParagraph && mode === "capture" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 rounded-xl border border-accent-primary/15 bg-accent-primary/5 px-4 py-2.5 text-xs text-accent-primary/80"
                  >
                    Multiple paragraphs detected &mdash; consider using <strong>Organize</strong> mode to decompose into separate units.
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Keyboard hints */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-secondary">
                    Enter
                  </kbd>
                  submit
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-secondary">
                    Shift+Enter
                  </kbd>
                  new line
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-secondary">
                    Esc
                  </kbd>
                  close
                </span>
              </div>
            </motion.div>
          )}

          {/* Decomposing phase */}
          {phase === "decomposing" && (
            <motion.div
              key="decomposing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center gap-5 py-16"
            >
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-accent-primary/20" />
                <div className="relative rounded-full bg-accent-primary/10 p-4">
                  <Sparkles className="h-6 w-6 text-accent-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium text-text-primary">Analyzing your thoughts</p>
                <p className="mt-1 text-sm text-text-tertiary">
                  AI is breaking this down into atomic thought units...
                </p>
              </div>
            </motion.div>
          )}

          {/* Reviewing phase */}
          {phase === "reviewing" && decompositionData && (
            <motion.div
              key="reviewing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <DecompositionReview
                originalText={decompositionData.originalText}
                purpose={decompositionData.purpose}
                proposals={decompositionData.proposals}
                relationProposals={decompositionData.relationProposals}
                projectId={projectId}
                contextId={contextId}
                isStructuredDiscourse={decompositionData.isStructuredDiscourse}
                onComplete={(accepted, rejected) => {
                  handleDecompositionComplete(accepted, rejected);
                  close();
                  announceToScreenReader(
                    `Decomposition complete. ${accepted} units created, ${rejected} rejected.`
                  );
                }}
                onCancel={() => {
                  cancelDecomposition();
                  announceToScreenReader("Decomposition cancelled");
                }}
              />
            </motion.div>
          )}

          {/* Transcribing phase */}
          {isTranscribing && (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center gap-5 py-16"
            >
              <div className="rounded-full bg-accent-primary/10 p-4">
                <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-text-primary">Transcribing audio</p>
                <p className="mt-1 text-sm text-text-tertiary">
                  Converting your recording to text...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Audio recorder ── */}
      <AnimatePresence>
        {showAudioRecorder && !isTranscribing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-6"
          >
            <AudioRecorder
              onRecordingComplete={handleAudioRecordingComplete}
              onCancel={handleAudioCancel}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
      className="group flex items-center gap-0.5 rounded-full border border-border bg-bg-secondary p-0.5 transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      aria-label={`Current mode: ${mode === "capture" ? "Capture (No AI)" : "Organize (AI-Assisted)"}. Click to toggle.`}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
          mode === "capture"
            ? "bg-bg-primary text-text-primary shadow-sm"
            : "text-text-tertiary hover:text-text-secondary",
        )}
      >
        <Feather className="h-3.5 w-3.5" />
        Capture
      </span>
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
          mode === "organize"
            ? "bg-accent-primary/10 text-accent-primary shadow-sm"
            : "text-text-tertiary hover:text-text-secondary",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Organize
      </span>
    </button>
  );
}
