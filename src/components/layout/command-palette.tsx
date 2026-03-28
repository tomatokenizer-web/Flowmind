"use client";

import { useEffect, useCallback } from "react";
import { Command } from "cmdk";
import {
  FolderOpen,
  MessageSquare,
  Plus,
  Search,
  Settings,
  LayoutList,
  Network,
  BookOpen,
  Columns3,
  Inspect,
  Compass,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useWorkspaceStore, type ViewMode } from "@/stores/workspace-store";

// ---------------------------------------------------------------------------
// Command palette
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const search = useCommandPaletteStore((s) => s.search);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const setSearch = useCommandPaletteStore((s) => s.setSearch);

  const setViewMode = useWorkspaceStore((s) => s.setViewMode);
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);
  const setRightPanelContent = useWorkspaceStore((s) => s.setRightPanelContent);

  const runAction = useCallback(
    (fn: () => void) => {
      fn();
      setOpen(false);
    },
    [setOpen],
  );

  // Close on escape is handled by cmdk internally
  // but we also handle overlay click
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Command dialog */}
      <Command
        className={cn(
          "relative z-10 w-full max-w-[560px]",
          "rounded-xl border border-[var(--border-default)]",
          "bg-[var(--bg-primary)] shadow-[var(--shadow-high)]",
          "overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-4",
        )}
        loop
        shouldFilter
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4">
          <Search className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className={cn(
              "flex-1 bg-transparent py-3",
              "text-[var(--text-sm)] text-[var(--text-primary)]",
              "placeholder:text-[var(--text-tertiary)]",
              "outline-none",
            )}
            autoFocus
          />
          <kbd className="rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
            ESC
          </kbd>
        </div>

        {/* Commands list */}
        <Command.List
          className="max-h-[320px] overflow-y-auto p-2"
        >
          <Command.Empty className="py-8 text-center text-[var(--text-sm)] text-[var(--text-tertiary)]">
            No results found.
          </Command.Empty>

          {/* Navigation group */}
          <Command.Group
            heading="Navigation"
            className="mb-2"
          >
            <GroupHeading>Navigation</GroupHeading>
            <CommandItem
              icon={FolderOpen}
              label="Go to Contexts"
              shortcut=""
              onSelect={() => runAction(() => {})}
            />
            <CommandItem
              icon={MessageSquare}
              label="Go to Inquiries"
              shortcut=""
              onSelect={() => runAction(() => {})}
            />
          </Command.Group>

          {/* View group */}
          <Command.Group heading="View" className="mb-2">
            <GroupHeading>View</GroupHeading>
            <CommandItem
              icon={LayoutList}
              label="Switch to List View"
              shortcut=""
              onSelect={() => runAction(() => setViewMode("list" as ViewMode))}
            />
            <CommandItem
              icon={Network}
              label="Switch to Graph View"
              shortcut=""
              onSelect={() => runAction(() => setViewMode("graph" as ViewMode))}
            />
            <CommandItem
              icon={BookOpen}
              label="Switch to Reading View"
              shortcut=""
              onSelect={() => runAction(() => setViewMode("reading" as ViewMode))}
            />
            <CommandItem
              icon={Columns3}
              label="Switch to Board View"
              shortcut=""
              onSelect={() => runAction(() => setViewMode("board" as ViewMode))}
            />
            <CommandItem
              icon={PanelLeft}
              label="Toggle Sidebar"
              shortcut="Ctrl+\"
              onSelect={() => runAction(toggleSidebar)}
            />
            <CommandItem
              icon={Inspect}
              label="Toggle Inspector"
              shortcut="Ctrl+Shift+I"
              onSelect={() =>
                runAction(() => {
                  const ws = useWorkspaceStore.getState();
                  ws.setRightPanelContent(
                    ws.rightPanelContent === "inspector" ? null : "inspector",
                  );
                })
              }
            />
            <CommandItem
              icon={Network}
              label="Toggle Graph Panel"
              shortcut="Ctrl+Shift+G"
              onSelect={() =>
                runAction(() => {
                  const ws = useWorkspaceStore.getState();
                  ws.setRightPanelContent(
                    ws.rightPanelContent === "graph" ? null : "graph",
                  );
                })
              }
            />
            <CommandItem
              icon={Compass}
              label="Toggle Compass"
              shortcut=""
              onSelect={() =>
                runAction(() => {
                  const ws = useWorkspaceStore.getState();
                  ws.setRightPanelContent(
                    ws.rightPanelContent === "compass" ? null : "compass",
                  );
                })
              }
            />
          </Command.Group>

          {/* Actions group */}
          <Command.Group heading="Actions" className="mb-2">
            <GroupHeading>Actions</GroupHeading>
            <CommandItem
              icon={Plus}
              label="New Unit"
              shortcut=""
              onSelect={() => runAction(() => {})}
            />
            <CommandItem
              icon={Plus}
              label="New Context"
              shortcut=""
              onSelect={() => runAction(() => {})}
            />
            <CommandItem
              icon={Plus}
              label="New Inquiry"
              shortcut=""
              onSelect={() => runAction(() => {})}
            />
            <CommandItem
              icon={Settings}
              label="Open Settings"
              shortcut=""
              onSelect={() => runAction(() => {})}
            />
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 px-2 text-[var(--text-xs)] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
      {children}
    </div>
  );
}

function CommandItem({
  icon: Icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2",
        "text-[var(--text-sm)] text-[var(--text-secondary)]",
        "cursor-pointer",
        "aria-selected:bg-[var(--bg-hover)] aria-selected:text-[var(--text-primary)]",
        "transition-colors duration-75",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] font-medium text-[var(--text-tertiary)]">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
