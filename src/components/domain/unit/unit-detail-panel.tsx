"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  ChevronDown,
  Clock,
  GitMerge,
  Leaf,
  Link2,
  Pencil,
  Scissors,
  Trash2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { UnitTypeBadge } from "./unit-type-badge";
import { UnitLifecycleBadge } from "./unit-lifecycle-badge";

/* ─── Types ─── */

interface Relation {
  id: string;
  type: string;
  targetUnit: {
    id: string;
    content: string;
    primaryType: string;
  };
}

interface UnitVersion {
  id: string;
  versionNumber: number;
  content: string;
  changeReason?: string | null;
  createdAt: Date;
}

interface Perspective {
  stance: string;
  importance: number;
  note?: string | null;
}

interface UnitDetailPanelProps {
  unit: {
    id: string;
    content: string;
    primaryType: string;
    secondaryType?: string | null;
    lifecycle: string;
    aiTrustLevel?: string | null;
    isEvergreen: boolean;
    isArchived: boolean;
    contextDependency: string;
    salience: number;
    createdAt: Date;
    modifiedAt: Date;
    tags: { tag: { id: string; name: string } }[];
  };
  relations?: Relation[];
  versions?: UnitVersion[];
  perspective?: Perspective | null;
  contextName?: string;
  onEdit?: () => void;
  onSplit?: () => void;
  onMerge?: () => void;
  onArchive?: () => void;
  onDiscard?: () => void;
  onConfirm?: () => void;
  onNavigateUnit?: (id: string) => void;
  className?: string;
}

/* ─── Relation Group ─── */

const RELATION_LABELS: Record<string, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  elaborates: "Elaborates",
  qualifies: "Qualifies",
  exemplifies: "Exemplifies",
  generalizes: "Generalizes",
  causes: "Causes",
  preconditions: "Preconditions",
  questions: "Questions",
  responds_to: "Responds to",
};

