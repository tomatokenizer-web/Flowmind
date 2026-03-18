"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  FolderTree,
  FileText,
  Hash,
  Star,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useLayoutStore } from "~/stores/layout-store";
import { Button } from "~/components/ui/button";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 60;

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);

  return (
    <nav
      aria-label="Project navigation"
      className={cn(
        "flex h-full flex-col border-r border-border bg-bg-secondary",
        "transition-[width] duration-sidebar ease-default",
        "motion-reduce:transition-none",
        className,
      )}
      style={{ width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
    >
      {/* Sidebar header */}
      <div className="flex h-10 items-center justify-between border-b border-border px-space-3">
        {sidebarOpen && (
          <span className="truncate text-sm font-medium text-text-primary">
            Flowmind
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="ml-auto h-8 w-8 shrink-0"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto p-space-2">
        <SidebarItem icon={FolderTree} label="Projects" collapsed={!sidebarOpen} />
        <SidebarItem icon={FileText} label="All Thoughts" collapsed={!sidebarOpen} />
        <SidebarItem icon={Hash} label="Contexts" collapsed={!sidebarOpen} />
        <SidebarItem icon={Star} label="Starred" collapsed={!sidebarOpen} />
      </div>
    </nav>
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
