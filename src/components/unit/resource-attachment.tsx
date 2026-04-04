"use client";

import * as React from "react";
// Matches Prisma ResourceType enum
type ResourceType = "image" | "table" | "audio" | "diagram" | "link" | "video" | "code";
import {
  Image as ImageIcon,
  FileCode,
  Link2,
  Music,
  Video,
  Table2,
  Network,
  X,
  File,
} from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export interface ResourceAttachment {
  id: string;
  resourceType: ResourceType;
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ResourceAttachmentStripProps {
  resources: ResourceAttachment[];
  onRemove?: (resourceId: string) => void;
  className?: string;
}

// ─── Resource type → icon mapping ────────────────────────────────────

const RESOURCE_TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  image: ImageIcon,
  code: FileCode,
  link: Link2,
  audio: Music,
  video: Video,
  table: Table2,
  diagram: Network,
};

const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  image: "bg-purple-50 text-purple-600 border-purple-200",
  code: "bg-emerald-50 text-emerald-600 border-emerald-200",
  link: "bg-blue-50 text-blue-600 border-blue-200",
  audio: "bg-amber-50 text-amber-600 border-amber-200",
  video: "bg-rose-50 text-rose-600 border-rose-200",
  table: "bg-cyan-50 text-cyan-600 border-cyan-200",
  diagram: "bg-indigo-50 text-indigo-600 border-indigo-200",
};

// ─── Helpers ─────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageUrl(url: string, mimeType?: string | null): boolean {
  if (mimeType?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
}

// ─── ResourceChip ────────────────────────────────────────────────────

function ResourceChip({
  resource,
  onRemove,
}: {
  resource: ResourceAttachment;
  onRemove?: (id: string) => void;
}) {
  const Icon = RESOURCE_TYPE_ICONS[resource.resourceType] ?? File;
  const colorClass = RESOURCE_TYPE_COLORS[resource.resourceType] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const showThumbnail =
    resource.resourceType === "image" &&
    isImageUrl(resource.url, resource.mimeType);

  const label = resource.fileName ?? resource.resourceType;
  const sizeLabel = formatFileSize(resource.fileSize);

  return (
    <div
      className={cn(
        "group relative inline-flex items-center gap-1.5 rounded-lg border px-2 py-1",
        "text-xs transition-all duration-fast",
        "hover:shadow-sm",
        "motion-reduce:transition-none",
        colorClass,
      )}
      role="listitem"
      aria-label={`${resource.resourceType}: ${label}`}
    >
      {showThumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resource.url}
          alt={label}
          className="h-5 w-5 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      )}

      <span className="max-w-[120px] truncate font-medium">{label}</span>

      {sizeLabel && (
        <span className="text-[10px] opacity-60">{sizeLabel}</span>
      )}

      {onRemove && (
        <button
          type="button"
          className={cn(
            "ml-0.5 rounded-full p-0.5",
            "opacity-0 group-hover:opacity-100",
            "hover:bg-black/10 focus-visible:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            "transition-opacity duration-fast",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(resource.id);
          }}
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── ResourceAttachmentStrip ─────────────────────────────────────────

export function ResourceAttachmentStrip({
  resources,
  onRemove,
  className,
}: ResourceAttachmentStripProps) {
  if (resources.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      role="list"
      aria-label={`${resources.length} attached resource${resources.length === 1 ? "" : "s"}`}
    >
      {resources.map((resource) => (
        <ResourceChip
          key={resource.id}
          resource={resource}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
