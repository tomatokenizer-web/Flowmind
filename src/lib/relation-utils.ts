// ── Relation category utilities ──────────────────────────────────────────
// Shared between LocalCardArray, ThreadView, and any future graph components.

export const CATEGORY_COLORS: Record<string, string> = {
  argument: "#3B82F6",               // blue-500
  creative_research: "#8B5CF6",      // violet-500
  structure_containment: "#6B7280",  // gray-500
};

export function getRelationCategory(type: string): string {
  const argumentTypes = [
    "supports", "contradicts", "derives_from", "expands",
    "references", "exemplifies", "defines", "questions",
  ];
  const creativeTypes = [
    "inspires", "echoes", "transforms_into", "foreshadows",
    "parallels", "contextualizes", "operationalizes",
  ];
  if (argumentTypes.includes(type)) return "argument";
  if (creativeTypes.includes(type)) return "creative_research";
  return "structure_containment";
}
