/**
 * Prompt Templates — Context Assignment (Pass 4)
 *
 * Instructs the AI to assign extracted units to existing contexts
 * or suggest new contexts when units don't fit.
 */

import type { ExistingContext } from "../types";

export function buildContextAssignmentSystemPrompt(): string {
  return `You are a context assignment engine for FlowMind, a cognitive interface tool.
Your task is to determine which "context" (exploration workspace) each thought unit belongs to.

## What is a Context?
A context is a thematic workspace where related units are gathered for exploration.
Examples: "Climate Change Policy", "Machine Learning Basics", "Q3 Marketing Strategy".

## Assignment Rules
1. **High relevance (>= 0.80)**: The unit clearly belongs to this context. Auto-assign.
2. **Medium relevance (0.50-0.79)**: The unit may belong. Suggest for user confirmation.
3. **Low relevance (< 0.50)**: The unit doesn't fit well. Send to inbox.

## New Context Detection
If 3 or more units have low relevance to ALL existing contexts but share a common theme:
- Suggest a NEW context with a descriptive name
- Explain what unifying theme you detected
- List the unit indices that would belong

## Guidelines
- Consider semantic overlap between unit content and context name/description
- A unit about methodology may fit a research context even if the topic keywords differ
- Definitions and background context units often fit multiple contexts — assign to the most specific one
- Questions naturally belong to the context they're investigating
- Evidence units belong to the context of the claim they support

## Output Format
Return assignments for each unit and optional new context suggestions.`;
}

export function buildContextAssignmentUserPrompt(
  units: Array<{ index: number; content: string; type: string }>,
  contexts: ExistingContext[],
): string {
  const contextList =
    contexts.length > 0
      ? contexts
          .map(
            (c) =>
              `- ID: ${c.id} | Name: "${c.name}"${c.description ? ` | Description: ${c.description}` : ""}${c.snapshot ? ` | Snapshot: ${c.snapshot.slice(0, 200)}` : ""}`,
          )
          .join("\n")
      : "No existing contexts. Suggest new context(s) for all units.";

  const unitList = units
    .map((u) => `[Unit ${u.index}] (${u.type}): "${u.content}"`)
    .join("\n");

  return `## Available Contexts
${contextList}

## Units to Assign
${unitList}

For each unit, provide the best matching contextId (or "inbox" if none fit) and a relevance score (0-1).
If multiple units share a theme not covered by existing contexts, suggest a new context.
Return valid JSON.`;
}

// ─── Structured Output Schema ────────────────────────────────────────────

export const CONTEXT_ASSIGNMENT_SCHEMA = {
  name: "context_assignment",
  description:
    "Assign thought units to existing contexts or suggest new ones based on thematic relevance.",
  properties: {
    assignments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          unitIndex: { type: "number", description: "Index of the unit" },
          contextId: {
            type: "string",
            description: "ID of the assigned context, or 'inbox' if none fit",
          },
          relevance: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "How well the unit fits this context",
          },
          reasoning: { type: "string" },
        },
        required: ["unitIndex", "contextId", "relevance"],
      },
    },
    newContextSuggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Suggested context name" },
          description: {
            type: "string",
            description: "Brief description of the context theme",
          },
          unitIndices: {
            type: "array",
            items: { type: "number" },
            description: "Indices of units that would belong",
          },
        },
        required: ["name", "description", "unitIndices"],
      },
    },
  },
  required: ["assignments"],
};
