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

// ─── Transcription ────────────────────────────────────────────────────
// Whisper API integration requires OPENAI_API_KEY configuration.

function requireTranscriptionConfig(): never {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message:
      "Audio transcription requires Whisper API configuration. Set OPENAI_API_KEY in .env",
  });
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
   * Requires OPENAI_API_KEY to be set — throws NOT_IMPLEMENTED otherwise.
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

      // Transcription requires Whisper API — not yet configured.
      // This throws TRPCError NOT_IMPLEMENTED; code below is unreachable
      // until OPENAI_API_KEY is set and real Whisper integration is added.
      return requireTranscriptionConfig();
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
