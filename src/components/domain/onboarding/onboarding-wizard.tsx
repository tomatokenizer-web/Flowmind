"use client";

import * as React from "react";
import {
  Sparkles,
  Brain,
  FolderPlus,
  MapPin,
  ChevronRight,
  ChevronLeft,
  SkipForward,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useThemeStore } from "@/stores/theme-store";
import type { ExpertiseLevel } from "@/stores/theme-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import { DomainTemplatePicker } from "./domain-template-picker";

/* ─── Types ─── */

interface OnboardingWizardProps {
  onComplete: () => void;
  className?: string;
}

type Step = "welcome" | "expertise" | "domain" | "project" | "tour";

const STEPS: Step[] = ["welcome", "expertise", "domain", "project", "tour"];

const EXPERTISE_OPTIONS: {
  value: ExpertiseLevel;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "novice",
    label: "Novice",
    description: "New to structured thinking tools. Show me everything with helpful guidance.",
    icon: "🌱",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Familiar with note-taking and knowledge tools. Show key features.",
    icon: "🌿",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Power user of knowledge management. Minimal guidance, maximum control.",
    icon: "🌳",
  },
];

const TOUR_HIGHLIGHTS = [
  {
    title: "Sidebar",
    description: "Navigate between projects, inquiries, and contexts. Your knowledge structure lives here.",
    region: "left",
  },
  {
    title: "Main Area",
    description: "View and edit your thinking units. Switch between list, graph, board, reading, and thread views.",
    region: "center",
  },
  {
    title: "Right Panel",
    description: "Inspect unit details, view local graphs, and access the dialectical compass.",
    region: "right",
  },
  {
    title: "Command Palette",
    description: "Press Ctrl+K to quickly navigate, create, and search across your entire knowledge base.",
    region: "overlay",
  },
];

/* ─── Animation variants ─── */

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

/* ─── Component ─── */

