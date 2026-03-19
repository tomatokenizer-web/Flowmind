"use client";

import * as React from "react";
import Link from "next/link";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export interface BreadcrumbSegment {
  /** Display label */
  label: string;
  /** Navigation href — omit for current (last) segment */
  href?: string;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  /** Max segments to show before collapsing middle ones into "..." */
  maxVisible?: number;
  className?: string;
}

// ─── Single segment ──────────────────────────────────────────────────

function BreadcrumbItem({
  segment,
  isCurrent,
}: {
  segment: BreadcrumbSegment;
  isCurrent: boolean;
}) {
  const MAX_LABEL_LEN = 24;
  const isTruncated = segment.label.length > MAX_LABEL_LEN;
  const displayLabel = isTruncated
    ? `${segment.label.slice(0, MAX_LABEL_LEN)}…`
    : segment.label;

  const inner = isCurrent ? (
    <span
      className="max-w-[180px] truncate font-medium text-text-primary"
      aria-current="page"
    >
      {displayLabel}
    </span>
  ) : segment.href ? (
    <Link
      href={segment.href}
      className={cn(
        "max-w-[180px] truncate text-text-secondary",
        "transition-colors duration-fast hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1 rounded",
      )}
    >
      {displayLabel}
    </Link>
  ) : (
    <span className="max-w-[180px] truncate text-text-secondary">
      {displayLabel}
    </span>
  );

  if (!isTruncated) return inner;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{inner}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 rounded-md bg-bg-elevated px-3 py-1.5 text-xs text-text-primary shadow-md"
            sideOffset={4}
          >
            {segment.label}
            <Tooltip.Arrow className="fill-bg-elevated" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// ─── Collapsed "..." dropdown ─────────────────────────────────────────

function CollapsedSegments({
  segments,
}: {
  segments: BreadcrumbSegment[];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded text-text-tertiary",
          "hover:bg-bg-hover hover:text-text-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        )}
        aria-label="Show hidden breadcrumb segments"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[160px] rounded-lg border border-border bg-bg-surface p-1 shadow-md"
          sideOffset={4}
        >
          {segments.map((seg, i) => (
            <DropdownMenu.Item key={i} asChild>
              {seg.href ? (
                <Link
                  href={seg.href}
                  className={cn(
                    "flex cursor-pointer select-none rounded-md px-3 py-1.5 text-sm text-text-secondary",
                    "hover:bg-bg-hover hover:text-text-primary",
                    "focus-visible:outline-none focus-visible:bg-bg-hover",
                  )}
                >
                  {seg.label}
                </Link>
              ) : (
                <span className="flex select-none rounded-md px-3 py-1.5 text-sm text-text-secondary">
                  {seg.label}
                </span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Main component ──────────────────────────────────────────────────

/**
 * Breadcrumb navigation component.
 *
 * On narrow screens, collapses intermediate segments into a "..." dropdown.
 * Long labels are truncated with a Radix Tooltip showing the full name.
 */
export function Breadcrumb({
  segments,
  maxVisible = 3,
  className,
}: BreadcrumbProps) {
  if (segments.length === 0) return null;

  const needsCollapse = segments.length > maxVisible;

  // Always show first + last; collapse middle
  const visible: Array<BreadcrumbSegment | "collapsed"> = needsCollapse
    ? [
        segments[0]!,
        "collapsed" as const,
        segments[segments.length - 1]!,
      ]
    : segments;

  const collapsed = needsCollapse
    ? segments.slice(1, segments.length - 1)
    : [];

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 text-sm",
        className,
      )}
    >
      <ol className="flex items-center gap-1">
        {visible.map((item, idx) => {
          const isLast = idx === visible.length - 1;

          return (
            <React.Fragment key={idx}>
              <li className="flex items-center">
                {item === "collapsed" ? (
                  <CollapsedSegments segments={collapsed} />
                ) : (
                  <BreadcrumbItem segment={item} isCurrent={isLast} />
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
