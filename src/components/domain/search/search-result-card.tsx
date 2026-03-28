"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Link2, ExternalLink, Columns2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { UnitTypeBadge } from "~/components/domain/unit/unit-type-badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import type { UnitCardUnit } from "~/components/domain/unit/unit-card";

/* ─── Types ─── */

export interface SearchResultCardProps {
  unit: UnitCardUnit;
  /** 0-1 relevance score */
  relevance: number;
  /** Content snippet with match terms to be bolded */
  snippet?: string;
  /** Matched query terms for highlighting */
  matchTerms?: string[];
  /** Context name */
  contextName?: string;
  /** Number of relations */
  relationCount?: number;
  /** Click handler */
  onClick?: (id: string) => void;
  /** Cmd+click handler (split view) */
  onCmdClick?: (id: string) => void;
  /** Open in graph handler */
  onOpenInGraph?: (id: string) => void;
  className?: string;
}

/* ─── Relevance Color ─── */

function getRelevanceColor(score: number): string {
  if (score >= 0.8) return "var(--accent-success)";
  if (score >= 0.5) return "var(--accent-primary)";
  if (score >= 0.3) return "var(--accent-warning)";
  return "var(--text-tertiary)";
}

/* ─── Highlighted Text ─── */

function HighlightedText({
  text,
  terms,
}: {
  text: string;
  terms: string[];
}) {
  if (!terms.length) {
    return <>{text}</>;
  }

  const escaped = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-accent-warning/20 text-text-primary rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

/* ─── Component ─── */

export const SearchResultCard = React.memo(function SearchResultCard({
  unit,
  relevance,
  snippet,
  matchTerms = [],
  contextName,
  relationCount,
  onClick,
  onCmdClick,
  onOpenInGraph,
  className,
}: SearchResultCardProps) {
  const displayText = snippet ?? unit.content.slice(0, 100);

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey) {
        onCmdClick?.(unit.id);
      } else {
        onClick?.(unit.id);
      }
    },
    [onClick, onCmdClick, unit.id],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onClick?.(unit.id);
      }
    },
    [onClick, unit.id],
  );

  const cardContent = (
    <motion.div
      role="article"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group/result relative rounded-card border border-border p-3",
        "bg-bg-primary cursor-pointer select-none",
        "transition-all duration-fast ease-default",
        "hover:shadow-hover hover:border-border-focus/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        className,
      )}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Relevance bar — thin colored line at top */}
      <div
        className="absolute top-0 left-3 right-3 h-0.5 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${getRelevanceColor(relevance)} ${relevance * 100}%, transparent ${relevance * 100}%)`,
        }}
        role="meter"
        aria-valuenow={Math.round(relevance * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Relevance: ${Math.round(relevance * 100)}%`}
      />

      {/* Top row: type badge + context badge */}
      <div className="flex items-center gap-2 mt-0.5">
        <UnitTypeBadge type={unit.primaryType} secondaryType={unit.secondaryType} size="sm" />

        {contextName && (
          <span
            className={cn(
              "inline-block truncate rounded px-1.5 py-0.5",
              "text-[10px] font-medium leading-tight",
              "bg-bg-hover text-text-tertiary",
              "max-w-[120px]",
            )}
          >
            {contextName}
          </span>
        )}

        {/* Relation count — right aligned */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {(relationCount ?? 0) > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5",
                "text-[10px] text-text-tertiary",
                "opacity-0 group-hover/result:opacity-100 transition-opacity duration-fast",
              )}
            >
              <Link2 className="h-3 w-3" aria-hidden="true" />
              {relationCount}
            </span>
          )}
        </div>
      </div>

      {/* Content preview with highlighted terms */}
      <p className="mt-1.5 text-sm text-text-primary leading-relaxed line-clamp-2">
        <HighlightedText text={displayText} terms={matchTerms} />
      </p>

      {/* Tags */}
      {(unit.tags ?? []).length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
          {(unit.tags ?? []).slice(0, 3).map(({ tag }) => (
            <span
              key={tag.id}
              className="inline-block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight bg-bg-secondary text-text-tertiary"
            >
              {tag.name}
            </span>
          ))}
          {(unit.tags ?? []).length > 3 && (
            <span className="text-[10px] text-text-tertiary shrink-0">
              +{(unit.tags ?? []).length - 3}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onClick?.(unit.id)}>
          <ExternalLink className="mr-2 h-4 w-4 text-text-tertiary" />
          Open
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onCmdClick?.(unit.id)}>
          <Columns2 className="mr-2 h-4 w-4 text-text-tertiary" />
          Open in Split View
          <span className="ml-auto text-xs text-text-tertiary">Ctrl+Click</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onOpenInGraph?.(unit.id)}>
          <Link2 className="mr-2 h-4 w-4 text-text-tertiary" />
          Show in Graph
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

SearchResultCard.displayName = "SearchResultCard";
