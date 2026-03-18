"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatDuration } from "~/lib/audio-utils";

// ─── Types ──────────────────────────────────────────────────────────

interface AudioPlayerProps {
  /** URL of the audio file */
  src: string;
  /** Optional start time in seconds (for timestamp-based seeking) */
  startTime?: number;
  /** Whether to auto-play when mounted (used when opening from timestamp badge) */
  autoPlay?: boolean;
  /** Total duration if known (avoids loading metadata) */
  duration?: number;
  /** Additional className */
  className?: string;
}

// ─── AudioPlayer Component ──────────────────────────────────────────

export function AudioPlayer({
  src,
  startTime = 0,
  autoPlay = false,
  duration: knownDuration,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(knownDuration ?? 0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load audio and set initial position
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      if (startTime > 0) {
        audio.currentTime = startTime;
      }
      if (autoPlay) {
        void audio.play();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [src, startTime, autoPlay]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  }, [isPlaying]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = progressRef.current;
      if (!audio || !bar || !duration) return;

      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
    },
    [duration],
  );

  const handleProgressKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const audio = audioRef.current;
      if (!audio) return;

      const step = 5; // seconds
      if (e.key === "ArrowRight") {
        audio.currentTime = Math.min(audio.currentTime + step, duration);
      } else if (e.key === "ArrowLeft") {
        audio.currentTime = Math.max(audio.currentTime - step, 0);
      }
    },
    [duration],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-[--border-default] bg-white p-3",
        "shadow-[--shadow-resting]",
        className,
      )}
      role="region"
      aria-label="Audio player"
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        type="button"
        onClick={togglePlayPause}
        disabled={!isLoaded}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          "bg-[--accent-primary] text-white",
          "hover:bg-blue-600 transition-colors duration-150",
          "disabled:opacity-50",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" fill="currentColor" />
        ) : (
          <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
        )}
      </button>

      {/* Current time */}
      <span className="min-w-[2.5rem] text-right font-mono text-xs tabular-nums text-text-secondary">
        {formatDuration(currentTime)}
      </span>

      {/* Progress bar */}
      <div
        ref={progressRef}
        className="relative flex-1 cursor-pointer py-2"
        onClick={handleProgressClick}
        onKeyDown={handleProgressKeyDown}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(duration)}`}
        tabIndex={0}
      >
        <div className="h-1 rounded-full bg-[--bg-secondary]">
          <motion.div
            className="h-1 rounded-full bg-[--accent-primary]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Duration */}
      <span className="min-w-[2.5rem] font-mono text-xs tabular-nums text-text-tertiary">
        {formatDuration(duration)}
      </span>

      {/* Volume icon (visual indicator) */}
      <Volume2 className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
    </div>
  );
}

// ─── AudioTimestampBadge ────────────────────────────────────────────

interface AudioTimestampBadgeProps {
  /** Timestamp in seconds */
  timestamp: number;
  /** Audio source URL */
  audioSrc: string;
  /** Called when badge is clicked to open player */
  onPlay?: (timestamp: number, audioSrc: string) => void;
  /** Additional className */
  className?: string;
}

export function AudioTimestampBadge({
  timestamp,
  audioSrc,
  onPlay,
  className,
}: AudioTimestampBadgeProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPlay?.(timestamp, audioSrc);
    },
    [timestamp, audioSrc, onPlay],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onPlay?.(timestamp, audioSrc);
      }
    },
    [timestamp, audioSrc, onPlay],
  );

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
        "bg-[--bg-secondary] text-text-secondary",
        "font-mono text-xs tabular-nums",
        "cursor-pointer hover:bg-[--bg-hover] hover:text-text-primary",
        "transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[--border-focus]",
        className,
      )}
      aria-label={`Play from ${formatDuration(timestamp)}`}
    >
      <Volume2 className="h-3 w-3" aria-hidden="true" />
      {formatDuration(timestamp)}
    </span>
  );
}
