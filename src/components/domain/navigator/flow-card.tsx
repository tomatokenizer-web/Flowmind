"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { UnitTypeBadge, getUnitTypeConfig, type UnitCardUnit } from "~/components/domain/unit";
import { RelationBadge } from "~/components/domain/relation";
import type { CardGroup, PathRelation } from "~/lib/card-boundary-algorithm";
import { api } from "~/trpc/react";

/* ─── Types ─── */

interface FlowCardProps {
  card: CardGroup;
  isCurrent: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  /** All cards in the flow, for resolving external relation targets */
  allCards: CardGroup[];
  onJumpToCard: (index: number) => void;
  className?: string;
}

/* ─── InlineConnector ─── */

function InlineConnector({ relation }: { relation: PathRelation }) {
  return (
    <div
      className="flex items-center justify-center py-1"
      aria-label={`Relation: ${relation.type}`}
    >
      <div className="h-3 w-px bg-border" aria-hidden="true" />
      <RelationBadge
        type={relation.type}
        layer={relation.layer}
        className="mx-2"
      />
      <div className="h-3 w-px bg-border" aria-hidden="true" />
    </div>
  );
}

/* ─── ExternalLink badge ─── */

function SeeAlsoLink({
  relation,
  allCards,
  onJumpToCard,
}: {
  relation: PathRelation;
  allCards: CardGroup[];
  onJumpToCard: (index: number) => void;
}) {
  // Find which card contains the target unit
  const otherUnitId =
    relation.targetUnitId; // External relations always point outward
  const targetCardIndex = allCards.findIndex((c) =>
    c.unitIds.includes(otherUnitId),
  );

  if (targetCardIndex < 0) return null;

  return (
    <button
      type="button"
      onClick={() => onJumpToCard(targetCardIndex)}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
        "text-[10px] font-medium text-accent-primary",
        "bg-accent-primary/5 hover:bg-accent-primary/10",
        "transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
      )}
      aria-label={`See also: card ${targetCardIndex + 1}`}
    >
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
      {relation.type.replace(/_/g, " ")} (Card {targetCardIndex + 1})
    </button>
  );
}

/* ─── UnitInCard ─── */

function UnitInCard({
  unitId,
  showType,
}: {
  unitId: string;
  showType: boolean;
}) {
  const unitQuery = api.unit.getById.useQuery(
    { id: unitId },
    { enabled: !!unitId },
  );

  const unit = unitQuery.data as UnitCardUnit | undefined;

  if (unitQuery.isLoading) {
    return (
      <div className="animate-pulse space-y-2 py-3">
        <div className="h-3 w-20 rounded bg-bg-secondary" />
        <div className="h-4 w-full rounded bg-bg-secondary" />
        <div className="h-4 w-3/4 rounded bg-bg-secondary" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="py-3 text-sm text-text-tertiary italic">
        Unit unavailable
      </div>
    );
  }

  const typeConfig = getUnitTypeConfig(unit.primaryType);

  return (
    <article className="py-3" aria-label={`${typeConfig.label}: ${unit.content.slice(0, 60)}`}>
      {showType && (
        <div className="mb-1.5">
          <UnitTypeBadge
            type={unit.primaryType}
            secondaryType={unit.secondaryType}
            size="sm"
          />
        </div>
      )}
      <p
        className={cn(
          "text-[15px] leading-relaxed text-text-primary",
          "max-w-[65ch]",
        )}
        style={{ wordBreak: "break-word" }}
      >
        {unit.content}
      </p>

      {/* Tags */}
      {(unit.tags ?? []).length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          {(unit.tags ?? []).slice(0, 4).map(({ tag }) => (
            <span
              key={tag.id}
              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-bg-secondary text-text-tertiary"
            >
              {tag.name}
            </span>
          ))}
          {(unit.tags ?? []).length > 4 && (
            <span className="text-[10px] text-text-tertiary">
              +{(unit.tags ?? []).length - 4}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

/* ─── FlowCard Component ─── */

export function FlowCard({
  card,
  isCurrent,
  isBookmarked,
  onToggleBookmark,
  allCards,
  onJumpToCard,
  className,
}: FlowCardProps) {
  const [expanded, setExpanded] = React.useState(true);
  const isMultiUnit = card.unitIds.length > 1;

  const typeConfig = getUnitTypeConfig(card.dominantType);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-bg-primary",
        "shadow-resting transition-shadow duration-slow",
        isCurrent
          ? "shadow-hover border-border-focus/40"
          : "border-border hover:shadow-hover",
        className,
      )}
      role="article"
      aria-label={`Card: ${card.theme}`}
      aria-current={isCurrent ? "true" : undefined}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Theme/title */}
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {card.theme}
          </h3>
          <span className="text-[10px] text-text-tertiary shrink-0">
            {card.unitIds.length} unit{card.unitIds.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Bookmark button */}
          <SimpleTooltip content={isBookmarked ? "Remove bookmark" : "Bookmark this card"}>
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleBookmark}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
              aria-pressed={isBookmarked}
              className="h-7 w-7"
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-accent-primary" />
              ) : (
                <Bookmark className="h-4 w-4 text-text-tertiary" />
              )}
            </Button>
          </SimpleTooltip>

          {/* Expand/collapse for multi-unit cards */}
          {isMultiUnit && (
            <SimpleTooltip content={expanded ? "Collapse" : "Expand"}>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? "Collapse card" : "Expand card"}
                aria-expanded={expanded}
                className="h-7 w-7"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-tertiary" />
                )}
              </Button>
            </SimpleTooltip>
          )}
        </div>
      </div>

      {/* Accent line */}
      <div className="mx-6 mb-2">
        <div
          className="h-0.5 w-12 rounded-full"
          style={{ backgroundColor: `var(--unit-${card.dominantType}-accent, var(--accent-primary))` }}
          aria-hidden="true"
        />
      </div>

      {/* Card content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4">
              {card.unitIds.map((unitId, i) => (
                <React.Fragment key={unitId}>
                  {/* Internal relation connector between units in the same card */}
                  {i > 0 && (
                    <>
                      {card.internalRelations
                        .filter(
                          (r) =>
                            (r.sourceUnitId === card.unitIds[i - 1] &&
                              r.targetUnitId === unitId) ||
                            (r.targetUnitId === card.unitIds[i - 1] &&
                              r.sourceUnitId === unitId),
                        )
                        .slice(0, 1)
                        .map((rel) => (
                          <InlineConnector
                            key={`${rel.sourceUnitId}-${rel.targetUnitId}`}
                            relation={rel}
                          />
                        ))}
                      {/* Divider if no relation to show */}
                      {!card.internalRelations.some(
                        (r) =>
                          (r.sourceUnitId === card.unitIds[i - 1] &&
                            r.targetUnitId === unitId) ||
                          (r.targetUnitId === card.unitIds[i - 1] &&
                            r.sourceUnitId === unitId),
                      ) && (
                        <div
                          className="my-1 border-t border-border/50"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}

                  <UnitInCard
                    unitId={unitId}
                    showType={isMultiUnit}
                  />
                </React.Fragment>
              ))}

              {/* External relations: "See also" links */}
              {card.externalRelations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                    See also
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {card.externalRelations.slice(0, 5).map((rel, i) => (
                      <SeeAlsoLink
                        key={`${rel.sourceUnitId}-${rel.targetUnitId}-${i}`}
                        relation={rel}
                        allCards={allCards}
                        onJumpToCard={onJumpToCard}
                      />
                    ))}
                    {card.externalRelations.length > 5 && (
                      <span className="text-[10px] text-text-tertiary self-center">
                        +{card.externalRelations.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
