/**
 * AI Pipeline Types
 *
 * All interfaces and type definitions for the 7-pass processing pipeline.
 * Aligned with Prisma schema enums and the Processing-Pipeline spec.
 */

// ─── Unit Type Taxonomy ──────────────────────────────────────────────────

export const UNIT_TYPES = [
  "claim",
  "evidence",
  "warrant",
  "backing",
  "qualifier",
  "rebuttal",
  "observation",
  "context",
  "definition",
  "question",
  "analogy",
  "decision",
  "idea",
  "assumption",
  "action",
  "counterargument",
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

// ─── Relation Types ──────────────────────────────────────────────────────

export const RELATION_TYPES = [
  "supports",
  "contradicts",
  "elaborates",
  "qualifies",
  "exemplifies",
  "generalizes",
  "causes",
  "enables",
  "temporal_sequence",
  "part_of",
  "contrasts",
  "reframes",
  "depends_on",
  "responds_to",
  "analogous_to",
  "derived_from",
  "refines",
  "subsumes",
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

// ─── Source Types ────────────────────────────────────────────────────────

export type SourceType = "text" | "url" | "pdf" | "image" | "audio";

// ─── Genre / Domain ──────────────────────────────────────────────────────

export type GenreDensity = "high" | "medium" | "low";

export const GENRE_MAP: Record<string, GenreDensity> = {
  science: "high",
  law: "high",
  philosophy: "medium",
  business: "medium",
  academic: "high",
  technical: "high",
  narrative: "low",
  journal: "low",
  casual: "low",
  general: "medium",
} as const;

// ─── Pipeline Input ──────────────────────────────────────────────────────

export interface PipelineInput {
  text: string;
  sourceType: SourceType;
  sourceUrl?: string;
  projectId: string;
  contextId?: string;
  domainTemplate?: string;
}

export interface PipelineOptions {
  /** Skip sensemaking loop (passes 5-7) */
  foragingOnly?: boolean;
  /** Override genre detection */
  genre?: string;
  /** Override density for unit extraction */
  density?: GenreDensity;
  /** Existing units in the graph for cross-relation detection */
  existingUnits?: ExistingUnit[];
  /** Existing contexts for context assignment */
  existingContexts?: ExistingContext[];
  /** Use mock/heuristic mode even if API key is available */
  forceMock?: boolean;
}

// ─── Pass 1: Capture & Normalization ─────────────────────────────────────

export interface NormalizedInput {
  rawText: string;
  normalizedText: string;
  sourceType: SourceType;
  sourceUrl?: string;
  language: string;
  metadata: InputMetadata;
}

export interface InputMetadata {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  detectedLanguage: string;
  hasUrls: boolean;
  hasCitations: boolean;
  hasCodeBlocks: boolean;
  processingTimeMs: number;
}

// ─── Pass 2: Unit Extraction ─────────────────────────────────────────────

export interface ExtractedUnit {
  content: string;
  rawContent: string;
  type: UnitType;
  typeConfidence: number;
  secondaryType?: UnitType;
  extractionConfidence: number;
  suggestedContextId?: string;
  contextRelevance: number;
  lifecycle: "draft";
  position: number;
  sourceSpan: { start: number; end: number };
}

export interface ExtractionResult {
  units: ExtractedUnit[];
  genre: string;
  density: GenreDensity;
  processingTimeMs: number;
}

// ─── Pass 3: Classification ──────────────────────────────────────────────

export interface ClassificationResult {
  unitIndex: number;
  type: UnitType;
  confidence: number;
  secondaryType?: UnitType;
  secondaryConfidence?: number;
  reasoning?: string;
  needsReview: boolean;
}

// ─── Pass 4: Context Assignment ──────────────────────────────────────────

export interface ContextAssignment {
  unitIndex: number;
  contextId: string;
  contextName?: string;
  relevance: number;
  action: "auto-assign" | "suggest" | "inbox" | "new-context";
  suggestedContextName?: string;
}

export interface ExistingContext {
  id: string;
  name: string;
  description?: string;
  snapshot?: string;
}

// ─── Pass 5: Within-Input Relations ──────────────────────────────────────

export interface DetectedRelation {
  sourceIndex: number;
  targetIndex: number;
  type: RelationType;
  confidence: number;
  action: "auto-accept" | "suggest" | "hidden" | "discard";
  reasoning?: string;
  /** For cross-graph relations: ID of the existing unit */
  existingUnitId?: string;
}

// ─── Pass 6: Cross-Graph Relations ───────────────────────────────────────

export interface ExistingUnit {
  id: string;
  content: string;
  type: string;
  contextId?: string;
  keywords?: string[];
  importance?: number;
}

export interface CrossRelation extends DetectedRelation {
  existingUnitId: string;
  salienceBoost: number;
}

// ─── Pass 7: Salience ───────────────────────────────────────────────────

export interface SalienceUpdate {
  unitIndex: number;
  salience: number;
  convergenceBonus: number;
  crossGraphBoost: number;
  finalSalience: number;
}

export interface SalienceResult {
  updates: SalienceUpdate[];
  processingTimeMs: number;
}

// ─── Review Items ────────────────────────────────────────────────────────

export type ReviewReason =
  | "low-extraction-confidence"
  | "low-type-confidence"
  | "ambiguous-context"
  | "suggested-relation"
  | "suggested-context"
  | "new-context-proposal";

export interface ReviewItem {
  type: ReviewReason;
  unitIndex?: number;
  message: string;
  data?: Record<string, unknown>;
}

// ─── Pipeline Result ─────────────────────────────────────────────────────

export interface PipelineMetadata {
  totalProcessingTimeMs: number;
  foragingTimeMs: number;
  sensemakingTimeMs: number;
  genre: string;
  density: GenreDensity;
  language: string;
  unitCount: number;
  relationCount: number;
  reviewItemCount: number;
  usedMockMode: boolean;
  passTimings: Record<string, number>;
}

export interface PipelineResult {
  units: ExtractedUnit[];
  relations: DetectedRelation[];
  crossRelations: CrossRelation[];
  contextAssignments: ContextAssignment[];
  salienceUpdates: SalienceUpdate[];
  reviewItems: ReviewItem[];
  metadata: PipelineMetadata;
}

// ─── AI Response Schemas (for structured output) ─────────────────────────

export interface AIExtractionResponse {
  units: Array<{
    content: string;
    type: UnitType;
    confidence: number;
    secondaryType?: UnitType;
    reasoning?: string;
  }>;
  genre: string;
}

export interface AIClassificationResponse {
  classifications: Array<{
    unitIndex: number;
    type: UnitType;
    confidence: number;
    secondaryType?: UnitType;
    secondaryConfidence?: number;
    reasoning: string;
  }>;
}

export interface AIContextAssignmentResponse {
  assignments: Array<{
    unitIndex: number;
    contextId: string;
    relevance: number;
    reasoning: string;
  }>;
  newContextSuggestions?: Array<{
    name: string;
    description: string;
    unitIndices: number[];
  }>;
}

export interface AIRelationResponse {
  relations: Array<{
    sourceIndex: number;
    targetIndex: number;
    type: RelationType;
    confidence: number;
    reasoning: string;
  }>;
}

export interface AICrossRelationResponse {
  relations: Array<{
    unitIndex: number;
    existingUnitId: string;
    type: RelationType;
    confidence: number;
    reasoning: string;
  }>;
}
