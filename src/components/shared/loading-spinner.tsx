"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

/**
 * AI processing indicator — animated dots with optional cancel button.
 * NOT a spinner (spinners are an anti-pattern in Flowmind).
 */

interface AIProcessingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label shown next to the dot animation */
  label?: string;
  /** If provided, shows a cancel button */
  onCancel?: () => void;
}

export function AIProcessingIndicator({
  label = "Processing",
  onCancel,
  className,
  ...props
}: AIProcessingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-3 rounded-lg bg-bg-secondary px-4 py-2.5",
        className,
      )}
      {...props}
    >
      {/* Dot animation */}
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-accent-primary motion-reduce:animate-none"
            style={{
              animation: "flowmind-dot-bounce 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </span>

      <span className="text-sm text-text-secondary">{label}</span>

      {onCancel && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCancel}
          aria-label="Cancel processing"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
