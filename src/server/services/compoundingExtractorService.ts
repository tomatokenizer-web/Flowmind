import type { PrismaClient, UnitType } from "@prisma/client";
import { createProposalService } from "@/server/services/proposalService";

// ─── Compounding Candidate-Unit Extractor ──────────────────────────
//
// Per DEC-2026-002 §19: after an assembly is exported, scan the final
// artifact for claims / questions / observations etc. that are NOT
// already backed by an existing Unit and surface them as `compounding`
// Proposals so the user can promote new knowledge back into the graph.
//
// Heuristic, deterministic extractor — no AI calls. Designed to run on
// any text (rendered markdown, plaintext export, bridge text between
// assembly items). Returns candidates with suggestedType + rationale.

// ─── Types ─────────────────────────────────────────────────────────

export interface ExtractedCandidate {
  suggestedContent: string;
  suggestedType: UnitType;
  extractionReason: string;
  sourcePosition: {
    start: number;
    end: number;
  };
  /** 0-1 confidence score based on pattern strength. */
  confidence: number;
}

export interface ExtractOptions {
  /** Unit IDs already present in the source assembly — exclude overlaps. */
  existingUnitContents?: string[];
  /** Minimum candidate length (characters). Default 20. */
  minLength?: number;
  /** Maximum candidate length (characters). Default 280. */
  maxLength?: number;
  /** Maximum number of candidates to return. Default 20. */
  limit?: number;
}

export interface ExtractAndProposeOptions extends ExtractOptions {
  assemblyId?: string;
  contextId?: string;
}

// ─── Sentence Segmentation ─────────────────────────────────────────

/**
 * Lightweight sentence splitter. Preserves offsets so we can report
 * sourcePosition for each candidate.
 */
function segmentSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  const re = /[^.!?\n]+[.!?]+|[^.!?\n]+(?=\n|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const start = match.index + (raw.length - raw.trimStart().length);
    const end = start + trimmed.length;
    sentences.push({ text: trimmed, start, end });
  }
  return sentences;
}

// ─── Type Classification Patterns ──────────────────────────────────

interface TypePattern {
  type: UnitType;
  pattern: RegExp;
  reason: string;
  confidence: number;
}

