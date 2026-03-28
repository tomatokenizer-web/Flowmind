"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MessageSquare,
  Layers,
  Clock,
  Tag,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { api } from "~/trpc/react";

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function SidebarSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-[var(--text-secondary)]",
          "text-[var(--text-xs)] font-medium uppercase tracking-wider",
          "hover:text-[var(--text-primary)] transition-colors",
          "duration-[var(--duration-fast)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          "rounded",
        )}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        {action && (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
          >
            {action}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 py-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar item
// ---------------------------------------------------------------------------

function SidebarItem({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded px-3 py-1.5 text-[var(--text-sm)]",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        active
          ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
      )}
    >
      <span className="flex-1 truncate text-left">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "text-[var(--text-xs)] tabular-nums",
            active ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Project selector
// ---------------------------------------------------------------------------

function ProjectSelector() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

  const { data: projects } = api.project.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const activeProject = projects?.find((p) => p.id === activeProjectId);

  return (
    <div className="px-3 pb-2">
      <select
        value={activeProjectId ?? ""}
        onChange={(e) => setActiveProject(e.target.value || null)}
        className={cn(
          "w-full rounded-md border border-[var(--border-default)]",
          "bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-sm)]",
          "text-[var(--text-primary)]",
          "focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]/20",
          "transition-colors duration-[var(--duration-fast)]",
        )}
        aria-label="Select project"
      >
        <option value="">Select a project...</option>
        {projects?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {activeProject && (
        <p className="mt-1 truncate text-[var(--text-xs)] text-[var(--text-tertiary)]">
          {activeProject.description ?? "No description"}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

export function Sidebar() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeInquiryId = useWorkspaceStore((s) => s.activeInquiryId);
  const activeContextId = useWorkspaceStore((s) => s.activeContextId);
  const setActiveInquiry = useWorkspaceStore((s) => s.setActiveInquiry);
  const setActiveContext = useWorkspaceStore((s) => s.setActiveContext);

  const { data: inquiries } = api.inquiry.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId, staleTime: 30_000 },
  );

  const { data: contexts } = api.context.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId, staleTime: 30_000 },
  );

  return (
    <nav
      className="flex h-full flex-col overflow-hidden bg-[var(--bg-secondary)]"
      aria-label="Sidebar navigation"
    >
      {/* Logo / brand area */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent-primary)] text-white">
          <Layers className="h-4 w-4" />
        </div>
        <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">
          FlowMind
        </span>
      </div>

      {/* Project selector */}
      <div className="border-b border-[var(--border-default)] py-3">
        <ProjectSelector />
      </div>

      {/* Scrollable nav sections */}
      <div className="flex-1 overflow-y-auto py-2">
        {activeProjectId ? (
          <div className="flex flex-col gap-3">
            {/* Inquiries */}
            <SidebarSection
              title="Inquiries"
              icon={MessageSquare}
              action={
                <button
                  type="button"
                  className="rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="New inquiry"
                >
                  <Plus className="h-3 w-3" />
                </button>
              }
            >
              {inquiries?.map((inq) => (
                <SidebarItem
                  key={inq.id}
                  label={inq.title}
                  active={inq.id === activeInquiryId}
                  onClick={() => setActiveInquiry(inq.id)}
                />
              ))}
              {(!inquiries || inquiries.length === 0) && (
                <p className="px-3 py-2 text-[var(--text-xs)] text-[var(--text-tertiary)] italic">
                  No inquiries yet
                </p>
              )}
            </SidebarSection>

            {/* Contexts */}
            <SidebarSection
              title="Contexts"
              icon={FolderOpen}
              action={
                <button
                  type="button"
                  className="rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="New context"
                >
                  <Plus className="h-3 w-3" />
                </button>
              }
            >
              {contexts?.map((ctx) => (
                <SidebarItem
                  key={ctx.id}
                  label={ctx.name}
                  active={ctx.id === activeContextId}
                  count={ctx.counts.units}
                  onClick={() => setActiveContext(ctx.id)}
                />
              ))}
              {(!contexts || contexts.length === 0) && (
                <p className="px-3 py-2 text-[var(--text-xs)] text-[var(--text-tertiary)] italic">
                  No contexts yet
                </p>
              )}
            </SidebarSection>

            {/* Recent units */}
            <SidebarSection title="Recent" icon={Clock} defaultOpen={false}>
              <p className="px-3 py-2 text-[var(--text-xs)] text-[var(--text-tertiary)] italic">
                Recent units appear here
              </p>
            </SidebarSection>

            {/* Tags */}
            <SidebarSection title="Tags" icon={Tag} defaultOpen={false}>
              <p className="px-3 py-2 text-[var(--text-xs)] text-[var(--text-tertiary)] italic">
                Tags appear here
              </p>
            </SidebarSection>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <FolderOpen className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
            <p className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
              Select a project to get started
            </p>
          </div>
        )}
      </div>
    </nav>
  );
}
