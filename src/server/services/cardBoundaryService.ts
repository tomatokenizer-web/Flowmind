// ─── DEC-2026-002 §12: Card Boundary Strategy ─────────────────────
//
// When raw text is imported (pastes, transcripts, notes) we need to
// slice it into card-sized units before running type classification
// or embedding. DEC-2026-002 §12 specifies three strategies:
//
//   1. `sentence`  — one card per sentence (finest grain, good for
//                    dense argumentation)
//   2. `paragraph` — one card per blank-line separated block
//   3. `semantic`  — paragraph boundaries, but merges short paragraphs
//                    (< MERGE_UNDER chars) with their neighbours and
//                    splits very long paragraphs (> SPLIT_OVER chars)
//                    at sentence boundaries
//
// This module is a PURE FUNCTION — no DB, no AI, no side effects.
// It can be run on the server or bundled for the client.

// ─── Tunables ─────────────────────────────────────────────────────

const MERGE_UNDER = 80;       // paragraphs shorter than this get merged
const SPLIT_OVER = 600;       // paragraphs longer than this get re-split
const MIN_CARD_LENGTH = 1;    // drop empty fragments

// ─── Types ────────────────────────────────────────────────────────

export type BoundaryStrategy = "sentence" | "paragraph" | "semantic";

export interface CardBoundary {
  /** Zero-based index of this card within the source text. */
  index: number;
  /** Inclusive character offset of first character in the source text. */
  start: number;
  /** Exclusive character offset — `source.slice(start, end)` is the card. */
  end: number;
  /** Already-sliced content (trimmed). */
  content: string;
}

export interface SegmentOptions {
  strategy?: BoundaryStrategy;
}

// ─── Strategy implementations ─────────────────────────────────────

/**
 * Split on sentence-ending punctuation followed by whitespace.
 * Deliberately conservative — keeps abbreviations intact by requiring
 * the punctuation to be followed by a space and a capital letter or a
 * newline.
 */
function splitSentences(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  const re = /[.!?](?:\s+(?=[A-Z"'])|\s*\n|\s*$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const end = match.index + 1; // keep the terminal punctuation
    spans.push({ start: lastIndex, end });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    spans.push({ start: lastIndex, end: text.length });
  }
  return spans;
}

/**
 * Split on blank lines. Preserves offsets in the original text.
 */
function splitParagraphs(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  const re = /\n\s*\n/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    spans.push({ start: lastIndex, end: match.index });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    spans.push({ start: lastIndex, end: text.length });
  }
  return spans;
}

/**
 * Paragraph boundaries, but merge short paragraphs forward and split
 * long paragraphs at sentence boundaries. Produces the "semantic"
 * strategy from DEC-2026-002 §12.
 */
function splitSemantic(
  text: string,
): Array<{ start: number; end: number }> {
  const paragraphs = splitParagraphs(text);
  const out: Array<{ start: number; end: number }> = [];

  // Phase 1: merge short paragraphs forward.
  let carry: { start: number; end: number } | null = null;
  for (const p of paragraphs) {
    const len = p.end - p.start;
    if (carry) {
      carry = { start: carry.start, end: p.end };
      if (carry.end - carry.start >= MERGE_UNDER) {
        out.push(carry);
        carry = null;
      }
      continue;
    }
    if (len < MERGE_UNDER) {
      carry = p;
      continue;
    }
    out.push(p);
  }
  if (carry) out.push(carry);

  // Phase 2: re-split long paragraphs at sentence boundaries.
  const resized: Array<{ start: number; end: number }> = [];
  for (const p of out) {
    if (p.end - p.start <= SPLIT_OVER) {
      resized.push(p);
      continue;
    }
    const slice = text.slice(p.start, p.end);
    const sents = splitSentences(slice);
    if (sents.length <= 1) {
      resized.push(p);
      continue;
    }
    // Walk sentences and pack them into chunks <= SPLIT_OVER.
    let chunkStart = p.start + sents[0]!.start;
    let chunkEnd = p.start + sents[0]!.end;
    for (let i = 1; i < sents.length; i++) {
      const sAbsStart = p.start + sents[i]!.start;
      const sAbsEnd = p.start + sents[i]!.end;
      if (sAbsEnd - chunkStart > SPLIT_OVER) {
        resized.push({ start: chunkStart, end: chunkEnd });
        chunkStart = sAbsStart;
      }
      chunkEnd = sAbsEnd;
    }
    resized.push({ start: chunkStart, end: chunkEnd });
  }

  return resized;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Segment raw text into card-sized units using the chosen strategy.
 * Returns offsets + content in source order. Empty / whitespace-only
 * cards are filtered out.
 */
export function segmentIntoCards(
  text: string,
  opts: SegmentOptions = {},
): CardBoundary[] {
  const strategy = opts.strategy ?? "semantic";
  let spans: Array<{ start: number; end: number }>;
  switch (strategy) {
    case "sentence":
      spans = splitSentences(text);
      break;
    case "paragraph":
      spans = splitParagraphs(text);
      break;
    case "semantic":
      spans = splitSemantic(text);
      break;
  }

  const out: CardBoundary[] = [];
  for (const s of spans) {
    const raw = text.slice(s.start, s.end);
    const content = raw.trim();
    if (content.length < MIN_CARD_LENGTH) continue;
    out.push({
      index: out.length,
      start: s.start,
      end: s.end,
      content,
    });
  }
  return out;
}

/**
 * Choose the cheapest strategy that yields a reasonable card count
 * for the given text length. Deterministic heuristic — callers that
 * want full control should pass `strategy` explicitly.
 */
export function pickDefaultStrategy(text: string): BoundaryStrategy {
  const hasBlankLines = /\n\s*\n/.test(text);
  if (!hasBlankLines) return "sentence";
  // Long docs with structure benefit from the semantic merge/split.
  if (text.length > 1500) return "semantic";
  return "paragraph";
}
