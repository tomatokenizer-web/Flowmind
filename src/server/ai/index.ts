export { getAIProvider, setAIProvider, AnthropicProvider } from "./provider";
export type { AIProvider, AIGenerateTextOptions, AIGenerateStructuredOptions } from "./provider";

export { createSafetyGuard } from "./safetyGuard";
export type { SafetyGuard, SafetyCheckResult, SafetyGuardOptions } from "./safetyGuard";

export { createAIService } from "./aiService";
export type {
  AIService,
  TypeSuggestion,
  RelationSuggestion,
  AIServiceContext,
  UserPurpose,
  DecompositionBoundary,
  DecompositionRelationProposal,
  UnitProposal,
  DecompositionResult,
  // Story 5.4-5.15 Types
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
} from "./aiService";
