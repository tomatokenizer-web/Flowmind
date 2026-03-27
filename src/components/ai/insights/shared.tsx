"use client";

import * as React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Sparkles } from "lucide-react";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-text-secondary text-sm">{message}</div>
  );
}

export function AIErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const isApiKey = message.includes("API") || message.includes("api-key") || message.includes("authentication");
  return (
    <div className="py-6 px-4 text-center">
      <AlertTriangle className="h-6 w-6 mx-auto text-red-400 mb-2" />
      <div className="text-red-400 text-sm font-medium mb-2">AI request failed</div>
      <p className="text-xs text-text-secondary mb-3">
        {isApiKey
          ? "The Anthropic API key is missing or invalid. Update ANTHROPIC_API_KEY in your .env file."
          : message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function RunButton({ label, onRun }: { label: string; onRun: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Button onClick={onRun}>
        <Sparkles className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}
