"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderTree,
  FileText,
  Star,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { useLayoutStore } from "~/stores/layout-store";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useProjectId } from "~/contexts/project-context";
import { Button } from "~/components/ui/button";
import { ContextTree } from "~/components/context/context-tree";
import { ProjectSelector } from "~/components/project/ProjectSelector";
import { IncubationQueue } from "~/components/incubation/IncubationQueue";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 60;

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
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

      {/* Project selector */}
      <div className="border-b border-border px-space-3 py-space-2">
        <ProjectSelector collapsed={isCollapsed} />
      </div>

      {/* Context tree */}
      <ContextTree projectId={projectId} collapsed={isCollapsed} />

      {/* Incubation queue */}
      <div className="border-t border-border">
        <IncubationQueue collapsed={isCollapsed} />
      </div>

      {/* Bottom nav items */}
      <div className="border-t border-border p-space-2">
        <SidebarItem icon={FileText} label="All Thoughts" collapsed={isCollapsed} />
        <SidebarItem icon={Star} label="Starred" collapsed={isCollapsed} />
        <Link href="/settings" className={cn(
          "flex w-full items-center gap-space-3 rounded-lg px-space-3 py-space-2",
          "text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors",
          isCollapsed && "justify-center px-0",
        )}>
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
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
