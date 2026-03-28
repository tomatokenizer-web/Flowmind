"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Edit3,
  GitBranch,
  Globe,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useThemeStore } from "@/stores/theme-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/shared/skeleton";
import { RefinementDiff } from "./refinement-diff";
import { ExternalConnection } from "./external-connection";
import { AIBadge } from "../shared/ai-badge";

/* ─── Types ─── */

interface PredictionGap {
  id: string;
  label: string;
  description: string;
  suggestedAction: string;
}

interface AmplificationPanelProps {
  /** Currently selected unit ID for refinement */
  selectedUnitId?: string | null;
  /** Inquiry ID for compass-based predictions */
  inquiryId?: string;
  className?: string;
  /** Called when a new unit is created from amplification */
  onUnitCreated?: (unitId: string) => void;
  /** Navigate to a unit */
  onNavigateUnit?: (unitId: string) => void;
}

/* ─── Component ─── */

export function AmplificationPanel({
  selectedUnitId,
  inquiryId,
  className,
  onUnitCreated,
  onNavigateUnit,
}: AmplificationPanelProps) {
  const expertiseLevel = useThemeStore((s) => s.expertiseLevel);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  // Refinement state
  const [isRefining, setIsRefining] = React.useState(false);
  const [refinedText, setRefinedText] = React.useState<string | null>(null);
  const [originalText, setOriginalText] = React.useState<string>("");

  // External search state
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<
    Array<{
      id: string;
      title: string;
      snippet: string;
      sourceUrl: string;
      sourceDomain: string;
      relevanceScore: number;
    }>
  >([]);

  // Predictions (from compass)
  const compassQuery = api.compass.getByInquiry.useQuery(
    { inquiryId: inquiryId! },
    { enabled: !!inquiryId },
  );
  const predictions: PredictionGap[] = (compassQuery.data?.openQuestions as unknown as PredictionGap[] | undefined) ?? [];

  // Unit data for refinement
  const unitQuery = api.unit.getById.useQuery(
    { id: selectedUnitId! },
    { enabled: !!activeProjectId && !!selectedUnitId },
  );
  const selectedUnit = unitQuery.data;

  /* ─── Handlers ─── */

  function handleRefine() {
    if (!selectedUnit) return;
    setOriginalText(selectedUnit.content);
    setIsRefining(true);

    // Simulated AI call — in production, this would call a server action
    setTimeout(() => {
      setRefinedText(selectedUnit.content); // Placeholder
      setIsRefining(false);
    }, 2000);
  }

  function handleAcceptRefinement() {
    setRefinedText(null);
    // In production: create UnitVersion with refined text
  }

  function handleRejectRefinement() {
    setRefinedText(null);
  }

  function handleEditRefinement() {
    // In production: open editor with refined text pre-filled
    setRefinedText(null);
  }

  function handleSearch() {
    if (!selectedUnit) return;
    setIsSearching(true);
    setSearchResults([]);

    // Simulated search — in production, uses api.search.global
    setTimeout(() => {
      setIsSearching(false);
    }, 2000);
  }

  function handleSaveAsUnit(result: { id: string }) {
    // In production: create Resource Unit from external result
    onUnitCreated?.(result.id);
  }

  function handleAttachReference(result: { id: string }) {
    // In production: create relation from current unit to resource unit
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs defaultValue="refine" className="flex flex-col h-full">
        <TabsList className="px-4 shrink-0">
          <TabsTrigger value="refine">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Refine
          </TabsTrigger>
          <TabsTrigger value="predict">
            <GitBranch className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Predict
          </TabsTrigger>
          <TabsTrigger value="connect">
            <Globe className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Connect
          </TabsTrigger>
        </TabsList>

        {/* ─── Refine Tab ─── */}
        <TabsContent value="refine" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 p-4">
              {!selectedUnitId ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Edit3
                    className="h-8 w-8 text-text-tertiary/50"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-text-tertiary">
                    Select a unit to refine its text with AI assistance.
                  </p>
                </div>
              ) : (
                <>
                  {/* Selected unit preview */}
                  <div className="rounded-lg border border-border bg-bg-secondary p-3">
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">
                      Selected unit
                    </span>
                    {unitQuery.isLoading ? (
                      <Skeleton height="40px" />
                    ) : (
                      <p className="text-sm text-text-primary leading-relaxed line-clamp-3">
                        {selectedUnit?.content ?? "Unit not found"}
                      </p>
                    )}
                  </div>

                  {/* Refine button */}
                  {!refinedText && !isRefining && (
                    <Button
                      variant="ghost"
                      className="h-10 text-sm text-accent-primary hover:bg-accent-primary/10 border border-accent-primary/20"
                      onClick={handleRefine}
                      disabled={!selectedUnit}
                    >
                      <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                      Refine this unit
                    </Button>
                  )}

                  {/* Refinement diff */}
                  {(isRefining || refinedText) && (
                    <RefinementDiff
                      original={originalText}
                      refined={refinedText ?? ""}
                      isLoading={isRefining}
                      onAccept={handleAcceptRefinement}
                      onReject={handleRejectRefinement}
                      onEdit={handleEditRefinement}
                    />
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Predict Tab ─── */}
        <TabsContent value="predict" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Label-based Flow Prediction
                </h4>
                <AIBadge />
              </div>

              {expertiseLevel === "novice" && (
                <p className="text-[11px] text-text-tertiary leading-relaxed">
                  Based on the types of units in your inquiry, the AI predicts what
                  kinds of units are typically missing at this stage.
                </p>
              )}

              {!inquiryId ? (
                <p className="text-xs text-text-tertiary italic py-4 text-center">
                  Select an inquiry to see flow predictions.
                </p>
              ) : compassQuery.isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} height="56px" />
                  ))}
                </div>
              ) : predictions.length === 0 ? (
                <p className="text-xs text-text-tertiary italic py-4 text-center">
                  {expertiseLevel === "expert"
                    ? "No significant gaps predicted."
                    : "Your inquiry flow looks well-balanced. No gaps predicted at this time."}
                </p>
              ) : (
                predictions.map((gap, index) => (
                  <motion.div
                    key={gap.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "rounded-lg border border-border bg-bg-surface p-3",
                      "transition-shadow duration-fast hover:shadow-resting",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-1.5 py-0.5",
                          "text-[10px] font-medium leading-tight",
                          "bg-purple-500/12 text-purple-400",
                        )}
                      >
                        {gap.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {gap.description}
                    </p>
                    <button
                      type="button"
                      className={cn(
                        "mt-2 text-[11px] text-accent-primary",
                        "hover:underline",
                        "focus-visible:outline-none focus-visible:underline",
                      )}
                      onClick={() => onUnitCreated?.(gap.id)}
                    >
                      {gap.suggestedAction}
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Connect Tab ─── */}
        <TabsContent value="connect" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 p-4">
              {!selectedUnitId ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Globe
                    className="h-8 w-8 text-text-tertiary/50"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-text-tertiary">
                    Select a unit to search for external knowledge connections.
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="h-10 text-sm text-accent-primary hover:bg-accent-primary/10 border border-accent-primary/20"
                    onClick={handleSearch}
                    disabled={isSearching || !selectedUnit}
                  >
                    <Globe className="mr-2 h-4 w-4" aria-hidden="true" />
                    Find external connections
                  </Button>

                  <ExternalConnection
                    results={searchResults}
                    isSearching={isSearching}
                    onSaveAsUnit={handleSaveAsUnit}
                    onAttachReference={handleAttachReference}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

AmplificationPanel.displayName = "AmplificationPanel";
