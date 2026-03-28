/**
 * Prompt Templates — Relation Detection (Passes 5 & 6)
 *
 * Pass 5: Within-input relations (between newly extracted units)
 * Pass 6: Cross-graph relations (between new units and existing graph)
 */

// ─── Pass 5: Within-Input Relations ──────────────────────────────────────

export function buildWithinRelationSystemPrompt(): string {
  return `You are a relation detection engine for FlowMind, a cognitive interface tool.
Your task is to identify meaningful relationships between thought units extracted from the same input.

## Relation Type Taxonomy

| Type | Description | Typical Pattern |
|------|-------------|-----------------|
| supports | Unit A provides evidence/reasoning for Unit B | evidence→claim, warrant→claim |
| contradicts | Unit A opposes or negates Unit B | rebuttal→claim, conflicting claims |
| elaborates | Unit A adds detail or nuance to Unit B | observation→claim, context→claim |
| qualifies | Unit A limits or conditions Unit B | qualifier→claim, assumption→claim |
| exemplifies | Unit A is a specific instance of Unit B | evidence→observation, case→principle |
| generalizes | Unit A is a broader statement that Unit B instances | claim→evidence, principle→case |
| causes | Unit A leads to or produces Unit B | temporal/causal chains |
| enables | Unit A is a prerequisite for Unit B | context→action, definition→claim |
| temporal_sequence | Unit A occurs before Unit B in time | narrative ordering |
| part_of | Unit A is a component of Unit B | detail→larger structure |
| contrasts | Unit A and Unit B differ in a notable way | comparison without opposition |
| reframes | Unit A presents Unit B from a different angle | analogy→claim, new perspective |
| depends_on | Unit A requires Unit B to hold | assumption→conclusion |
| responds_to | Unit A directly addresses Unit B | answer→question, rebuttal→claim |
| analogous_to | Unit A parallels Unit B structurally | analogy pairs |
| derived_from | Unit A is logically derived from Unit B | conclusion→premises |
| refines | Unit A is a more precise version of Unit B | definition→earlier usage |
| subsumes | Unit A encompasses Unit B | general→specific |

## Detection Strategy
1. **Adjacent units**: Check consecutive units for continuation, elaboration, or contrast
2. **Claim-evidence pairs**: Match evidence units to the claims they support
3. **Same-type pairs**: Compare units of the same type for agreement/disagreement
4. **Question-response**: Link questions to their answers
5. **Argument structure**: Identify warrant chains (claim←warrant←backing)

## Confidence Guidelines
- 0.90+: Clear structural signal (e.g., "because" linking evidence to claim)
- 0.70-0.89: Strong semantic connection, minor ambiguity in direction
- 0.50-0.69: Plausible connection, could be coincidental
- Below 0.50: Weak, do not include

## Rules
- Each relation is directional: source → target (source supports/elaborates/etc. target)
- Do not create redundant relations (if A supports B, don't also say B is supported by A)
- Prefer the strongest relation type when multiple could apply
- Maximum 3 relations per unit pair
- Quality over quantity: only include relations you're confident about`;
}

export function buildWithinRelationUserPrompt(
  units: Array<{ index: number; content: string; type: string }>,
): string {
  const unitList = units
    .map((u) => `[Unit ${u.index}] (${u.type}): "${u.content}"`)
    .join("\n");

  return `Detect meaningful relations between these units from the same input:

${unitList}

For each relation found, provide: sourceIndex, targetIndex, type, confidence (0-1), and reasoning.
Only include relations with confidence >= 0.50.
Return valid JSON.`;
}

// ─── Pass 6: Cross-Graph Relations ───────────────────────────────────────

export function buildCrossRelationSystemPrompt(): string {
  return `You are a cross-graph relation detector for FlowMind.
Your task is to find meaningful connections between NEWLY extracted units and EXISTING units in the knowledge graph.

## Context
The user's knowledge graph contains previously processed units. You're given the top-20 most semantically similar existing units for comparison against each new unit.

## Relation Types
Same taxonomy as within-input relations (supports, contradicts, elaborates, qualifies, exemplifies, generalizes, causes, enables, temporal_sequence, part_of, contrasts, reframes, depends_on, responds_to, analogous_to, derived_from, refines, subsumes).

## Stricter Thresholds (Cross-Graph)
Cross-graph relations require higher confidence because:
- Units were written at different times with different contexts
- Superficial keyword overlap doesn't imply real connection
- False positives are more costly (pollute the graph)

Confidence guidelines:
- 0.92+: Very strong, clear semantic and structural connection
- 0.72-0.91: Strong connection, worth suggesting to user
- 0.55-0.71: Possible connection, store but don't surface
- Below 0.55: Do not include

## What Makes a Good Cross-Graph Relation
- Same concept discussed from different angles
- Contradictory claims about the same topic
- Evidence that supports/undermines an existing claim
- A new definition that refines an existing one
- Causal chains that connect across different inputs
- Analogies between different domains

## What to Avoid
- Shallow keyword overlap (both mention "data" but in different contexts)
- Generic topical similarity (both about "AI" but unrelated claims)
- Temporal co-occurrence without causal or logical connection`;
}

export function buildCrossRelationUserPrompt(
  newUnits: Array<{ index: number; content: string; type: string }>,
  existingUnits: Array<{ id: string; content: string; type: string }>,
): string {
  const newList = newUnits
    .map((u) => `[New Unit ${u.index}] (${u.type}): "${u.content}"`)
    .join("\n");

  const existingList = existingUnits
    .map((u) => `[Existing ${u.id}] (${u.type}): "${u.content}"`)
    .join("\n");

  return `## New Units (just extracted)
${newList}

## Existing Units (from knowledge graph, top-20 similar)
${existingList}

Find meaningful cross-graph relations between new and existing units.
For each relation: unitIndex (new unit), existingUnitId, type, confidence (0-1), reasoning.
Only include relations with confidence >= 0.55. Be strict.
Return valid JSON.`;
}

// ─── Structured Output Schemas ───────────────────────────────────────────

export const WITHIN_RELATION_SCHEMA = {
  name: "within_relation_detection",
  description: "Detect relations between units extracted from the same input text.",
  properties: {
    relations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceIndex: { type: "number", description: "Index of the source unit" },
          targetIndex: { type: "number", description: "Index of the target unit" },
          type: {
            type: "string",
            enum: [
              "supports", "contradicts", "elaborates", "qualifies",
              "exemplifies", "generalizes", "causes", "enables",
              "temporal_sequence", "part_of", "contrasts", "reframes",
              "depends_on", "responds_to", "analogous_to", "derived_from",
              "refines", "subsumes",
            ],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" },
        },
        required: ["sourceIndex", "targetIndex", "type", "confidence", "reasoning"],
      },
    },
  },
  required: ["relations"],
};

export const CROSS_RELATION_SCHEMA = {
  name: "cross_relation_detection",
  description: "Detect relations between newly extracted units and existing units in the knowledge graph.",
  properties: {
    relations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          unitIndex: { type: "number", description: "Index of the new unit" },
          existingUnitId: { type: "string", description: "ID of the existing unit" },
          type: {
            type: "string",
            enum: [
              "supports", "contradicts", "elaborates", "qualifies",
              "exemplifies", "generalizes", "causes", "enables",
              "temporal_sequence", "part_of", "contrasts", "reframes",
              "depends_on", "responds_to", "analogous_to", "derived_from",
              "refines", "subsumes",
            ],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" },
        },
        required: ["unitIndex", "existingUnitId", "type", "confidence", "reasoning"],
      },
    },
  },
  required: ["relations"],
};
