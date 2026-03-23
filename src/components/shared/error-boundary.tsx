"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────

interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback UI to render when an error occurs */
  fallback?: React.ReactNode;
  /** Callback invoked when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Additional className for the default fallback container */
  className?: string;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Error Boundary (class component required by React) ─────────────

export class ComponentErrorBoundary extends React.Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[ComponentErrorBoundary]", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

// ─── Default Fallback ───────────────────────────────────────────────

interface DefaultErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  className?: string;
}

function DefaultErrorFallback({
  error,
  onRetry,
  className,
}: DefaultErrorFallbackProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-bg-secondary p-6 text-center",
        className,
      )}
      role="alert"
    >
      <AlertTriangle
        className="h-8 w-8 text-accent-warning"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-text-primary">
          Something went wrong
        </p>
        <p className="text-xs text-text-tertiary">
          This section encountered an unexpected error.
        </p>
      </div>
      {process.env.NODE_ENV === "development" && error && (
        <pre className="max-w-full overflow-auto rounded bg-bg-primary p-2 text-left text-xs text-text-secondary">
          {error.message}
        </pre>
      )}
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}
