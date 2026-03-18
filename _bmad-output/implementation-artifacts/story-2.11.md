# Story 2.11: Audio Input & Transcription-Linked Units

Status: complete

## Story

As a user,
I want to record audio thoughts and have them transcribed into Thought Units that link back to specific audio timestamps,
So that I can capture ideas verbally when typing is impractical and later navigate between text and the original spoken context.

## Acceptance Criteria

1. **Given** the user is in Capture Mode or any Unit creation context, **When** the user taps the record button (microphone icon in the input toolbar), **Then** a real-time waveform visualizer appears showing audio levels during recording
2. The recording state is clearly indicated with a pulsing red dot and elapsed time counter
3. The user can stop recording via the stop button or by pressing Escape
4. **Given** a recording has been stopped, **When** the audio is submitted for processing, **Then** a processing state indicator shows "Transcribing..." with a progress animation
5. The transcribed text is fed through the standard Unit creation pipeline (including AI decomposition if enabled)
6. The original audio file is stored as a Resource Unit (type: audio) linked to the generated Thought Units
7. **Given** Units have been created from an audio recording, **When** the user views any such Unit in UnitCard or Unit Detail Panel, **Then** each Unit displays an audio timestamp badge (e.g., "1:23") indicating the position in the source audio
8. Clicking the timestamp badge opens an inline audio player and plays from that exact position
9. The audio Resource Unit's detail view shows the full waveform with clickable timestamp markers for each derived Unit

## Tasks / Subtasks

- [x] Task 1: Create AudioRecorder component (AC: #1, #2, #3)
  - [x] Create `src/components/unit/audio-recorder.tsx`
  - [x] Implement microphone button in Capture Mode input toolbar
  - [x] Use `MediaRecorder` API for audio capture
  - [x] Request microphone permission with graceful error handling
  - [x] Show real-time waveform visualizer using `AnalyserNode` + Canvas/SVG
  - [x] Show pulsing red dot animation during recording
  - [x] Show elapsed time counter (MM:SS format)
  - [x] Stop button and Escape key to end recording
- [x] Task 2: Implement audio upload and storage (AC: #6)
  - [x] Convert recorded audio to WebM/Opus or WAV format
  - [x] Upload to Vercel Blob via `storageService` (from Story 2.6)
  - [x] Create Resource Unit with `resource_type: "audio"`, `metadata: { duration, sampleRate, format }`
  - [x] Store audio URL in Resource Unit
- [x] Task 3: Implement transcription pipeline (AC: #4, #5)
  - [x] Create mock transcription in `audio.ts` router (real Whisper API in Epic 5)
  - [x] Integrate with transcription API (mock for now, real Whisper API wired in Epic 5)
  - [x] Parse transcription response including word-level timestamps
  - [x] Feed transcribed text through unit creation pipeline
  - [x] If Organize Mode: route to AI decomposition (placeholder for Epic 5)
  - [x] If Capture Mode: create single Unit with full transcription
- [x] Task 4: Implement timestamp linking (AC: #7, #8)
  - [x] Store `audio_timestamp` (seconds) in Unit's `source_span` metadata
  - [x] Create `AudioTimestampBadge` component: shows formatted time (e.g., "1:23")
  - [x] On badge click: open inline audio player seeking to that timestamp
- [x] Task 5: Create inline audio player (AC: #8)
  - [x] Create `src/components/unit/audio-player.tsx`
  - [x] Compact player with play/pause, progress bar, time display
  - [x] Accept `startTime` prop for seeking to a specific position
  - [x] Auto-play from the specified timestamp when opened via badge click
- [x] Task 6: Create audio utility library
  - [x] Create `src/lib/audio-utils.ts`
  - [x] Format conversion (blob to base64)
  - [x] Duration calculation via Web Audio API
  - [x] Waveform peak extraction for static visualization
  - [x] Audio metadata extraction
- [x] Task 7: Handle edge cases and errors
  - [x] Microphone permission denied: show instructional message
  - [x] Long recordings: warn after 5 minutes, hard limit at 30 minutes
  - [x] Browser compatibility: detect supported MIME types
- [x] Task 8: Create useAudioRecorder hook
  - [x] Create `src/hooks/use-audio-recorder.ts`
  - [x] Manage recording state (idle, requesting, recording, stopping)
  - [x] Real-time frequency data for waveform visualization
  - [x] Escape key to stop recording
  - [x] Cleanup on unmount

## Dev Notes

- Use the Web Audio API (`AudioContext`, `AnalyserNode`) for real-time waveform visualization during recording
- `MediaRecorder` API is well-supported in modern browsers — use `audio/webm;codecs=opus` for efficient encoding
- Transcription can use OpenAI Whisper API which provides word-level timestamps — store these in `source_span` for precise linking
- The waveform visualization can use a simple canvas drawing: sample the `AnalyserNode` frequency data and draw bars
- Audio files can be large — implement upload progress indication and consider chunked uploads for files >10MB
- The timestamp linking is a key UX differentiator — ensure the badge-to-player interaction feels instant
- Consider using `Web Audio API` for the static waveform display (decode audio buffer, compute peak data)
- This story has a dependency on Story 2.6 (Resource Unit model) and the transcription API setup

### Architecture References

- [Source: _bmad-output/planning-artifacts/architecture.md] — Vercel Blob for file storage
- [Source: _bmad-output/planning-artifacts/architecture.md] — External API integration patterns
- [Source: _bmad-output/planning-artifacts/architecture.md] — 3-layer architecture (Router → Service → Repository)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.11] — Story definition and acceptance criteria

### UX References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — FR18: Audio input and transcription
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — FR4: Resource Units as first-class citizens
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR58: Optimistic UI updates
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — UX-DR42: Animation timing
