"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import {
  X,
  FileText,
  Link2,
  Settings2,
  Sparkles,
  Compass,
  ChevronDown,
  GitCommitHorizontal,
  Network,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import { MetadataEditor, type MetadataValues } from "~/components/unit/metadata-editor";
import type { ResourceAttachment } from "~/components/unit/resource-attachment";
import { usePanelStore, type DetailTab } from "~/stores/panel-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { toast } from "~/lib/toast";
import type { UnitType } from "@prisma/client";
import { ComponentErrorBoundary } from "~/components/shared/error-boundary";
import { ProvenanceChain } from "~/components/feedback/ProvenanceChain";
import { ContentTab } from "~/components/unit/detail-tabs/ContentTab";
import { RelationsTab } from "~/components/unit/detail-tabs/RelationsTab";
import { MetadataTab } from "~/components/unit/detail-tabs/MetadataTab";
import { AITab } from "~/components/unit/detail-tabs/AITab";
import { ConnectionsTab } from "~/components/unit/detail-tabs/ConnectionsTab";

// ─── Types ───────────────────────────────────────────────────────────

export interface UnitDetailData {
  id: string;
  content: string;
  projectId?: string;
  unitType: UnitType;
  lifecycle: string;
  createdAt: Date | string;
  modifiedAt?: Date | string | null;
  originType?: string | null;
  sourceSpan?: Record<string, unknown> | null;
  versionCount?: number;
  aiTrustLevel?: string | null;
  certainty?: string | null;
  completeness?: string | null;
  evidenceDomain?: string | null;
  scope?: string | null;
  stance?: string | null;
  resources?: ResourceAttachment[];
  relationCount?: number;
  branchPotential?: number;
}

interface UnitDetailPanelProps {
  unit: UnitDetailData | null;
  isLoading?: boolean;
  onClose: () => void;
  onContentChange?: (content: string) => void;
  onMetadataChange?: (field: keyof MetadataValues, value: string | null) => void;
  onLifecycleChange?: (lifecycle: string) => void;
  onRemoveResource?: (resourceId: string) => void;
  /** Called when user clicks "Add as Unit" from the external knowledge panel */
  onAddAsUnit?: (content: string) => void;
  className?: string;
}

// ─── Loading skeleton ────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="space-y-4 p-space-4">
      <div className="animate-pulse bg-bg-secondary rounded-lg h-6 w-24" />
      <div className="animate-pulse bg-bg-secondary rounded-lg h-4 w-full" />
      <div className="animate-pulse bg-bg-secondary rounded-lg h-4 w-3/4" />
      <div className="animate-pulse bg-bg-secondary rounded-xl h-40 w-full" />
      <div className="animate-pulse bg-bg-secondary rounded-lg h-4 w-1/2" />
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────

const TAB_CONFIG: { value: DetailTab; label: string; Icon: React.ElementType }[] = [
  { value: "connections", label: "Connections", Icon: Network },
  { value: "content", label: "Content", Icon: FileText },
  { value: "relations", label: "Relations", Icon: Link2 },
  { value: "metadata", label: "Metadata", Icon: Settings2 },
  { value: "ai", label: "AI", Icon: Sparkles },
  { value: "provenance", label: "Provenance", Icon: GitCommitHorizontal },
];

// ─── Add to Navigator ────────────────────────────────────────────────

function AddToNavigatorRow({ unitId }: { unitId: string }) {
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const utils = api.useUtils();

  const { data: navigators = [] } = api.navigator.list.useQuery(
    { contextId: activeContextId! },
    { enabled: !!activeContextId },
  );

  const addUnit = api.navigator.addUnit.useMutation({
    onSuccess: (nav) => {
      void utils.navigator.list.invalidate({ contextId: activeContextId! });
      toast.success("Unit added to navigator", { description: `Added to "${nav.name}"` });
    },
    onError: () => {
      toast.error("Failed to add unit to navigator");
    },
  });

  if (!activeContextId || navigators.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-b border-border px-space-4 py-2 shrink-0">
      <Compass className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
      <span className="text-xs text-text-secondary">Add to navigator</span>
      <div className="relative ml-auto">
        <select
          defaultValue=""
          disabled={addUnit.isPending}
          onChange={(e) => {
            const navId = e.target.value;
            if (navId) {
              addUnit.mutate({ navigatorId: navId, unitId });
              e.target.value = "";
            }
          }}
          className="appearance-none rounded-md border border-border bg-bg-primary py-1 pl-2 pr-6 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 cursor-pointer hover:bg-bg-hover"
          aria-label="Select navigator to add this unit to"
        >
          <option value="" disabled>Pick one…</option>
          {navigators.map((nav) => (
            <option key={nav.id} value={nav.id}>{nav.name}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
      </div>
    </div>
  );
}

// ─── UnitDetailPanel ─────────────────────────────────────────────────

export function UnitDetailPanel({
  unit,
  isLoading,
  onClose,
  onContentChange,
  onMetadataChange,
  onLifecycleChange,
  onRemoveResource: _onRemoveResource,
  onAddAsUnit,
  className,
}: UnitDetailPanelProps) {
  const activeTab = usePanelStore((s) => s.activeTab);
  const setActiveTab = usePanelStore((s) => s.setActiveTab);
  const openPanel = usePanelStore((s) => s.openPanel);

  return (
    <ComponentErrorBoundary>
    <div className={cn("flex h-full flex-col", className)}>
      {/* Panel header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-space-4 shrink-0">
        <h2 className="text-sm font-medium text-text-primary truncate">
          {unit ? "Unit Detail" : "Details"}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close detail panel"
          className="h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Add to Navigator action — shown when a unit is open */}
      {!isLoading && unit && <AddToNavigatorRow unitId={unit.id} />}

      {/* Loading state */}
      {isLoading && <PanelSkeleton />}

      {/* Empty state — no unit selected */}
      {!isLoading && !unit && (
        <div className="flex flex-1 flex-col items-center justify-center gap-space-4 p-space-6 text-center">
          <div className="h-12 w-12 rounded-xl bg-bg-secondary" />
          <p className="text-sm text-text-secondary">
            Select a thought unit to see its details
          </p>
        </div>
      )}

      {/* Unit detail content */}
      {!isLoading && unit && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as DetailTab)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="px-space-4 shrink-0 w-full">
            {TAB_CONFIG.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 gap-1.5 text-xs"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-space-4">
              <TabsContent value="connections" className="mt-0">
                <ConnectionsTab
                  unitId={unit.id}
                  projectId={unit.projectId ?? ""}
                />
              </TabsContent>

              <TabsContent value="content" className="mt-0">
                <ContentTab
                  unit={unit}
                  onContentChange={onContentChange}
                  onLifecycleChange={onLifecycleChange}
                />
              </TabsContent>

              <TabsContent value="relations" className="mt-0">
                <RelationsTab unitId={unit.id} projectId={unit.projectId} />
              </TabsContent>

              <TabsContent value="metadata" className="mt-0">
                <MetadataTab
                  unit={unit}
                  onMetadataChange={onMetadataChange}
                  setActiveTab={setActiveTab}
                />
              </TabsContent>

              <TabsContent value="ai" className="mt-0">
                <AITab
                  unitId={unit.id}
                  content={unit.content}
                  branchPotential={unit.branchPotential}
                  onContentChange={onContentChange}
                  onAddAsUnit={onAddAsUnit}
                />
              </TabsContent>

              <TabsContent value="provenance" className="mt-0">
                <ProvenanceChain
                  unitId={unit.id}
                  onNavigate={(id) => openPanel(id)}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      )}
    </div>
    </ComponentErrorBoundary>
  );
}
