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

- [ ] Task 1: Create AudioRecorder component (AC: #1, #2, #3)
  - [ ] Create `src/components/capture/AudioRecorder.tsx`
  - [ ] Implement microphone button in Capture Mode input toolbar
  - [ ] Use `MediaRecorder` API for audio capture
  - [ ] Request microphone permission with graceful error handling
  - [ ] Show real-time waveform visualizer using `AnalyserNode` + Canvas/SVG
  - [ ] Show pulsing red dot animation during recording
  - [ ] Show elapsed time counter (MM:SS format)
  - [ ] Stop button and Escape key to end recording
- [ ] Task 2: Implement audio upload and storage (AC: #6)
  - [ ] Convert recorded audio to WebM/Opus or WAV format
  - [ ] Upload to Vercel Blob via `storageService` (from Story 2.6)
  - [ ] Create Resource Unit with `resource_type: "audio"`, `metadata: { duration, sampleRate, format }`
  - [ ] Store audio URL in Resource Unit
- [ ] Task 3: Implement transcription pipeline (AC: #4, #5)
  - [ ] Create `server/services/transcriptionService.ts`
  - [ ] Integrate with transcription API (OpenAI Whisper API or similar)
  - [ ] Show "Transcribing..." state with progress/spinner animation
  - [ ] Parse transcription response including word-level timestamps
  - [ ] Feed transcribed text through `unitService.create()` pipeline
  - [ ] If Organize Mode: route to AI decomposition (placeholder for Epic 5)
  - [ ] If Capture Mode: create single Unit with full transcription
- [ ] Task 4: Implement timestamp linking (AC: #7, #8)
  - [ ] Store `audio_timestamp` (seconds) in Unit's `source_span` metadata
  - [ ] Create `AudioTimestampBadge` component: shows formatted time (e.g., "1:23")
  - [ ] Add badge to UnitCard and Unit Detail Panel for audio-derived Units
  - [ ] On badge click: open inline audio player seeking to that timestamp
- [ ] Task 5: Create inline audio player (AC: #8)
  - [ ] Create `src/components/media/InlineAudioPlayer.tsx`
  - [ ] Compact player with play/pause, progress bar, time display
  - [ ] Accept `startTime` prop for seeking to a specific position
  - [ ] Auto-play from the specified timestamp when opened via badge click
  - [ ] Show waveform visualization (static, not real-time)
- [ ] Task 6: Create audio Resource Unit detail view (AC: #9)
  - [ ] Create `src/components/media/AudioResourceDetail.tsx`
  - [ ] Show full waveform visualization of the audio file
  - [ ] Overlay clickable timestamp markers for each derived Unit
  - [ ] Clicking a marker scrolls to / highlights the corresponding Unit
  - [ ] Show total duration, recording date, linked Unit count
- [ ] Task 7: Handle edge cases and errors
  - [ ] Microphone permission denied: show instructional message
  - [ ] Transcription failure: store audio Resource Unit, show error with retry option
  - [ ] Long recordings: warn after 5 minutes, hard limit at 30 minutes
  - [ ] Poor audio quality: show confidence indicator from transcription API
- [ ] Task 8: Write tests
  - [ ] Test recording start/stop lifecycle
  - [ ] Test audio upload to Vercel Blob
  - [ ] Test transcription service integration (mock API)
  - [ ] Test timestamp badge rendering on derived Units
  - [ ] Test inline player seek-to-timestamp
  - [ ] Test error handling (permission denied, transcription failure)
  - [ ] Test Resource Unit creation with correct metadata

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
