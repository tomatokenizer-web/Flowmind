"use client";

import * as React from "react";
import {
  ChevronRight,
  GitFork,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { SimpleTooltip } from "~/components/ui/tooltip";
import type { PathNode } from "~/hooks/use-navigator";
import { api } from "~/trpc/react";

/* ─── Types ─── */

interface NavigatorBreadcrumbProps {
  path: PathNode[];
  currentIndex: number;
  onJumpTo: (index: number) => void;
  /** Show fewer items for compact top-bar integration */
  compact?: boolean;
  className?: string;
}

/* ─── BreadcrumbNode ─── */

function BreadcrumbNode({
  node,
  index,
  isCurrent,
  isLast,
  onClick,
}: {
  node: PathNode;
  index: number;
  isCurrent: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const unitQuery = api.unit.getById.useQuery(
    { id: node.unitId },
    { enabled: !!node.unitId },
  );

  const label = unitQuery.data
    ? (unitQuery.data as { content: string }).content.slice(0, 30) +
      ((unitQuery.data as { content: string }).content.length > 30 ? "..." : "")
    : `Step ${index + 1}`;

  const tooltipContent = unitQuery.data
    ? (unitQuery.data as { content: string }).content.slice(0, 80)
    : `Step ${index + 1}`;

  return (
    <>
      <SimpleTooltip content={tooltipContent}>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
            "text-xs whitespace-nowrap max-w-[120px]",
            "transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            isCurrent
              ? "font-medium text-accent-primary bg-accent-primary/8"
              : node.visited
                ? "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                : "text-text-tertiary hover:text-text-secondary hover:bg-bg-hover",
          )}
          aria-current={isCurrent ? "step" : undefined}
          aria-label={`${tooltipContent}${node.visited ? ", visited" : ""}`}
        >
          {/* Visit state icon */}
          {node.visited ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : (
            <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}

          <span className="truncate">{label}</span>

          {/* Branch indicator */}
          {node.branches.length > 0 && (
            <GitFork className="h-3 w-3 shrink-0 text-accent-primary" aria-hidden="true" />
          )}
        </button>
      </SimpleTooltip>

      {/* Separator */}
      {!isLast && (
        <ChevronRight
          className="h-3 w-3 shrink-0 text-text-tertiary"
          aria-hidden="true"
        />
      )}
    </>
  );
}

/* ─── NavigatorBreadcrumb Component ─── */

export function NavigatorBreadcrumb({
  path,
  currentIndex,
  onJumpTo,
  compact = false,
  className,
}: NavigatorBreadcrumbProps) {
  // In compact mode, show only a window of nodes around current
  const visibleNodes = React.useMemo(() => {
    if (!compact || path.length <= 5) {
      return path.map((node, i) => ({ node, originalIndex: i }));
    }

    // Show first, current -1, current, current +1, last
    const indices = new Set<number>();
    indices.add(0); // first
    if (currentIndex > 0) indices.add(currentIndex - 1);
    indices.add(currentIndex);
    if (currentIndex < path.length - 1) indices.add(currentIndex + 1);
    indices.add(path.length - 1); // last

    return Array.from(indices)
      .sort((a, b) => a - b)
      .map((i) => ({ node: path[i]!, originalIndex: i }));
  }, [path, currentIndex, compact]);

  if (path.length === 0) return null;

  return (
    <nav
      className={cn("flex items-center gap-0.5 overflow-x-auto px-4 py-2", className)}
      aria-label="Navigation path"
    >
      {visibleNodes.map((item, i) => {
        const prevItem = visibleNodes[i - 1];
        const hasGap =
          prevItem !== undefined &&
          item.originalIndex - prevItem.originalIndex > 1;

        return (
          <React.Fragment key={`${item.node.unitId}-${item.originalIndex}`}>
            {/* Gap indicator for compact mode */}
            {hasGap && (
              <>
                <span
                  className="text-[10px] text-text-tertiary px-1"
                  aria-label={`${item.originalIndex - prevItem.originalIndex - 1} steps skipped`}
                >
                  ...
                </span>
                <ChevronRight
                  className="h-3 w-3 shrink-0 text-text-tertiary"
                  aria-hidden="true"
                />
              </>
            )}

            <BreadcrumbNode
              node={item.node}
              index={item.originalIndex}
              isCurrent={item.originalIndex === currentIndex}
              isLast={i === visibleNodes.length - 1}
              onClick={() => onJumpTo(item.originalIndex)}
            />
          </React.Fragment>
        );
      })}
    </nav>
  );
}
