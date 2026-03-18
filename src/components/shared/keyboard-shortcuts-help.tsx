"use client";

import * as React from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { formatShortcut } from "~/lib/accessibility";
import { useShortcutRegistry } from "~/hooks/use-keyboard-shortcuts";
import { useFocusTrap } from "~/hooks/use-focus-trap";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Overlay that displays all registered keyboard shortcuts,
 * grouped by category. Auto-generated from the shortcut registry.
 */
export function KeyboardShortcutsHelp({
  open,
  onClose,
}: KeyboardShortcutsHelpProps) {
  const registry = useShortcutRegistry();
  const trapRef = useFocusTrap<HTMLDivElement>({
    active: open,
    onEscape: onClose,
    returnFocus: true,
  });

  // Group shortcuts by their `group` field
  const grouped = React.useMemo(() => {
    const groups = new Map<string, { id: string; label: string; keys: string }[]>();
    for (const [, shortcut] of registry) {
      // Don't show the help shortcut itself in the list redundantly
      const group = shortcut.group ?? "General";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push({
        id: shortcut.id,
        label: shortcut.label,
        keys: shortcut.keys,
      });
    }
    return groups;
  }, [registry]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={trapRef}
            className={cn(
              "fixed left-1/2 top-[15%] z-50 w-full max-w-md",
              "rounded-card border border-border bg-bg-primary",
              "shadow-modal overflow-hidden",
            )}
            initial={{ opacity: 0, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%" }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-label="Keyboard shortcuts"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={onClose}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                  "transition-colors duration-fast",
                )}
                aria-label="Close keyboard shortcuts"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {grouped.size === 0 ? (
                <p className="text-sm text-text-secondary">
                  No shortcuts registered.
                </p>
              ) : (
                Array.from(grouped.entries()).map(([group, items]) => (
                  <div key={group} className="mb-5 last:mb-0">
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      {group}
                    </h3>
                    <table className="w-full" role="presentation">
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1.5 pr-4 text-sm text-text-primary">
                              {item.label}
                            </td>
                            <td className="py-1.5 text-right">
                              <kbd
                                className={cn(
                                  "inline-flex items-center gap-0.5 rounded-md",
                                  "border border-border bg-bg-secondary",
                                  "px-2 py-0.5 text-xs font-medium text-text-secondary",
                                )}
                              >
                                {formatShortcut(item.keys)}
                              </kbd>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
