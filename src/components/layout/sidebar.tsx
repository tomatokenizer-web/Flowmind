"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderTree,
  FileText,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { useLayoutStore } from "~/stores/layout-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useProjectId } from "~/contexts/project-context";
import { Button } from "~/components/ui/button";
import { ContextTree } from "~/components/context/context-tree";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 60;

interface SidebarProps {
  className?: string;
  projectId?: string;
}

export function Sidebar({ className, projectId }: SidebarProps) {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const sidebarWidth = useSidebarStore((s) => s.sidebarWidth);
  const projectId = useProjectId();

  const isExpanded = sidebarOpen && sidebarWidth !== 0;
  const isCollapsed = !sidebarOpen || sidebarWidth === 60;
  const isHidden = sidebarWidth === 0;

  const width = isHidden ? 0 : isExpanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <motion.nav
      aria-label="Project navigation"
      className={cn(
        "flex h-full flex-col border-r border-border bg-bg-secondary",
        "motion-reduce:transition-none",
        isHidden && "overflow-hidden",
        className,
      )}
      animate={{ width }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Sidebar header */}
      <div className="flex h-10 items-center justify-between border-b border-border px-space-3">
        {isExpanded && (
          <span className="truncate text-sm font-medium text-text-primary">
            Flowmind
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className="ml-auto h-8 w-8 shrink-0"
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Project selector placeholder */}
      {/* TODO: Epic 9 — real project selector */}
      <div className="border-b border-border px-space-3 py-space-2">
        {isExpanded ? (
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-space-2 rounded-lg px-space-2 py-[6px]",
              "text-sm text-text-secondary",
              "transition-colors duration-fast ease-default",
              "hover:bg-bg-hover hover:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
            )}
            aria-label="Select project"
          >
            <FolderTree className="h-4 w-4 shrink-0 text-text-tertiary" />
            <span className="flex-1 truncate text-left">Default Project</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-center rounded-lg py-space-2",
              "text-text-secondary transition-colors duration-fast",
              "hover:bg-bg-hover hover:text-text-primary",
            )}
            aria-label="Default Project"
            title="Default Project"
          >
            <FolderTree className="h-5 w-5 shrink-0" />
          </button>
        )}
      </div>

      {/* Context tree */}
      <ContextTree projectId={projectId} collapsed={isCollapsed} />

      {/* Bottom nav items */}
      <div className="border-t border-border p-space-2">
        <SidebarItem icon={FileText} label="All Thoughts" collapsed={isCollapsed} />
        <SidebarItem icon={Star} label="Starred" collapsed={isCollapsed} />
      </div>
    </motion.nav>
  );
}

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
}

function SidebarItem({ icon: Icon, label, collapsed }: SidebarItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-space-3 rounded-lg px-space-3 py-space-2",
        "text-sm text-text-secondary",
        "transition-colors duration-fast ease-default",
        "hover:bg-bg-hover hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        "motion-reduce:transition-none",
        collapsed && "justify-center px-0",
      )}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
