"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSupportedMimeType,
  RECORDING_MAX_SECONDS,
  RECORDING_WARN_SECONDS,
} from "~/lib/audio-utils";

export type RecordingState = "idle" | "requesting" | "recording" | "stopping";

export interface AudioRecorderResult {
  blob: Blob;
  mimeType: string;
  duration: number;
}

export interface UseAudioRecorderReturn {
  /** Current recording state */
  state: RecordingState;
  /** Elapsed recording time in seconds */
  elapsed: number;
  /** Whether elapsed time exceeds the warning threshold */
  isOverWarningLimit: boolean;
  /** Real-time frequency data for waveform visualization (0-255 values) */
  frequencyData: Uint8Array | null;
  /** Error message if recording failed */
  error: string | null;
  /** Start recording */
  start: () => Promise<void>;
  /** Stop recording and return the audio blob */
  stop: () => void;
  /** Cancel recording without producing output */
  cancel: () => void;
}

interface UseAudioRecorderOptions {
  /** Called when recording completes successfully */
  onRecordingComplete?: (result: AudioRecorderResult) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {},
): UseAudioRecorderReturn {
  const { onRecordingComplete, onError } = options;

  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const cancelledRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setFrequencyData(null);
  }, []);

  // Update frequency data for waveform visualization
  const updateFrequencyData = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    setFrequencyData(new Uint8Array(data));

    animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    cancelledRef.current = false;
    setState("requesting");

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      const msg = "Audio recording is not supported in this browser.";
      setError(msg);
      onError?.(msg);
      setState("idle");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone access in your browser settings."
          : "Could not access microphone. Please check your audio device.";
      setError(msg);
      onError?.(msg);
      setState("idle");
      return;
    }

    streamRef.current = stream;

    // Set up audio analysis for waveform
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    // Set up MediaRecorder
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (cancelledRef.current) {
        cleanup();
        setState("idle");
        return;
      }

      const blob = new Blob(chunksRef.current, { type: mimeType });
      const duration = (Date.now() - startTimeRef.current) / 1000;
      cleanup();
      setState("idle");
      setElapsed(0);
      onRecordingComplete?.({ blob, mimeType, duration });
    };

    recorder.onerror = () => {
      const msg = "Recording failed unexpectedly.";
      setError(msg);
      onError?.(msg);
      cleanup();
      setState("idle");
    };

    // Start recording
    recorder.start(1000); // Collect data every second
    startTimeRef.current = Date.now();
    setState("recording");
    setElapsed(0);

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);

      // Hard limit
      if (secs >= RECORDING_MAX_SECONDS) {
        mediaRecorderRef.current?.stop();
      }
    }, 200);

    // Start waveform animation
    updateFrequencyData();
  }, [cleanup, onRecordingComplete, onError, updateFrequencyData]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      setState("stopping");
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setState("idle");
    }
    setElapsed(0);
    setError(null);
  }, [cleanup]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state === "recording") {
        stop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    state,
    elapsed,
    isOverWarningLimit: elapsed >= RECORDING_WARN_SECONDS,
    frequencyData,
    error,
    start,
    stop,
    cancel,
  };
}
