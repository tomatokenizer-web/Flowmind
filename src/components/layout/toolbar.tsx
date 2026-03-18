"use client";

import * as React from "react";
import { Layout, Focus, GitBranch, ChevronRight, Menu } from "lucide-react";
import { cn } from "~/lib/utils";
import { useLayoutStore, type ViewMode } from "~/stores/layout-store";
import { Button } from "~/components/ui/button";

const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: "canvas", icon: Layout, label: "Canvas" },
  { mode: "focus", icon: Focus, label: "Focus" },
  { mode: "graph", icon: GitBranch, label: "Graph" },
];

interface ToolbarProps {
  className?: string;
  onHamburgerClick?: () => void;
  showHamburger?: boolean;
}

export function Toolbar({ className, onHamburgerClick, showHamburger }: ToolbarProps) {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const setViewMode = useLayoutStore((s) => s.setViewMode);

  return (
    <div
      role="toolbar"
      aria-label="Main toolbar"
      className={cn(
        "flex h-12 items-center gap-space-2 border-b border-border bg-bg-primary px-space-4",
        className,
      )}
    >
      {/* Hamburger menu for tablet */}
      {showHamburger && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onHamburgerClick}
          aria-label="Open navigation menu"
          className="h-9 w-9 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Breadcrumb placeholder */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-space-1 text-sm">
        <span className="text-text-secondary">Home</span>
        <ChevronRight className="h-3 w-3 text-text-tertiary" />
        <span className="font-medium text-text-primary">Dashboard</span>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View switcher */}
      <div
        role="radiogroup"
        aria-label="View mode"
        className="flex items-center gap-space-1 rounded-lg bg-bg-secondary p-space-1"
      >
        {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={viewMode === mode}
            aria-label={`${label} view`}
            onClick={() => setViewMode(mode)}
            className={cn(
              "inline-flex items-center gap-space-1 rounded-md px-space-3 py-space-1",
              "text-xs font-medium",
              "transition-all duration-fast ease-default",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
              "motion-reduce:transition-none",
              viewMode === mode
                ? "bg-bg-primary text-text-primary shadow-resting"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
