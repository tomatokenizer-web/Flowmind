"use client";

import * as React from "react";
import type {
  UnitType,
  Certainty,
  Completeness,
  EvidenceDomain,
  Scope,
  Stance,
} from "@prisma/client";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export interface MetadataValues {
  unitType: UnitType;
  certainty: Certainty | null;
  completeness: Completeness | null;
  evidenceDomain: EvidenceDomain | null;
  scope: Scope | null;
  stance: Stance | null;
}

export interface MetadataEditorProps {
  values: MetadataValues;
  onChange: (field: keyof MetadataValues, value: string | null) => void;
  disabled?: boolean;
  className?: string;
}

// ─── Option configs ──────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
}

const UNIT_TYPE_OPTIONS: SelectOption[] = [
  { value: "claim", label: "Claim" },
  { value: "question", label: "Question" },
  { value: "evidence", label: "Evidence" },
  { value: "counterargument", label: "Counterargument" },
  { value: "observation", label: "Observation" },
  { value: "idea", label: "Idea" },
  { value: "definition", label: "Definition" },
  { value: "assumption", label: "Assumption" },
  { value: "action", label: "Action" },
];

const CERTAINTY_OPTIONS: SelectOption[] = [
  { value: "certain", label: "Certain" },
  { value: "probable", label: "Probable" },
  { value: "hypothesis", label: "Hypothesis" },
  { value: "uncertain", label: "Uncertain" },
];

const COMPLETENESS_OPTIONS: SelectOption[] = [
  { value: "complete", label: "Complete" },
  { value: "needs_evidence", label: "Needs Evidence" },
  { value: "unaddressed_counterarg", label: "Unaddressed Counter" },
  { value: "exploring", label: "Exploring" },
  { value: "fragment", label: "Fragment" },
];

const EVIDENCE_DOMAIN_OPTIONS: SelectOption[] = [
  { value: "external_public", label: "External Public" },
  { value: "external_private", label: "External Private" },
  { value: "personal_event", label: "Personal Event" },
  { value: "personal_belief", label: "Personal Belief" },
  { value: "personal_intuition", label: "Personal Intuition" },
  { value: "reasoned_inference", label: "Reasoned Inference" },
];

const SCOPE_OPTIONS: SelectOption[] = [
  { value: "universal", label: "Universal" },
  { value: "domain_general", label: "Domain General" },
  { value: "domain_specific", label: "Domain Specific" },
  { value: "situational", label: "Situational" },
  { value: "interpersonal", label: "Interpersonal" },
  { value: "personal", label: "Personal" },
];

const STANCE_OPTIONS: SelectOption[] = [
  { value: "support", label: "Support" },
  { value: "oppose", label: "Oppose" },
  { value: "neutral", label: "Neutral" },
  { value: "exploring", label: "Exploring" },
];

// ─── MetadataField ───────────────────────────────────────────────────

function MetadataField({
  label,
  field,
  value,
  options,
  nullable,
  onChange,
  disabled,
}: {
  label: string;
  field: keyof MetadataValues;
  value: string | null;
  options: SelectOption[];
  nullable?: boolean;
  onChange: (field: keyof MetadataValues, value: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor={`metadata-${field}`}
        className="text-xs font-medium text-text-secondary shrink-0"
      >
        {label}
      </label>
      <select
        id={`metadata-${field}`}
        value={value ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          onChange(field, val === "" ? null : val);
        }}
        disabled={disabled}
        className={cn(
          "h-7 rounded-md border border-border bg-bg-primary px-2",
          "text-xs text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "max-w-[160px]",
        )}
      >
        {nullable && <option value="">—</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── MetadataEditor ──────────────────────────────────────────────────

export function MetadataEditor({
  values,
  onChange,
  disabled,
  className,
}: MetadataEditorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <MetadataField
        label="Type"
        field="unitType"
        value={values.unitType}
        options={UNIT_TYPE_OPTIONS}
        onChange={onChange}
        disabled={disabled}
      />
      <MetadataField
        label="Certainty"
        field="certainty"
        value={values.certainty}
        options={CERTAINTY_OPTIONS}
        nullable
        onChange={onChange}
        disabled={disabled}
      />
      <MetadataField
        label="Completeness"
        field="completeness"
        value={values.completeness}
        options={COMPLETENESS_OPTIONS}
        nullable
        onChange={onChange}
        disabled={disabled}
      />
      <MetadataField
        label="Evidence Domain"
        field="evidenceDomain"
        value={values.evidenceDomain}
        options={EVIDENCE_DOMAIN_OPTIONS}
        nullable
        onChange={onChange}
        disabled={disabled}
      />
      <MetadataField
        label="Scope"
        field="scope"
        value={values.scope}
        options={SCOPE_OPTIONS}
        nullable
        onChange={onChange}
        disabled={disabled}
      />
      <MetadataField
        label="Stance"
        field="stance"
        value={values.stance}
        options={STANCE_OPTIONS}
        nullable
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
