"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, X, AlertTriangle } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatDuration } from "~/lib/audio-utils";
import {
  useAudioRecorder,
  type AudioRecorderResult,
} from "~/hooks/use-audio-recorder";

// ─── Types ──────────────────────────────────────────────────────────

interface AudioRecorderProps {
  /** Called when recording is complete */
  onRecordingComplete: (result: AudioRecorderResult) => void;
  /** Called when user cancels recording */
  onCancel?: () => void;
  /** Additional className */
  className?: string;
}

// ─── Waveform Visualizer ────────────────────────────────────────────

function WaveformVisualizer({
  frequencyData,
  isRecording,
}: {
  frequencyData: Uint8Array | null;
  isRecording: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!frequencyData || !isRecording) {
      // Draw idle line
      ctx.strokeStyle = "#D2D2D7";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(rect.width, rect.height / 2);
      ctx.stroke();
      return;
    }

    const barCount = 40;
    const barWidth = rect.width / barCount - 2;
    const step = Math.floor(frequencyData.length / barCount);

    ctx.fillStyle = "#0071E3";

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i * step] ?? 0;
      const barHeight = Math.max(2, (value / 255) * rect.height * 0.8);
      const x = i * (barWidth + 2);
      const y = (rect.height - barHeight) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }
  }, [frequencyData, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="h-10 w-full"
      aria-hidden="true"
    />
  );
}

// ─── AudioRecorder Component ────────────────────────────────────────

export function AudioRecorder({
  onRecordingComplete,
  onCancel,
  className,
}: AudioRecorderProps) {
  const {
    state,
    elapsed,
    isOverWarningLimit,
    frequencyData,
    error,
    start,
    stop,
    cancel,
  } = useAudioRecorder({
    onRecordingComplete,
    onError: undefined,
  });

  const handleCancel = useCallback(() => {
    cancel();
    onCancel?.();
  }, [cancel, onCancel]);

  const isRecording = state === "recording";
  const isIdle = state === "idle";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <AnimatePresence mode="wait">
        {isIdle && !error && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              onClick={start}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2",
                "text-text-secondary hover:bg-bg-hover",
                "transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
              )}
              aria-label="Start audio recording"
            >
              <Mic className="h-4 w-4" />
              <span className="text-sm">Record audio</span>
            </button>
          </motion.div>
        )}

        {(isRecording || state === "stopping" || state === "requesting") && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-[--border-default] bg-white p-3",
              "shadow-[--shadow-resting]",
            )}
            role="status"
            aria-label={`Recording audio, ${formatDuration(elapsed)} elapsed`}
          >
            {/* Pulsing red dot */}
            <motion.div
              className="h-3 w-3 shrink-0 rounded-full bg-[--accent-error]"
              animate={{ opacity: isRecording ? [1, 0.3, 1] : 1 }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              aria-hidden="true"
            />

            {/* Waveform */}
            <div className="flex-1">
              <WaveformVisualizer
                frequencyData={frequencyData}
                isRecording={isRecording}
              />
            </div>

            {/* Timer */}
            <span
              className={cn(
                "min-w-[3rem] text-right font-mono text-sm tabular-nums",
                isOverWarningLimit
                  ? "text-[--accent-warning] font-medium"
                  : "text-text-secondary",
              )}
            >
              {formatDuration(elapsed)}
            </span>

            {/* Warning icon for long recordings */}
            {isOverWarningLimit && (
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-[--accent-warning]"
                aria-label="Recording is getting long"
              />
            )}

            {/* Stop button */}
            <button
              type="button"
              onClick={stop}
              disabled={!isRecording}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                "bg-[--accent-error] text-white",
                "hover:bg-red-600 transition-colors duration-150",
                "disabled:opacity-50",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
              )}
              aria-label="Stop recording"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>

            {/* Cancel button */}
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                "text-text-tertiary hover:text-text-secondary hover:bg-bg-hover",
                "transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
              )}
              aria-label="Cancel recording"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-[--accent-error]"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