export function OnboardingWizard({ onComplete, className }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = React.useState<Step>("welcome");
  const [direction, setDirection] = React.useState(1);
  const [selectedExpertise, setSelectedExpertise] = React.useState<ExpertiseLevel>("intermediate");
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>("general");
  const [projectName, setProjectName] = React.useState("");
  const [projectDescription, setProjectDescription] = React.useState("");
  const [tourStep, setTourStep] = React.useState(0);
  const [isCreating, setIsCreating] = React.useState(false);

  const setExpertiseLevel = useThemeStore((s) => s.setExpertiseLevel);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

  const createProjectMutation = api.project.create.useMutation();

  const stepIndex = STEPS.indexOf(currentStep);

  function goTo(step: Step) {
    const newIndex = STEPS.indexOf(step);
    setDirection(newIndex > stepIndex ? 1 : -1);
    setCurrentStep(step);
  }

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      goTo(STEPS[stepIndex + 1]!);
    } else {
      handleComplete();
    }
  }

  function goPrev() {
    if (stepIndex > 0) {
      goTo(STEPS[stepIndex - 1]!);
    }
  }

  async function handleComplete() {
    // Save expertise level
    setExpertiseLevel(selectedExpertise);

    // Create first project if name provided
    if (projectName.trim()) {
      setIsCreating(true);
      try {
        const result = await createProjectMutation.mutateAsync({
          name: projectName.trim(),
          description: projectDescription.trim() || undefined,
        });
        if (result?.id) {
          setActiveProject(result.id);
        }
      } catch {
        // Continue even if project creation fails
      }
      setIsCreating(false);
    }

    // Mark onboarding complete
    try {
      localStorage.setItem("flowmind-onboarding-complete", "true");
    } catch {
      // localStorage may be unavailable
    }

    onComplete();
  }

  const canProceed =
    currentStep === "welcome" ||
    currentStep === "expertise" ||
    currentStep === "domain" ||
    currentStep === "tour" ||
    (currentStep === "project" && projectName.trim().length > 0);

  return (
    <div
      className={cn(
        "flex min-h-[80vh] flex-col items-center justify-center px-4",
        className,
      )}
    >
      <div className="w-full max-w-lg">
        {/* Skip button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComplete}
            className="gap-1 text-text-tertiary"
          >
            Skip
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Step content */}
        <div className="relative overflow-hidden rounded-card border border-border bg-bg-surface p-8 shadow-resting min-h-[420px]">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ── Step 1: Welcome ── */}
            {currentStep === "welcome" && (
              <motion.div
                key="welcome"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center gap-6"
              >
                <motion.div
                  className="rounded-full border border-accent-primary/30 bg-accent-primary/10 p-5"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                  <Sparkles className="h-10 w-10 text-accent-primary" />
                </motion.div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-text-primary tracking-heading-tight">
                    Welcome to FlowMind
                  </h2>
                  <p className="text-text-secondary leading-relaxed max-w-sm mx-auto">
                    FlowMind preserves the flow of your thinking. Capture ideas as units,
                    connect them with relations, and let your knowledge evolve organically.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 w-full mt-2">
                  {[
                    { label: "Capture", desc: "Thinking units" },
                    { label: "Connect", desc: "Rich relations" },
                    { label: "Evolve", desc: "Living knowledge" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-card border border-border bg-bg-primary p-3 text-center"
                    >
                      <span className="block text-sm font-semibold text-text-primary">
                        {item.label}
                      </span>
                      <span className="text-xs text-text-tertiary">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Expertise ── */}
            {currentStep === "expertise" && (
              <motion.div
                key="expertise"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <Brain className="h-8 w-8 text-accent-primary mx-auto" />
                  <h2 className="text-xl font-bold text-text-primary">
                    Your Experience Level
                  </h2>
                  <p className="text-sm text-text-secondary">
                    This helps us tailor the interface to your needs.
                  </p>
                </div>
                <div className="space-y-2">
                  {EXPERTISE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedExpertise(opt.value)}
                      className={cn(
                        "w-full flex items-start gap-3 rounded-card border p-4 text-left transition-all duration-fast",
                        selectedExpertise === opt.value
                          ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary"
                          : "border-border hover:bg-bg-hover",
                      )}
                    >
                      <span className="text-xl mt-0.5">{opt.icon}</span>
                      <div>
                        <span className="block text-sm font-semibold text-text-primary">
                          {opt.label}
                        </span>
                        <span className="text-xs text-text-secondary leading-relaxed">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Domain ── */}
            {currentStep === "domain" && (
              <motion.div
                key="domain"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-text-primary">
                    Choose Your Domain
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Select a template to get domain-specific unit types and structures.
                  </p>
                </div>
                <DomainTemplatePicker
                  selected={selectedTemplate}
                  onSelect={setSelectedTemplate}
                  compact
                />
              </motion.div>
            )}

            {/* ── Step 4: First Project ── */}
            {currentStep === "project" && (
              <motion.div
                key="project"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <FolderPlus className="h-8 w-8 text-accent-primary mx-auto" />
                  <h2 className="text-xl font-bold text-text-primary">
                    Create Your First Project
                  </h2>
                  <p className="text-sm text-text-secondary">
                    A project is the top-level container for your thinking.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="project-name"
                      className="text-xs font-medium text-text-secondary uppercase tracking-wider"
                    >
                      Project Name *
                    </label>
                    <input
                      id="project-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g., Research Paper, Product Strategy"
                      className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="project-desc"
                      className="text-xs font-medium text-text-secondary uppercase tracking-wider"
                    >
                      Description (optional)
                    </label>
                    <textarea
                      id="project-desc"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="What is this project about?"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 5: Quick Tour ── */}
            {currentStep === "tour" && (
              <motion.div
                key="tour"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <MapPin className="h-8 w-8 text-accent-primary mx-auto" />
                  <h2 className="text-xl font-bold text-text-primary">
                    Quick Tour
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Here is how your workspace is organized.
                  </p>
                </div>

                {/* Tour layout illustration */}
                <div className="relative rounded-card border border-border bg-bg-primary overflow-hidden aspect-[16/9]">
                  {/* Sidebar region */}
                  <div
                    className={cn(
                      "absolute top-0 left-0 bottom-0 w-[25%] border-r border-border p-3 transition-colors duration-fast",
                      tourStep === 0 ? "bg-accent-primary/10" : "bg-bg-secondary",
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="h-2 w-12 rounded bg-text-tertiary/20" />
                      <div className="h-1.5 w-16 rounded bg-text-tertiary/10" />
                      <div className="h-1.5 w-10 rounded bg-text-tertiary/10" />
                    </div>
                  </div>
                  {/* Main region */}
                  <div
                    className={cn(
                      "absolute top-0 left-[25%] bottom-0 right-[25%] p-3 transition-colors duration-fast",
                      tourStep === 1 ? "bg-accent-primary/10" : "",
                    )}
                  >
                    <div className="h-2 w-20 rounded bg-text-tertiary/20 mb-2" />
                    <div className="space-y-1">
                      <div className="h-8 rounded bg-bg-secondary" />
                      <div className="h-8 rounded bg-bg-secondary" />
                      <div className="h-8 rounded bg-bg-secondary" />
                    </div>
                  </div>
                  {/* Right panel region */}
                  <div
                    className={cn(
                      "absolute top-0 right-0 bottom-0 w-[25%] border-l border-border p-3 transition-colors duration-fast",
                      tourStep === 2 ? "bg-accent-primary/10" : "bg-bg-secondary",
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="h-2 w-10 rounded bg-text-tertiary/20" />
                      <div className="h-16 rounded bg-text-tertiary/10" />
                    </div>
                  </div>
                  {/* Command palette overlay */}
                  {tourStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex items-start justify-center pt-6 bg-black/20"
                    >
                      <div className="w-[50%] rounded-lg bg-bg-surface border border-border p-2 shadow-elevated">
                        <div className="h-2 w-24 rounded bg-text-tertiary/20 mx-auto" />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tour step info */}
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {TOUR_HIGHLIGHTS[tourStep]?.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    {TOUR_HIGHLIGHTS[tourStep]?.description}
                  </p>
                </div>

                {/* Tour step navigation */}
                <div className="flex items-center justify-center gap-2">
                  {TOUR_HIGHLIGHTS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTourStep(i)}
                      className={cn(
                        "h-2 rounded-full transition-all duration-fast",
                        tourStep === i
                          ? "w-6 bg-accent-primary"
                          : "w-2 bg-text-tertiary/30 hover:bg-text-tertiary/50",
                      )}
                      aria-label={`Tour step ${i + 1}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={stepIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-fast",
                  i === stepIndex
                    ? "w-5 bg-accent-primary"
                    : i < stepIndex
                      ? "w-1.5 bg-accent-primary/50"
                      : "w-1.5 bg-text-tertiary/30",
                )}
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={goNext}
            disabled={!canProceed || isCreating}
            className="gap-1"
          >
            {stepIndex === STEPS.length - 1
              ? isCreating
                ? "Setting up..."
                : "Get Started"
              : "Next"}
            {stepIndex < STEPS.length - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
