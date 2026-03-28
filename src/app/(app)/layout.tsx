"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, SIDEBAR_MIN, SIDEBAR_MAX } from "@/stores/workspace-store";
import { useResizablePanel } from "@/hooks/use-resizable-panel";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { StoreProvider } from "@/components/providers/store-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { RightPanel } from "@/components/layout/right-panel";
import { StatusBar } from "@/components/layout/status-bar";
import { CommandPalette } from "@/components/layout/command-palette";

// ---------------------------------------------------------------------------
// Sidebar resize handle
// ---------------------------------------------------------------------------

function SidebarResizeHandle({
  onMouseDown,
  isDragging,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onMouseDown={onMouseDown}
      className={cn(
        "relative z-10 w-1 shrink-0 cursor-col-resize",
        "transition-colors duration-[var(--duration-fast)]",
        "hover:bg-[var(--accent-primary)]/30",
        isDragging && "bg-[var(--accent-primary)]/50",
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Inner layout (needs store access)
// ---------------------------------------------------------------------------

function AppLayoutInner({ children }: { children: ReactNode }) {
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  const {
    width: currentSidebarWidth,
    isDragging: isSidebarDragging,
    handleMouseDown: handleSidebarMouseDown,
  } = useResizablePanel({
    initialWidth: sidebarWidth,
    minWidth: SIDEBAR_MIN,
    maxWidth: SIDEBAR_MAX,
    direction: "right",
    onWidthChange: (w) => {
      useWorkspaceStore.setState({ sidebarWidth: w });
    },
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* ── Left sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: currentSidebarWidth }}
              exit={{ width: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="shrink-0 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              <Sidebar />
            </motion.div>
            <SidebarResizeHandle
              onMouseDown={handleSidebarMouseDown}
              isDragging={isSidebarDragging}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── Center column (top bar + main content + status bar) ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="flex-1 overflow-y-auto" id="main-content">
          {children}
        </main>

        <StatusBar />
      </div>

      {/* ── Right panel ── */}
      <RightPanel />

      {/* ── Command palette overlay ── */}
      <CommandPalette />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported layout (wraps with StoreProvider)
// ---------------------------------------------------------------------------

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </StoreProvider>
  );
}
