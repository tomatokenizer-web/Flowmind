/**
 * AI Pipeline Orchestrator
 *
 * Main entry point for the 7-pass processing pipeline.
 * - Foraging Loop (Passes 1-4): Extract, classify, organize. Sync, <3s target.
 * - Sensemaking Loop (Passes 5-7): Relations, cross-graph, salience. Async.
 *
 * All AI-generated units start as "draft" lifecycle.
 * Works without API key using heuristic fallbacks.
 */

import { logger } from "@/server/logger";
import { PipelineClient, getPipelineClient } from "./client";
import type {
  PipelineInput,
  PipelineOptions,
  PipelineResult,
  PipelineMetadata,
  NormalizedInput,
  ExtractedUnit,
  DetectedRelation,
  CrossRelation,
  ContextAssignment,
  SalienceUpdate,
  ReviewItem,
  GenreDensity,
} from "./types";
import { SAFETY_CONFIG } from "./config";

// Pass imports
import { executePass1 } from "./passes/pass1-capture";
import { executePass2 } from "./passes/pass2-extraction";
import { executePass3, applyClassifications } from "./passes/pass3-classification";
import { executePass4 } from "./passes/pass4-context";
import { executePass5 } from "./passes/pass5-within-relations";
import { executePass6 } from "./passes/pass6-cross-relations";
import { executePass7 } from "./passes/pass7-salience";
import {
  buildExtractionReview,
  buildClassificationReview,
} from "./utils/confidence";
import { EXTRACTION_CONFIG } from "./config";

// ─── Foraging Loop (Passes 1-4) ─────────────────────────────────────────

export interface ForagingResult {
  normalizedInput: NormalizedInput;
  units: ExtractedUnit[];
  contextAssignments: ContextAssignment[];
  reviewItems: ReviewItem[];
  genre: string;
  density: GenreDensity;
  processingTimeMs: number;
}

/**
 * Execute the Foraging Loop: Passes 1-4.
 * Captures, extracts, classifies, and assigns context.
 * Designed to feel instant (<3s total).
 */
export async function processForagingLoop(
  input: PipelineInput,
  options: PipelineOptions = {},
): Promise<ForagingResult> {
  const startTime = performance.now();
  const client = getPipelineClient({ forceMock: options.forceMock });
  const reviewItems: ReviewItem[] = [];

  // ── Pass 1: Capture & Normalization ──
  const pass1Start = performance.now();
  const normalizedInput = executePass1(input);
  const pass1Time = performance.now() - pass1Start;
  logger.debug({ pass1Time }, "Pass 1 complete");

  // ── Pass 2: Unit Extraction ──
  const pass2Start = performance.now();
  const extractionResult = await executePass2(client, normalizedInput, {
    genre: options.genre,
    density: options.density,
  });
  const pass2Time = performance.now() - pass2Start;
  logger.debug(
    { pass2Time, unitCount: extractionResult.units.length },
    "Pass 2 complete",
  );

  // Flag low-confidence extractions for review
  for (const unit of extractionResult.units) {
    if (unit.extractionConfidence < EXTRACTION_CONFIG.confidenceThreshold) {
      reviewItems.push(
        buildExtractionReview(
          unit.position,
          unit.extractionConfidence,
          unit.content,
        ),
      );
    }
  }

  // ── Pass 3: Type Classification ──
  const pass3Start = performance.now();
  const classifications = await executePass3(client, extractionResult.units, {
    domainTemplate: input.domainTemplate,
  });
  applyClassifications(extractionResult.units, classifications);
  const pass3Time = performance.now() - pass3Start;
  logger.debug({ pass3Time }, "Pass 3 complete");

  // Flag low-confidence classifications for review
  for (const c of classifications) {
    if (c.needsReview) {
      reviewItems.push(
        buildClassificationReview(c.unitIndex, c.type, c.confidence),
      );
    }
  }

  // ── Pass 4: Context Assignment ──
  const pass4Start = performance.now();
  const contextResult = await executePass4(client, extractionResult.units, {
    existingContexts: options.existingContexts,
    targetContextId: input.contextId,
  });
  const pass4Time = performance.now() - pass4Start;
  logger.debug({ pass4Time }, "Pass 4 complete");

  reviewItems.push(...contextResult.reviewItems);

  const totalTime = performance.now() - startTime;

  return {
    normalizedInput,
    units: extractionResult.units,
    contextAssignments: contextResult.assignments,
    reviewItems,
    genre: extractionResult.genre,
    density: extractionResult.density,
    processingTimeMs: totalTime,
  };
}

// ─── Sensemaking Loop (Passes 5-7) ──────────────────────────────────────

export interface SensemakingResult {
  relations: DetectedRelation[];
  crossRelations: CrossRelation[];
  salienceUpdates: SalienceUpdate[];
  reviewItems: ReviewItem[];
  processingTimeMs: number;
}

/**
 * Execute the Sensemaking Loop: Passes 5-7.
 * Detects within-input relations, cross-graph relations, and updates salience.
 * Designed to run asynchronously after the foraging loop.
 */
