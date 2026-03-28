"use client";

import * as React from "react";
import {
  Sun,
  Moon,
  Laptop,
  TreePine,
  Upload,
  Download,
  User,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useThemeStore } from "@/stores/theme-store";
import type { Theme, ExpertiseLevel } from "@/stores/theme-store";
import { Button } from "~/components/ui/button";
import { DomainTemplatePicker } from "~/components/domain/onboarding";
import { ExportDialog } from "~/components/domain/import-export";
import { ImportDialog } from "~/components/domain/import-export";

/* ─── Theme options ─── */

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "natural-dark", label: "Natural Dark", icon: TreePine },
  { value: "system", label: "System", icon: Laptop },
];

const EXPERTISE_OPTIONS: {
  value: ExpertiseLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "novice",
    label: "Novice",
    description: "Full guidance with tooltips and explanations",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Key features highlighted, less hand-holding",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Minimal UI, maximum power and keyboard shortcuts",
  },
];

/* ─── Component ─── */

export default function SettingsPage() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const expertiseLevel = useThemeStore((s) => s.expertiseLevel);
  const setExpertiseLevel = useThemeStore((s) => s.setExpertiseLevel);

  const [selectedTemplate, setSelectedTemplate] = React.useState("general");
  const [exportOpen, setExportOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-heading-tight">
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Customize your FlowMind experience.
        </p>
      </div>

      {/* ── Theme ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Theme</h2>
          <p className="text-sm text-text-secondary">
            Choose how FlowMind looks.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-card border p-4 transition-all duration-fast",
                theme === opt.value
                  ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary"
                  : "border-border bg-bg-surface hover:bg-bg-hover",
              )}
            >
              <opt.icon
                className={cn(
                  "h-5 w-5",
                  theme === opt.value ? "text-accent-primary" : "text-text-tertiary",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  theme === opt.value ? "text-accent-primary" : "text-text-secondary",
                )}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Expertise Level ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Expertise Level
          </h2>
          <p className="text-sm text-text-secondary">
            Controls how much guidance FlowMind provides.
          </p>
        </div>
        <div className="space-y-2">
          {EXPERTISE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setExpertiseLevel(opt.value)}
              className={cn(
                "w-full flex items-center justify-between rounded-card border px-4 py-3 text-left transition-all duration-fast",
                expertiseLevel === opt.value
                  ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary"
                  : "border-border bg-bg-surface hover:bg-bg-hover",
              )}
            >
              <div>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    expertiseLevel === opt.value
                      ? "text-accent-primary"
                      : "text-text-primary",
                  )}
                >
                  {opt.label}
                </span>
                <p className="text-xs text-text-secondary mt-0.5">
                  {opt.description}
                </p>
              </div>
              {expertiseLevel === opt.value && (
                <div className="h-2 w-2 rounded-full bg-accent-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Domain Template ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Domain Template
          </h2>
          <p className="text-sm text-text-secondary">
            Set default unit types and structure for new projects.
          </p>
        </div>
        <DomainTemplatePicker
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
        />
      </section>

      {/* ── Import / Export ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Import / Export
          </h2>
          <p className="text-sm text-text-secondary">
            Move your data in and out of FlowMind.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setImportOpen(true)}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="secondary"
            onClick={() => setExportOpen(true)}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
        <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      </section>

      {/* ── Account (placeholder) ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Account</h2>
          <p className="text-sm text-text-secondary">
            Manage your account settings.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-card border border-border bg-bg-surface p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary">
            <User className="h-5 w-5 text-text-tertiary" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              Account settings
            </p>
            <p className="text-xs text-text-tertiary">
              Profile, billing, and preferences will be available here.
            </p>
          </div>
          <Button variant="ghost" size="sm" disabled>
            Coming soon
          </Button>
        </div>
      </section>
    </div>
  );
}
