"use client";

import * as React from "react";
import { NavigatorPanel } from "./NavigatorPanel";

interface NavigateViewProps {
  projectId: string;
}

export function NavigateView({ projectId }: NavigateViewProps) {
  return (
    <section aria-label="Navigate view" className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <NavigatorPanel projectId={projectId} />
      </div>
    </section>
  );
}
