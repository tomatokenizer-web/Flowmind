/**
 * AI Pipeline Configuration
 *
 * Centralized thresholds, model settings, and tuning parameters
 * for all 7 passes of the processing pipeline.
 */

// ─── Model Configuration ─────────────────────────────────────────────────

export const MODEL_CONFIG = {
  /** Model used for passes 2-6 (extraction, classification, relations) */
  processingModel: "claude-sonnet-4-20250514",
  /** Max tokens for extraction (Pass 2) */
  extractionMaxTokens: 4096,
  /** Max tokens for classification (Pass 3) */
  classificationMaxTokens: 2048,
  /** Max tokens for context assignment (Pass 4) */
  contextMaxTokens: 2048,
  /** Max tokens for relation detection (Pass 5-6) */
  relationMaxTokens: 3072,
  /** Temperature for extraction — slightly creative for boundary detection */
  extractionTemperature: 0.3,
  /** Temperature for classification — more deterministic */
  classificationTemperature: 0.2,
  /** Temperature for relation detection */
  relationTemperature: 0.2,
} as const;

// ─── Pass 2: Extraction Thresholds ───────────────────────────────────────

export const EXTRACTION_CONFIG = {
  /** Below this confidence, flag unit for review */
  confidenceThreshold: 0.8,
  /** Maximum units to extract from a single input */
  maxUnitsPerInput: 50,
  /** Minimum content length for a unit (characters) */
  minUnitLength: 10,
  /** Maximum content length for a unit (characters) */
  maxUnitLength: 2000,
  /** Genre-aware density targets (approximate units per 1000 chars) */
  densityTargets: {
    high: 5, // science, law, academic
    medium: 3, // philosophy, business
    low: 1.5, // narrative, journal
  },
} as const;

// ─── Pass 3: Classification Thresholds ───────────────────────────────────

export const CLASSIFICATION_CONFIG = {
  /** Domain-template types override when confidence >= this */
  domainOverrideThreshold: 0.75,
  /** Below this, present to user for confirmation */
  userConfirmationThreshold: 0.75,
} as const;

// ─── Pass 4: Context Assignment Thresholds ───────────────────────────────

export const CONTEXT_CONFIG = {
  /** Auto-assign when relevance >= this */
  autoAssignThreshold: 0.8,
  /** Suggest (user confirms) when relevance in [suggestThreshold, autoAssignThreshold) */
  suggestThreshold: 0.5,
  /** If 3+ units below suggestThreshold, suggest new context */
  newContextMinUnits: 3,
} as const;

// ─── Pass 5: Within-Input Relation Thresholds ────────────────────────────

export const WITHIN_RELATION_CONFIG = {
  /** Auto-accept relations with confidence >= this */
  autoAcceptThreshold: 0.9,
  /** Suggest relations with confidence in [suggestThreshold, autoAcceptThreshold) */
  suggestThreshold: 0.7,
  /** Store as hidden with confidence in [hiddenThreshold, suggestThreshold) */
  hiddenThreshold: 0.5,
  /** Discard below hiddenThreshold */
  /** Maximum relation candidates to evaluate per unit pair */
  maxCandidatesPerPair: 3,
} as const;

// ─── Pass 6: Cross-Graph Relation Thresholds ─────────────────────────────

export const CROSS_RELATION_CONFIG = {
  /** Stricter auto-accept for cross-graph */
  autoAcceptThreshold: 0.92,
  /** Suggest threshold */
  suggestThreshold: 0.72,
  /** Hidden/low-confidence threshold */
  hiddenThreshold: 0.55,
  /** Number of similar existing units to retrieve for comparison */
  topKSimilar: 20,
  /** Salience boost for cross-graph relation (auto-accepted) */
  salienceBoostAuto: 0.15,
  /** Salience boost for cross-graph relation (suggested) */
  salienceBoostSuggested: 0.1,
} as const;

// ─── Pass 7: Salience Configuration ──────────────────────────────────────

export const SALIENCE_CONFIG = {
  /** Initial salience for focal units */
  focalSalience: 1.0,
  /** Decay factor per hop in activation spreading */
  decayPerHop: 0.6,
  /** Maximum hops for activation spreading */
  maxHops: 5,
  /** Convergence bonus multiplier when multiple paths reach same unit */
  convergenceMultiplier: 0.1,
  /** Minimum salience to continue spreading */
  spreadingThreshold: 0.01,
} as const;

// ─── AI Safety Configuration ─────────────────────────────────────────────

export const SAFETY_CONFIG = {
  /** All AI-generated units start with this lifecycle */
  defaultLifecycle: "draft" as const,
  /** Maximum AI-generated units per request */
  maxGeneratedPerRequest: 3,
  /** Warning when AI ratio in context exceeds this percentage */
  aiRatioWarningThreshold: 0.4,
} as const;

// ─── Timing Budgets (milliseconds) ──────────────────────────────────────

export const TIMING_BUDGETS = {
  pass1: 500,
  pass2: 1000,
  pass3: 1000,
  pass4: 2000,
  pass5: 3000,
  pass6: 10000,
  pass7: 1000,
  foragingTotal: 3000,
} as const;
