"use client";

import * as React from "react";
import { Upload, X, FileUp, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export interface PendingFile {
  file: File;
  id: string;
  progress: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export interface ResourceUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_ACCEPT =
  "image/*,audio/*,video/*,.pdf,.csv,.json,.md,.txt,.html";

const DEFAULT_MAX_SIZE_MB = 50;

// ─── ResourceUploadZone ──────────────────────────────────────────────

export function ResourceUploadZone({
  onFilesSelected,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  multiple = true,
  disabled = false,
  className,
  children,
}: ResourceUploadZoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFiles = React.useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (file.size > maxSizeBytes) {
          errors.push(
            `${file.name}: exceeds ${maxSizeMB}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
          );
        } else {
          valid.push(file);
        }
      }

      return { valid, errors };
    },
    [maxSizeBytes, maxSizeMB],
  );

  const handleFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0) {
        setValidationError(errors.join("; "));
        setTimeout(() => setValidationError(null), 5000);
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [onFilesSelected, validateFiles],
  );

  const handleDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setIsDragOver(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const handleClick = React.useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleFiles],
  );

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-2",
          "rounded-xl border-2 border-dashed p-6",
          "cursor-pointer transition-all duration-normal",
          "motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",

          // Default state
          !isDragOver && !disabled && "border-border hover:border-accent-primary/50 hover:bg-bg-hover/50",

          // Drag over state
          isDragOver && "border-accent-primary bg-accent-primary/5 scale-[1.01]",

          // Disabled state
          disabled && "cursor-not-allowed opacity-50 border-border",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload files by dropping them here or clicking to browse"
        aria-disabled={disabled}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        {children ?? (
          <>
            <div
              className={cn(
                "rounded-full p-3 transition-colors duration-fast",
                isDragOver
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "bg-bg-secondary text-text-tertiary",
              )}
            >
              {isDragOver ? (
                <FileUp className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Upload className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-secondary">
                {isDragOver ? "Drop files here" : "Drop files or click to upload"}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Images, audio, video, documents up to {maxSizeMB}MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Validation error toast */}
      {validationError && (
        <div
          className="mt-2 flex items-start gap-2 rounded-lg border border-accent-error/20 bg-red-50 px-3 py-2 text-xs text-accent-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
          <button
            type="button"
            className="ml-auto flex-shrink-0 rounded p-0.5 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            onClick={() => setValidationError(null)}
            aria-label="Dismiss error"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
