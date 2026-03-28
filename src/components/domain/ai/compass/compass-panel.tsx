"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, HelpCircle, Target } from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useThemeStore } from "@/stores/theme-store";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/shared/skeleton";
import { CompassRing } from "./compass-ring";
import { CompassPromptCard } from "./compass-prompt-card";
import type { ExpertiseLevel } from "@/stores/theme-store";

/* ─── Types ─── */

interface ConfirmedChain {
  id: string;
  claimPreview: string;
  evidenceCount: number;
}

interface MissingPrompt {
  id: string;
  question: string;
  linkedUnitId?: string;
  linkedUnitPreview?: string;
  priority: "high" | "medium" | "low";
}

interface CompassPanelProps {
  inquiryId: string;
  className?: string;
  /** Callback when user creates a new unit to address a prompt */
  onCreateUnit?: (promptId: string) => void;
  /** Callback to navigate to a unit */
  onNavigateUnit?: (unitId: string) => void;
}

/* ─── Expertise Helpers ─── */

function getSelfAssessmentLabel(level: ExpertiseLevel): string {
  switch (level) {
    case "novice":
      return "How complete do you feel this inquiry is? (Rate your confidence in the completeness of your research so far.)";
    case "intermediate":
      return "How complete does this inquiry feel?";
    case "expert":
      return "Self-assessed completeness";
  }
}

function getSectionDescription(
  section: "confirmed" | "missing",
  level: ExpertiseLevel,
): string | null {
  if (level !== "novice") return null;
  if (section === "confirmed") {
    return "These are claim-evidence chains that your inquiry has established so far.";
  }
  return "These are interrogative prompts highlighting gaps in your inquiry. Addressing them will strengthen your argument.";
}

/* ─── Component ─── */

