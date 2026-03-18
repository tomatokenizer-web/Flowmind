"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

/* ─── Base Skeleton ─── */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width — accepts any CSS value */
  width?: string;
  /** Height — accepts any CSS value */
  height?: string;
}

export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn(
        "animate-pulse rounded-card bg-bg-secondary motion-reduce:animate-none",
        className,
      )}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

/* ─── SkeletonText ─── */

interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of text lines to render */
  lines?: number;
}

export function SkeletonText({ lines = 3, className, ...props }: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="status" aria-busy="true" aria-label="Loading text" {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-3.5 animate-pulse rounded bg-bg-secondary motion-reduce:animate-none",
            i === lines - 1 && "w-3/4",
          )}
        />
      ))}
    </div>
  );
}

/* ─── SkeletonAvatar ─── */

interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size in pixels */
  size?: number;
}

export function SkeletonAvatar({ size = 40, className, style, ...props }: SkeletonAvatarProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading avatar"
      className={cn(
        "animate-pulse rounded-full bg-bg-secondary motion-reduce:animate-none",
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  );
}

/* ─── SkeletonCard ─── */

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show avatar placeholder */
  showAvatar?: boolean;
}

export function SkeletonCard({ showAvatar = false, className, ...props }: SkeletonCardProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading card"
      className={cn(
        "rounded-card border border-border bg-white p-4 shadow-resting",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {showAvatar && <SkeletonAvatar size={32} />}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-2/5" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  );
}
