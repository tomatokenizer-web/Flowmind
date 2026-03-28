"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Search,
  Route,
  MousePointerClick,
  BookOpen,
  List,
  Swords,
  Zap,
  Clock,
  Sparkles,
  Layers,
  Globe,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { SimpleTooltip } from "~/components/ui/tooltip";
import {
  useNavigator,
  type NavigatorMode,
  type PathType,
  type TraversalMode,
} from "~/hooks/use-navigator";
import { useThemeStore } from "~/stores/theme-store";
import { useUnitSelectionStore } from "~/stores/unit-selection-store";
import { NavigatorQuery } from "./navigator-query";
import { NavigatorPath } from "./navigator-path";
import { NavigatorSelection } from "./navigator-selection";
import { FlowReadingView } from "./flow-reading-view";
import { NavigatorBreadcrumb } from "./navigator-breadcrumb";

/* ─── Path Type Config ─── */

interface PathTypeConfig {
  type: PathType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const PATH_TYPES: PathTypeConfig[] = [
  {
    type: "argument",
    label: "Argument",
    icon: Swords,
    description: "Follow supports, contradicts, rebuts chains",
  },
  {
    type: "causal",
    label: "Causal",
    icon: Zap,
    description: "Follow causes, enables, prevents chains",
  },
  {
    type: "temporal",
    label: "Temporal",
    icon: Clock,
    description: "Follow chronological order",
  },
  {
    type: "associative",
    label: "Associative",
    icon: Sparkles,
    description: "Follow analogous, echoes, parallels",
  },
  {
    type: "containment",
    label: "Containment",
    icon: Layers,
    description: "Follow contains, part_of hierarchy",
  },
  {
    type: "cross-context",
    label: "Cross-Context",
    icon: Globe,
    description: "Trace recontextualization across contexts",
  },
];

/* ─── Traversal Mode Config ─── */

interface TraversalConfig {
  mode: TraversalMode;
  label: string;
  shortLabel: string;
}

const TRAVERSAL_MODES: TraversalConfig[] = [
  { mode: "depth-first", label: "Depth-first: go deep into one branch", shortLabel: "Depth" },
  { mode: "breadth-first", label: "Breadth-first: explore all neighbors", shortLabel: "Breadth" },
  { mode: "guided", label: "Guided: AI selects the next step", shortLabel: "Guided" },
];

/* ─── NavigatorView Component ─── */

export function NavigatorView({ className }: { className?: string }) {
  const navigator = useNavigator();
  const expertiseLevel = useThemeStore((s) => s.expertiseLevel);
  const selectedUnitIds = useUnitSelectionStore((s) => s.selectedUnitIds);

  return (
    <div
      className={cn("flex h-full flex-col", className)}
      role="region"
      aria-label="Navigator"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Compass
          className="h-5 w-5 text-accent-primary shrink-0"
          aria-hidden="true"
        />
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Navigator
        </h2>

        {/* View toggle: List / Reading */}
        <div className="ml-auto flex items-center gap-1">
          <SimpleTooltip content="List view">
            <Button
              variant={navigator.viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => navigator.setViewMode("list")}
              aria-label="List view"
              aria-pressed={navigator.viewMode === "list"}
            >
              <List className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Reading view">
            <Button
              variant={navigator.viewMode === "reading" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => navigator.setViewMode("reading")}
              aria-label="Reading view"
              aria-pressed={navigator.viewMode === "reading"}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Path type selector */}
      <div className="border-b border-border px-4 py-2">
        <div
          className="flex items-center gap-1 overflow-x-auto"
          role="radiogroup"
          aria-label="Path type"
        >
          {PATH_TYPES.map((pt) => {
            const Icon = pt.icon;
            const isActive = navigator.pathType === pt.type;
            return (
              <SimpleTooltip key={pt.type} content={pt.description}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => navigator.setPathType(pt.type)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
                    "text-xs font-medium whitespace-nowrap",
                    "transition-all duration-fast ease-default",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    isActive
                      ? "bg-accent-primary/10 text-accent-primary"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "text-accent-primary" : "text-text-tertiary",
                    )}
                  />
                  {pt.label}
                </button>
              </SimpleTooltip>
            );
          })}
        </div>
      </div>

      {/* Traversal mode toggle */}
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-tertiary shrink-0">
            Traversal:
          </span>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Traversal mode">
            {TRAVERSAL_MODES.map((tm) => (
              <SimpleTooltip key={tm.mode} content={tm.label}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={navigator.traversalMode === tm.mode}
                  onClick={() => navigator.setTraversalMode(tm.mode)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
                    "transition-all duration-fast ease-default",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    navigator.traversalMode === tm.mode
                      ? "bg-bg-secondary text-text-primary"
                      : "text-text-tertiary hover:text-text-secondary hover:bg-bg-hover",
                  )}
                >
                  {tm.shortLabel}
                </button>
              </SimpleTooltip>
            ))}
          </div>
        </div>
      </div>

      {/* Breadcrumb (visible when active) */}
      {navigator.isActive && navigator.path.length > 0 && (
        <NavigatorBreadcrumb
          path={navigator.path}
          currentIndex={navigator.currentStepIndex}
          onJumpTo={navigator.goToStep}
          className="border-b border-border"
        />
      )}

      {/* Mode tabs + content */}
      <Tabs
        value={navigator.mode}
        onValueChange={(v) => navigator.setMode(v as NavigatorMode)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="px-4">
          <TabsTrigger value="query" className="gap-1.5">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Query
          </TabsTrigger>
          <TabsTrigger value="path" className="gap-1.5">
            <Route className="h-3.5 w-3.5" aria-hidden="true" />
            Path
          </TabsTrigger>
          <TabsTrigger value="selection" className="gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
            Selection
            {selectedUnitIds.size > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold text-white">
                {selectedUnitIds.size}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {navigator.viewMode === "reading" && navigator.isActive ? (
              <motion.div
                key="reading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="h-full"
              >
                <FlowReadingView
                  path={navigator.path}
                  expertiseLevel={expertiseLevel}
                />
              </motion.div>
            ) : (
              <motion.div
                key="tabs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="h-full"
              >
                <TabsContent value="query" className="h-full mt-0">
                  <NavigatorQuery
                    navigator={navigator}
                    onStartNavigation={navigator.startNavigation}
                  />
                </TabsContent>
                <TabsContent value="path" className="h-full mt-0">
                  <NavigatorPath navigator={navigator} />
                </TabsContent>
                <TabsContent value="selection" className="h-full mt-0">
                  <NavigatorSelection navigator={navigator} />
                </TabsContent>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}

export { PATH_TYPES, TRAVERSAL_MODES };
export type { PathTypeConfig, TraversalConfig };
