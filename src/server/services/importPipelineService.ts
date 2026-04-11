import type { PrismaClient } from "@prisma/client";
import {
  segmentIntoCards,
  pickDefaultStrategy,
  type BoundaryStrategy,
  type CardBoundary,
} from "@/server/services/cardBoundaryService";

// ─── DEC-2026-002 §11: Import Pipeline 2-Phase Dedupe ─────────────
//
// Raw text imports (pastes, transcripts, markdown dumps) need to be
// decomposed into card-sized units AND deduplicated against both
// their own batch and the existing project corpus. Running this
// through the AI pipeline per-card is expensive and non-deterministic.
//
// This service is a deterministic two-phase pre-processor:
//
//   Phase 1 — Segment + within-batch dedupe
//     - Use cardBoundaryService to split the raw text into cards
//     - Normalise each card's content (lowercase, collapse whitespace,
//       strip punctuation) to produce a fingerprint
//     - Group cards by fingerprint; collapse exact duplicates
//
//   Phase 2 — Cross-batch dedupe against existing units
//     - Load existing project unit content
//     - For each phase-1 card, look up matching existing units by the
//       same fingerprint function
//     - Emit a `DuplicateOf` match when found; otherwise emit `New`
//
// The service is PURE READ — it never writes to the database.
// Callers feed the result into pipelineService (for `New` items) or
// unitMergeService (for `DuplicateOf` items) as their policy dictates.

// ─── Normalisation ────────────────────────────────────────────────

/**
 * Produce a deterministic fingerprint of a card's content. Two cards
 * that differ only in casing, punctuation, or whitespace will share
 * the same fingerprint. Not cryptographically hashed — we just need
 * a stable map key.
 */
export function fingerprint(content: string): string {
  return content
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Types ────────────────────────────────────────────────────────

export type ImportDisposition = "new" | "duplicate_in_batch" | "duplicate_of_existing";

export interface ImportItem {
  /** Index in source text (from cardBoundaryService). */
  index: number;
  content: string;
  fingerprint: string;
  disposition: ImportDisposition;
  /** For `duplicate_in_batch` — points to the index of the canonical card in the batch. */
  canonicalIndex?: number;
  /** For `duplicate_of_existing` — points to the existing Unit id. */
  duplicateOfUnitId?: string;
}

export interface ImportBatchResult {
  /** Items in source order — includes duplicates (flagged, not dropped). */
  items: ImportItem[];
  stats: {
    totalCards: number;
    newCount: number;
    duplicateInBatchCount: number;
    duplicateOfExistingCount: number;
  };
  strategy: BoundaryStrategy;
}

export interface ImportOptions {
  /** Override the boundary strategy. Default: `pickDefaultStrategy`. */
  strategy?: BoundaryStrategy;
}

// ─── Service ──────────────────────────────────────────────────────

export function createImportPipelineService(db: PrismaClient) {
  /**
   * Run phase-1 segmentation + within-batch dedupe only. Does not
   * touch the database. Callers that want to preview segmentation
   * (before committing to the full two-phase run) should use this.
   */
  function phase1Segment(
    rawText: string,
    opts: ImportOptions = {},
  ): { cards: CardBoundary[]; items: ImportItem[]; strategy: BoundaryStrategy } {
    const strategy = opts.strategy ?? pickDefaultStrategy(rawText);
    const cards = segmentIntoCards(rawText, { strategy });

    // First pass: every card gets "new"; record first-seen fingerprint index.
    const seen = new Map<string, number>();
    const items: ImportItem[] = cards.map((c) => {
      const fp = fingerprint(c.content);
      const existing = seen.get(fp);
      if (existing !== undefined) {
        return {
          index: c.index,
          content: c.content,
          fingerprint: fp,
          disposition: "duplicate_in_batch",
          canonicalIndex: existing,
        };
      }
      seen.set(fp, c.index);
      return {
        index: c.index,
        content: c.content,
        fingerprint: fp,
        disposition: "new",
      };
    });

    return { cards, items, strategy };
  }

  /**
   * Run both phases: segment + within-batch dedupe + cross-batch
   * dedupe against the project's existing Unit content. Items whose
   * fingerprint matches an existing unit are flagged
   * `duplicate_of_existing` and carry that unit's id.
   *
   * Pure read — never writes units, relations, or proposals.
   */
  async function importBatch(
    projectId: string,
    rawText: string,
    opts: ImportOptions = {},
  ): Promise<ImportBatchResult> {
    const { items: phase1Items, strategy } = phase1Segment(rawText, opts);

    if (phase1Items.length === 0) {
      return {
        items: [],
        stats: {
          totalCards: 0,
          newCount: 0,
          duplicateInBatchCount: 0,
          duplicateOfExistingCount: 0,
        },
        strategy,
      };
    }

    // Phase 2: load existing project content and fingerprint it.
    const existingUnits = await db.unit.findMany({
      where: { projectId },
      select: { id: true, content: true },
    });

    const existingByFp = new Map<string, string>();
    for (const u of existingUnits) {
      const fp = fingerprint(u.content);
      // First write wins — if the project already has duplicates, we
      // point new imports at the oldest row rather than the newest.
      if (!existingByFp.has(fp)) existingByFp.set(fp, u.id);
    }

    const items = phase1Items.map((item): ImportItem => {
      if (item.disposition !== "new") return item;
      const match = existingByFp.get(item.fingerprint);
      if (match) {
        return {
          ...item,
          disposition: "duplicate_of_existing",
          duplicateOfUnitId: match,
        };
      }
      return item;
    });

    let newCount = 0;
    let duplicateInBatchCount = 0;
    let duplicateOfExistingCount = 0;
    for (const it of items) {
      if (it.disposition === "new") newCount++;
      else if (it.disposition === "duplicate_in_batch") duplicateInBatchCount++;
      else duplicateOfExistingCount++;
    }

    return {
      items,
      stats: {
        totalCards: items.length,
        newCount,
        duplicateInBatchCount,
        duplicateOfExistingCount,
      },
      strategy,
    };
  }

  return { phase1Segment, importBatch };
}

export type ImportPipelineService = ReturnType<typeof createImportPipelineService>;
