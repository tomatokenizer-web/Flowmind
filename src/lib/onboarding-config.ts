/**
 * Onboarding step definitions for the first-time user experience.
 * Progressive disclosure: simple first, complexity revealed gradually.
 */

export interface OnboardingStep {
  id: string;
  /** Selector for the target element to spotlight */
  targetSelector: string;
  /** Main heading shown in the tooltip */
  title: string;
  /** Description text */
  description: string;
  /** Preferred placement relative to target */
  placement: "top" | "bottom" | "left" | "right";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "unit-card",
    targetSelector: "[data-onboarding='first-unit']",
    title: "This is your first Thought Unit",
    description:
      "Every thought you capture becomes a Unit — a building block you can connect, organize, and reuse across projects.",
    placement: "bottom",
  },
  {
    id: "sidebar",
    targetSelector: "[aria-label='Project navigation']",
    title: "Contexts organize your thinking",
    description:
      "As you capture more thoughts, Contexts help you group related ideas — like folders, but smarter.",
    placement: "right",
  },
  {
    id: "view-switcher",
    targetSelector: "[aria-label='View mode']",
    title: "Multiple ways to see your thoughts",
    description:
      "Switch between Canvas, Focus, and Graph views to explore your ideas spatially, linearly, or as a connected web.",
    placement: "bottom",
  },
];

export const ONBOARDING_STORAGE_KEY = "flowmind_onboarding_completed";
export const ONBOARDING_TIMESTAMP_KEY = "flowmind_onboarding_completed_at";
