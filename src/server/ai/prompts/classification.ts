/**
 * Prompt Templates — Unit Type Classification (Pass 3)
 *
 * Refines the initial type assignment from Pass 2 with deeper analysis.
 * Supports domain-template overrides and secondary type detection.
 */

export function buildClassificationSystemPrompt(
  domainTemplate?: string,
): string {
  const domainSection = domainTemplate
    ? `\n## Active Domain Template: ${domainTemplate}
When the domain template defines specialized types, prefer them over base types
if your confidence in the domain-specific classification is >= 0.75.
Domain-specific types take priority in their area of expertise.`
    : "";

  return `You are a thought-unit classifier for FlowMind, a cognitive interface tool.
You receive pre-extracted text units and must assign precise type classifications.

## Unit Type Taxonomy (Base Types)

| Type | Description | Key Signals |
|------|-------------|-------------|
| claim | Assertion that can be true/false | Declarative sentences, "is", "should", "must" |
| evidence | Data, facts, citations | Numbers, studies, quotes, "according to" |
| warrant | Reasoning connecting evidence to claim | "because", "since", "this means" |
| backing | Support for a warrant | Meta-reasoning, methodology justification |
| qualifier | Conditions, limitations, scope | "unless", "except", "in most cases" |
| rebuttal | Counter-arguments | "however", "critics argue", "on the other hand" |
| observation | Noted pattern or insight | "I notice", "interestingly", "it appears" |
| context | Background information | Scene-setting, prerequisite knowledge |
| definition | Explicit definition | "X is defined as", "X refers to" |
| question | Explicit inquiry | Interrogative sentences, "how", "why", "what" |
| analogy | Comparison or metaphor | "like", "similar to", "just as" |
| decision | Concluded choice | "we decided", "the choice is", "going with" |
| idea | Speculative thought | "what if", "imagine", "could we" |
| assumption | Unstated premise made explicit | "assuming", "given that", "if we take" |
| action | Specific task or step | "do X", "implement", "create", imperative |
| counterargument | Opposing argument | "against this", "the problem with" |

## Multi-Type Units
Some units genuinely span two types. If so, assign a primary type (strongest signal)
and a secondary type. The secondary confidence should be lower than the primary.

## Confidence Scoring
- 0.90-1.00: Very clear type signal, unambiguous
- 0.75-0.89: Clear with minor ambiguity
- 0.60-0.74: Moderate ambiguity, needs user confirmation
- Below 0.60: Highly ambiguous, likely needs review
${domainSection}

## Output Format
Return classifications for each unit by index, with type, confidence, optional secondary type, and reasoning.`;
}

export function buildClassificationUserPrompt(
  units: Array<{ index: number; content: string; currentType: string }>,
): string {
  const unitList = units
    .map(
      (u) =>
        `[Unit ${u.index}] (current: ${u.currentType})\n"${u.content}"`,
    )
    .join("\n\n");

  return `Classify the following thought units. Confirm or correct their types:

${unitList}

For each unit, provide: type, confidence (0-1), optional secondaryType with secondaryConfidence, and brief reasoning.
Return valid JSON.`;
}

// ─── Structured Output Schema ────────────────────────────────────────────

export const CLASSIFICATION_SCHEMA = {
  name: "unit_classification",
  description:
    "Classify thought units into types with confidence scores and optional secondary types.",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          unitIndex: { type: "number", description: "Index of the unit being classified" },
          type: {
            type: "string",
            enum: [
              "claim", "evidence", "warrant", "backing", "qualifier",
              "rebuttal", "observation", "context", "definition",
              "question", "analogy", "decision", "idea", "assumption",
              "action", "counterargument",
            ],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          secondaryType: {
            type: "string",
            enum: [
              "claim", "evidence", "warrant", "backing", "qualifier",
              "rebuttal", "observation", "context", "definition",
              "question", "analogy", "decision", "idea", "assumption",
              "action", "counterargument",
            ],
          },
          secondaryConfidence: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" },
        },
        required: ["unitIndex", "type", "confidence", "reasoning"],
      },
    },
  },
  required: ["classifications"],
};