function RelationGroup({
  type,
  relations,
  onNavigate,
}: {
  type: string;
  relations: Relation[];
  onNavigate?: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {RELATION_LABELS[type] ?? type}
      </h4>
      <div className="space-y-1">
        {relations.map((rel) => (
          <button
            key={rel.id}
            type="button"
            onClick={() => onNavigate?.(rel.targetUnit.id)}
            className={cn(
              "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left",
              "hover:bg-bg-hover transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            )}
          >
            <UnitTypeBadge type={rel.targetUnit.primaryType} size="sm" />
            <span className="text-xs text-text-secondary line-clamp-2 flex-1">
              {rel.targetUnit.content}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Version History ─── */

function VersionHistory({ versions }: { versions: UnitVersion[] }) {
  const [expanded, setExpanded] = React.useState(false);

  if (versions.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-2 py-1.5",
          "text-xs font-medium text-text-secondary",
          "hover:bg-bg-hover transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        )}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
          Version History ({versions.length})
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-text-tertiary transition-transform duration-fast",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pl-2 border-l-2 border-border/50 ml-2">
              {versions.map((version) => (
                <div key={version.id} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-text-tertiary">
                      v{version.versionNumber}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {formatRelativeDate(version.createdAt)}
                    </span>
                  </div>
                  {version.changeReason && (
                    <p className="text-[10px] text-text-tertiary italic">
                      {version.changeReason}
                    </p>
                  )}
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {version.content}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Helpers ─── */

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Stance Badge ─── */

const STANCE_CONFIG: Record<string, { label: string; colorClass: string }> = {
  supportive: { label: "Supportive", colorClass: "text-accent-success bg-accent-success/10" },
  opposing: { label: "Opposing", colorClass: "text-accent-error bg-accent-error/10" },
  neutral: { label: "Neutral", colorClass: "text-text-tertiary bg-bg-secondary" },
  ambivalent: { label: "Ambivalent", colorClass: "text-accent-warning bg-accent-warning/10" },
};

/* ─── UnitDetailPanel Component ─── */

export function UnitDetailPanel({
  unit,
  relations = [],
  versions = [],
  perspective,
  contextName,
  onEdit,
  onSplit,
  onMerge,
  onArchive,
  onDiscard,
  onConfirm,
  onNavigateUnit,
  className,
}: UnitDetailPanelProps) {
  /* Group relations by type */
  const groupedRelations = React.useMemo(() => {
    const groups: Record<string, Relation[]> = {};
    for (const rel of relations) {
      const key = rel.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(rel);
    }
    return groups;
  }, [relations]);

  const isDraft = unit.lifecycle === "draft";
  const isPending = unit.lifecycle === "pending";
  const stanceConfig = perspective?.stance
    ? STANCE_CONFIG[perspective.stance]
    : null;

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-5 p-4">
        {/* Header: type + lifecycle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <UnitTypeBadge
              type={unit.primaryType}
              secondaryType={unit.secondaryType}
            />
            <UnitLifecycleBadge
              lifecycle={unit.lifecycle}
              showActions={isDraft || isPending}
              onConfirm={onConfirm}
              onEdit={onEdit}
              onDiscard={onDiscard}
            />
          </div>

          {/* Evergreen indicator */}
          {unit.isEvergreen && (
            <div className="flex items-center gap-1.5 text-xs text-accent-success">
              <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
              Evergreen
            </div>
          )}
        </div>

        {/* Full content */}
        <div className="space-y-1">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {unit.content}
          </p>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <MetaRow label="Created" value={formatFullDate(unit.createdAt)} />
          <MetaRow label="Modified" value={formatFullDate(unit.modifiedAt)} />
          <MetaRow
            label="Context Dep."
            value={unit.contextDependency.charAt(0).toUpperCase() + unit.contextDependency.slice(1)}
          />
          <MetaRow
            label="Salience"
            value={`${Math.round(unit.salience * 100)}%`}
          />
          {unit.aiTrustLevel && (
            <MetaRow label="AI Trust" value={unit.aiTrustLevel} />
          )}
          {contextName && <MetaRow label="Context" value={contextName} />}
        </div>

        {/* Perspective section */}
        {perspective && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Perspective
            </h3>
            <div className="rounded-lg bg-bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between">
                {stanceConfig && (
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      stanceConfig.colorClass,
                    )}
                  >
                    {stanceConfig.label}
                  </span>
                )}
                <span className="text-xs text-text-tertiary">
                  Importance: {perspective.importance}/5
                </span>
              </div>
              {perspective.note && (
                <p className="text-xs text-text-secondary italic">
                  {perspective.note}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Tags */}
        {unit.tags.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {unit.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className={cn(
                    "inline-block rounded-md px-2 py-0.5",
                    "text-xs font-medium",
                    "bg-bg-secondary text-text-secondary",
                  )}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Relations */}
        {relations.length > 0 && (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Relations ({relations.length})
            </h3>
            <div className="space-y-3">
              {Object.entries(groupedRelations).map(([type, rels]) => (
                <RelationGroup
                  key={type}
                  type={type}
                  relations={rels}
                  onNavigate={onNavigateUnit}
                />
              ))}
            </div>
          </section>
        )}

        {/* Version History */}
        <section>
          <VersionHistory versions={versions} />
        </section>

        {/* Actions */}
        <section className="space-y-2 pt-2 border-t border-border/50">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            Actions
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {onSplit && (
              <Button variant="secondary" size="sm" onClick={onSplit}>
                <Scissors className="mr-1.5 h-3.5 w-3.5" />
                Split
              </Button>
            )}
            {onMerge && (
              <Button variant="secondary" size="sm" onClick={onMerge}>
                <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                Merge
              </Button>
            )}
            {onArchive && (
              <Button variant="secondary" size="sm" onClick={onArchive}>
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Archive
              </Button>
            )}
            {onDiscard && (
              <Button variant="destructive" size="sm" onClick={onDiscard}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Discard
              </Button>
            )}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}

/* ─── MetaRow helper ─── */

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
        {label}
      </dt>
      <dd className="text-xs text-text-secondary">{value}</dd>
    </div>
  );
}

UnitDetailPanel.displayName = "UnitDetailPanel";
