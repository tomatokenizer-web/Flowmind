import type { PrismaClient } from "@prisma/client";
import { eventBus } from "@/server/events/eventBus";

// ─── Types ──────────────────────────────────────────────────────────

export interface VersionDiff {
  additions: string[];
  deletions: string[];
  summary: string;
}

// ─── Diff Utilities ─────────────────────────────────────────────────

/**
 * Simple word-level diff using longest common subsequence.
 * Splits content by words, finds LCS, reports additions/deletions.
 */
function computeWordDiff(oldText: string, newText: string): VersionDiff {
  const oldWords = oldText.split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);

  // Build LCS table
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0) as number[],
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack to find additions and deletions
  const deletions: string[] = [];
  const additions: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      additions.unshift(newWords[j - 1]!);
      j--;
    } else {
      deletions.unshift(oldWords[i - 1]!);
      i--;
    }
  }

  // Generate summary
  const parts: string[] = [];
  if (deletions.length > 0) {
    parts.push(`−${deletions.length} word${deletions.length !== 1 ? "s" : ""}`);
  }
  if (additions.length > 0) {
    parts.push(`+${additions.length} word${additions.length !== 1 ? "s" : ""}`);
  }
  const summary = parts.length > 0 ? parts.join(", ") : "No changes";

  return { additions, deletions, summary };
}

/**
 * Line-level diff for display purposes.
 * Returns arrays of {type, text} for rendering.
 */
export interface DiffLine {
  type: "unchanged" | "added" | "removed";
  text: string;
}

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0) as number[],
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: "unchanged", text: oldLines[i - 1]! });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      result.unshift({ type: "added", text: newLines[j - 1]! });
      j--;
    } else {
      result.unshift({ type: "removed", text: oldLines[i - 1]! });
      i--;
    }
  }

  return result;
}

// ─── Service ────────────────────────────────────────────────────────

export function createVersionService(db: PrismaClient) {
  return {
    /**
     * Create a version snapshot of a unit's current content.
     * Called automatically before edits by unitService.
     */
    async createSnapshot(
      unitId: string,
      content: string,
      meta: unknown,
      changeReason?: string,
    ) {
      const latest = await db.unitVersion.findFirst({
        where: { unitId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      // Compute diff summary against previous version content
      let diffSummary: string | undefined;
      if (latest) {
        const prevVersion = await db.unitVersion.findFirst({
          where: { unitId },
          orderBy: { version: "desc" },
          select: { content: true },
        });
        if (prevVersion) {
          const diff = computeWordDiff(prevVersion.content, content);
          diffSummary = diff.summary;
        }
      }

      return db.unitVersion.create({
        data: {
          unit: { connect: { id: unitId } },
          version: nextVersion,
          content,
          meta: meta as undefined,
          changeReason: changeReason ?? "auto-version before edit",
          diffSummary,
        },
      });
    },

    /**
     * List all versions for a unit, reverse chronological.
     */
    async listByUnitId(unitId: string) {
      return db.unitVersion.findMany({
        where: { unitId },
        orderBy: { version: "desc" },
      });
    },

    /**
     * Get a specific version by ID.
     */
    async getById(versionId: string) {
      return db.unitVersion.findUnique({
        where: { id: versionId },
      });
    },

    /**
     * Get a specific version by unit ID and version number.
     */
    async getByVersion(unitId: string, version: number) {
      return db.unitVersion.findUnique({
        where: { unitId_version: { unitId, version } },
      });
    },

    /**
     * Compute diff between two versions of the same unit.
     */
    async getDiff(unitId: string, fromVersion: number, toVersion: number) {
      const [fromV, toV] = await Promise.all([
        db.unitVersion.findUnique({
          where: { unitId_version: { unitId, version: fromVersion } },
        }),
        db.unitVersion.findUnique({
          where: { unitId_version: { unitId, version: toVersion } },
        }),
      ]);

      if (!fromV || !toV) return null;

      const wordDiff = computeWordDiff(fromV.content, toV.content);
      const lineDiff = computeLineDiff(fromV.content, toV.content);

      return {
        from: fromV,
        to: toV,
        wordDiff,
        lineDiff,
      };
    },

    /**
     * Compute diff between a version and the current unit content.
     */
    async getDiffWithCurrent(unitId: string, version: number) {
      const [versionRecord, unit] = await Promise.all([
        db.unitVersion.findUnique({
          where: { unitId_version: { unitId, version } },
        }),
        db.unit.findUnique({
          where: { id: unitId },
          select: { content: true },
        }),
      ]);

      if (!versionRecord || !unit) return null;

      const wordDiff = computeWordDiff(versionRecord.content, unit.content);
      const lineDiff = computeLineDiff(versionRecord.content, unit.content);

      return {
        from: versionRecord,
        currentContent: unit.content,
        wordDiff,
        lineDiff,
      };
    },

    /**
     * Restore a previous version. Creates a new version snapshot first
     * (non-destructive), then updates the unit content.
     */
    async restore(unitId: string, version: number, userId: string) {
      const targetVersion = await db.unitVersion.findUnique({
        where: { unitId_version: { unitId, version } },
      });

      if (!targetVersion) return null;

      const unit = await db.unit.findUnique({
        where: { id: unitId },
        select: { content: true, meta: true },
      });

      if (!unit) return null;

      // Snapshot current content before restoring
      await this.createSnapshot(
        unitId,
        unit.content,
        unit.meta,
        `Restored from v${version}`,
      );

      // Update unit with the restored content
      const updated = await db.unit.update({
        where: { id: unitId },
        data: {
          content: targetVersion.content,
          meta: targetVersion.meta ?? undefined,
        },
      });

      await eventBus.emit({
        type: "unit.updated",
        payload: {
          unitId,
          userId,
          unit: updated,
          changes: { content: updated.content } as Partial<typeof updated>,
        },
        timestamp: new Date(),
      });

      return updated;
    },
  };
}

export type VersionService = ReturnType<typeof createVersionService>;
