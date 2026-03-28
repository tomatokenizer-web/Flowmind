"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Target,
  X,
  Bell,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { AIBadge } from "../shared/ai-badge";

/* ─── Types ─── */

type TriggerType =
  | "cluster"
  | "question_answered"
  | "completeness"
  | "dormant"
  | "contradiction";

interface ProactiveCardProps {
  id: string;
  trigger: TriggerType;
  /** Main suggestion text */
  message: string;
  /** Optional detail (e.g., unit/context name) */
  detail?: string;
  /** Accept the suggestion */
  onAccept: (id: string) => void;
  /** Dismiss permanently */
  onDismiss: (id: string) => void;
  /** Snooze — remind later */
  onSnooze: (id: string) => void;
  className?: string;
}

/* ─── Trigger Config ─── */

const TRIGGER_CONFIG: Record<
  TriggerType,
  { icon: React.ElementType; accent: string; bgAccent: string }
> = {
  cluster: {
    icon: Layers,
    accent: "text-blue-400",
    bgAccent: "bg-blue-500/10",
  },
  question_answered: {
    icon: CheckCircle2,
    accent: "text-accent-success",
    bgAccent: "bg-accent-success/10",
  },
  completeness: {
    icon: Target,
    accent: "text-purple-400",
    bgAccent: "bg-purple-500/10",
  },
  dormant: {
    icon: Clock,
    accent: "text-amber-400",
    bgAccent: "bg-amber-500/10",
  },
  contradiction: {
    icon: AlertTriangle,
    accent: "text-accent-error",
    bgAccent: "bg-accent-error/10",
  },
};

/* ─── Auto-dismiss Timer ─── */

const AUTO_DISMISS_MS = 30_000;

/* ─── Component ─── */

export function ProactiveCard({
  id,
  trigger,
  message,
  detail,
  onAccept,
  onDismiss,
  onSnooze,
  className,
}: ProactiveCardProps) {
  const [visible, setVisible] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = TRIGGER_CONFIG[trigger];
  const Icon = config.icon;

  // Auto-dismiss after 30 seconds unless hovered
  React.useEffect(() => {
    if (hovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(id), 300);
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hovered, id, onDismiss]);

  function handleAccept() {
    setVisible(false);
    setTimeout(() => onAccept(id), 200);
  }

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => onDismiss(id), 200);
  }

  function handleSnooze() {
    setVisible(false);
    setTimeout(() => onSnooze(id), 200);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            "w-[340px] rounded-xl border border-border bg-bg-primary",
            "shadow-elevated backdrop-blur-sm",
            "overflow-hidden",
            className,
          )}
          role="alert"
          aria-live="polite"
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5",
              config.bgAccent,
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                "bg-bg-primary/60",
              )}
            >
              <Icon className={cn("h-4 w-4", config.accent)} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                Suggestion
              </span>
            </div>
            <AIBadge compact />
            <button
              type="button"
              onClick={handleDismiss}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md",
                "text-text-tertiary hover:text-text-primary",
                "hover:bg-bg-hover",
                "transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              )}
              aria-label="Dismiss suggestion"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <p className="text-sm text-text-primary leading-relaxed">
              {message}
            </p>
            {detail && (
              <p className="mt-1 text-xs text-text-tertiary truncate">
                {detail}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-accent-primary hover:bg-accent-primary/10 flex-1"
              onClick={handleAccept}
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-text-tertiary hover:text-text-secondary flex-1"
              onClick={handleSnooze}
            >
              <Bell className="mr-1 h-3 w-3" aria-hidden="true" />
              Later
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-text-tertiary hover:text-text-secondary flex-1"
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

ProactiveCard.displayName = "ProactiveCard";
