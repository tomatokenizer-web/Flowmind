"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  GitFork,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SimpleTooltip } from "~/components/ui/tooltip";
import { EmptyState } from "~/components/shared/empty-state";
import { UnitCard, type UnitCardUnit } from "~/components/domain/unit";
import { RelationBadge } from "~/components/domain/relation";
import type { UseNavigatorReturn, PathNode } from "~/hooks/use-navigator";
import { api } from "~/trpc/react";

/* ─── Types ─── */

interface NavigatorPathProps {
  navigator: UseNavigatorReturn;
  className?: string;
}

/* We need access to the navigator's takeBranch in the child;
   lift it via a context to avoid prop drilling through PathNodeDisplay */
const NavigatorContext = React.createContext<UseNavigatorReturn | null>(null);

/* ─── PathNodeDisplay ─── */

function PathNodeDisplay({
  node,
  index,
  isCurrent,
  onSelect,
}: {
  node: PathNode;
  index: number;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const nav = React.useContext(NavigatorContext);
  const unitQuery = api.unit.getById.useQuery(
    { id: node.unitId },
    { enabled: !!node.unitId },
  );

  const unit = unitQuery.data as UnitCardUnit | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      {/* Relation label from previous */}
      {node.relationFromPrevious && (
        <div className="flex items-center gap-2 py-1.5 pl-6">
          <div className="h-4 w-px bg-border" aria-hidden="true" />
          <RelationBadge
            type={node.relationFromPrevious}
            layer={node.relationLayer}
          />
          <div className="h-4 w-px bg-border" aria-hidden="true" />
        </div>
      )}

      {/* Node */}
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group flex w-full items-start gap-2 rounded-lg p-2 text-left",
          "transition-all duration-fast ease-default",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          isCurrent
            ? "bg-accent-primary/8 ring-1 ring-accent-primary/30"
            : "hover:bg-bg-hover",
        )}
        aria-current={isCurrent ? "step" : undefined}
        aria-label={`Step ${index + 1}${node.visited ? ", visited" : ""}`}
      >
        {/* Visit indicator */}
        <div className="mt-1 shrink-0">
          {node.visited ? (
            <CheckCircle2
              className={cn(
                "h-4 w-4",
                isCurrent ? "text-accent-primary" : "text-accent-success",
              )}
              aria-hidden="true"
            />
          ) : (
            <Circle
              className="h-4 w-4 text-text-tertiary"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Unit card or loading */}
        <div className="min-w-0 flex-1">
          {unit ? (
            <UnitCard unit={unit} variant="compact" />
          ) : unitQuery.isLoading ? (
            <div className="h-16 animate-pulse rounded-card bg-bg-secondary" />
          ) : (
            <div className="rounded-card border border-border border-dashed p-3">
              <p className="text-xs text-text-tertiary">
                Unit not found
              </p>
            </div>
          )}
        </div>

        {/* Branch indicator */}
        {node.branches.length > 0 && (
          <SimpleTooltip
            content={`${node.branches.length} branch${node.branches.length > 1 ? "es" : ""} available`}
          >
            <span className="mt-1 shrink-0">
              <GitFork
                className="h-4 w-4 text-accent-primary"
                aria-label={`${node.branches.length} branches`}
              />
            </span>
          </SimpleTooltip>
        )}
      </button>

      {/* Branch options (shown when current) */}
      {isCurrent && node.branches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-8 mt-1 space-y-1 overflow-hidden"
        >
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
            Branches
          </p>
          {node.branches.map((branch) => (
            <button
              key={branch.unitId}
              type="button"
              onClick={() => nav?.takeBranch(branch.unitId)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5",
                "text-xs text-text-secondary",
                "transition-all duration-fast ease-default",
                "hover:bg-bg-hover hover:text-text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              )}
            >
              <GitFork className="h-3 w-3 text-text-tertiary shrink-0" aria-hidden="true" />
              <RelationBadge type={branch.relationType} layer={branch.relationLayer} />
              {branch.preview && (
                <span className="truncate text-text-tertiary">
                  {branch.preview}
                </span>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── NavigatorPath Component ─── */

export function NavigatorPath({ navigator, className }: NavigatorPathProps) {
  const { path, currentStepIndex, isActive, canGoForward, canGoBack } =
    navigator;

  return (
    <NavigatorContext.Provider value={navigator}>
      <div className={cn("flex h-full flex-col", className)}>
        {/* Navigation controls */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            {!isActive ? (
              <Button
                size="sm"
                onClick={() => {
                  // Will be triggered from unit selection or external source
                  // For now, show a prompt
                }}
                disabled={true}
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Start path
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={navigator.stopNavigation}
                className="gap-1.5"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            )}
          </div>

          {isActive && (
            <div className="flex items-center gap-1">
              <SimpleTooltip content="Previous step">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!canGoBack}
                  onClick={navigator.goBack}
                  aria-label="Previous step"
                  className="h-7 w-7"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <span className="text-xs text-text-tertiary tabular-nums">
                {currentStepIndex + 1} / {path.length}
              </span>
              <SimpleTooltip content="Next step">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!canGoForward}
                  onClick={navigator.goForward}
                  aria-label="Next step"
                  className="h-7 w-7"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
            </div>
          )}
        </div>

        {/* Path visualization */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-3">
            {path.length > 0 ? (
              <div
                className="space-y-0"
                role="list"
                aria-label="Navigation path"
              >
                {path.map((node, i) => (
                  <div key={`${node.unitId}-${i}`} role="listitem">
                    <PathNodeDisplay
                      node={node}
                      index={i}
                      isCurrent={i === currentStepIndex}
                      onSelect={() => navigator.goToStep(i)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Play}
                headline="No active path"
                description="Select a starting unit and path type to begin navigating your knowledge graph."
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </NavigatorContext.Provider>
  );
}
