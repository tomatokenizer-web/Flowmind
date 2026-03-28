/**
 * Text Processing Utilities
 *
 * Handles text normalization, sentence segmentation, and paragraph detection
 * for Pass 1 (capture) and Pass 2 (extraction) of the pipeline.
 */

// ─── Normalization ───────────────────────────────────────────────────────

/**
 * Normalize input text: fix whitespace, normalize quotes, trim.
 */
export function normalizeText(text: string): string {
  let result = text;

  // Normalize line endings
  result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Collapse multiple blank lines into double newline
  result = result.replace(/\n{3,}/g, "\n\n");

  // Normalize unicode quotes to ASCII
  result = result
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, " -- ")
    .replace(/\u2013/g, " - ")
    .replace(/\u2026/g, "...");

  // Collapse multiple spaces (but preserve intentional indentation at line start)
  result = result
    .split("\n")
    .map((line) => {
      const indent = line.match(/^(\s*)/)?.[1] ?? "";
      const content = line.slice(indent.length).replace(/  +/g, " ");
      return indent + content;
    })
    .join("\n");

  return result.trim();
}

// ─── Sentence Segmentation ──────────────────────────────────────────────

/** Common abbreviations that should not trigger sentence breaks */
const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "vs",
  "etc",
  "inc",
  "ltd",
  "dept",
  "est",
  "approx",
  "vol",
  "no",
  "fig",
  "eq",
  "ref",
  "e.g",
  "i.e",
  "cf",
  "al",
  "st",
  "ave",
  "blvd",
]);

/**
 * Split text into sentences using rule-based segmentation.
 * Handles abbreviations, decimal numbers, and quoted text.
 */
export function splitSentences(text: string): string[] {
  if (!text.trim()) return [];

  const sentences: string[] = [];
  let current = "";

  // Split on sentence-ending punctuation followed by space+uppercase or newline
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]!;
    current += char;

    if (char === "." || char === "!" || char === "?") {
      // Check if this is a real sentence boundary
      const nextChar = chars[i + 1];
      const nextNextChar = chars[i + 2];

      // Period: check for abbreviations and decimals
      if (char === ".") {
        // Look back for abbreviation
        const wordBefore = current
          .slice(0, -1)
          .split(/\s/)
          .pop()
          ?.toLowerCase();
        if (wordBefore && ABBREVIATIONS.has(wordBefore)) {
          continue;
        }

        // Check for decimal number (e.g., "3.14")
        const charBefore = chars[i - 1];
        if (charBefore && /\d/.test(charBefore) && nextChar && /\d/.test(nextChar)) {
          continue;
        }

        // Check for ellipsis
        if (nextChar === ".") {
          continue;
        }
      }

      // Is this followed by space+uppercase, newline, or end of text?
      const isEnd = i === chars.length - 1;
      const isFollowedByBreak =
        nextChar === "\n" ||
        (nextChar === " " && nextNextChar && /[A-Z\u00C0-\u024F"]/.test(nextNextChar));

      if (isEnd || isFollowedByBreak) {
        const trimmed = current.trim();
        if (trimmed) sentences.push(trimmed);
        current = "";
      }
    } else if (char === "\n" && current.trim()) {
      // Paragraph break: double newline
      const nextChar = chars[i + 1];
      if (nextChar === "\n") {
        const trimmed = current.trim();
        if (trimmed) sentences.push(trimmed);
        current = "";
        i++; // skip the second newline
      }
    }
  }

  // Remainder
  const trimmed = current.trim();
  if (trimmed) sentences.push(trimmed);

  return sentences;
}

// ─── Paragraph Detection ─────────────────────────────────────────────────

/**
 * Split text into paragraphs based on blank lines.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// ─── Discourse Markers ──────────────────────────────────────────────────

/** Discourse markers that may indicate unit boundaries */
export const DISCOURSE_MARKERS = {
  contrast: [
    "however",
    "but",
    "nevertheless",
    "on the other hand",
    "conversely",
    "in contrast",
    "yet",
    "although",
    "despite",
    "whereas",
  ],
  cause: [
    "because",
    "since",
    "therefore",
    "thus",
    "consequently",
    "as a result",
    "hence",
    "so",
    "due to",
    "owing to",
  ],
  addition: [
    "moreover",
    "furthermore",
    "additionally",
    "also",
    "in addition",
    "besides",
    "what's more",
  ],
  example: [
    "for example",
    "for instance",
    "such as",
    "e.g.",
    "namely",
    "specifically",
    "to illustrate",
  ],
  conclusion: [
    "in conclusion",
    "to summarize",
    "in summary",
    "overall",
    "finally",
    "in short",
    "ultimately",
  ],
  qualification: [
    "except",
    "unless",
    "provided that",
    "assuming",
    "given that",
    "on condition that",
    "with the caveat",
  ],
  temporal: [
    "then",
    "next",
    "subsequently",
    "previously",
    "meanwhile",
    "after",
    "before",
    "during",
    "while",
  ],
} as const;

/**
 * Detect discourse markers at the start of a text segment.
 * Returns the marker category if found, or null.
 */
export function detectDiscourseMarker(
  text: string,
): { category: string; marker: string } | null {
  const lower = text.toLowerCase().trim();
  for (const [category, markers] of Object.entries(DISCOURSE_MARKERS)) {
    for (const marker of markers) {
      if (
        lower.startsWith(marker + " ") ||
        lower.startsWith(marker + ",") ||
        lower.startsWith(marker + ":")
      ) {
        return { category, marker };
      }
    }
  }
  return null;
}

// ─── Content Analysis ───────────────────────────────────────────────────

/**
 * Count words in text.
 */
export function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Detect if text contains URLs.
 */
export function hasUrls(text: string): boolean {
  return /https?:\/\/[^\s]+/.test(text);
}

/**
 * Detect if text contains academic citations.
 */
export function hasCitations(text: string): boolean {
  // Parenthetical: (Author, Year) or (Author et al., Year)
  if (/\([A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}\)/.test(text)) return true;
  // Numbered: [1], [2,3], [1-5]
  if (/\[\d+(?:[,-]\s*\d+)*\]/.test(text)) return true;
  return false;
}

/**
 * Detect if text contains code blocks.
 */
export function hasCodeBlocks(text: string): boolean {
  return /```[\s\S]*?```/.test(text) || /`[^`]+`/.test(text);
}

/**
 * Compute source span (character offsets) for a substring within the full text.
 */
export function findSourceSpan(
  fullText: string,
  substring: string,
  startFrom: number = 0,
): { start: number; end: number } {
  const idx = fullText.indexOf(substring, startFrom);
  if (idx === -1) {
    return { start: startFrom, end: startFrom + substring.length };
  }
  return { start: idx, end: idx + substring.length };
}
