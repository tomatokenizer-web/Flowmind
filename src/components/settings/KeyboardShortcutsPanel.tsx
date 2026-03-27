"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useShortcutRegistry } from "~/hooks/use-keyboard-shortcuts";
import { formatShortcut } from "~/lib/accessibility";

export function KeyboardShortcutsPanel() {
  const registry = useShortcutRegistry();
  const [search, setSearch] = React.useState("");

  const grouped = React.useMemo(() => {
    const groups = new Map<
      string,
      { id: string; label: string; keys: string }[]
    >();
    for (const [, shortcut] of registry) {
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

  const filteredGroups = React.useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const filtered = new Map<
      string,
      { id: string; label: string; keys: string }[]
    >();
    for (const [group, items] of grouped) {
      const matching = items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.keys.toLowerCase().includes(q) ||
          group.toLowerCase().includes(q),
      );
      if (matching.length > 0) filtered.set(group, matching);
    }
    return filtered;
  }, [grouped, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Keyboard Shortcuts
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          All registered shortcuts in the application. Press{" "}
          <kbd className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-xs">
            {formatShortcut("mod+/")}
          </kbd>{" "}
          to toggle the overlay anywhere.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shortcuts..."
          className="w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          aria-label="Search keyboard shortcuts"
        />
      </div>

      {/* Shortcuts list */}
      {filteredGroups.size === 0 ? (
        <p className="text-sm text-text-tertiary">
          {search ? "No shortcuts match your search." : "No shortcuts registered."}
        </p>
      ) : (
        Array.from(filteredGroups.entries()).map(([group, items]) => (
          <div key={group} className="rounded-xl border border-border p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">
              {group}
            </h3>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-bg-hover"
                >
                  <span className="text-sm text-text-primary">
                    {item.label}
                  </span>
                  <kbd className="inline-flex items-center gap-0.5 rounded-md border border-border bg-bg-secondary px-2 py-0.5 text-xs font-medium text-text-secondary">
                    {formatShortcut(item.keys)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
