/**
 * Pass 1: Input Capture & Normalization (<500ms)
 *
 * Detects format, normalizes text, detects language, stores raw + normalized.
 * Pure computation — no AI calls needed.
 */

import type { PipelineInput, NormalizedInput, InputMetadata } from "../types";
import {
  normalizeText,
  splitSentences,
  splitParagraphs,
  countWords,
  hasUrls,
  hasCitations,
  hasCodeBlocks,
} from "../utils/text-processing";

// ─── Language Detection (heuristic) ──────────────────────────────────────

/**
 * Simple heuristic language detection based on character frequency and common words.
 * For production, replace with a proper library like franc or cld3.
 */
function detectLanguage(text: string): string {
  // CJK character ranges
  const cjkPattern = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
  const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF]/;
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/;
  const cyrillicPattern = /[\u0400-\u04FF]/;
  const arabicPattern = /[\u0600-\u06FF]/;

  // Count character class occurrences
  const chars = [...text];
  let cjk = 0;
  let korean = 0;
  let japanese = 0;
  let cyrillic = 0;
  let arabic = 0;
  let latin = 0;

  for (const char of chars) {
    if (koreanPattern.test(char)) korean++;
    else if (japanesePattern.test(char)) japanese++;
    else if (cjkPattern.test(char)) cjk++;
    else if (cyrillicPattern.test(char)) cyrillic++;
    else if (arabicPattern.test(char)) arabic++;
    else if (/[a-zA-Z]/.test(char)) latin++;
  }

  const total = chars.length || 1;

  if (korean / total > 0.1) return "ko";
  if (japanese / total > 0.1) return "ja";
  if (cjk / total > 0.1) return "zh";
  if (cyrillic / total > 0.1) return "ru";
  if (arabic / total > 0.1) return "ar";

  // For Latin-script languages, check common words
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const wordSet = new Set(words);

  // Spanish signals
  const esWords = ["el", "la", "de", "en", "que", "los", "las", "por", "del", "una"];
  const esCount = esWords.filter((w) => wordSet.has(w)).length;

  // French signals
  const frWords = ["le", "la", "de", "les", "des", "une", "est", "dans", "pour", "pas"];
  const frCount = frWords.filter((w) => wordSet.has(w)).length;

  // German signals
  const deWords = ["der", "die", "das", "und", "ist", "ein", "eine", "nicht", "auf", "mit"];
  const deCount = deWords.filter((w) => wordSet.has(w)).length;

  // English signals
  const enWords = ["the", "is", "are", "was", "were", "have", "has", "been", "this", "that"];
  const enCount = enWords.filter((w) => wordSet.has(w)).length;

  const langScores = [
    { lang: "en", score: enCount },
    { lang: "es", score: esCount },
    { lang: "fr", score: frCount },
    { lang: "de", score: deCount },
  ];

  langScores.sort((a, b) => b.score - a.score);
  const best = langScores[0];

  if (best && best.score >= 2) return best.lang;
  if (latin / total > 0.5) return "en"; // Default for Latin text

  return "en"; // Fallback
}

// ─── Pass 1 Implementation ──────────────────────────────────────────────

/**
 * Execute Pass 1: Capture and normalize input text.
 * Pure computation, no API calls. Should complete in <500ms.
 */
export function executePass1(input: PipelineInput): NormalizedInput {
  const startTime = performance.now();

  const rawText = input.text;
  const normalized = normalizeText(rawText);
  const language = detectLanguage(normalized);

  const sentences = splitSentences(normalized);
  const paragraphs = splitParagraphs(normalized);

  const metadata: InputMetadata = {
    charCount: normalized.length,
    wordCount: countWords(normalized),
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    detectedLanguage: language,
    hasUrls: hasUrls(normalized),
    hasCitations: hasCitations(normalized),
    hasCodeBlocks: hasCodeBlocks(normalized),
    processingTimeMs: 0,
  };

  metadata.processingTimeMs = performance.now() - startTime;

  return {
    rawText,
    normalizedText: normalized,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    language,
    metadata,
  };
}
