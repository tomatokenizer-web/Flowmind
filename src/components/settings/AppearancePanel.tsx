"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "~/lib/utils";

export function AppearancePanel() {
  const [theme, setThemeState] = React.useState<"light" | "natural-dark">("light");

  React.useEffect(() => {
    void import("~/lib/theme").then(({ getTheme }) => {
      setThemeState(getTheme());
    });
  }, []);

  const handleThemeChange = async (mode: "light" | "natural-dark") => {
    const { setTheme } = await import("~/lib/theme");
    setTheme(mode);
    setThemeState(mode);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Choose your preferred visual theme.
        </p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <label className="mb-3 block text-sm font-medium text-text-primary">
          Theme
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleThemeChange("light")}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border p-4 transition-colors",
              theme === "light"
                ? "border-accent-primary bg-accent-primary/5"
                : "border-border hover:bg-bg-hover",
            )}
          >
            <div className="flex h-16 w-full items-center justify-center rounded-lg bg-white border border-gray-200">
              <Sun className="h-6 w-6 text-amber-500" />
            </div>
            <span className="text-sm font-medium text-text-primary">Light</span>
            <span className="text-xs text-text-tertiary">Clean and bright</span>
          </button>
          <button
            type="button"
            onClick={() => void handleThemeChange("natural-dark")}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border p-4 transition-colors",
              theme === "natural-dark"
                ? "border-accent-primary bg-accent-primary/5"
                : "border-border hover:bg-bg-hover",
            )}
          >
            <div className="flex h-16 w-full items-center justify-center rounded-lg bg-[#1a1a17] border border-[#3d3d38]">
              <Moon className="h-6 w-6 text-[#c9a96e]" />
            </div>
            <span className="text-sm font-medium text-text-primary">Natural</span>
            <span className="text-xs text-text-tertiary">Warm earthy tones</span>
          </button>
        </div>
      </div>
    </div>
  );
}
