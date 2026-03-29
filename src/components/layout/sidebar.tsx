"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Link2,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "~/lib/utils";
import { useSidebarStore } from "~/stores/sidebar-store";
import { useProjectId } from "~/contexts/project-context";
import { Button } from "~/components/ui/button";
import { ContextTree } from "~/components/context/context-tree";
import { ProjectSelector } from "~/components/project/ProjectSelector";
import { ExternalImportDialog } from "~/components/import/ExternalImportDialog";
import { AttentionPanel } from "~/components/sidebar/AttentionPanel";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const sidebarWidth = useSidebarStore((s) => s.sidebarWidth);
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar);
  const activeContextId = useSidebarStore((s) => s.activeContextId);
  const projectId = useProjectId();
  const pathname = usePathname();
  const [importOpen, setImportOpen] = React.useState(false);

  const isExpanded = sidebarWidth === 260;
  const isCollapsed = sidebarWidth === 60;
  const isHidden = sidebarWidth === 0;

  return (
    <motion.nav
      aria-label="Project navigation"
      className={cn(
        "flex h-full flex-col border-r border-border bg-bg-secondary",
        "motion-reduce:transition-none",
        isHidden && "overflow-hidden",
        className,
      )}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Sidebar header */}
      <div className="flex h-10 items-center justify-between border-b border-border px-space-3">
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="truncate text-sm font-medium text-text-primary"
            >
              Flowmind
            </motion.span>
          )}
        </AnimatePresence>
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

      {/* Scrollable middle section — contains all expandable panels */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {/* Context tree */}
        <ContextTree projectId={projectId} collapsed={isCollapsed} />

        {/* Attention panel — consolidates Incubating, Orphans, Similar, Drift */}
        {projectId && (
          <AttentionPanel
            projectId={projectId}
            activeContextId={activeContextId}
            collapsed={isCollapsed}
          />
        )}
      </div>

      {/* Bottom nav items — utilities (always visible, never scrolled away) */}
      <div className="border-t border-border p-space-2 space-y-0.5">
        <button type="button" onClick={() => setImportOpen(true)}
          className={cn("flex w-full items-center gap-space-3 rounded-lg px-space-3 py-space-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors duration-fast", isCollapsed && "justify-center px-0")}
          title="Import External Content"
          aria-label="Import External Content">
          <Link2 className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Import</span>}
        </button>
        <Link href="/settings" className={cn("flex w-full items-center gap-space-3 rounded-lg px-space-3 py-space-2 text-sm transition-colors duration-fast", isCollapsed && "justify-center px-0", pathname?.startsWith("/settings") ? "bg-bg-hover text-text-primary" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary")}
          title="Settings"
          aria-label="Settings">
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
        <button type="button" onClick={() => void signOut({ callbackUrl: "/" })}
          className={cn("flex w-full items-center gap-space-3 rounded-lg px-space-3 py-space-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-accent-danger transition-colors duration-fast", isCollapsed && "justify-center px-0")}
          title="Sign out"
          aria-label="Sign out">
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Import dialog */}
      <ExternalImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </motion.nav>
  );
}
