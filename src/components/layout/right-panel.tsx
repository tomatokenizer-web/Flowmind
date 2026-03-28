"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Inspect, Network, Compass, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWorkspaceStore,
  RIGHT_PANEL_MIN,
  RIGHT_PANEL_MAX,
  type RightPanelContent,
} from "@/stores/workspace-store";
import { useResizablePanel } from "@/hooks/use-resizable-panel";
import * as Tabs from "@radix-ui/react-tabs";

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const PANEL_TABS: {
  value: RightPanelContent;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { value: "inspector", icon: Inspect, label: "Inspector" },
  { value: "graph", icon: Network, label: "Graph" },
  { value: "compass", icon: Compass, label: "Compass" },
];

// ---------------------------------------------------------------------------
// Placeholder content panels
// ---------------------------------------------------------------------------

function InspectorPanel() {
  const activeUnitId = useWorkspaceStore((s) => s.activeUnitId);

  if (!activeUnitId) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <Inspect className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
        <p className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
          Select a unit to inspect
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
        Unit inspector for: {activeUnitId.slice(0, 8)}...
      </p>
    </div>
  );
}

function GraphPanel() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Network className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
        Relation graph
      </p>
    </div>
  );
}

function CompassPanel() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Compass className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
        Thinking compass
      </p>
    </div>
  );
}

const PANEL_CONTENT: Record<string, React.ComponentType> = {
  inspector: InspectorPanel,
  graph: GraphPanel,
  compass: CompassPanel,
};

// ---------------------------------------------------------------------------
// Resize handle
// ---------------------------------------------------------------------------

function ResizeHandle({
  onMouseDown,
  isDragging,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize right panel"
      onMouseDown={onMouseDown}
      className={cn(
        "absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize",
        "transition-colors duration-[var(--duration-fast)]",
        "hover:bg-[var(--accent-primary)]/30",
        isDragging && "bg-[var(--accent-primary)]/50",
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Right panel
// ---------------------------------------------------------------------------

export function RightPanel() {
  const rightPanelOpen = useWorkspaceStore((s) => s.rightPanelOpen);
  const rightPanelContent = useWorkspaceStore((s) => s.rightPanelContent);
  const rightPanelWidth = useWorkspaceStore((s) => s.rightPanelWidth);
  const setRightPanelContent = useWorkspaceStore((s) => s.setRightPanelContent);

  const { width, isDragging, handleMouseDown } = useResizablePanel({
    initialWidth: rightPanelWidth,
    minWidth: RIGHT_PANEL_MIN,
    maxWidth: RIGHT_PANEL_MAX,
    direction: "left",
    onWidthChange: (w) => {
      // Debounced persist handled by store — direct set is fine here
      useWorkspaceStore.setState({ rightPanelWidth: w });
    },
  });

  const activeTab = rightPanelContent ?? "inspector";
  const ContentComponent = PANEL_CONTENT[activeTab];

  return (
    <AnimatePresence initial={false}>
      {rightPanelOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="relative flex h-full flex-col overflow-hidden border-l border-[var(--border-default)] bg-[var(--bg-primary)]"
          style={{ minWidth: 0 }}
          aria-label="Right panel"
        >
          <ResizeHandle onMouseDown={handleMouseDown} isDragging={isDragging} />

          {/* Tab bar */}
          <Tabs.Root
            value={activeTab}
            onValueChange={(v) => setRightPanelContent(v as RightPanelContent)}
            className="flex h-full flex-col"
          >
            <div className="flex items-center border-b border-[var(--border-default)]">
              <Tabs.List
                className="flex flex-1 items-center"
                aria-label="Panel tabs"
              >
                {PANEL_TABS.map(({ value, icon: Icon, label }) => (
                  <Tabs.Trigger
                    key={value}
                    value={value!}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5",
                      "text-[var(--text-xs)] font-medium",
                      "border-b-2 transition-colors duration-[var(--duration-fast)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]",
                      "data-[state=active]:border-[var(--accent-primary)] data-[state=active]:text-[var(--accent-primary)]",
                      "data-[state=inactive]:border-transparent data-[state=inactive]:text-[var(--text-tertiary)]",
                      "data-[state=inactive]:hover:text-[var(--text-secondary)]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setRightPanelContent(null)}
                className={cn(
                  "mr-2 rounded p-1 text-[var(--text-tertiary)]",
                  "hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                  "transition-colors duration-[var(--duration-fast)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                )}
                aria-label="Close panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {PANEL_TABS.map(({ value }) => (
                <Tabs.Content
                  key={value}
                  value={value!}
                  className="h-full outline-none"
                >
                  {value === activeTab && ContentComponent ? (
                    <ContentComponent />
                  ) : null}
                </Tabs.Content>
              ))}
            </div>
          </Tabs.Root>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
