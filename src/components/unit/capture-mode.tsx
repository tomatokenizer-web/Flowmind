"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, AlertCircle } from "lucide-react";
import { useCaptureStore } from "~/stores/capture-store";
import { useCaptureMode } from "~/hooks/use-capture-mode";
import { announceToScreenReader } from "~/lib/accessibility";
import { DecompositionReview } from "~/components/ai/decomposition-review";
import { AudioRecorder } from "./audio-recorder";
import { api } from "~/trpc/react";
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
    isDecomposing,
    close,
    toggleMode,
    setText,
    submit,
    handleDecompositionComplete,
    cancelDecomposition,
  } = useCaptureMode({ projectId, contextId });

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Audio recording state from store
  const showAudioRecorder = useCaptureStore((s) => s.showAudioRecorder);
  const hideAudioRecorder = useCaptureStore((s) => s.hideAudioRecorder);
  const [isTranscribing, setIsTranscribing] = React.useState(false);

  const utils = api.useUtils();
  const uploadAudio = api.audio.upload.useMutation();
  const transcribeAudio = api.audio.transcribe.useMutation();
  const submitCapture = api.capture.submit.useMutation({
    onSuccess: () => void utils.unit.list.invalidate(),
  });

  // Handle audio recording completion
  const handleAudioRecordingComplete = React.useCallback(
    async (result: AudioRecorderResult) => {
      setIsTranscribing(true);
      try {
        // Convert blob to base64
        const arrayBuffer = await result.blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        // Upload audio
        const uploadResult = await uploadAudio.mutateAsync({
          base64,
          mimeType: result.mimeType,
          duration: result.duration,
        });

        // Transcribe audio
        const transcribeResult = await transcribeAudio.mutateAsync({
          resourceId: uploadResult.id,
          projectId,
          decompose: false,
        });

        // Submit transcription as capture
        if (transcribeResult.transcription.text) {
          await submitCapture.mutateAsync({
            content: transcribeResult.transcription.text,
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

      {/* Mode toggle - only show in input phase */}
      {phase === "input" && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2">
          <ModeToggle mode={mode} onToggle={toggleMode} />
        </div>
      )}

      {/* Phase title - show for decomposing/reviewing */}
      {phase !== "input" && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2">
          <span className="flex items-center gap-2 rounded-full border border-[#0071E3]/20 bg-[#0071E3]/5 px-3 py-1.5 text-sm font-medium text-[#0071E3]">
            {phase === "decomposing" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing...
              </>
            )}
            {phase === "reviewing" && "Review Decomposition"}
          </span>
        </div>
      )}

      {/* Content area */}
      <div className="w-full max-w-2xl px-6">
        <AnimatePresence mode="wait">
          {/* Input phase */}
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
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

              {/* Error message */}
              {errorMessage && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Hint text */}
              <p className="mt-4 text-sm text-[#AEAEB2]">
                <span className="inline-flex items-center gap-1.5">
                  <kbd className="rounded bg-[#F5F5F7] px-1.5 py-0.5 text-xs font-medium text-[#6E6E73]">
                    Enter
                  </kbd>
                  <span>to {mode === "organize" ? "decompose" : "capture"}</span>
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
            </motion.div>
          )}

          {/* Decomposing phase - loading state */}
          {phase === "decomposing" && (
            <motion.div
              key="decomposing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[#0071E3]" />
              <p className="text-center text-text-secondary">
                AI is analyzing your text and proposing thought units...
              </p>
            </motion.div>
          )}

          {/* Reviewing phase - decomposition review */}
          {phase === "reviewing" && decompositionData && (
            <motion.div
              key="reviewing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DecompositionReview
                originalText={decompositionData.originalText}
                purpose={decompositionData.purpose}
                proposals={decompositionData.proposals}
                relationProposals={decompositionData.relationProposals}
                projectId={projectId}
                contextId={contextId}
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

          {/* Transcribing phase - loading state */}
          {isTranscribing && (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[#0071E3]" />
              <p className="text-center text-text-secondary">
                Transcribing audio...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Audio recorder panel at bottom */}
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
