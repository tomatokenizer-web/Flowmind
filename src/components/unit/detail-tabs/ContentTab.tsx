"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";
import { Paperclip } from "lucide-react";
import { api } from "~/trpc/react";
import { RichTextEditor } from "~/components/editor/RichTextEditor";
import { cn } from "~/lib/utils";
import { UnitTypeSelector } from "~/components/unit/UnitTypeSelector";
import { VersionHistory } from "~/components/unit/version-history";
import { AILifecycleBadge } from "~/components/unit/lifecycle-badge";
import { ResourceAttachmentStrip } from "~/components/unit/resource-attachment";
import { ResourceUploadZone } from "~/components/unit/resource-upload";
import { AudioDetailView } from "~/components/unit/audio-detail-view";
import { EpistemicHumilityBanner } from "~/components/feedback/EpistemicHumilityBanner";
import { UnitAIActionsMenu } from "~/components/unit/UnitAIActionsMenu";
import { toast } from "~/lib/toast";
import type { UnitDetailData } from "~/components/panels/UnitDetailPanel";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useProjectId } from "~/contexts/project-context";
import { DeepDiveSection, DecomposeSection, ContextSuggestionSection } from "./AITab";
import { DerivationSuggestions } from "~/components/unit/DerivationSuggestions";

function mimeToResourceType(
  mime: string,
): "image" | "audio" | "video" | "code" | "table" | "link" | "diagram" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "text/csv" || mime === "application/vnd.ms-excel") return "table";
  if (mime === "application/json" || mime.includes("javascript") || mime.includes("typescript")) return "code";
  return "diagram";
}

interface ContentTabProps {
  unit: UnitDetailData;
  onContentChange?: (content: string) => void;
  onLifecycleChange?: (lifecycle: string) => void;
  onAddAsUnit?: (content: string) => void;
}

export function ContentTab({ unit, onContentChange, onLifecycleChange, onAddAsUnit }: ContentTabProps) {
  const [localContent, setLocalContent] = useState(unit.content);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deepDiveUnitIds, setDeepDiveUnitIds] = React.useState<string[]>([]);
  const utils = api.useUtils();
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const projectId = useProjectId();

  const uploadResource = api.resource.upload.useMutation({
    onSuccess: () => {
      void utils.unit.getById.invalidate({ id: unit.id });
      void utils.resource.getByUnitId.invalidate({ unitId: unit.id });
      setShowUpload(false);
      toast.success("File attached successfully");
    },
    onError: (err) => {
      toast.error("Upload failed", { description: err.message });
    },
  });

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        uploadResource.mutate({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          resourceType: mimeToResourceType(file.type),
          base64,
          unitId: unit.id,
        });
      };
      reader.readAsDataURL(file);
    },
    [unit.id, uploadResource],
  );

  useEffect(() => {
    setLocalContent(unit.content);
  }, [unit.id, unit.content]);

  const handleContentChange = useCallback(
    (html: string) => {
      setLocalContent(html);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onContentChange?.(html);
      }, 1000);
    },
    [onContentChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const audioResources = (unit.resources ?? []).filter(
    (r) => r.resourceType === "audio",
  );

  const plainText = localContent.replace(/<[^>]*>/g, "");
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = plainText.length;

  return (
    <div className="space-y-4">
      {/* Unit type + AI actions */}
      <div className="flex items-center gap-2">
        <UnitTypeSelector unitId={unit.id} currentType={unit.unitType} />
        <AILifecycleBadge lifecycle={unit.lifecycle as "draft" | "pending" | "confirmed"} size="sm" />
        <div className="ml-auto">
          <UnitAIActionsMenu
            unit={{ id: unit.id, content: unit.content, unitType: unit.unitType, projectId: unit.projectId }}
            projectId={unit.projectId}
            onDecomposeComplete={() => void utils.unit.getById.invalidate({ id: unit.id })}
          />
        </div>
      </div>

      {/* Audio detail view */}
      {audioResources.length > 0 && (
        <div className="space-y-3">
          {audioResources.map((resource) => (
            <AudioDetailView
              key={resource.id}
              src={resource.url}
              title={resource.fileName ?? "Audio recording"}
              duration={
                typeof resource.metadata?.duration === "number"
                  ? resource.metadata.duration
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Rich text editor */}
      <div className="space-y-1">
        <RichTextEditor
          content={localContent}
          onChange={handleContentChange}
          editable
          placeholder="Write your thought..."
        />
        <div className="flex items-center justify-between text-[11px] text-text-tertiary px-1">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
      </div>

      {/* Epistemic humility notice */}
      <EpistemicHumilityBanner content={localContent} unitId={unit.id} />

      {/* Lifecycle controls */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-text-secondary">Lifecycle</span>
        <div className="flex items-center gap-2">
          {(["draft", "pending", "confirmed"] as const).map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => onLifecycleChange?.(state)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium",
                "border transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
                "motion-reduce:transition-none",
                unit.lifecycle === state
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover",
              )}
              aria-pressed={unit.lifecycle === state}
              aria-label={`Set lifecycle to ${state}`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Deep Dive — prompt-based exploration */}
      {projectId && (
        <DeepDiveSection
          unitId={unit.id}
          content={unit.content}
          unitType={unit.unitType}
          projectId={projectId}
          onBranchedUnitsChange={setDeepDiveUnitIds}
        />
      )}

      {/* Decompose — split long unit */}
      {projectId && unit.content.length > 100 && (
        <DecomposeSection
          unitId={unit.id}
          content={unit.content}
          projectId={projectId}
          contextId={activeContextId ?? undefined}
          onAddAsUnit={onAddAsUnit}
        />
      )}

      {/* AI Derivation Suggestions */}
      {projectId && (
        <DerivationSuggestions
          unitId={unit.id}
          contextId={activeContextId}
          projectId={projectId}
        />
      )}

      {/* Context suggestion */}
      {projectId && (
        <ContextSuggestionSection
          unitId={unit.id}
          projectId={projectId}
          deepDiveUnitIds={deepDiveUnitIds}
        />
      )}

      {/* Resources */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            Resources
          </div>
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs",
              "border border-border text-text-secondary transition-colors",
              "hover:bg-bg-hover hover:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              showUpload && "bg-bg-secondary",
            )}
            aria-label={showUpload ? "Hide upload zone" : "Attach file"}
          >
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            {showUpload ? "Cancel" : "Attach file"}
          </button>
        </div>

        {showUpload && (
          <div className="space-y-2">
            <ResourceUploadZone
              onFilesSelected={handleFilesSelected}
              multiple={false}
              disabled={uploadResource.isPending}
              className="text-xs"
            />
            {uploadResource.isPending && (
              <p className="text-center text-xs text-text-tertiary">Uploading…</p>
            )}
          </div>
        )}

        {unit.resources && unit.resources.length > 0 && (
          <ResourceAttachmentStrip resources={unit.resources} />
        )}
      </div>

      {/* Version History */}
      <div className="border-t border-border pt-3">
        <VersionHistory unitId={unit.id} currentContent={unit.content} />
      </div>
    </div>
  );
}
