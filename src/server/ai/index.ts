export { getAIProvider, setAIProvider, resetAIProvider, getEmbeddingModel, AnthropicProvider } from "./provider";
export type { AIProvider, AIGenerateTextOptions, AIGenerateStructuredOptions } from "./provider";

export { createSafetyGuard, generateSessionId } from "./safetyGuard";
export type { SafetyGuard, SafetyCheckResult, SafetyGuardOptions } from "./safetyGuard";

export { createAIService } from "./aiService";
export type { AIService } from "./aiService";

// All domain types re-exported from the types module
export type {
  TypeSuggestion,
  RelationSuggestion,
  AIServiceContext,
  UserPurpose,
  DecompositionBoundary,
  DecompositionRelationProposal,
  UnitProposal,
  DecompositionResult,
  SplitReattributionProposal,
  SplitReattributionResult,
  AlternativeFraming,
  CounterArgument,
  IdentifiedAssumption,
  ContradictionPair,
  MergeSuggestion,
  CompletenessAnalysis,
  ContextSummary,
  GeneratedQuestion,
  NextStepSuggestion,
  ExtractedTerm,
  StanceClassification,
  ReflectionPrompt,
} from "./types";

// Domain module exports (for direct imports if needed)
export { suggestUnitType, classifyStance, extractKeyTerms } from "./classification";
export { decomposeText } from "./decomposition";
export { proposeSplitReattribution } from "./split";
export {
  suggestRelations,
  generateAlternativeFraming,
  suggestCounterArguments,
  identifyAssumptions,
} from "./suggestion";
export { detectContradictions, analyzeCompleteness, summarizeContext } from "./analysis";
export { suggestMerge, generateQuestions, suggestNextSteps } from "./guidance";
export { generateReflectionPrompts } from "./reflection";

// Shared utilities
export { sanitizeUserContent, PROMPT_INJECTION_GUARD } from "./utils";

// Rate limiting
export { checkRateLimit, enforceRateLimit, getRateLimitConfig } from "./rate-limiter";
export type { RateLimitConfig, RateLimitResult } from "./rate-limiter";