export async function processSensemakingLoop(
  units: ExtractedUnit[],
  options: PipelineOptions = {},
): Promise<SensemakingResult> {
  const startTime = performance.now();
  const client = getPipelineClient({ forceMock: options.forceMock });
  const reviewItems: ReviewItem[] = [];

  // ── Pass 5: Within-Input Relations ──
  const pass5Start = performance.now();
  const withinResult = await executePass5(client, units);
  const pass5Time = performance.now() - pass5Start;
  logger.debug(
    { pass5Time, relationCount: withinResult.relations.length },
    "Pass 5 complete",
  );
  reviewItems.push(...withinResult.reviewItems);

  // ── Pass 6: Cross-Graph Relations ──
  const pass6Start = performance.now();
  const crossResult = await executePass6(
    client,
    units,
    options.existingUnits ?? [],
  );
  const pass6Time = performance.now() - pass6Start;
  logger.debug(
    { pass6Time, crossRelationCount: crossResult.crossRelations.length },
    "Pass 6 complete",
  );
  reviewItems.push(...crossResult.reviewItems);

  // ── Pass 7: Salience Update ──
  const pass7Start = performance.now();
  const salienceResult = executePass7(
    units,
    withinResult.relations,
    crossResult.crossRelations,
  );
  const pass7Time = performance.now() - pass7Start;
  logger.debug({ pass7Time }, "Pass 7 complete");

  const totalTime = performance.now() - startTime;

  return {
    relations: withinResult.relations,
    crossRelations: crossResult.crossRelations,
    salienceUpdates: salienceResult.updates,
    reviewItems,
    processingTimeMs: totalTime,
  };
}

// ─── Full Pipeline ───────────────────────────────────────────────────────

/**
 * Execute the complete 7-pass pipeline.
 *
 * @param input - The text input with metadata
 * @param options - Pipeline configuration options
 * @returns Full pipeline result with units, relations, assignments, and review items
 */
export async function processInput(
  input: PipelineInput,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const startTime = performance.now();
  const client = getPipelineClient({ forceMock: options.forceMock });

  logger.info(
    {
      sourceType: input.sourceType,
      textLength: input.text.length,
      mockMode: client.mockMode,
      projectId: input.projectId,
    },
    "Starting AI pipeline",
  );

  // ── Foraging Loop (Passes 1-4) ──
  const foragingStart = performance.now();
  const foragingResult = await processForagingLoop(input, options);
  const foragingTime = performance.now() - foragingStart;

  let relations: DetectedRelation[] = [];
  let crossRelations: CrossRelation[] = [];
  let salienceUpdates: SalienceUpdate[] = [];
  let sensemakingReviewItems: ReviewItem[] = [];
  let sensemakingTime = 0;

  // ── Sensemaking Loop (Passes 5-7) — skip if foragingOnly ──
  if (!options.foragingOnly) {
    const sensemakingStart = performance.now();
    const sensemakingResult = await processSensemakingLoop(
      foragingResult.units,
      options,
    );
    sensemakingTime = performance.now() - sensemakingStart;

    relations = sensemakingResult.relations;
    crossRelations = sensemakingResult.crossRelations;
    salienceUpdates = sensemakingResult.salienceUpdates;
    sensemakingReviewItems = sensemakingResult.reviewItems;
  }

  // ── Enforce AI Safety Limits ──
  // Cap generated units if this is an AI-generated batch
  if (foragingResult.units.length > SAFETY_CONFIG.maxGeneratedPerRequest) {
    logger.warn(
      {
        extracted: foragingResult.units.length,
        max: SAFETY_CONFIG.maxGeneratedPerRequest,
      },
      "AI safety: unit count exceeds max per request (not capping — these are extractions, not generations)",
    );
    // Note: extraction is not generation. The max-3 limit applies to
    // AI-generated units (origin: ai_generated), not user-submitted text decomposition.
    // We log but don't cap extraction results.
  }

  const totalTime = performance.now() - startTime;

  const allReviewItems = [
    ...foragingResult.reviewItems,
    ...sensemakingReviewItems,
  ];

  const metadata: PipelineMetadata = {
    totalProcessingTimeMs: totalTime,
    foragingTimeMs: foragingTime,
    sensemakingTimeMs: sensemakingTime,
    genre: foragingResult.genre,
    density: foragingResult.density,
    language: foragingResult.normalizedInput.language,
    unitCount: foragingResult.units.length,
    relationCount: relations.length + crossRelations.length,
    reviewItemCount: allReviewItems.length,
    usedMockMode: client.mockMode,
    passTimings: {
      pass1: foragingResult.normalizedInput.metadata.processingTimeMs,
      foraging: foragingTime,
      sensemaking: sensemakingTime,
      total: totalTime,
    },
  };

  logger.info(
    {
      units: metadata.unitCount,
      relations: metadata.relationCount,
      reviews: metadata.reviewItemCount,
      totalMs: Math.round(totalTime),
      mockMode: metadata.usedMockMode,
    },
    "AI pipeline complete",
  );

  return {
    units: foragingResult.units,
    relations,
    crossRelations,
    contextAssignments: foragingResult.contextAssignments,
    salienceUpdates,
    reviewItems: allReviewItems,
    metadata,
  };
}

// ─── Re-exports ──────────────────────────────────────────────────────────

export type {
  PipelineInput,
  PipelineOptions,
  PipelineResult,
  PipelineMetadata,
  ExtractedUnit,
  DetectedRelation,
  CrossRelation,
  ContextAssignment,
  SalienceUpdate,
  ReviewItem,
  ExistingUnit,
  ExistingContext,
} from "./types";

export { PipelineClient, getPipelineClient, resetPipelineClient } from "./client";
