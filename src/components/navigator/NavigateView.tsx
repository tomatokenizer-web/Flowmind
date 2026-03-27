"use client";

import * as React from "react";
import { NavigatorPanel } from "./NavigatorPanel";

interface NavigateViewProps {
  projectId: string;
  contextId: string;
}

export function NavigateView({ projectId, contextId }: NavigateViewProps) {
  return (
    <section aria-label="Navigate view" className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <NavigatorPanel contextId={contextId} projectId={projectId} />
      </div>
    </section>
  );
}