const TYPE_PATTERNS: TypePattern[] = [
  // Questions — strong signal
  {
    type: "question",
    pattern: /\?$/,
    reason: "Ends with question mark",
    confidence: 0.95,
  },
  {
    type: "question",
    pattern: /^(what|why|how|when|where|who|which|is|are|can|could|should|would|does|do|did)\b/i,
    reason: "Starts with interrogative",
    confidence: 0.75,
  },

  // Definitions
  {
    type: "definition",
    pattern: /\b(is defined as|means|refers to|is the|denotes)\b/i,
    reason: "Contains definitional phrase",
    confidence: 0.8,
  },

  // Counterarguments
  {
    type: "counterargument",
    pattern: /\b(however|but|on the contrary|conversely|yet|although|despite|nevertheless)\b/i,
    reason: "Contains contrasting conjunction",
    confidence: 0.6,
  },

  // Assumptions
  {
    type: "assumption",
    pattern: /\b(assume|assuming|presumably|if we take|granted that|given that)\b/i,
    reason: "Contains assumption marker",
    confidence: 0.75,
  },

  // Evidence
  {
    type: "evidence",
    pattern: /\b(according to|study shows|research indicates|data from|reported by|observed in)\b/i,
    reason: "References an external source or study",
    confidence: 0.85,
  },

  // Observations
  {
    type: "observation",
    pattern: /\b(I notice|I observed|we see|it appears|seems to|looks like)\b/i,
    reason: "First-person observational phrase",
    confidence: 0.7,
  },

  // Interpretations
  {
    type: "interpretation",
    pattern: /\b(this means|this suggests|this implies|this indicates|in other words)\b/i,
    reason: "Interpretive phrase",
    confidence: 0.7,
  },

  // Examples
  {
    type: "example",
    pattern: /\b(for example|for instance|e\.g\.|such as|consider|take the case of)\b/i,
    reason: "Example marker",
    confidence: 0.85,
  },

  // Decisions
  {
    type: "decision",
    pattern: /\b(we decided|I decided|the decision|we chose|we will|we should)\b/i,
    reason: "Decision language",
    confidence: 0.75,
  },

  // Actions
  {
    type: "action",
    pattern: /\b(TODO|need to|must|let's|action item|next step|follow up)\b/i,
    reason: "Action / TODO language",
    confidence: 0.8,
  },

  // Ideas
  {
    type: "idea",
    pattern: /\b(what if|idea:|perhaps we could|maybe|could explore)\b/i,
    reason: "Speculative idea phrase",
    confidence: 0.7,
  },
];

/** Default fallback when no pattern matches — treat as a claim. */
const DEFAULT_CLAIM: Pick<TypePattern, "type" | "reason" | "confidence"> = {
  type: "claim",
  reason: "Default classification (declarative statement)",
  confidence: 0.4,
};

function classifySentence(
  sentence: string,
): { type: UnitType; reason: string; confidence: number } {
  for (const rule of TYPE_PATTERNS) {
    if (rule.pattern.test(sentence)) {
      return { type: rule.type, reason: rule.reason, confidence: rule.confidence };
    }
  }
  return DEFAULT_CLAIM;
}

// ─── Overlap Detection ─────────────────────────────────────────────

/**
 * Normalize a sentence for overlap comparison:
 * lowercase, strip punctuation, collapse whitespace.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Jaccard similarity over word tokens. Used as a cheap overlap filter
 * to avoid re-proposing content that's already an existing Unit.
 */
function jaccardSimilarity(a: string, b: string): number {
  const aw = new Set(normalize(a).split(" ").filter(Boolean));
  const bw = new Set(normalize(b).split(" ").filter(Boolean));
  if (aw.size === 0 || bw.size === 0) return 0;
  let intersect = 0;
  for (const w of aw) if (bw.has(w)) intersect++;
  const union = aw.size + bw.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

const OVERLAP_THRESHOLD = 0.6;

// ─── Public API ────────────────────────────────────────────────────

/**
 * Extract candidate Units from arbitrary text.
 * Pure function — no DB access.
 */
export function extractCandidates(
  text: string,
  opts: ExtractOptions = {},
): ExtractedCandidate[] {
  const minLength = opts.minLength ?? 20;
  const maxLength = opts.maxLength ?? 280;
  const limit = opts.limit ?? 20;
  const existing = opts.existingUnitContents ?? [];

  const sentences = segmentSentences(text);
  const candidates: ExtractedCandidate[] = [];

  for (const s of sentences) {
    if (s.text.length < minLength || s.text.length > maxLength) continue;

    // Skip if overlaps with an existing Unit.
    let duplicate = false;
    for (const existingText of existing) {
      if (jaccardSimilarity(s.text, existingText) >= OVERLAP_THRESHOLD) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) continue;

    const classification = classifySentence(s.text);
    candidates.push({
      suggestedContent: s.text,
      suggestedType: classification.type,
      extractionReason: classification.reason,
      sourcePosition: { start: s.start, end: s.end },
      confidence: classification.confidence,
    });

    if (candidates.length >= limit) break;
  }

  return candidates;
}

// ─── Service Factory ───────────────────────────────────────────────

export function createCompoundingExtractorService(db: PrismaClient) {
  const proposalService = createProposalService(db);

  /**
   * Extract candidates from an assembly's rendered text and create
   * `compounding` Proposals for each one. Skips candidates whose
   * content overlaps with existing units already in the assembly.
   *
   * This is NOT gated by the ProactiveScheduler because compounding
   * proposals are user-initiated (triggered by export), not AI-initiated.
   *
   * DEC-2026-002 §19 — when the user's rolling compounding acceptance
   * rate has fallen below the auto-disable threshold, we still return
   * the candidates (so the UI can preview what WOULD have surfaced)
   * but create zero proposals. The user must explicitly reactivate.
   */
  async function extractFromAssembly(
    assemblyId: string,
    renderedText: string,
    userId: string,
    opts: ExtractAndProposeOptions = {},
  ) {
    // Collect existing unit contents so we can filter out duplicates.
    const items = await db.assemblyItem.findMany({
      where: { assemblyId },
      select: { unit: { select: { content: true } } },
    });
    const existingUnitContents = items
      .map((i) => i.unit?.content)
      .filter((c): c is string => typeof c === "string");

    const candidates = extractCandidates(renderedText, {
      ...opts,
      existingUnitContents,
    });

    const disabled = await proposalService.isCompoundingDisabled(userId);
    if (disabled) {
      return {
        candidates,
        proposalsCreated: 0,
        assemblyId,
        autoDisabled: true,
      };
    }

    const created = [];
    for (const c of candidates) {
      const proposal = await proposalService.create(
        {
          kind: "compounding",
          contextId: opts.contextId,
          payload: {
            suggestedContent: c.suggestedContent,
            suggestedType: c.suggestedType,
            extractionReason: c.extractionReason,
            sourcePosition: c.sourcePosition,
            confidence: c.confidence,
            sourceAssemblyId: assemblyId,
          },
          rationale: `Compounding candidate: ${c.extractionReason}`,
        },
        userId,
      );
      created.push(proposal);
    }

    return {
      candidates,
      proposalsCreated: created.length,
      assemblyId,
      autoDisabled: false,
    };
  }

  /**
   * Preview extraction without creating any proposals.
   */
  function previewExtraction(
    text: string,
    opts: ExtractOptions = {},
  ): ExtractedCandidate[] {
    return extractCandidates(text, opts);
  }

  return {
    extractFromAssembly,
    previewExtraction,
    extractCandidates,
  };
}

export type CompoundingExtractorService = ReturnType<
  typeof createCompoundingExtractorService
>;
