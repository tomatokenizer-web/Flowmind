"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  Wand2,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  BookOpen,
  FileText,
  Presentation,
  Scale,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateType = "essay" | "research_paper" | "debate_brief" | "presentation" | "blank";

const STEPS = ["analyze", "map", "confirm"] as const;
type Step = (typeof STEPS)[number];

interface TemplateScore {
  templateType: TemplateType;
  score: number;
  label: string;
}

interface Mapping {
  slot: string;
  unitId: string | null;
  confidence: number;
  position: number;
}

interface GapItem {
  slot: string;
  missing: boolean;
  suggestedUnitType: string;
}

interface UnitPreview {
  id: string;
  unitType: string;
  contentPreview: string;
  lifecycle: string;
}

interface FormalizeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: (assemblyId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_ICONS: Record<TemplateType, React.ReactNode> = {
  essay: <FileText className="h-5 w-5" />,
  research_paper: <BookOpen className="h-5 w-5" />,
  debate_brief: <Scale className="h-5 w-5" />,
  presentation: <Presentation className="h-5 w-5" />,
  blank: <Sparkles className="h-5 w-5" />,
};

const UNIT_TYPE_COLORS: Record<string, string> = {
  claim: "bg-blue-500/10 text-blue-600 border-blue-200",
  evidence: "bg-green-500/10 text-green-600 border-green-200",
  counterargument: "bg-red-500/10 text-red-600 border-red-200",
  observation: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  question: "bg-purple-500/10 text-purple-600 border-purple-200",
  idea: "bg-pink-500/10 text-pink-600 border-pink-200",
  definition: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  assumption: "bg-orange-500/10 text-orange-600 border-orange-200",
  action: "bg-teal-500/10 text-teal-600 border-teal-200",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  const labels = ["Analyze", "Map Units", "Confirm"];
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i < idx
                  ? "bg-accent-primary text-white"
                  : i === idx
                  ? "bg-accent-primary text-white ring-2 ring-accent-primary/30"
                  : "bg-bg-tertiary text-text-tertiary"
              )}
            >
              {i < idx ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn("text-[10px]", i === idx ? "text-text-primary font-medium" : "text-text-tertiary")}>
              {labels[i]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("mb-3 h-0.5 w-10 transition-colors", i < idx ? "bg-accent-primary" : "bg-bg-tertiary")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "bg-accent-success" : pct >= 40 ? "bg-accent-warning" : "bg-bg-tertiary";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-tertiary">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-text-tertiary">{pct}%</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FormalizeWizard({ open, onOpenChange, projectId, onSuccess }: FormalizeWizardProps) {
  const [step, setStep] = React.useState<Step>("analyze");
  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplateType>("essay");
  const [mappings, setMappings] = React.useState<Mapping[]>([]);
  const [assemblyName, setAssemblyName] = React.useState("");

  const utils = api.useUtils();

  // Step 1: Analyze
  const analyze = api.formalize.analyze.useMutation({
    onSuccess: (data) => {
      setSelectedTemplate(data.suggestedTemplate as TemplateType);
      setMappings(data.mappings as Mapping[]);
      // Pre-fill name
      setAssemblyName(`Formalized — ${data.suggestedTemplate.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`);
    },
  });

  // Step 3: Confirm
  const confirm = api.formalize.confirm.useMutation({
    onSuccess: (data) => {
      utils.assembly.list.invalidate({ projectId });
      onOpenChange(false);
      resetForm();
      onSuccess?.(data.assemblyId);
    },
  });

  const resetForm = () => {
    setStep("analyze");
    setSelectedTemplate("essay");
    setMappings([]);
    setAssemblyName("");
    analyze.reset();
    confirm.reset();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleAnalyze = () => {
    analyze.mutate({ projectId });
  };

  const handleTemplateChange = (t: TemplateType) => {
    setSelectedTemplate(t);
    // Rebuild mappings from cached analyze data for new template — re-analyze
    if (analyze.data) {
      // Trigger a fresh analysis with the new template preference
      // For now, just clear mappings so user can see gaps
      setMappings([]);
    }
  };

  const handleMappingChange = (position: number, unitId: string | null) => {
    setMappings((prev) =>
      prev.map((m) => (m.position === position ? { ...m, unitId } : m))
    );
  };

  const handleNext = () => {
    if (step === "analyze" && !analyze.data) {
      handleAnalyze();
      return;
    }
    if (step === "analyze" && analyze.data) {
      setStep("map");
      return;
    }
    if (step === "map") {
      setStep("confirm");
      return;
    }
    if (step === "confirm") {
      confirm.mutate({
        projectId,
        templateType: selectedTemplate,
        assemblyName: assemblyName.trim() || "Formalized Assembly",
        mappings,
      });
    }
  };

  const handleBack = () => {
    const stepIdx = STEPS.indexOf(step);
    if (stepIdx > 0) {
      setStep(STEPS[stepIdx - 1]!);
    }
  };

  const currentStepIndex = STEPS.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const canProceed = () => {
    if (step === "analyze") return true; // always can try
    if (step === "map") return mappings.some((m) => m.unitId !== null);
    if (step === "confirm") return assemblyName.trim().length > 0 && !confirm.isPending;
    return true;
  };

  const nextLabel = () => {
    if (step === "analyze" && !analyze.data) return "Analyze Project";
    if (step === "analyze" && analyze.data) return "Review Mappings";
    if (step === "map") return "Review & Confirm";
    return "Create Assembly";
  };

  const analysisData = analyze.data;
  const templateScores: TemplateScore[] = (analysisData?.templateScores ?? []) as TemplateScore[];
  const gapAnalysis: GapItem[] = (analysisData?.gapAnalysis ?? []) as GapItem[];
  const unitPreviews: UnitPreview[] = (analysisData?.units ?? []) as UnitPreview[];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-accent-primary" />
            Convert to Formal Template
          </DialogTitle>
          <DialogDescription>
            AI analyzes your project units and maps them to a structured document template.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="min-h-[260px]"
          >
            {/* ── Step 1: Analyze ── */}
            {step === "analyze" && (
              <div className="space-y-4">
                {analyze.isPending && (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
                    <p className="text-sm text-text-secondary">Analyzing project units…</p>
                  </div>
                )}

                {analyze.isError && (
                  <div className="flex items-center gap-2 rounded-lg border border-accent-error/30 bg-accent-error/5 p-3 text-sm text-accent-error">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {analyze.error.message}
                  </div>
                )}

                {!analyze.isPending && !analysisData && (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-primary/10">
                      <Wand2 className="h-7 w-7 text-accent-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">Ready to analyze</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        Click &quot;Analyze Project&quot; to let AI examine your units and suggest the best template structure.
                      </p>
                    </div>
                  </div>
                )}

                {analysisData && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-lg border border-accent-success/30 bg-accent-success/5 p-3 text-sm text-accent-success">
                      <Check className="h-4 w-4 shrink-0" />
                      Analyzed {analysisData.unitCount} units
                      {analysisData.analysisSource === "ai" ? " with AI" : " using heuristics"}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-text-secondary uppercase tracking-wide">Template Fit Scores</p>
                      <div className="space-y-2">
                        {templateScores.map((ts) => (
                          <button
                            key={ts.templateType}
                            onClick={() => handleTemplateChange(ts.templateType as TemplateType)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                              selectedTemplate === ts.templateType
                                ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/30"
                                : "border-border hover:border-border-hover hover:bg-bg-hover"
                            )}
                          >
                            <div className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              selectedTemplate === ts.templateType ? "bg-accent-primary/10 text-accent-primary" : "bg-bg-secondary text-text-tertiary"
                            )}>
                              {TEMPLATE_ICONS[ts.templateType as TemplateType]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-text-primary">{ts.label}</span>
                                {selectedTemplate === ts.templateType && (
                                  <Check className="h-3.5 w-3.5 text-accent-primary" />
                                )}
                              </div>
                              <ScoreBar score={ts.score} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Map Units ── */}
            {step === "map" && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-text-secondary">
                    Review which units map to each template slot. You can reassign units from the dropdown.
                  </p>
                  <span className="shrink-0 rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
                    {selectedTemplate.replace(/_/g, " ")}
                  </span>
                </div>

                {mappings.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-text-tertiary" />
                    <p className="text-sm text-text-secondary">No mappings available. Try re-analyzing.</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {mappings.map((mapping) => {
                      const mapped = unitPreviews.find((u) => u.id === mapping.unitId);
                      const gap = gapAnalysis.find((g) => g.slot === mapping.slot);
                      return (
                        <div
                          key={mapping.slot}
                          className={cn(
                            "rounded-lg border p-3 transition-colors",
                            mapping.unitId ? "border-border bg-bg-primary" : "border-dashed border-border bg-bg-secondary/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                                {mapping.slot}
                              </span>
                            </div>
                            {mapping.unitId && (
                              <span className="text-[10px] text-text-tertiary">
                                {Math.round(mapping.confidence * 100)}% fit
                              </span>
                            )}
                          </div>

                          {mapped ? (
                            <div className="mt-2 flex items-start gap-2">
                              <span className={cn(
                                "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                                UNIT_TYPE_COLORS[mapped.unitType] ?? "bg-bg-secondary text-text-secondary border-border"
                              )}>
                                {mapped.unitType}
                              </span>
                              <p className="text-xs text-text-secondary line-clamp-2">{mapped.contentPreview}</p>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-xs text-text-tertiary italic">
                              Empty slot — suggest adding a {gap?.suggestedUnitType ?? "unit"}
                            </p>
                          )}

                          {/* Unit selector */}
                          <select
                            className={cn(
                              "mt-2 w-full rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary",
                              "outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20"
                            )}
                            value={mapping.unitId ?? ""}
                            onChange={(e) => handleMappingChange(mapping.position, e.target.value || null)}
                          >
                            <option value="">— Leave empty —</option>
                            {unitPreviews.map((u) => (
                              <option key={u.id} value={u.id}>
                                [{u.unitType}] {u.contentPreview.slice(0, 60)}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}

                {gapAnalysis.some((g) => g.missing) && (
                  <div className="flex items-center gap-2 rounded-lg border border-accent-warning/30 bg-accent-warning/5 p-2.5 text-xs text-accent-warning">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {gapAnalysis.filter((g) => g.missing).length} slot(s) are empty. You can still proceed.
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Assembly Name *
                  </label>
                  <input
                    type="text"
                    value={assemblyName}
                    onChange={(e) => setAssemblyName(e.target.value)}
                    placeholder="e.g., My Essay — Final Draft"
                    autoFocus
                    className={cn(
                      "w-full rounded-lg border border-border bg-bg-primary px-3 py-2",
                      "text-sm text-text-primary placeholder:text-text-tertiary",
                      "outline-none transition-colors",
                      "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                    )}
                  />
                </div>

                <div className="rounded-lg border border-border bg-bg-secondary p-4 space-y-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-text-tertiary">Template</p>
                      <p className="font-medium text-text-primary capitalize">{selectedTemplate.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Units mapped</p>
                      <p className="font-medium text-text-primary">
                        {mappings.filter((m) => m.unitId !== null).length} / {mappings.length} slots
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs text-text-tertiary">Slot summary</p>
                    <div className="space-y-1">
                      {mappings.map((m) => (
                        <div key={m.slot} className="flex items-center gap-2 text-xs">
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            m.unitId ? "bg-accent-success" : "bg-bg-tertiary"
                          )} />
                          <span className="text-text-secondary w-28 truncate">{m.slot}</span>
                          {m.unitId ? (
                            <span className="text-text-tertiary truncate">
                              {unitPreviews.find((u) => u.id === m.unitId)?.contentPreview.slice(0, 40) ?? "—"}
                            </span>
                          ) : (
                            <span className="text-text-tertiary italic">empty</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {confirm.isError && (
                  <div className="flex items-center gap-2 rounded-lg border border-accent-error/30 bg-accent-error/5 p-3 text-sm text-accent-error">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {confirm.error.message}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={isFirstStep} className={cn(isFirstStep && "invisible")}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canProceed() || analyze.isPending || confirm.isPending}
          >
            {analyze.isPending || confirm.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isLastStep ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                Create Assembly
              </>
            ) : (
              <>
                {nextLabel()}
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
