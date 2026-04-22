"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useToastStore, type ToastItem, type ToastType } from "~/lib/toast";

/* ─── Icon & color mapping ─── */

const toastConfig: Record<
  ToastType,
  { icon: React.ElementType; className: string; ariaLive: "assertive" | "polite" }
> = {
  success: {
    icon: CheckCircle2,
    className: "text-accent-success",
    ariaLive: "polite",
  },
  error: {
    icon: AlertCircle,
    className: "text-accent-error",
    ariaLive: "assertive",
  },
  info: {
    icon: Info,
    className: "text-accent-primary",
    ariaLive: "polite",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-accent-warning",
    ariaLive: "polite",
  },
};

const TOAST_DURATION = 4000;

/* ─── Single Toast ─── */

function ToastNotification({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const config = toastConfig[toast.type];
  const Icon = config.icon;
  const duration = toast.duration ?? TOAST_DURATION;

  return (
    <ToastPrimitive.Root
      className={cn(
        "group pointer-events-auto relative flex w-full max-w-sm items-start gap-3",
        "overflow-hidden rounded-card border border-border bg-white p-4 shadow-elevated",
        "motion-reduce:transition-none",
        "data-[state=open]:animate-[flowmind-toast-slide-up_300ms_ease-out]",
        "data-[state=closed]:animate-[flowmind-toast-slide-down_200ms_ease-in]",
        "data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]",
        "data-[swipe=cancel]:translate-y-0",
        "data-[swipe=end]:animate-[flowmind-toast-slide-down_200ms_ease-in]",
      )}
      duration={duration}
      onOpenChange={(open) => {
        if (!open) removeToast(toast.id);
      }}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", config.className)}
        aria-hidden="true"
      />

      <div className="flex-1 space-y-1">
        <ToastPrimitive.Title className="text-sm font-medium text-text-primary">
          {toast.title}
        </ToastPrimitive.Title>

        {toast.description && (
          <ToastPrimitive.Description className="text-sm text-text-secondary">
            {toast.description}
          </ToastPrimitive.Description>
        )}

        {toast.undoAction && (
          <ToastPrimitive.Action
            altText="Undo this action"
            className="mt-1 inline-flex text-sm font-medium text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            onClick={toast.undoAction}
          >
            Undo
          </ToastPrimitive.Action>
        )}
        {toast.action && (
          <ToastPrimitive.Action
            altText={toast.action.label}
            className="mt-1 inline-flex text-sm font-medium text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            onClick={toast.action.onClick}
          >
            {toast.action.label}
          </ToastPrimitive.Action>
        )}
      </div>

      <ToastPrimitive.Close
        className={cn(
          "shrink-0 rounded-md p-1 text-text-tertiary",
          "hover:bg-bg-hover hover:text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          "transition-colors duration-fast",
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>

      {/* Auto-dismiss progress bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-0.5 bg-current opacity-20",
          config.className,
        )}
        style={{
          animation: `flowmind-toast-progress ${duration}ms linear forwards`,
        }}
      />
    </ToastPrimitive.Root>
  );
}

/* ─── Toast Provider (mount once in app shell) ─── */

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <ToastPrimitive.Provider swipeDirection="down">
      {toasts.map((t) => (
        <ToastNotification key={t.id} toast={t} />
      ))}

      <ToastPrimitive.Viewport
        className={cn(
          "fixed bottom-0 left-1/2 z-[100] flex -translate-x-1/2 flex-col-reverse gap-2",
          "w-full max-w-sm p-4",
          "outline-none",
        )}
        aria-label="Notifications"
      />
    </ToastPrimitive.Provider>
  );
}
