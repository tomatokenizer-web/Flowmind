"use client";

import {
  ChevronRight,
  LayoutList,
  Network,
  BookOpen,
  Columns3,
  Search,
  Loader2,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type ViewMode } from "@/stores/workspace-store";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { usePipelineStore } from "@/stores/pipeline-store";
import { api } from "~/trpc/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";

// ---------------------------------------------------------------------------
// View mode config
// ---------------------------------------------------------------------------

const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: "list", icon: LayoutList, label: "List view" },
  { mode: "graph", icon: Network, label: "Graph view" },
  { mode: "reading", icon: BookOpen, label: "Reading view" },
  { mode: "board", icon: Columns3, label: "Board view" },
];

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function Breadcrumb() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeInquiryId = useWorkspaceStore((s) => s.activeInquiryId);
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);

  const { data: projects } = api.project.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: context } = api.context.getById.useQuery(
    { id: activeContextId! },
    { enabled: !!activeContextId },
  );

  const projectName = projects?.find((p) => p.id === activeProjectId)?.name;

  const crumbs: string[] = [];
  if (projectName) crumbs.push(projectName);
  if (activeInquiryId) crumbs.push("Inquiry");
  if (context) crumbs.push(context.name);

  if (crumbs.length === 0) {
    return (
      <span className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
        FlowMind
      </span>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight className="h-3 w-3 text-[var(--text-tertiary)]" />
          )}
          <span
            className={cn(
              "text-[var(--text-sm)]",
              i === crumbs.length - 1
                ? "font-medium text-[var(--text-primary)]"
                : "text-[var(--text-secondary)]",
            )}
          >
            {crumb}
          </span>
        </span>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// View mode toggle
// ---------------------------------------------------------------------------

function ViewModeToggle() {
  const viewMode = useWorkspaceStore((s) => s.viewMode);
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="flex items-center gap-0.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-0.5">
        {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
          <Tooltip.Root key={mode}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded p-1.5 transition-colors duration-[var(--duration-fast)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
                  viewMode === mode
                    ? "bg-[var(--accent-primary)] text-white"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                )}
                aria-label={label}
                aria-pressed={viewMode === mode}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                sideOffset={6}
                className={cn(
                  "rounded-md bg-[var(--bg-primary)] px-2.5 py-1.5",
                  "text-[var(--text-xs)] text-[var(--text-primary)]",
                  "shadow-[var(--shadow-elevated)] border border-[var(--border-default)]",
                  "animate-in fade-in-0 zoom-in-95",
                )}
              >
                {label}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        ))}
      </div>
    </Tooltip.Provider>
  );
}

// ---------------------------------------------------------------------------
// Pipeline status indicator
// ---------------------------------------------------------------------------

function PipelineIndicator() {
  const isProcessing = usePipelineStore((s) => s.isProcessing);
  const currentPass = usePipelineStore((s) => s.currentPass);

  if (!isProcessing) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/10 px-2.5 py-1">
      <Loader2 className="h-3 w-3 animate-spin text-[var(--accent-primary)]" />
      <span className="text-[var(--text-xs)] font-medium text-[var(--accent-primary)]">
        Pass {currentPass}/7
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User menu
// ---------------------------------------------------------------------------

function UserMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full",
            "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
            "hover:bg-[var(--accent-primary)]/20 transition-colors duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          )}
          aria-label="User menu"
        >
          <User className="h-3.5 w-3.5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "min-w-[160px] rounded-lg border border-[var(--border-default)]",
            "bg-[var(--bg-primary)] p-1 shadow-[var(--shadow-elevated)]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          )}
        >
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5",
              "text-[var(--text-sm)] text-[var(--text-secondary)]",
              "cursor-pointer outline-none",
              "data-[highlighted]:bg-[var(--bg-hover)] data-[highlighted]:text-[var(--text-primary)]",
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border-default)]" />
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5",
              "text-[var(--text-sm)] text-[var(--accent-error)]",
              "cursor-pointer outline-none",
              "data-[highlighted]:bg-[var(--accent-error)]/10",
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

export function TopBar() {
  const toggleCommandPalette = useCommandPaletteStore((s) => s.toggle);

  return (
    <header
      className={cn(
        "flex h-12 items-center justify-between gap-4",
        "border-b border-[var(--border-default)] bg-[var(--bg-primary)]",
        "px-4",
      )}
    >
      {/* Left: Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center">
        <Breadcrumb />
      </div>

      {/* Center: View mode toggle */}
      <div className="flex items-center gap-3">
        <ViewModeToggle />
        <PipelineIndicator />
      </div>

      {/* Right: Search + User */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleCommandPalette}
          className={cn(
            "flex items-center gap-2 rounded-md border border-[var(--border-default)]",
            "bg-[var(--bg-surface)] px-2.5 py-1.5",
            "text-[var(--text-xs)] text-[var(--text-tertiary)]",
            "hover:border-[var(--border-focus)] hover:text-[var(--text-secondary)]",
            "transition-colors duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          )}
          aria-label="Search (Cmd+K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-[10px] font-medium sm:inline">
            {typeof navigator !== "undefined" &&
            /Mac|iPhone/.test(navigator.userAgent)
              ? "\u2318K"
              : "Ctrl+K"}
          </kbd>
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
