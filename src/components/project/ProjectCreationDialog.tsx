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
  Code2,
  BookOpen,
  TrendingUp,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Shield,
  Compass,
  Unlock,
} from "lucide-react";

interface ProjectCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (projectId: string) => void;
}

type ConstraintLevel = "strict" | "guided" | "open";

const STEPS = ["basics", "template", "constraints"] as const;
type Step = (typeof STEPS)[number];

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "software-design": <Code2 className="h-6 w-6" />,
  "nonfiction-writing": <BookOpen className="h-6 w-6" />,
  "investment-decision": <TrendingUp className="h-6 w-6" />,
  "academic-research": <GraduationCap className="h-6 w-6" />,
};

const CONSTRAINT_CONFIG = {
  strict: {
    icon: Shield,
    title: "Strict",
    description: "Enforces template structure. Best for formal documents and consistent outputs.",
    color: "text-accent-error",
    bgColor: "bg-accent-error/10",
    borderColor: "border-accent-error/30",
  },
  guided: {
    icon: Compass,
    title: "Guided",
    description: "Suggests structure but allows flexibility. Great for exploration with guardrails.",
    color: "text-accent-warning",
    bgColor: "bg-accent-warning/10",
    borderColor: "border-accent-warning/30",
  },
  open: {
    icon: Unlock,
    title: "Open",
    description: "No constraints. Full creative freedom for freeform thinking.",
    color: "text-accent-success",
    bgColor: "bg-accent-success/10",
    borderColor: "border-accent-success/30",
  },
};

export function ProjectCreationDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProjectCreationDialogProps) {
  const [step, setStep] = React.useState<Step>("basics");
  const [name, setName] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [constraintLevel, setConstraintLevel] = React.useState<ConstraintLevel>("guided");

  const utils = api.useUtils();
  const { data: templates, isLoading: templatesLoading } = api.domainTemplate.list.useQuery();

  const createProject = api.project.create.useMutation({
    onSuccess: (data) => {
      utils.project.list.invalidate();
      onOpenChange(false);
      resetForm();
      onSuccess?.(data.id);
    },
  });

  const resetForm = () => {
    setStep("basics");
    setName("");
    setPurpose("");
    setSelectedTemplateId(null);
    setConstraintLevel("guided");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const currentStepIndex = STEPS.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const canProceed = () => {
    if (step === "basics") return name.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (isLastStep) {
      createProject.mutate({
        name: name.trim(),
        purpose: purpose.trim() || undefined,
        templateId: selectedTemplateId ?? undefined,
        constraintLevel,
      });
    } else {
      const nextStep = STEPS[currentStepIndex + 1];
      if (nextStep) setStep(nextStep);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      const prevStep = STEPS[currentStepIndex - 1];
      if (prevStep) setStep(prevStep);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            {step === "basics" && "Give your project a name and optional purpose."}
            {step === "template" && "Choose a domain template or start freeform."}
            {step === "constraints" && "Set how strictly the template guides your work."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  i <= currentStepIndex ? "bg-accent-primary" : "bg-bg-tertiary"
                )}
              />
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 transition-colors",
                    i < currentStepIndex ? "bg-accent-primary" : "bg-bg-tertiary"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-[200px]"
          >
            {step === "basics" && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="project-name"
                    className="mb-1 block text-xs font-medium text-text-secondary"
                  >
                    Project Name *
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Product Roadmap 2026"
                    autoFocus
                    className={cn(
                      "w-full rounded-lg border border-border bg-bg-primary px-3 py-2",
                      "text-sm text-text-primary placeholder:text-text-tertiary",
                      "outline-none transition-colors duration-fast",
                      "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                    )}
                  />
                </div>
                <div>
                  <label
                    htmlFor="project-purpose"
                    className="mb-1 block text-xs font-medium text-text-secondary"
                  >
                    Purpose (optional)
                  </label>
                  <input
                    id="project-purpose"
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g., Strategic planning for Q3"
                    className={cn(
                      "w-full rounded-lg border border-border bg-bg-primary px-3 py-2",
                      "text-sm text-text-primary placeholder:text-text-tertiary",
                      "outline-none transition-colors duration-fast",
                      "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                    )}
                  />
                </div>
              </div>
            )}

            {step === "template" && (
              <div className="grid grid-cols-2 gap-3">
                {/* Freeform option */}
                <button
                  onClick={() => setSelectedTemplateId(null)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all",
                    selectedTemplateId === null
                      ? "border-accent-primary bg-accent-primary/5 ring-2 ring-accent-primary/20"
                      : "border-border hover:border-border-hover hover:bg-bg-hover"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      selectedTemplateId === null ? "bg-accent-primary/10" : "bg-bg-secondary"
                    )}
                  >
                    <Sparkles className="h-6 w-6 text-accent-primary" />
                  </div>
                  <div className="font-medium text-text-primary">Freeform</div>
                  <div className="text-xs text-text-secondary">No template, full freedom</div>
                </button>

                {/* Template options */}
                {templatesLoading ? (
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
                  </div>
                ) : (
                  templates?.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all",
                        selectedTemplateId === template.id
                          ? "border-accent-primary bg-accent-primary/5 ring-2 ring-accent-primary/20"
                          : "border-border hover:border-border-hover hover:bg-bg-hover"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-lg",
                          selectedTemplateId === template.id
                            ? "bg-accent-primary/10"
                            : "bg-bg-secondary"
                        )}
                      >
                        {TEMPLATE_ICONS[template.slug] ?? <Sparkles className="h-6 w-6" />}
                      </div>
                      <div className="font-medium text-text-primary">{template.name}</div>
                      <div className="text-xs text-text-secondary capitalize">
                        {template.type} template
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {step === "constraints" && (
              <div className="space-y-3">
                {(["strict", "guided", "open"] as const).map((level) => {
                  const config = CONSTRAINT_CONFIG[level];
                  const Icon = config.icon;
                  const isSelected = constraintLevel === level;

                  return (
                    <button
                      key={level}
                      onClick={() => setConstraintLevel(level)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all",
                        isSelected
                          ? cn(config.borderColor, config.bgColor, "ring-2 ring-offset-1", `ring-${level === "strict" ? "accent-error" : level === "guided" ? "accent-warning" : "accent-success"}/30`)
                          : "border-border hover:border-border-hover hover:bg-bg-hover"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          isSelected ? config.bgColor : "bg-bg-secondary"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isSelected ? config.color : "text-text-secondary")} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{config.title}</span>
                          {isSelected && (
                            <Check className={cn("h-4 w-4", config.color)} />
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-text-secondary">{config.description}</p>
                      </div>
                    </button>
                  );
                })}

                {!selectedTemplateId && (
                  <p className="text-xs text-text-tertiary italic">
                    Note: Constraints are most useful with a template selected.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={isFirstStep}
            className={cn(isFirstStep && "invisible")}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canProceed() || createProject.isPending}
          >
            {createProject.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isLastStep ? (
              <>
                Create Project
                <Check className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
