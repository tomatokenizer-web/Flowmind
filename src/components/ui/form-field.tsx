"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

export interface FormFieldProps {
  /** The form control's id — used for htmlFor on the label */
  htmlFor: string;
  /** Visible label text */
  label: string;
  /** When true, renders a red asterisk (*) after the label */
  required?: boolean;
  /** Helper / description text shown below the label */
  description?: string;
  /** Validation error message. When present, the field is marked aria-invalid */
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * FormField — reusable wrapper that pairs a label with a form control.
 *
 * Usage:
 *   <FormField htmlFor="email" label="Email address" required error={errors.email}>
 *     <input id="email" type="email" ... />
 *   </FormField>
 */
export function FormField({
  htmlFor,
  label,
  required,
  description,
  error,
  className,
  children,
}: FormFieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Label row */}
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-text-primary leading-none"
      >
        {label}
        {required && (
          <span
            aria-hidden="true"
            className="ml-0.5 text-accent-error"
            title="Required"
          >
            *
          </span>
        )}
      </label>

      {/* Optional description */}
      {description && (
        <p
          id={descriptionId}
          className="text-xs text-text-secondary leading-snug"
        >
          {description}
        </p>
      )}

      {/* The actual control — wrapped so we can pass aria props via context */}
      <FormFieldContext.Provider
        value={{ htmlFor, required: required ?? false, descriptionId, errorId, hasError: !!error }}
      >
        {children}
      </FormFieldContext.Provider>

      {/* Inline error message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-accent-error leading-snug"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Context so child inputs can self-wire aria attributes ── */

interface FormFieldContextValue {
  htmlFor: string;
  required: boolean;
  descriptionId: string | undefined;
  errorId: string | undefined;
  hasError: boolean;
}

const FormFieldContext = React.createContext<FormFieldContextValue>({
  htmlFor: "",
  required: false,
  descriptionId: undefined,
  errorId: undefined,
  hasError: false,
});

/**
 * useFormField — hook to consume FormField context inside a custom input component.
 *
 * Returns aria props ready to spread onto the control element:
 *   const aria = useFormField();
 *   <input {...aria} />
 */
export function useFormField() {
  const ctx = React.useContext(FormFieldContext);
  return {
    id: ctx.htmlFor,
    required: ctx.required,
    "aria-required": ctx.required || undefined,
    "aria-invalid": ctx.hasError || undefined,
    "aria-describedby":
      [ctx.descriptionId, ctx.errorId].filter(Boolean).join(" ") || undefined,
  } as const;
}
