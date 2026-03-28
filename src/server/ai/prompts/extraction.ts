/**
 * Prompt Templates — Unit Extraction (Pass 2)
 *
 * Instructs the AI to segment input text into atomic thought units,
 * respecting genre-aware density and the atomicity rule.
 */

import type { GenreDensity } from "../types";

export function buildExtractionSystemPrompt(
  genre: string,
  density: GenreDensity,
): string {
  return `You are an expert text analyst for a knowledge management system called FlowMind.
Your task is to decompose input text into atomic "thought units" — the smallest meaningful fragments of thought.

## Atomicity Rule
Each unit MUST contain exactly ONE of:
- A single claim or assertion
- A single piece of evidence or data point
- A single observation or insight
- A single question
- A single definition
- A single decision or action item
- A single analogy or comparison

If a sentence contains multiple claims, split them into separate units.
If a claim and its evidence are tightly bound in one sentence, they can remain together only if splitting would lose essential meaning.

## Genre: ${genre} (Density: ${density})
${getDensityInstruction(density)}

## Unit Type Taxonomy
Classify each unit as one of:
- **claim**: An assertion or proposition that can be true or false
- **evidence**: Data, facts, citations, or observations supporting/opposing a claim
- **warrant**: Reasoning that connects evidence to a claim
- **backing**: Support for a warrant (meta-reasoning)
- **qualifier**: Conditions, limitations, or scope restrictions
- **rebuttal**: Counter-arguments or opposing viewpoints
- **observation**: A noted pattern, phenomenon, or personal insight
- **context**: Background information needed to understand other units
- **definition**: Explicit definition of a term or concept
- **question**: An explicit question or inquiry
- **analogy**: A comparison or metaphorical connection
- **decision**: A concluded choice or action commitment
- **idea**: A speculative or generative thought
- **assumption**: An unstated premise being made explicit
- **action**: A specific task or step to be taken
- **counterargument**: An argument opposing a previous claim

## Output Format
Return a JSON object with:
- "units": array of extracted units, each with:
  - "content": the normalized text of the unit
  - "type": the unit type from the taxonomy above
  - "confidence": 0.0-1.0 how confident you are in this extraction
  - "secondaryType": optional secondary type if the unit spans categories
  - "reasoning": brief explanation of why this boundary was chosen
- "genre": the detected genre (confirm or override the provided genre)

## Guidelines
- Preserve the original meaning — do not paraphrase or summarize
- Maintain the author's voice and terminology
- Mark confidence below 0.80 for any unit where the boundary is uncertain
- Do not extract trivial connective tissue (e.g., "As mentioned above...")
- Do extract transition sentences that carry substantive claims
- For lists, each item is typically a separate unit
- Code snippets should remain as single units unless they contain distinct logical steps`;
}

function getDensityInstruction(density: GenreDensity): string {
  switch (density) {
    case "high":
      return `HIGH density mode: Extract aggressively. Scientific, legal, and technical texts often pack multiple claims per sentence. Split compound sentences. Each data point, each qualifier, each condition is its own unit. Target ~5 units per 1000 characters.`;
    case "medium":
      return `MEDIUM density mode: Balance between granularity and readability. Split multi-claim sentences but keep tightly-bound claim-evidence pairs together. Target ~3 units per 1000 characters.`;
    case "low":
      return `LOW density mode: Preserve narrative flow. Only split at clear topic shifts, explicit claims, or distinct observations. Narrative passages and journal entries should keep their coherence. Target ~1.5 units per 1000 characters.`;
  }
}

export function buildExtractionUserPrompt(normalizedText: string): string {
  return `Extract atomic thought units from the following text:

---
${normalizedText}
---

Remember: one claim/observation/evidence per unit. Return valid JSON.`;
}

// ─── Structured Output Schema ────────────────────────────────────────────

export const EXTRACTION_SCHEMA = {
  name: "unit_extraction",
  description: "Extract atomic thought units from input text with type classification and confidence scores.",
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string", description: "The normalized text of the unit" },
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
          reasoning: { type: "string" },
        },
        required: ["content", "type", "confidence"],
      },
    },
    genre: { type: "string" },
  },
  required: ["units", "genre"],
};
