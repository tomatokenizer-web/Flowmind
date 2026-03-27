"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

type AIIntensityLevel = "minimal" | "balanced" | "proactive";

const INTENSITY_VALUES: Record<AIIntensityLevel, number> = {
  minimal: 0,
  balanced: 50,
  proactive: 100,
};

function intensityLevelFromNumber(value: number): AIIntensityLevel {
  if (value <= 33) return "minimal";
  if (value <= 66) return "balanced";
  return "proactive";
}

export function AIPreferencesPanel() {
  const { data: prefs } = api.user.getAIPreferences.useQuery();
  const utils = api.useUtils();

  const [intensityLevel, setIntensityLevel] = React.useState<AIIntensityLevel>("balanced");
  const [model, setModel] = React.useState<"depth" | "speed" | "balanced">("balanced");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (prefs) {
      setIntensityLevel(intensityLevelFromNumber(prefs.interventionIntensity ?? 50));
      setModel((prefs.modelPreference ?? "balanced") as "depth" | "speed" | "balanced");
    }
  }, [prefs]);

  const updateMutation = api.user.updateAIPreferences.useMutation({
    onSuccess: () => {
      void utils.user.getAIPreferences.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      interventionIntensity: INTENSITY_VALUES[intensityLevel],
      modelPreference: model,
    });
  };

  const intensityOptions: {
    id: AIIntensityLevel;
    label: string;
    desc: string;
  }[] = [
    {
      id: "minimal",
      label: "Minimal",
      desc: "AI only responds when you explicitly ask",
    },
    {
      id: "balanced",
      label: "Balanced",
      desc: "AI suggests type and relations on new units (default)",
    },
    {
      id: "proactive",
      label: "Proactive",
      desc: "AI auto-suggests refinements, flags contradictions, shows branch potential",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          AI Preferences
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Configure how AI assists your thinking process.
        </p>
      </div>

      {/* Intervention intensity */}
      <div className="rounded-xl border border-border p-4">
        <p className="mb-1 text-sm font-medium text-text-primary">
          AI Intervention Intensity
        </p>
        <p className="mb-4 text-xs text-text-tertiary">
          How proactively the AI suggests connections, improvements, and
          insights.
        </p>
        <div className="space-y-2">
          {intensityOptions.map((opt) => (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                intensityLevel === opt.id
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border hover:bg-bg-hover",
              )}
            >
              <input
                type="radio"
                name="ai-intensity-level"
                value={opt.id}
                checked={intensityLevel === opt.id}
                onChange={() => setIntensityLevel(opt.id)}
                className="accent-accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {opt.label}
                </p>
                <p className="text-xs text-text-tertiary">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Model preference */}
      <div className="rounded-xl border border-border p-4">
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Model Preference
        </label>
        <p className="mb-3 text-xs text-text-tertiary">
          Choose the AI behavior profile that best matches your workflow.
        </p>
        <div className="space-y-2">
          {[
            {
              id: "speed",
              label: "Speed",
              desc: "Faster responses, lighter analysis",
            },
            {
              id: "balanced",
              label: "Balanced",
              desc: "Good mix of speed and depth",
            },
            {
              id: "depth",
              label: "Depth",
              desc: "Thorough analysis, deeper connections",
            },
          ].map((opt) => (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                model === opt.id
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border hover:bg-bg-hover",
              )}
            >
              <input
                type="radio"
                name="model-preference"
                value={opt.id}
                checked={model === opt.id}
                onChange={(e) => setModel(e.target.value as "depth" | "speed" | "balanced")}
                className="accent-accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {opt.label}
                </p>
                <p className="text-xs text-text-tertiary">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending || saved}
        className="w-full"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Preferences Saved
          </>
        ) : updateMutation.isPending ? (
          "Saving..."
        ) : (
          "Save AI Preferences"
        )}
      </Button>
    </div>
  );
}
