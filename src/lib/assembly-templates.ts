import type { UnitType } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TemplateSlot {
  name: string;
  description: string;
  preferredTypes: UnitType[];
  required: boolean;
}

export interface AssemblyTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  slots: TemplateSlot[];
}

// ─── Built-in Templates ──────────────────────────────────────────────────────

export const ASSEMBLY_TEMPLATES: AssemblyTemplate[] = [
  {
    id: "essay",
    name: "Essay",
    description: "Structured argumentative essay with thesis and evidence",
    icon: "📝",
    slots: [
      { name: "Introduction", description: "Hook and context", preferredTypes: ["observation", "claim"], required: true },
      { name: "Thesis", description: "Central argument", preferredTypes: ["claim"], required: true },
      { name: "Evidence 1", description: "First supporting evidence", preferredTypes: ["evidence"], required: true },
      { name: "Evidence 2", description: "Second supporting evidence", preferredTypes: ["evidence"], required: false },
      { name: "Counterargument", description: "Address opposing view", preferredTypes: ["counterargument"], required: false },
      { name: "Conclusion", description: "Summary and implications", preferredTypes: ["claim", "observation"], required: true },
    ],
  },
  {
    id: "report",
    name: "Report",
    description: "Professional report with findings and recommendations",
    icon: "📊",
    slots: [
      { name: "Executive Summary", description: "Key takeaways", preferredTypes: ["claim"], required: true },
      { name: "Background", description: "Context and problem", preferredTypes: ["observation", "definition"], required: true },
      { name: "Findings", description: "Key discoveries", preferredTypes: ["evidence", "observation"], required: true },
      { name: "Recommendations", description: "Action items", preferredTypes: ["action", "claim"], required: true },
      { name: "Conclusion", description: "Final summary", preferredTypes: ["claim"], required: false },
    ],
  },
  {
    id: "decision-brief",
    name: "Decision Brief",
    description: "Structured decision-making document",
    icon: "⚖️",
    slots: [
      { name: "Context", description: "What decision needs to be made", preferredTypes: ["observation", "question"], required: true },
      { name: "Options", description: "Available choices", preferredTypes: ["idea", "claim"], required: true },
      { name: "Pros/Cons", description: "Trade-offs analysis", preferredTypes: ["evidence", "counterargument"], required: true },
      { name: "Recommendation", description: "Recommended course of action", preferredTypes: ["claim", "action"], required: true },
      { name: "Next Steps", description: "Immediate actions", preferredTypes: ["action"], required: false },
    ],
  },
  {
    id: "research-summary",
    name: "Research Summary",
    description: "Academic research summary format",
    icon: "🔬",
    slots: [
      { name: "Abstract", description: "Brief overview", preferredTypes: ["claim", "observation"], required: true },
      { name: "Problem Statement", description: "Research question", preferredTypes: ["question", "claim"], required: true },
      { name: "Methodology", description: "How research was conducted", preferredTypes: ["observation", "definition"], required: false },
      { name: "Findings", description: "What was discovered", preferredTypes: ["evidence", "observation"], required: true },
      { name: "Implications", description: "What it means", preferredTypes: ["claim", "idea"], required: true },
    ],
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

export function getTemplateById(id: string): AssemblyTemplate | undefined {
  return ASSEMBLY_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateSlots(templateId: string): TemplateSlot[] {
  const template = getTemplateById(templateId);
  return template?.slots ?? [];
}

export function getRequiredSlots(templateId: string): TemplateSlot[] {
  return getTemplateSlots(templateId).filter((s) => s.required);
}

export function getSlotsForTemplate(
  templateId: string
): { name: string; position: number }[] {
  const slots = getTemplateSlots(templateId);
  return slots.map((slot, index) => ({
    name: slot.name,
    position: index,
  }));
}