export function CompassPanel({
  inquiryId,
  className,
  onCreateUnit,
  onNavigateUnit,
}: CompassPanelProps) {
  const expertiseLevel = useThemeStore((s) => s.expertiseLevel);

  const compassQuery = api.compass.getByInquiry.useQuery(
    { inquiryId },
    { enabled: !!inquiryId },
  );
  const upsertMutation = api.compass.upsert.useMutation();

  const [selfAssessment, setSelfAssessment] = React.useState<number>(50);
  const [dismissedPrompts, setDismissedPrompts] = React.useState<Set<string>>(
    new Set(),
  );

  const compass = compassQuery.data;
  const isLoading = compassQuery.isLoading;

  // Derived data from compass response
  const completeness: number = compass?.completeness ?? 0;
  const confirmedChains: ConfirmedChain[] = (compass?.requiredFormalTypes as ConfirmedChain[] | undefined) ?? [];
  const missingPrompts: MissingPrompt[] = ((compass?.openQuestions as MissingPrompt[] | undefined) ?? []).filter(
    (p: MissingPrompt) => !dismissedPrompts.has(p.id),
  );
  const aiAssessment: number = completeness;

  /* ─── Handlers ─── */

  function handleSelfAssessmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setSelfAssessment(val);
    upsertMutation.mutate({
      inquiryId,
      completeness: val / 100,
    });
  }

  function handleAddress(promptId: string) {
    onCreateUnit?.(promptId);
  }

  function handleDismiss(promptId: string) {
    setDismissedPrompts((prev) => new Set(prev).add(promptId));
  }

  function handleSkip(promptId: string) {
    setDismissedPrompts((prev) => new Set(prev).add(promptId));
  }

  /* ─── Loading ─── */

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-4 p-4", className)}>
        <div className="flex justify-center py-4">
          <Skeleton height="120px" width="120px" />
        </div>
        <Skeleton height="20px" width="80%" />
        <Skeleton height="60px" />
        <Skeleton height="60px" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-5 p-4">
          {/* ─── Compass Ring ─── */}
          <div className="flex justify-center py-2">
            <CompassRing value={completeness} />
          </div>

          {/* ─── Confirmed Chains ─── */}
          <section aria-labelledby="compass-confirmed-heading">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2
                className="h-4 w-4 text-accent-success"
                aria-hidden="true"
              />
              <h3
                id="compass-confirmed-heading"
                className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                What&apos;s confirmed
              </h3>
            </div>

            {getSectionDescription("confirmed", expertiseLevel) && (
              <p className="text-[11px] text-text-tertiary mb-2 leading-relaxed">
                {getSectionDescription("confirmed", expertiseLevel)}
              </p>
            )}

            {confirmedChains.length === 0 ? (
              <p className="text-xs text-text-tertiary italic py-2">
                No confirmed chains yet. Add evidence to support your claims.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5" role="list">
                {confirmedChains.map((chain) => (
                  <li key={chain.id}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-2",
                        "bg-accent-success/8 border border-accent-success/15",
                        "text-xs text-text-secondary",
                      )}
                    >
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-accent-success shrink-0"
                        aria-hidden="true"
                      />
                      <span className="flex-1 min-w-0 truncate">
                        {chain.claimPreview}
                      </span>
                      <span className="text-[10px] text-text-tertiary shrink-0">
                        {chain.evidenceCount} evidence
                      </span>
                    </motion.div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Missing / Interrogative Prompts ─── */}
          <section aria-labelledby="compass-missing-heading">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle
                className="h-4 w-4 text-amber-500"
                aria-hidden="true"
              />
              <h3
                id="compass-missing-heading"
                className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                What&apos;s missing
              </h3>
              {missingPrompts.length > 0 && (
                <span className="text-[10px] text-text-tertiary">
                  ({missingPrompts.length})
                </span>
              )}
            </div>

            {getSectionDescription("missing", expertiseLevel) && (
              <p className="text-[11px] text-text-tertiary mb-2 leading-relaxed">
                {getSectionDescription("missing", expertiseLevel)}
              </p>
            )}

            <AnimatePresence mode="popLayout">
              {missingPrompts.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-text-tertiary italic py-2"
                >
                  {expertiseLevel === "expert"
                    ? "No critical gaps detected."
                    : "No gaps detected. Your inquiry looks well-covered!"}
                </motion.p>
              ) : (
                <div className="flex flex-col gap-2">
                  {missingPrompts.map((prompt) => (
                    <CompassPromptCard
                      key={prompt.id}
                      id={prompt.id}
                      question={prompt.question}
                      linkedUnitId={prompt.linkedUnitId}
                      linkedUnitPreview={prompt.linkedUnitPreview}
                      priority={prompt.priority}
                      onAddress={handleAddress}
                      onDismiss={handleDismiss}
                      onSkip={handleSkip}
                      onClickUnit={onNavigateUnit}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </section>

          {/* ─── Self-Assessment ─── */}
          <section
            aria-labelledby="compass-self-heading"
            className="border-t border-border pt-4"
          >
            <h3
              id="compass-self-heading"
              className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
            >
              Self-assessment
            </h3>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-text-tertiary leading-relaxed">
                {getSelfAssessmentLabel(expertiseLevel)}
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selfAssessment}
                  onChange={handleSelfAssessmentChange}
                  className={cn(
                    "flex-1 h-1.5 rounded-full appearance-none cursor-pointer",
                    "bg-bg-secondary",
                    "[&::-webkit-slider-thumb]:appearance-none",
                    "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                    "[&::-webkit-slider-thumb]:rounded-full",
                    "[&::-webkit-slider-thumb]:bg-accent-primary",
                    "[&::-webkit-slider-thumb]:shadow-sm",
                    "[&::-webkit-slider-thumb]:cursor-pointer",
                  )}
                  aria-label="Self-assessed completeness"
                />
                <span className="text-sm font-medium text-text-primary tabular-nums w-10 text-right">
                  {selfAssessment}%
                </span>
              </div>
            </label>

            {/* AI Assessment Comparison */}
            <div
              className={cn(
                "mt-3 flex items-center gap-3 rounded-md px-3 py-2",
                "bg-bg-secondary border border-border",
              )}
            >
              <Target
                className="h-4 w-4 text-purple-400 shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-text-tertiary block">
                  AI assessment
                </span>
                <span className="text-sm font-medium text-text-primary">
                  {aiAssessment}%
                </span>
              </div>
              {Math.abs(selfAssessment - aiAssessment) > 20 && (
                <span className="text-[10px] text-amber-500">
                  {selfAssessment > aiAssessment
                    ? "You may be overestimating"
                    : "You may be underestimating"}
                </span>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

CompassPanel.displayName = "CompassPanel";
