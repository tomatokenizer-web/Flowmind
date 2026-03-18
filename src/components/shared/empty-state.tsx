"use client";

import * as React from "react";
import {
  FileText,
  FolderOpen,
  Layers,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

/* ─── EmptyState ─── */

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon component to render as the illustration */
  icon?: LucideIcon;
  /** Custom illustration element (takes priority over icon) */
  illustration?: React.ReactNode;
  /** Main headline */
  headline: string;
  /** Optional description text below the headline */
  description?: string;
  /** CTA button label */
  actionLabel?: string;
  /** CTA button click handler */
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  illustration,
  headline,
  description,
  actionLabel,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 py-16 text-center",
        className,
      )}
      {...props}
    >
      {illustration ?? (
        Icon && (
          <Icon
            className="h-12 w-12 text-text-tertiary"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )
      )}
      <h3 className="font-heading text-lg font-medium text-text-secondary">
        {headline}
      </h3>
      {description && (
        <p className="max-w-xs text-sm text-text-tertiary">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="ghost" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/* ─── Pre-built variants ─── */

type VariantProps = Omit<EmptyStateProps, "icon" | "headline"> & {
  onAction?: () => void;
};

export function EmptyUnits(props: VariantProps) {
  return (
    <EmptyState
      icon={FileText}
      headline="No thought units yet"
      description="Capture your first thought to get started."
      actionLabel="Create your first unit"
      {...props}
    />
  );
}

export function EmptyContexts(props: VariantProps) {
  return (
    <EmptyState
      icon={Layers}
      headline="No contexts created"
      description="Contexts group related thoughts together."
      actionLabel="Create a context"
      {...props}
    />
  );
}

export function EmptyProjects(props: VariantProps) {
  return (
    <EmptyState
      icon={FolderOpen}
      headline="No projects yet"
      description="Projects organize your thinking around goals."
      actionLabel="Start a project"
      {...props}
    />
  );
}

export function EmptySearch(props: VariantProps) {
  return (
    <EmptyState
      icon={Search}
      headline="No results found"
      description="Try adjusting your search terms or filters."
      {...props}
    />
  );
}
