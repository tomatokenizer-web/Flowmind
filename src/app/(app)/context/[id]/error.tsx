"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function ContextDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ContextDetailError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full border border-border bg-bg-secondary p-4">
          <AlertTriangle
            className="h-10 w-10 text-accent-warning"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">
            Context failed to load
          </h2>
          <p className="max-w-md text-sm text-text-secondary">
            An unexpected error occurred while loading this context. The content
            may have been moved or deleted, or there may be a temporary issue.
          </p>
        </div>
      </div>

      {process.env.NODE_ENV === "development" && error.message && (
        <pre className="max-w-lg overflow-auto rounded-lg border border-border bg-bg-secondary p-4 text-left text-xs text-text-secondary">
          {error.message}
        </pre>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={reset} className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </Button>
      </div>
    </div>
  );
}
