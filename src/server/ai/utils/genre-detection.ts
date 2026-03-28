/**
 * Genre Detection Utilities
 *
 * Detects the domain/genre of input text to calibrate extraction density.
 * Used by Pass 2 to determine how aggressively to segment units.
 */

import type { GenreDensity } from "../types";
import { GENRE_MAP } from "../types";

// ─── Keyword Signals ─────────────────────────────────────────────────────

const GENRE_KEYWORDS: Record<string, string[]> = {
  science: [
    "hypothesis",
    "experiment",
    "data",
    "results",
    "methodology",
    "statistical",
    "significant",
    "variable",
    "control group",
    "sample size",
    "correlation",
    "p-value",
    "peer-reviewed",
    "replication",
    "empirical",
    "findings",
    "abstract",
    "doi",
  ],
  law: [
    "statute",
    "precedent",
    "defendant",
    "plaintiff",
    "jurisdiction",
    "liability",
    "pursuant",
    "herein",
    "whereas",
    "stipulate",
    "adjudicate",
    "constitutional",
    "amendment",
    "tort",
    "contract law",
    "due process",
  ],
  philosophy: [
    "epistemology",
    "ontology",
    "metaphysics",
    "ethics",
    "axiom",
    "a priori",
    "a posteriori",
    "dialectic",
    "phenomenology",
    "existential",
    "consciousness",
    "free will",
    "determinism",
    "moral",
    "virtue",
    "categorical imperative",
  ],
  business: [
    "revenue",
    "market share",
    "stakeholder",
    "roi",
    "kpi",
    "strategy",
    "competitive advantage",
    "scalable",
    "synergy",
    "value proposition",
    "customer acquisition",
    "retention",
    "growth",
    "quarterly",
    "fiscal",
  ],
  academic: [
    "literature review",
    "theoretical framework",
    "research question",
    "methodology",
    "qualitative",
    "quantitative",
    "mixed methods",
    "thesis",
    "dissertation",
    "peer review",
    "citation",
    "bibliography",
    "journal",
    "publication",
  ],
  technical: [
    "algorithm",
    "implementation",
    "architecture",
    "api",
    "database",
    "framework",
    "deployment",
    "latency",
    "throughput",
    "scalability",
    "microservice",
    "containerization",
    "ci/cd",
    "refactor",
    "dependency",
    "runtime",
  ],
  narrative: [
    "once upon",
    "he said",
    "she said",
    "they walked",
    "morning",
    "evening",
    "felt",
    "remembered",
    "story",
    "chapter",
    "character",
    "plot",
    "scene",
    "dialogue",
  ],
  journal: [
    "today i",
    "i think",
    "i feel",
    "i wonder",
    "my thoughts",
    "reflection",
    "personally",
    "in my experience",
    "i realized",
    "i noticed",
    "diary",
    "journal",
    "mood",
    "grateful",
  ],
};

// ─── Structural Signals ─────────────────────────────────────────────────

interface StructuralSignals {
  avgSentenceLength: number;
  hasNumberedLists: boolean;
  hasBulletPoints: boolean;
  hasHeaders: boolean;
  hasCitations: boolean;
  hasFootnotes: boolean;
  hasCodeBlocks: boolean;
  formalityScore: number;
}

function analyzeStructure(text: string): StructuralSignals {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWords =
    sentences.reduce(
      (sum, s) => sum + s.trim().split(/\s+/).length,
      0,
    ) / Math.max(sentences.length, 1);

  // Formality: ratio of long words (>6 chars) to total words
  const words = text.toLowerCase().split(/\s+/);
  const longWords = words.filter((w) => w.length > 6).length;
  const formalityScore = words.length > 0 ? longWords / words.length : 0;

  return {
    avgSentenceLength: avgWords,
    hasNumberedLists: /^\s*\d+[.)]\s/m.test(text),
    hasBulletPoints: /^\s*[-*]\s/m.test(text),
    hasHeaders: /^#{1,6}\s/m.test(text) || /^[A-Z][A-Za-z\s]+:?\s*$/m.test(text),
    hasCitations: /\([A-Z][a-z]+,?\s*\d{4}\)/.test(text) || /\[\d+\]/.test(text),
    hasFootnotes: /\[\^?\d+\]/.test(text),
    hasCodeBlocks: /```[\s\S]*?```/.test(text),
    formalityScore,
  };
}

// ─── Genre Detection ─────────────────────────────────────────────────────

export interface GenreDetectionResult {
  genre: string;
  density: GenreDensity;
  confidence: number;
  scores: Record<string, number>;
}

/**
 * Detect the genre of input text using keyword frequency and structural analysis.
 * Returns the most likely genre along with extraction density recommendation.
 */
export function detectGenre(text: string): GenreDetectionResult {
  const lower = text.toLowerCase();
  const wordCount = lower.split(/\s+/).length;
  if (wordCount === 0) {
    return {
      genre: "general",
      density: "medium",
      confidence: 0,
      scores: {},
    };
  }

  const structure = analyzeStructure(text);

  // Score each genre by keyword hits
  const scores: Record<string, number> = {};

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    let hits = 0;
    for (const keyword of keywords) {
      // Count occurrences, capped at 3 per keyword to avoid bias from repetition
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi");
      const matches = lower.match(regex);
      hits += Math.min(matches?.length ?? 0, 3);
    }
    // Normalize by keyword count and text length
    scores[genre] = hits / keywords.length;
  }

  // Apply structural bonuses
  if (structure.hasCitations) {
    scores["academic"] = (scores["academic"] ?? 0) + 0.3;
    scores["science"] = (scores["science"] ?? 0) + 0.2;
  }
  if (structure.hasCodeBlocks) {
    scores["technical"] = (scores["technical"] ?? 0) + 0.4;
  }
  if (structure.formalityScore > 0.3) {
    scores["academic"] = (scores["academic"] ?? 0) + 0.15;
    scores["law"] = (scores["law"] ?? 0) + 0.15;
  }
  if (structure.formalityScore < 0.15) {
    scores["journal"] = (scores["journal"] ?? 0) + 0.2;
    scores["narrative"] = (scores["narrative"] ?? 0) + 0.1;
  }
  if (structure.avgSentenceLength > 20) {
    scores["academic"] = (scores["academic"] ?? 0) + 0.1;
    scores["law"] = (scores["law"] ?? 0) + 0.1;
  }

  // Find the winning genre
  let topGenre = "general";
  let topScore = 0;

  for (const [genre, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topGenre = genre;
    }
  }

  // If top score is too low, default to general
  const confidence = Math.min(topScore / 0.5, 1.0); // Normalize: 0.5+ = full confidence
  if (topScore < 0.1) {
    topGenre = "general";
  }

  const density: GenreDensity = GENRE_MAP[topGenre] ?? "medium";

  return {
    genre: topGenre,
    density,
    confidence,
    scores,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
