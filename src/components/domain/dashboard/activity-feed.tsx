"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  Link2,
  Layers,
  FolderOpen,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";

/* ─── Types ─── */

export type ActivityEventType =
  | "unit_created"
  | "unit_confirmed"
  | "unit_modified"
  | "relation_created"
  | "assembly_updated"
  | "context_created";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  description: string;
  entityId: string;
  entityLabel: string;
  timestamp: Date;
  actorLabel?: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onEventClick?: (entityId: string) => void;
  className?: string;
}

/* ─── Event Config ─── */

const EVENT_CONFIG: Record<ActivityEventType, { icon: LucideIcon; color: string }> = {
  unit_created: { icon: FileText, color: "var(--accent-primary)" },
  unit_confirmed: { icon: CheckCircle2, color: "var(--accent-success)" },
  unit_modified: { icon: Pencil, color: "var(--text-secondary)" },
  relation_created: { icon: Link2, color: "var(--accent-warning)" },
  assembly_updated: { icon: Layers, color: "var(--info)" },
  context_created: { icon: FolderOpen, color: "var(--accent-primary)" },
};

/* ─── Relative time ─── */

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/* ─── Group events by day ─── */

function groupByDay(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const groups = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    const d = new Date(event.timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );

    let label: string;
    if (diffDays === 0) label = "Today";
    else if (diffDays === 1) label = "Yesterday";
    else if (diffDays < 7) label = d.toLocaleDateString("en-US", { weekday: "long" });
    else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(event);
  }

  return groups;
}

/* ─── Event Item ─── */

function ActivityEventItem({
  event,
  onClick,
}: {
  event: ActivityEvent;
  onClick?: (entityId: string) => void;
}) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="flex gap-3"
    >
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            backgroundColor: `${config.color}18`,
            color: config.color,
          }}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="w-px flex-1 bg-border mt-1" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <button
          onClick={() => onClick?.(event.entityId)}
          className={cn(
            "text-left text-sm text-text-primary leading-snug",
            "hover:text-accent-primary transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:underline",
            !onClick && "cursor-default",
          )}
          disabled={!onClick}
        >
          {event.description}
        </button>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-text-tertiary tabular-nums">
            {relativeTime(event.timestamp)}
          </span>
          {event.actorLabel && (
            <span className="text-[10px] text-text-tertiary">
              by {event.actorLabel}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Component ─── */

export function ActivityFeed({
  events,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onEventClick,
  className,
}: ActivityFeedProps) {
  const grouped = React.useMemo(() => groupByDay(events), [events]);

  if (events.length === 0) {
    return (
      <div className={cn("flex flex-col items-center py-12 text-center", className)}>
        <FileText
          className="h-10 w-10 text-text-tertiary mb-3"
          strokeWidth={1.5}
        />
        <p className="text-sm text-text-secondary">No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-4 p-4">
        {[...grouped].map(([dayLabel, dayEvents]) => (
          <section key={dayLabel}>
            <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3 px-1">
              {dayLabel}
            </h3>
            <div className="flex flex-col">
              <AnimatePresence mode="popLayout">
                {dayEvents.map((event) => (
                  <ActivityEventItem
                    key={event.id}
                    event={event}
                    onClick={onEventClick}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        ))}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="text-xs"
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

ActivityFeed.displayName = "ActivityFeed";
