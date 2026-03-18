"use client";

import * as React from "react";
import type { UnitType } from "@prisma/client";
import { UnitCard, type UnitCardUnit } from "~/components/unit/unit-card";
import { UnitCardSkeleton } from "~/components/unit/unit-card-skeleton";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import { LifecycleIndicator, type LifecycleState } from "~/components/unit/lifecycle-indicator";
import { BASE_UNIT_TYPE_IDS } from "~/lib/unit-types";

// ─── Mock Data ───────────────────────────────────────────────────────

function makeMockUnit(overrides: Partial<UnitCardUnit> & { unitType: UnitType }): UnitCardUnit {
  return {
    id: crypto.randomUUID(),
    content:
      "The relationship between working memory capacity and fluid intelligence suggests that individual differences in attention control may be the primary mediating factor.",
    lifecycle: "confirmed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    branchPotential: 0.6,
    relationCount: 3,
    originType: "direct_write",
    contexts: ["Research"],
    ...overrides,
  };
}

const SAMPLE_UNITS: UnitCardUnit[] = [
  makeMockUnit({
    unitType: "claim",
    content: "Working memory capacity is the primary bottleneck in complex reasoning tasks.",
    branchPotential: 0.75,
    relationCount: 5,
    contexts: ["Cognition", "Research"],
  }),
  makeMockUnit({
    unitType: "question",
    content: "How does sleep quality affect the consolidation of procedural vs declarative memories?",
    lifecycle: "pending",
    branchPotential: 0.5,
    relationCount: 2,
  }),
  makeMockUnit({
    unitType: "evidence",
    content:
      "A 2023 meta-analysis of 47 studies (N=12,400) found a correlation of r=0.42 between attention control measures and fluid intelligence scores (p < .001).",
    branchPotential: 0.25,
    relationCount: 8,
    originType: "imported",
    sourceSpan: "Smith et al., 2023, Table 3",
  }),
  makeMockUnit({
    unitType: "counterargument",
    content:
      "The correlation may be an artifact of shared method variance, since both constructs are typically measured with similar computerized tasks.",
    lifecycle: "draft",
    branchPotential: 0.9,
    relationCount: 1,
  }),
  makeMockUnit({
    unitType: "observation",
    content: "Participants in the control group showed unexpectedly high variance in reaction times during the second testing session.",
    branchPotential: 0.4,
  }),
  makeMockUnit({
    unitType: "idea",
    content: "What if we used a dual-task paradigm to disentangle attention control from raw storage capacity?",
    lifecycle: "draft",
    branchPotential: 1.0,
    relationCount: 0,
  }),
  makeMockUnit({
    unitType: "definition",
    content: "Fluid intelligence (Gf): the capacity to reason and solve novel problems independent of previously acquired knowledge.",
    branchPotential: 0.1,
    relationCount: 4,
  }),
  makeMockUnit({
    unitType: "assumption",
    content: "We assume that the testing environment did not introduce systematic measurement bias across groups.",
    lifecycle: "pending",
    branchPotential: 0.3,
    relationCount: 2,
  }),
  makeMockUnit({
    unitType: "action",
    content: "Schedule follow-up session with Dr. Kim to review the updated analysis pipeline before Friday.",
    lifecycle: "confirmed",
    branchPotential: 0.0,
    relationCount: 1,
    contexts: ["Admin"],
  }),
];

const LIFECYCLE_STATES: LifecycleState[] = ["draft", "pending", "confirmed", "deferred", "complete"];

// ─── Showcase ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-bg-primary p-6 shadow-resting">
      <h2 className="mb-4 text-lg font-semibold text-text-primary tracking-heading-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function UnitsShowcasePage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  return (
    <div className="min-h-screen bg-bg-surface p-8">
      <div className="mx-auto max-w-content space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-heading-tight">
            UnitCard Components
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Story 2.3 — UnitCard with three variants, lifecycle states, and sub-components.
          </p>
        </div>

        {/* 1. Unit Type Badges */}
        <Section title="Unit Type Badges">
          <div className="flex flex-wrap gap-2">
            {BASE_UNIT_TYPE_IDS.map((type) => (
              <UnitTypeBadge key={type} unitType={type} />
            ))}
          </div>
        </Section>

        {/* 2. Lifecycle Indicators */}
        <Section title="Lifecycle Indicators">
          <div className="flex flex-wrap gap-4">
            {LIFECYCLE_STATES.map((state) => (
              <LifecycleIndicator key={state} lifecycle={state} />
            ))}
          </div>
        </Section>

        {/* 3. Skeleton Loading States */}
        <Section title="Skeleton Loading States">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-medium text-text-tertiary uppercase">Compact</p>
              <UnitCardSkeleton variant="compact" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-text-tertiary uppercase">Standard</p>
              <UnitCardSkeleton variant="standard" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-text-tertiary uppercase">Expanded</p>
              <UnitCardSkeleton variant="expanded" />
            </div>
          </div>
        </Section>

        {/* 4. Compact Variant */}
        <Section title="Compact Variant">
          <div className="space-y-2">
            {SAMPLE_UNITS.slice(0, 4).map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                variant="compact"
                selected={selectedId === unit.id}
                onClick={(u) => setSelectedId(u.id === selectedId ? null : u.id)}
              />
            ))}
          </div>
        </Section>

        {/* 5. Standard Variant — all 9 types */}
        <Section title="Standard Variant (All 9 Types)">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_UNITS.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                variant="standard"
                selected={selectedId === unit.id}
                onClick={(u) => setSelectedId(u.id === selectedId ? null : u.id)}
              />
            ))}
          </div>
        </Section>

        {/* 6. Expanded Variant */}
        <Section title="Expanded Variant">
          <div className="space-y-4 max-w-reading">
            {SAMPLE_UNITS.slice(0, 3).map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                variant="expanded"
                selected={selectedId === unit.id}
                onClick={(u) => setSelectedId(u.id === selectedId ? null : u.id)}
              />
            ))}
          </div>
        </Section>

        {/* 7. Lifecycle Visual States */}
        <Section title="Lifecycle Visual States">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(["draft", "pending", "confirmed"] as const).map((lifecycle) => (
              <div key={lifecycle}>
                <p className="mb-2 text-xs font-medium text-text-tertiary uppercase">{lifecycle}</p>
                <UnitCard
                  unit={makeMockUnit({
                    unitType: "claim",
                    lifecycle,
                    content: `This card demonstrates the ${lifecycle} lifecycle state with its visual treatment.`,
                  })}
                  variant="standard"
                />
              </div>
            ))}
          </div>
        </Section>

        {/* 8. Selected State */}
        <Section title="Selected State">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-text-tertiary uppercase">Default</p>
              <UnitCard unit={SAMPLE_UNITS[0]!} variant="standard" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-text-tertiary uppercase">Selected</p>
              <UnitCard unit={SAMPLE_UNITS[0]!} variant="standard" selected />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
