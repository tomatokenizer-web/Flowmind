"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export function LoadingButton({
  loading,
  loadingText,
  variant = "primary",
  disabled,
  children,
  className,
  ...props
}: LoadingButtonProps) {
  const variantStyles = {
    primary:
      "bg-accent-primary text-white hover:bg-accent-primary/90 disabled:bg-accent-primary/50",
    secondary:
      "border border-border bg-bg-secondary text-text-primary hover:bg-bg-hover disabled:opacity-50",
    ghost:
      "text-text-secondary hover:bg-bg-hover disabled:opacity-50",
    danger:
      "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        variantStyles[variant],
        className,
      )}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
