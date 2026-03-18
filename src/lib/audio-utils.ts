/**
 * Audio utilities for format conversion and duration calculation.
 * Used by the audio recording and playback system (Story 2.11).
 */

/** Supported audio MIME types for recording */
export const SUPPORTED_AUDIO_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
] as const;

/** Recording limits */
export const RECORDING_WARN_SECONDS = 5 * 60; // 5 minutes
export const RECORDING_MAX_SECONDS = 30 * 60; // 30 minutes

/**
 * Get the best supported MIME type for MediaRecorder.
 * Prefers WebM/Opus for efficient encoding.
 */
export function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return SUPPORTED_AUDIO_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Format seconds into MM:SS display string.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds into a compact timestamp badge (e.g., "1:23").
 */
export function formatTimestamp(seconds: number): string {
  return formatDuration(seconds);
}

/**
 * Calculate audio duration from an audio Blob using Web Audio API.
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } finally {
    await audioContext.close();
  }
}

/**
 * Convert an audio Blob to base64 string for upload.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(",")[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract waveform peak data from an AudioBuffer for static visualization.
 * Returns normalized peak values (0-1) for the given number of samples.
 */
export function extractWaveformPeaks(
  audioBuffer: AudioBuffer,
  numSamples: number,
): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const samplesPerPeak = Math.floor(channelData.length / numSamples);
  const peaks: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, channelData.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]!);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }

  return peaks;
}

/**
 * Decode a Blob into an AudioBuffer for waveform extraction.
 */
export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    return await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close();
  }
}

/**
 * Get audio metadata from a Blob.
 */
export async function getAudioMetadata(blob: Blob): Promise<{
  duration: number;
  sampleRate: number;
  format: string;
  fileSize: number;
}> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      format: blob.type || "audio/webm",
      fileSize: blob.size,
    };
  } finally {
    await audioContext.close();
  }
}
