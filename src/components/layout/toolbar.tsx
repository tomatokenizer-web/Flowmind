"use client";

import * as React from "react";
import { Layout, GitBranch, List, Menu, Maximize2, Minimize2, BookOpen, Search, Layers, FileText, Compass, Sparkles, Bell } from "lucide-react";
import { cn } from "~/lib/utils";
import { useLayoutStore, type ViewMode } from "~/stores/layout-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useFocusModeStore } from "~/stores/focusModeStore";
import { usePanelStore } from "~/stores/panel-store";
import { useAIPanelStore } from "~/stores/ai-panel-store";
import { Button } from "~/components/ui/button";
import { Breadcrumb, type BreadcrumbSegment } from "~/components/navigation/Breadcrumb";
// CompletenessCompass removed — percentage is meaningless without project-level objectives
import { openCommandPalette } from "~/components/search";
import { api } from "~/trpc/react";
import { ProactiveBudgetHUD } from "~/components/layout/ProactiveBudgetHUD";

const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: "canvas", icon: Layout, label: "Canvas" },
  { mode: "graph", icon: GitBranch, label: "Graph" },
  { mode: "thread", icon: List, label: "Thread" },
  { mode: "assembly", icon: BookOpen, label: "Assembly" },
  { mode: "navigate", icon: Compass, label: "Navigate" },
  { mode: "attention", icon: Bell, label: "Attention" },
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
  const setActiveContext = useSidebarStore((s) => s.setActiveContext);
  const panelIsOpen = usePanelStore((s) => s.isOpen);
  const closePanel = usePanelStore((s) => s.closePanel);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const aiPanelOpen = useAIPanelStore((s) => s.aiPanelOpen);
  const toggleAIPanel = useAIPanelStore((s) => s.toggleAIPanel);

  // Fetch context name for breadcrumb when a context is active
  const { data: contextData } = api.context.getById.useQuery(
    { id: activeContextId! },
    { enabled: !!activeContextId && !focusMode },
  );

  // Fetch unit content snippet for breadcrumb when a unit panel is open
  const { data: unitData } = api.unit.getById.useQuery(
    { id: selectedUnitId! },
    { enabled: !!selectedUnitId && panelIsOpen && !focusMode },
  );

  // View mode label for breadcrumb
  const viewModeLabel = VIEW_MODES.find((v) => v.mode === viewMode)?.label ?? "Canvas";

  // Build breadcrumb segments with full depth: Home > Context > View > Unit
  const defaultSegments = React.useMemo((): BreadcrumbSegment[] => {
    const segs: BreadcrumbSegment[] = [
      { label: "Home", onClick: () => setActiveContext(null), depth: "project" },
    ];

    if (activeContextId && contextData) {
      segs.push({
        label: contextData.name,
        onClick: () => setActiveContext(activeContextId),
        depth: "context",
        icon: Layers,
      });
    }

    // Add view mode segment when not in default canvas mode — clickable to close detail panel
    if (viewMode !== "canvas") {
      segs.push({
        label: viewModeLabel,
        depth: "view",
        ...(panelIsOpen ? { onClick: closePanel } : {}),
      });
    }

    // Add unit-level segment when detail panel is open
    if (panelIsOpen && selectedUnitId && unitData) {
      const unitSnippet =
        unitData.content.length > 30
          ? `${unitData.content.slice(0, 30)}...`
          : unitData.content;
      segs.push({
        label: unitSnippet,
        depth: "unit",
        icon: FileText,
      });
    } else if (!activeContextId && viewMode === "canvas") {
      // Fallback: just show "Dashboard"
      segs.push({ label: "Dashboard", depth: "view" });
    }

    return segs;
  }, [
    activeContextId,
    setActiveContext,
    contextData,
    viewMode,
    viewModeLabel,
    panelIsOpen,
    closePanel,
    selectedUnitId,
    unitData,
  ]);

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

      {/* Breadcrumb — allow up to 4 visible segments before collapsing */}
      <Breadcrumb segments={segments} maxVisible={4} className="flex-1" />

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

      {/* Proactive budget HUD */}
      {!focusMode && <ProactiveBudgetHUD />}

      {/* AI Command Panel button */}
      {!focusMode && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleAIPanel}
          aria-label="AI Commands"
          aria-pressed={aiPanelOpen}
          title="AI Commands"
          className={cn("h-9 w-9 transition-colors", aiPanelOpen && "text-accent-primary bg-accent-primary/10")}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      )}

      {/* Search button */}
      {!focusMode && (
        <Button variant="ghost" size="icon" onClick={openCommandPalette} aria-label="Search (Cmd+K)" title="Search (⌘K)" className="h-9 w-9">
          <Search className="h-4 w-4" />
        </Button>
      )}

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
