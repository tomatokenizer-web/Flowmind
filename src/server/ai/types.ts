// ─── AI Service Types ────────────────────────────────────────────────────────
// All type interfaces exported from the AI service module.

export interface TypeSuggestion {
  unitType: string;
  confidence: number;
  reasoning: string;
}

export interface RelationSuggestion {
  targetUnitId: string;
  relationType: string;
  strength: number;
  reasoning: string;
}

// ─── Story 5.4-5.15 Types ─────────────────────────────────────────────────────

export interface SplitReattributionProposal {
  relationId: string;
  assignTo: "A" | "B";
  rationale: string;
}

export interface SplitReattributionResult {
  proposals: SplitReattributionProposal[];
}

export interface AlternativeFraming {
  reframedContent: string;
  newType: string;
  rationale: string;
  confidence: number;
}

export interface CounterArgument {
  content: string;
  strength: number;
  targetsClaim: string;
  rationale: string;
}

export interface IdentifiedAssumption {
  content: string;
  isExplicit: boolean;
  importance: "critical" | "moderate" | "minor";
  rationale: string;
}

export interface ContradictionPair {
  unitAId: string;
  unitBId: string;
  description: string;
  severity: "direct" | "tension" | "potential";
  suggestedResolution: string;
}

export interface MergeSuggestion {
  unitIds: string[];
  mergedContent: string;
  mergedType: string;
  rationale: string;
  confidence: number;
}

// DEC-2026-002 §4: Dual output {structureScore, depthScore}. No single overall score.
export interface CompletenessAnalysis {
  structureScore: number; // 0-1 — graph topology / coverage
  depthScore: number;     // 0-1 — epistemic maturation
  missingElements: Array<{
    type: "evidence" | "counterargument" | "definition" | "example" | "assumption";
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  suggestions: string[];
}

export interface ContextSummary {
  mainThesis: string;
  keyPoints: string[];
  openQuestions: string[];
  conflictingViews: string[];
}

export interface GeneratedQuestion {
  content: string;
  type: "clarifying" | "challenging" | "exploratory" | "connecting";
  targetUnitId?: string;
  rationale: string;
}

export interface NextStepSuggestion {
  action: string;
  type: "research" | "define" | "challenge" | "connect" | "expand" | "resolve";
  priority: "high" | "medium" | "low";
  relatedUnitIds: string[];
  rationale: string;
}

export interface ExtractedTerm {
  term: string;
  definition?: string;
  occurrences: number;
  importance: "key" | "supporting" | "peripheral";
  suggestDefine: boolean;
}

export interface StanceClassification {
  stance: "support" | "oppose" | "neutral" | "exploring";
  confidence: number;
  rationale: string;
  keyIndicators: string[];
}

export interface ReflectionPrompt {
  question: string;
  category: "assumption" | "opposite" | "connection" | "consequence" | "evidence" | "reframe";
  targetUnitId?: string;
  rationale: string;
}

export interface AIServiceContext {
  userId: string;
  sessionId: string;
  contextId?: string;
}

// ─── Decomposition Types ─────────────────────────────────────────────────────

export type UserPurpose = "arguing" | "brainstorming" | "researching" | "defining" | "other";

export interface DecompositionBoundary {
  startChar: number;
  endChar: number;
  content: string;
  proposedType: string;
  confidence: number;
}

export interface DecompositionRelationProposal {
  /** Index of source unit in proposals array (0-based) */
  sourceIdx: number;
  /** ID of existing unit to link to */
  targetUnitId: string;
  relationType: string;
  strength: number;
  rationale: string;
}

export interface UnitProposal {
  id: string; // temporary client-side ID
  content: string;
  proposedType: string;
  confidence: number;
  startChar: number;
  endChar: number;
  lifecycle: "draft";
  originType: "ai_generated";
}

export interface DecompositionResult {
  purpose: UserPurpose;
  proposals: UnitProposal[];
  relationProposals: DecompositionRelationProposal[];
}

// ─── Story 5.11: Scope Jump Detection ────────────────────────────────────────

export interface ScopeJumpResult {
  isJump: boolean;
  currentScope: string;
  suggestedScope: string;
  confidence: number;
}

// ─── Story 6.7: Natural Language Query ───────────────────────────────────────

export interface NLQIntent {
  keywords: string[];
  unitTypes?: string[];
  summary: string;
}
