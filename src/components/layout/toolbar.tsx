"use client";

import * as React from "react";
import { Layout, Focus, GitBranch, List, Menu, Maximize2, Minimize2, BookOpen } from "lucide-react";
import { cn } from "~/lib/utils";
import { useLayoutStore, type ViewMode } from "~/stores/layout-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useFocusModeStore } from "~/stores/focusModeStore";
import { Button } from "~/components/ui/button";
import { Breadcrumb, type BreadcrumbSegment } from "~/components/navigation/Breadcrumb";
import { CompletenessCompass } from "~/components/project/CompletenessCompass";

const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: "canvas", icon: Layout, label: "Canvas" },
  { mode: "focus", icon: Focus, label: "Focus" },
  { mode: "graph", icon: GitBranch, label: "Graph" },
  { mode: "thread", icon: List, label: "Thread" },
  { mode: "assembly", icon: BookOpen, label: "Assembly" },
];

interface ToolbarProps {
  className?: string;
  onHamburgerClick?: () => void;
  showHamburger?: boolean;
  /** Optional breadcrumb segments — defaults to "Home / Dashboard" */
  breadcrumbSegments?: BreadcrumbSegment[];
}

export function Toolbar({
  className,
  onHamburgerClick,
  showHamburger,
  breadcrumbSegments,
}: ToolbarProps) {
  const viewMode = useLayoutStore((s) => s.viewMode);
  const setViewMode = useLayoutStore((s) => s.setViewMode);
  const focusMode = useFocusModeStore((s) => s.focusMode);
  const toggleFocusMode = useFocusModeStore((s) => s.toggleFocusMode);
  const activeContextId = useSidebarStore((s) => s.activeContextId);

  // Default breadcrumb segments
  const defaultSegments: BreadcrumbSegment[] = [
    { label: "Home", href: "/dashboard-app" },
    { label: activeContextId ? "Context" : "Dashboard" },
  ];
  const segments = breadcrumbSegments ?? defaultSegments;

  // Keyboard shortcut: Ctrl+Shift+F / Cmd+Shift+F
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        toggleFocusMode();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [toggleFocusMode]);

  return (
    <div
      role="toolbar"
      aria-label="Main toolbar"
      className={cn(
        "flex h-12 items-center gap-space-2 border-b border-border bg-bg-primary px-space-4",
        className,
      )}
    >
      {/* Hamburger menu for tablet — hidden in focus mode */}
      {showHamburger && !focusMode && (
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

      {/* Breadcrumb */}
      <Breadcrumb segments={segments} className="flex-1" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* View switcher — hidden in focus mode */}
      {!focusMode && (
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
      )}

      {/* Completeness Compass */}
      {!focusMode && <CompletenessCompass />}

      {/* Focus Mode toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleFocusMode}
        aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
        aria-pressed={focusMode}
        title={focusMode ? "Exit focus mode (Ctrl+Shift+F)" : "Focus mode (Ctrl+Shift+F)"}
        className="h-9 w-9"
      >
        {focusMode ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
