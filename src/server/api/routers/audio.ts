import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createResourceService } from "@/server/services/resourceService";
import { TRPCError } from "@trpc/server";

// ─── Zod Schemas ───────────────────────────────────────────────────

const uploadAudioSchema = z.object({
  /** Base64-encoded audio data */
  base64: z.string().min(1),
  /** Audio MIME type (e.g., "audio/webm;codecs=opus") */
  mimeType: z.string().min(1),
  /** Recording duration in seconds */
  duration: z.number().positive(),
  /** Sample rate of the recording */
  sampleRate: z.number().int().positive().optional(),
  /** File name for the recording */
  fileName: z.string().optional(),
});

const transcribeSchema = z.object({
  /** Resource ID of the uploaded audio */
  resourceId: z.string().uuid(),
  /** Project to create transcribed units in */
  projectId: z.string().uuid(),
  /** Whether to run AI decomposition on the transcription */
  decompose: z.boolean().default(false),
});

const transcriptionSegment = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
});

// ─── Mock Transcription Service ─────────────────────────────────────
// Real Whisper API integration will be wired in Epic 5.

interface TranscriptionResult {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  confidence: number;
  language: string;
}

async function mockTranscribe(
  _audioBase64: string,
  duration: number,
): Promise<TranscriptionResult> {
  // Simulate transcription latency
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate mock segments based on duration
  const segmentCount = Math.max(1, Math.floor(duration / 10));
  const segments: TranscriptionResult["segments"] = [];

  for (let i = 0; i < segmentCount; i++) {
    const start = (duration / segmentCount) * i;
    const end = (duration / segmentCount) * (i + 1);
    segments.push({
      text: `[Mock transcription segment ${i + 1}] Audio content from ${Math.floor(start)}s to ${Math.floor(end)}s.`,
      start,
      end,
    });
  }

  return {
    text: segments.map((s) => s.text).join(" "),
    segments,
    confidence: 0.92,
    language: "en",
  };
}

// ─── Router ────────────────────────────────────────────────────────

export const audioRouter = createTRPCRouter({
  /**
   * Upload an audio recording and create a Resource Unit.
   */
  upload: protectedProcedure
    .input(uploadAudioSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createResourceService(ctx.db);
      const buffer = Buffer.from(input.base64, "base64");

      const fileName =
        input.fileName ?? `recording-${Date.now()}.webm`;

      const resource = await service.upload(
        {
          buffer,
          fileName,
          mimeType: input.mimeType,
          resourceType: "audio",
          metadata: {
            duration: input.duration,
            sampleRate: input.sampleRate ?? 48000,
            format: input.mimeType,
          },
          lifecycle: "confirmed",
        },
        ctx.session.user.id!,
      );

      return resource;
    }),

  /**
   * Transcribe an uploaded audio Resource and create linked Units.
   * Uses mock transcription for now — real Whisper API in Epic 5.
   */
  transcribe: protectedProcedure
    .input(transcribeSchema)
    .mutation(async ({ ctx, input }) => {
      const resourceService = createResourceService(ctx.db);

      // Fetch the audio resource
      const resource = await resourceService.getById(input.resourceId);
      if (!resource) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audio resource not found",
        });
      }

      if (resource.resourceType !== "audio") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Resource is not an audio file",
        });
      }

      const metadata = resource.metadata as Record<string, unknown> | null;
      const duration = (metadata?.duration as number) ?? 30;

      // Run transcription (mock for now)
      const transcription = await mockTranscribe("", duration);

      // Create Units from transcription segments
      const units = await Promise.all(
        transcription.segments.map(async (segment) => {
          const unit = await ctx.db.unit.create({
            data: {
              content: segment.text,
              unitType: "observation",
              lifecycle: "draft",
              originType: "external_excerpt",
              sourceSpan: {
                type: "audio_transcription",
                audioResourceId: input.resourceId,
                start: segment.start,
                end: segment.end,
              },
              userId: ctx.session.user.id!,
              projectId: input.projectId,
            },
          });

          // Link unit to the audio resource
          await resourceService.linkToUnit(
            input.resourceId,
            unit.id,
            "transcription_source",
          );

          return unit;
        }),
      );

      return {
        transcription: {
          text: transcription.text,
          segments: transcription.segments,
          confidence: transcription.confidence,
          language: transcription.language,
        },
        units,
        resourceId: input.resourceId,
      };
    }),

  /**
   * Get transcription segments for a given audio resource.
   */
  getSegments: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Find all units linked to this audio resource that have sourceSpan
      const units = await ctx.db.unit.findMany({
        where: {
          originType: "external_excerpt",
          userId: ctx.session.user.id!,
          sourceSpan: {
            path: ["type"],
            equals: "audio_transcription",
          },
          AND: {
            sourceSpan: {
              path: ["audioResourceId"],
              equals: input.resourceId,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          sourceSpan: true,
          lifecycle: true,
          createdAt: true,
        },
      });

      return units.map((unit) => {
        const span = unit.sourceSpan as Record<string, unknown> | null;
        return {
          unitId: unit.id,
          content: unit.content,
          start: (span?.start as number) ?? 0,
          end: (span?.end as number) ?? 0,
          lifecycle: unit.lifecycle,
        };
      });
    }),
});
