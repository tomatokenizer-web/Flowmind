"use client";

import { Calendar, Clock, ExternalLink, History } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { AILifecycleBadge } from "~/components/unit/lifecycle-badge";
import { MetadataEditor, type MetadataValues } from "~/components/unit/metadata-editor";
import type { UnitDetailData } from "~/components/panels/UnitDetailPanel";
import type { DetailTab } from "~/stores/panel-store";

interface MetadataTabProps {
  unit: UnitDetailData;
  onMetadataChange?: (field: keyof MetadataValues, value: string | null) => void;
  setActiveTab: (tab: DetailTab) => void;
}

export function MetadataTab({ unit, onMetadataChange, setActiveTab }: MetadataTabProps) {
  const createdAt =
    typeof unit.createdAt === "string" ? new Date(unit.createdAt) : unit.createdAt;
  const modifiedAt = unit.modifiedAt
    ? typeof unit.modifiedAt === "string"
      ? new Date(unit.modifiedAt)
      : unit.modifiedAt
    : null;

  const originLabel = unit.originType?.replace(/_/g, " ") ?? "Direct write";

  return (
    <div className="space-y-5">
      {/* Dates section */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Timestamps
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              Created
            </span>
            <span className="text-text-primary" title={format(createdAt, "PPpp")}>
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          </div>
          {modifiedAt && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Modified
              </span>
              <span className="text-text-primary" title={format(modifiedAt, "PPpp")}>
                {formatDistanceToNow(modifiedAt, { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Provenance section */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Provenance
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              Origin
            </span>
            <span className="text-text-primary capitalize">{originLabel}</span>
          </div>
          {unit.aiTrustLevel && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">AI Trust</span>
              <span className="text-text-primary capitalize">
                {unit.aiTrustLevel.replace(/_/g, " ")}
              </span>
            </div>
          )}
          {unit.sourceSpan && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Source Span</span>
              {typeof unit.sourceSpan === "object" &&
              unit.sourceSpan !== null &&
              "splitFrom" in (unit.sourceSpan as Record<string, unknown>) ? (
                <span className="text-text-primary">Split from unit</span>
              ) : (
                <code className="text-text-primary truncate max-w-[160px] font-mono">
                  {JSON.stringify(unit.sourceSpan).slice(0, 80)}
                </code>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Version link */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          History
        </h4>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <History className="h-3 w-3" aria-hidden="true" />
            Versions
          </span>
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className="text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded"
          >
            {unit.versionCount ?? 0} version{(unit.versionCount ?? 0) !== 1 ? "s" : ""}
          </button>
        </div>
      </section>

      {/* Lifecycle badge */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Status
        </h4>
        <AILifecycleBadge
          lifecycle={unit.lifecycle as "draft" | "pending" | "confirmed"}
          size="md"
        />
      </section>

      {/* Editable metadata fields */}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Classification
        </h4>
        <MetadataEditor
          values={{
            unitType: unit.unitType,
            certainty: (unit.certainty as MetadataValues["certainty"]) ?? null,
            completeness: (unit.completeness as MetadataValues["completeness"]) ?? null,
            evidenceDomain: (unit.evidenceDomain as MetadataValues["evidenceDomain"]) ?? null,
            scope: (unit.scope as MetadataValues["scope"]) ?? null,
            stance: (unit.stance as MetadataValues["stance"]) ?? null,
          }}
          onChange={(field, value) => onMetadataChange?.(field, value)}
        />
      </section>
    </div>
  );
}
