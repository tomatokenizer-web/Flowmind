"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  formatDuration,
  decodeAudioBlob,
  extractWaveformPeaks,
} from "~/lib/audio-utils";

// ─── Types ──────────────────────────────────────────────────────────

interface AudioDetailViewProps {
  /** URL of the audio file to play */
  src: string;
  /** Optional pre-loaded audio Blob (avoids re-fetching for waveform) */
  blob?: Blob;
  /** Optional title displayed above the waveform */
  title?: string;
  /** Optional start time in seconds for initial seeking */
  startTime?: number;
  /** Known total duration in seconds (skips metadata loading) */
  duration?: number;
  /** Timestamp markers to render on the waveform (seconds) */
  markers?: AudioMarker[];
  /** Called when user clicks a marker */
  onMarkerClick?: (marker: AudioMarker) => void;
  /** Additional className */
  className?: string;
}

export interface AudioMarker {
  /** Time position in seconds */
  time: number;
  /** Display label for the marker */
  label: string;
  /** Optional color accent */
  color?: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const WAVEFORM_SAMPLES = 200;
const SEEK_STEP_SECONDS = 5;
const VOLUME_STEPS = 10;

// ─── Waveform Canvas ────────────────────────────────────────────────

function WaveformCanvas({
  peaks,
  progress,
  markers,
  duration,
  onSeek,
  onMarkerClick,
  className,
}: {
  peaks: number[];
  progress: number; // 0-1
  markers?: AudioMarker[];
  duration: number;
  onSeek: (ratio: number) => void;
  onMarkerClick?: (marker: AudioMarker) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredMarker, setHoveredMarker] = useState<AudioMarker | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const barCount = peaks.length;
    const gap = 1;
    const barWidth = Math.max(1, (rect.width - gap * (barCount - 1)) / barCount);
    const centerY = rect.height / 2;
    const maxBarHeight = rect.height * 0.85;

    for (let i = 0; i < barCount; i++) {
      const peak = peaks[i] ?? 0;
      const barHeight = Math.max(2, peak * maxBarHeight);
      const x = i * (barWidth + gap);
      const y = centerY - barHeight / 2;

      const barProgress = i / barCount;
      ctx.fillStyle =
        barProgress <= progress
          ? "#0071E3" // accent-primary (played)
          : "#D2D2D7"; // border-default (unplayed)

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }

    // Draw playhead line
    const playheadX = progress * rect.width;
    ctx.strokeStyle = "#0071E3";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, rect.height);
    ctx.stroke();
  }, [peaks, progress]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      onSeek(ratio);
    },
    [onSeek],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);

      // Check if hovering near a marker
      if (markers && duration > 0) {
        const ratio = x / rect.width;
        const hoverTime = ratio * duration;
        const threshold = duration * 0.02; // 2% of duration tolerance
        const found = markers.find(
          (m) => Math.abs(m.time - hoverTime) < threshold,
        );
        setHoveredMarker(found ?? null);
      }
    },
    [markers, duration],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverX(null);
    setHoveredMarker(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onSeek(Math.min(1, progress + SEEK_STEP_SECONDS / Math.max(duration, 1)));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSeek(Math.max(0, progress - SEEK_STEP_SECONDS / Math.max(duration, 1)));
      }
    },
    [progress, duration, onSeek],
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative cursor-pointer select-none", className)}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-label="Audio waveform — click or use arrow keys to seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(progress * duration)}
      aria-valuetext={`${formatDuration(progress * duration)} of ${formatDuration(duration)}`}
      tabIndex={0}
    >
      {/* Waveform canvas */}
      <canvas ref={canvasRef} className="h-24 w-full" aria-hidden="true" />

      {/* Timestamp markers */}
      {markers &&
        duration > 0 &&
        markers.map((marker, i) => {
          const markerRatio = marker.time / duration;
          if (markerRatio < 0 || markerRatio > 1) return null;

          return (
            <button
              key={i}
              type="button"
              className={cn(
                "absolute bottom-0 -translate-x-1/2",
                "flex flex-col items-center",
                "group",
              )}
              style={{ left: `${markerRatio * 100}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(markerRatio);
                onMarkerClick?.(marker);
              }}
              aria-label={`Jump to marker: ${marker.label} at ${formatDuration(marker.time)}`}
            >
              {/* Marker line */}
              <div
                className="h-24 w-px opacity-60"
                style={{
                  backgroundColor: marker.color ?? "#F5A623",
                }}
                aria-hidden="true"
              />
              {/* Marker label */}
              <span
                className={cn(
                  "mt-0.5 rounded px-1 py-0.5 text-[10px] font-medium",
                  "bg-[--bg-elevated] text-text-secondary shadow-sm",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                  hoveredMarker === marker && "opacity-100",
                )}
              >
                {marker.label}
              </span>
            </button>
          );
        })}

      {/* Hover time indicator */}
      {hoverX !== null && containerRef.current && (
        <div
          className="pointer-events-none absolute top-0"
          style={{ left: hoverX }}
          aria-hidden="true"
        >
          <div className="h-24 w-px bg-text-tertiary/40" />
          <span className="absolute -translate-x-1/2 top-[-18px] rounded bg-[--bg-elevated] px-1 py-0.5 text-[10px] font-mono text-text-secondary shadow-sm">
            {formatDuration(
              (hoverX / containerRef.current.getBoundingClientRect().width) *
                duration,
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Empty waveform (while loading) ─────────────────────────────────

function WaveformSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-24 w-full items-center justify-center rounded-lg bg-[--bg-secondary]",
        className,
      )}
      aria-label="Loading waveform..."
    >
      <div className="flex items-end gap-[2px] h-16">
        {Array.from({ length: 40 }, (_, i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full bg-[--border-default]"
            animate={{
              height: [4, 8 + Math.random() * 24, 4],
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.03,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Playback Speed Button ──────────────────────────────────────────

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function PlaybackSpeedButton({
  speed,
  onSpeedChange,
}: {
  speed: number;
  onSpeedChange: (speed: number) => void;
}) {
  const handleClick = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(
      speed as (typeof SPEED_OPTIONS)[number],
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % SPEED_OPTIONS.length : 2; // default to 1x
    onSpeedChange(SPEED_OPTIONS[nextIndex]!);
  }, [speed, onSpeedChange]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex h-7 items-center justify-center rounded-md px-2",
        "text-xs font-medium tabular-nums",
        "border border-[--border-default] bg-[--bg-primary]",
        "text-text-secondary hover:bg-[--bg-hover] hover:text-text-primary",
        "transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
        speed !== 1 && "text-[--accent-primary] border-[--accent-primary]/30",
      )}
      aria-label={`Playback speed: ${speed}x. Click to change.`}
    >
      {speed}x
    </button>
  );
}

// ─── Volume Slider ──────────────────────────────────────────────────

function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateVolume = useCallback(
    (clientX: number) => {
      const slider = sliderRef.current;
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      onVolumeChange(ratio);
    },
    [onVolumeChange],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      updateVolume(e.clientX);
    },
    [updateVolume],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => updateVolume(e.clientX);
    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, updateVolume]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onVolumeChange(Math.min(1, volume + 1 / VOLUME_STEPS));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onVolumeChange(Math.max(0, volume - 1 / VOLUME_STEPS));
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        onToggleMute();
      }
    },
    [volume, onVolumeChange, onToggleMute],
  );

  const displayVolume = isMuted ? 0 : volume;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleMute}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md",
          "text-text-secondary hover:text-text-primary hover:bg-[--bg-hover]",
          "transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
        )}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      <div
        ref={sliderRef}
        className="relative w-20 cursor-pointer py-2"
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayVolume * 100)}
        aria-valuetext={`${Math.round(displayVolume * 100)}%`}
        tabIndex={0}
      >
        <div className="h-1 rounded-full bg-[--bg-secondary]">
          <div
            className="h-1 rounded-full bg-text-secondary transition-[width] duration-75"
            style={{ width: `${displayVolume * 100}%` }}
          />
        </div>
        {/* Thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "h-3 w-3 rounded-full bg-text-primary",
            "shadow-sm transition-transform duration-75",
            isDragging && "scale-125",
          )}
          style={{ left: `${displayVolume * 100}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

// ─── AudioDetailView Component ──────────────────────────────────────

export function AudioDetailView({
  src,
  blob,
  title,
  startTime = 0,
  duration: knownDuration,
  markers,
  onMarkerClick,
  className,
}: AudioDetailViewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(knownDuration ?? 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(true);

  // ─── Load waveform peaks ───────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setIsLoadingWaveform(true);

    async function loadPeaks() {
      try {
        let audioBlob: Blob;
        if (blob) {
          audioBlob = blob;
        } else {
          const response = await fetch(src);
          audioBlob = await response.blob();
        }

        if (cancelled) return;

        const audioBuffer = await decodeAudioBlob(audioBlob);
        if (cancelled) return;

        const extractedPeaks = extractWaveformPeaks(
          audioBuffer,
          WAVEFORM_SAMPLES,
        );
        setPeaks(extractedPeaks);

        // Also set duration from decoded buffer if not known
        if (!knownDuration) {
          setDuration(audioBuffer.duration);
        }
      } catch (err) {
        console.warn("Failed to decode audio for waveform:", err);
        // Generate flat placeholder peaks
        setPeaks(Array.from({ length: WAVEFORM_SAMPLES }, () => 0.1));
      } finally {
        if (!cancelled) {
          setIsLoadingWaveform(false);
        }
      }
    }

    void loadPeaks();
    return () => {
      cancelled = true;
    };
  }, [src, blob, knownDuration]);

  // ─── Audio element event handlers ─────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (!knownDuration) {
        setDuration(audio.duration);
      }
      setIsLoaded(true);
      if (startTime > 0) {
        audio.currentTime = startTime;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
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
  }, [src, startTime, knownDuration]);

  // ─── Sync volume and playback rate ────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  // ─── Controls ─────────────────────────────────────────────────

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  }, [isPlaying]);

  const seekTo = useCallback(
    (ratio: number) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      audio.currentTime = ratio * duration;
      setCurrentTime(ratio * duration);
    },
    [duration],
  );

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + SEEK_STEP_SECONDS, duration);
  }, [duration]);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - SEEK_STEP_SECONDS, 0);
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this component area is focused
      if (
        document.activeElement?.closest("[data-audio-detail]") === null
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, toggleMute]);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      data-audio-detail
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[--border-default] bg-white p-4",
        "shadow-[--shadow-resting]",
        className,
      )}
      role="region"
      aria-label={title ? `Audio detail: ${title}` : "Audio detail player"}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Title */}
      {title && (
        <h3 className="text-sm font-medium text-text-primary truncate">
          {title}
        </h3>
      )}

      {/* Waveform */}
      {isLoadingWaveform ? (
        <WaveformSkeleton />
      ) : (
        <WaveformCanvas
          peaks={peaks}
          progress={progress}
          markers={markers}
          duration={duration}
          onSeek={seekTo}
          onMarkerClick={onMarkerClick}
        />
      )}

      {/* Time display */}
      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-text-secondary">
        <span>{formatDuration(currentTime)}</span>
        <span className="text-text-tertiary">
          -{formatDuration(Math.max(0, duration - currentTime))}
        </span>
        <span>{formatDuration(duration)}</span>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Skip backward */}
        <button
          type="button"
          onClick={skipBackward}
          disabled={!isLoaded}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            "text-text-secondary hover:text-text-primary hover:bg-[--bg-hover]",
            "transition-colors duration-150",
            "disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
          )}
          aria-label={`Skip backward ${SEEK_STEP_SECONDS} seconds`}
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlayPause}
          disabled={!isLoaded}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "bg-[--accent-primary] text-white",
            "hover:bg-blue-600 transition-colors duration-150",
            "disabled:opacity-50",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
          )}
        </button>

        {/* Skip forward */}
        <button
          type="button"
          onClick={skipForward}
          disabled={!isLoaded}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            "text-text-secondary hover:text-text-primary hover:bg-[--bg-hover]",
            "transition-colors duration-150",
            "disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--border-focus]",
          )}
          aria-label={`Skip forward ${SEEK_STEP_SECONDS} seconds`}
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom bar: volume + speed */}
      <div className="flex items-center justify-between border-t border-[--border-default] pt-3">
        <VolumeControl
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
        />

        <PlaybackSpeedButton
          speed={playbackRate}
          onSpeedChange={setPlaybackRate}
        />
      </div>

      {/* Marker list (if any) */}
      {markers && markers.length > 0 && (
        <div className="border-t border-[--border-default] pt-3">
          <h4 className="mb-2 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Markers
          </h4>
          <ul className="space-y-1">
            {markers.map((marker, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    seekTo(marker.time / Math.max(duration, 1));
                    onMarkerClick?.(marker);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
                    "text-xs text-text-secondary",
                    "hover:bg-[--bg-hover] hover:text-text-primary",
                    "transition-colors duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[--border-focus]",
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: marker.color ?? "#F5A623" }}
                    aria-hidden="true"
                  />
                  <span className="font-mono tabular-nums">
                    {formatDuration(marker.time)}
                  </span>
                  <span className="truncate">{marker.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
