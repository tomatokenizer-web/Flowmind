"use client";

import * as React from "react";
import {
  Key,
  Download,
  Puzzle,
  User,
  ArrowLeft,
  Copy,
  Trash2,
  Plus,
  Check,
  Brain,
  Keyboard,
  Shield,
  Search,
  Palette,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { useShortcutRegistry } from "~/hooks/use-keyboard-shortcuts";
import { formatShortcut } from "~/lib/accessibility";

// ─── Tab types ─────────────────────────────────────────────────────
type Tab =
  | "profile"
  | "appearance"
  | "ai-preferences"
  | "keyboard-shortcuts"
  | "privacy"
  | "api-keys"
  | "export"
  | "integrations";

// ─── Profile Panel ──────────────────────────────────────────────────
function ProfilePanel() {
  const { data: session } = api.user.getProfile.useQuery();
  const { data: accounts = [] } = api.user.getConnectedAccounts.useQuery();
  const utils = api.useUtils();

  const [displayName, setDisplayName] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (session?.name) setDisplayName(session.name);
  }, [session?.name]);

  const updateNameMutation = api.user.updateProfile.useMutation({
    onSuccess: () => {
      void utils.user.getProfile.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSaveName = () => {
    if (displayName.trim()) {
      updateNameMutation.mutate({ name: displayName.trim() });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your account information and connected services.
        </p>
      </div>

      {/* Avatar & basic info */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-4">
          {session?.image ? (
            <img
              src={session.image}
              alt="Profile avatar"
              className="h-16 w-16 rounded-full border-2 border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-bg-secondary">
              <User className="h-8 w-8 text-text-tertiary" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              {session?.email ?? "Loading..."}
            </p>
            <p className="text-xs text-text-tertiary">
              Member since{" "}
              {session?.createdAt
                ? new Date(session.createdAt).toLocaleDateString()
                : "..."}
            </p>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="rounded-xl border border-border p-4">
        <label
          htmlFor="display-name"
          className="mb-2 block text-sm font-medium text-text-primary"
        >
          Display Name
        </label>
        <div className="flex gap-2">
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            onKeyDown={(e) =>
              e.key === "Enter" && displayName.trim() && handleSaveName()
            }
          />
          <Button
            onClick={handleSaveName}
            disabled={
              !displayName.trim() || updateNameMutation.isPending || saved
            }
            size="sm"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" /> Saved
              </>
            ) : updateNameMutation.isPending ? (
              "Saving..."
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      {/* Connected accounts */}
      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-medium text-text-primary">
          Connected Accounts
        </p>
        {accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map(
              (account: { provider: string; providerAccountId: string }) => (
                <div
                  key={account.providerAccountId}
                  className="flex items-center gap-3 rounded-lg bg-bg-secondary/50 px-3 py-2"
                >
                  <ProviderIcon provider={account.provider} />
                  <span className="text-sm capitalize text-text-primary">
                    {account.provider}
                  </span>
                  <span className="ml-auto rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs text-accent-primary">
                    Connected
                  </span>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">
            No OAuth providers connected. Sign in with Google or GitHub to link
            your account.
          </p>
        )}
      </div>
    </div>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider.toLowerCase()) {
    case "google":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded bg-white text-sm shadow-sm">
          G
        </span>
      );
    case "github":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-800 text-sm text-white shadow-sm">
          GH
        </span>
      );
    default:
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded bg-bg-secondary text-xs text-text-tertiary">
          ?
        </span>
      );
  }
}

// ─── AI Preferences Panel ────────────────────────────────────────────
function AIPreferencesPanel() {
  const { data: prefs } = api.user.getAIPreferences.useQuery();
  const utils = api.useUtils();

  const [intensity, setIntensity] = React.useState(50);
  const [model, setModel] = React.useState<"depth" | "speed" | "balanced">("balanced");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (prefs) {
      setIntensity(prefs.interventionIntensity ?? 50);
      setModel((prefs.modelPreference ?? "balanced") as "depth" | "speed" | "balanced");
    }
  }, [prefs]);

  const updateMutation = api.user.updateAIPreferences.useMutation({
    onSuccess: () => {
      void utils.user.getAIPreferences.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      interventionIntensity: intensity,
      modelPreference: model,
    });
  };

  const intensityLabel =
    intensity < 25
      ? "Minimal"
      : intensity < 50
        ? "Light"
        : intensity < 75
          ? "Moderate"
          : "Active";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          AI Preferences
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Configure how AI assists your thinking process.
        </p>
      </div>

      {/* Intervention intensity */}
      <div className="rounded-xl border border-border p-4">
        <label
          htmlFor="ai-intensity"
          className="mb-1 block text-sm font-medium text-text-primary"
        >
          AI Intervention Intensity
        </label>
        <p className="mb-4 text-xs text-text-tertiary">
          How proactively the AI suggests connections, improvements, and
          insights.
        </p>
        <div className="flex items-center gap-4">
          <span className="w-12 text-xs text-text-tertiary">Minimal</span>
          <input
            id="ai-intensity"
            type="range"
            min={0}
            max={100}
            step={1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-bg-secondary accent-accent-primary"
            aria-label="AI intervention intensity slider"
            aria-valuenow={intensity}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${intensityLabel} (${intensity}%)`}
          />
          <span className="w-12 text-right text-xs text-text-tertiary">
            Active
          </span>
        </div>
        <p className="mt-2 text-center text-sm font-medium text-accent-primary">
          {intensityLabel} ({intensity}%)
        </p>
      </div>

      {/* Model preference */}
      <div className="rounded-xl border border-border p-4">
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Model Preference
        </label>
        <p className="mb-3 text-xs text-text-tertiary">
          Choose the AI behavior profile that best matches your workflow.
        </p>
        <div className="space-y-2">
          {[
            {
              id: "speed",
              label: "Speed",
              desc: "Faster responses, lighter analysis",
            },
            {
              id: "balanced",
              label: "Balanced",
              desc: "Good mix of speed and depth",
            },
            {
              id: "depth",
              label: "Depth",
              desc: "Thorough analysis, deeper connections",
            },
          ].map((opt) => (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                model === opt.id
                  ? "border-accent-primary bg-accent-primary/5"
                  : "border-border hover:bg-bg-hover",
              )}
            >
              <input
                type="radio"
                name="model-preference"
                value={opt.id}
                checked={model === opt.id}
                onChange={(e) => setModel(e.target.value as "depth" | "speed" | "balanced")}
                className="accent-accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {opt.label}
                </p>
                <p className="text-xs text-text-tertiary">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending || saved}
        className="w-full"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Preferences Saved
          </>
        ) : updateMutation.isPending ? (
          "Saving..."
        ) : (
          "Save AI Preferences"
        )}
      </Button>
    </div>
  );
}

// ─── Keyboard Shortcuts Panel ────────────────────────────────────────
function KeyboardShortcutsPanel() {
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

// ─── Privacy Panel ──────────────────────────────────────────────────
function PrivacyPanel() {
  // Export state
  const [exporting, setExporting] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"json" | "markdown">("json");

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

  // Embedding preference
  const { data: embeddingPref } = api.user.getEmbeddingPreference.useQuery();
  const setEmbeddingMutation = api.user.setEmbeddingPreference.useMutation();

  const { refetch } = api.apiKey.exportAllData.useQuery(undefined, {
    enabled: false,
  });

  const deleteMutation = api.user.deleteAccount.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await refetch();
      if (!result.data) return;

      const date = new Date().toISOString().split("T")[0];

      if (exportFormat === "json") {
        const json = JSON.stringify(result.data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `flowmind-export-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Markdown format
        const lines: string[] = [
          `# FlowMind Export`,
          ``,
          `**Exported at:** ${result.data.exportedAt}`,
          `**Format version:** ${result.data.version}`,
          ``,
        ];

        const data = result.data as Record<string, unknown>;

        // Projects
        const projects = data.projects as Array<{ name: string; type?: string; createdAt: string }> | undefined;
        if (projects && projects.length > 0) {
          lines.push(`## Projects (${projects.length})`);
          lines.push(``);
          for (const p of projects) {
            lines.push(`### ${p.name}`);
            if (p.type) lines.push(`- Type: ${p.type}`);
            lines.push(`- Created: ${new Date(p.createdAt).toLocaleDateString()}`);
            lines.push(``);
          }
        }

        // Units
        const units = data.units as Array<{ content: string; unitType: string; lifecycle: string; quality: string; createdAt: string }> | undefined;
        if (units && units.length > 0) {
          lines.push(`## Units (${units.length})`);
          lines.push(``);
          for (const u of units) {
            lines.push(`### [${u.unitType}] ${u.content.slice(0, 80)}${u.content.length > 80 ? "..." : ""}`);
            lines.push(`- Lifecycle: ${u.lifecycle} | Quality: ${u.quality}`);
            lines.push(`- Created: ${new Date(u.createdAt).toLocaleDateString()}`);
            lines.push(``);
          }
        }

        // Contexts
        const contexts = data.contexts as Array<{ name: string; description?: string; snapshot?: string }> | undefined;
        if (contexts && contexts.length > 0) {
          lines.push(`## Contexts (${contexts.length})`);
          lines.push(``);
          for (const c of contexts) {
            lines.push(`- **${c.name}**${c.description ? `: ${c.description}` : ""}`);
          }
          lines.push(``);
        }

        // Relations summary
        const relations = data.relations as Array<unknown> | undefined;
        if (relations && relations.length > 0) {
          lines.push(`## Relations`);
          lines.push(``);
          lines.push(`Total relations: ${relations.length}`);
          lines.push(``);
        }

        // Tags
        const tags = data.tags as Array<{ name: string; color?: string }> | undefined;
        if (tags && tags.length > 0) {
          lines.push(`## Tags (${tags.length})`);
          lines.push(``);
          lines.push(tags.map((t) => `\`${t.name}\``).join(", "));
          lines.push(``);
        }

        const markdown = lines.join("\n");
        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `flowmind-export-${date}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmText("");
  };

  const deleteConfirmReady = deleteConfirmText === "DELETE";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Privacy & Data
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Understand how your data is used and manage your account.
        </p>
      </div>

      {/* AI data usage */}
      <div className="rounded-xl border border-border p-4 text-sm">
        <p className="mb-3 font-medium text-text-primary">
          Data sent to AI services
        </p>
        <ul className="space-y-2 text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent-primary">--</span>
            <span>
              Only content you explicitly submit for AI analysis is sent to
              external AI providers.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent-primary">--</span>
            <span>
              AI features include: auto-classification, relation suggestions,
              decomposition, and thought drift detection.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent-primary">--</span>
            <span>
              Your data is never used to train AI models.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent-primary">--</span>
            <span>
              All AI processing is stateless -- providers do not retain your
              content after processing.
            </span>
          </li>
        </ul>
      </div>

      {/* AI-powered search (embedding) toggle */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <Search className="mt-0.5 h-5 w-5 text-text-tertiary" />
          <div className="flex-1">
            <p className="font-medium text-text-primary">AI-Powered Search</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              When enabled, your unit content is processed into vector embeddings
              for semantic search. Disable to opt out of AI indexing entirely.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={embeddingPref?.embeddingEnabled ?? true}
            disabled={setEmbeddingMutation.isPending}
            onClick={() =>
              setEmbeddingMutation.mutate({
                embeddingEnabled: !(embeddingPref?.embeddingEnabled ?? true),
              })
            }
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              (embeddingPref?.embeddingEnabled ?? true)
                ? "bg-accent-primary"
                : "bg-border",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
                (embeddingPref?.embeddingEnabled ?? true)
                  ? "translate-x-5"
                  : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>

      {/* Export data */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 text-text-tertiary" />
          <div className="flex-1">
            <p className="font-medium text-text-primary">Export All Data</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Download a complete export of your projects, units, contexts,
              assemblies, relations, resources, and tags.
            </p>
            {/* Format selector */}
            <div className="mt-3 flex items-center gap-1 rounded-lg border border-border bg-surface-secondary p-1 w-fit">
              <button
                onClick={() => setExportFormat("json")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  exportFormat === "json"
                    ? "bg-surface-primary text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary",
                )}
              >
                JSON
              </button>
              <button
                onClick={() => setExportFormat("markdown")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  exportFormat === "markdown"
                    ? "bg-surface-primary text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary",
                )}
              >
                Markdown
              </button>
            </div>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
            size="sm"
          >
            {exporting ? "Exporting..." : "Download"}
          </Button>
        </div>
      </div>

      {/* Delete account */}
      <div className="rounded-xl border border-accent-danger/30 p-4">
        <p className="mb-1 font-medium text-accent-danger">Delete Account</p>
        <p className="mb-4 text-sm text-text-secondary">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>

        {!showDeleteDialog ? (
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="outline"
            size="sm"
            className="border-accent-danger/50 text-accent-danger hover:bg-accent-danger/10"
          >
            Delete My Account
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              This will permanently erase all your projects, units, contexts,
              assemblies, and relations. Type{" "}
              <span className="font-mono font-semibold text-accent-danger">
                DELETE
              </span>{" "}
              to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              autoFocus
              className={cn(
                "w-full rounded-lg border bg-surface-primary px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-danger/50",
                deleteConfirmReady
                  ? "border-accent-danger/60"
                  : "border-border",
              )}
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={() => deleteMutation.mutate()}
                disabled={!deleteConfirmReady || deleteMutation.isPending}
                size="sm"
                className="bg-accent-danger text-white hover:bg-accent-danger/90 disabled:opacity-40"
              >
                {deleteMutation.isPending
                  ? "Deleting..."
                  : "Permanently Delete Account"}
              </Button>
              <Button
                onClick={handleDeleteCancel}
                variant="outline"
                size="sm"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
            </div>
            {deleteMutation.isError && (
              <p className="text-xs text-accent-danger">
                Failed to delete account. Please try again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── API Keys Panel ────────────────────────────────────────────────
function ApiKeysPanel() {
  const [newKeyName, setNewKeyName] = React.useState("");
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const utils = api.useUtils();

  const { data: keys = [] } = api.apiKey.list.useQuery();

  const createMutation = api.apiKey.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setNewKeyName("");
      void utils.apiKey.list.invalidate();
    },
  });

  const deleteMutation = api.apiKey.delete.useMutation({
    onSuccess: () => void utils.apiKey.list.invalidate(),
  });

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">API Keys</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Use API keys to access your Flowmind data from external tools.
        </p>
      </div>

      {/* Create new key */}
      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-medium text-text-primary">
          Create new key
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. My App)"
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            onKeyDown={(e) =>
              e.key === "Enter" &&
              newKeyName &&
              createMutation.mutate({ name: newKeyName })
            }
          />
          <Button
            onClick={() => createMutation.mutate({ name: newKeyName })}
            disabled={!newKeyName || createMutation.isPending}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        {/* Show created key once */}
        {createdKey && (
          <div className="mt-3 rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-3">
            <p className="mb-1 text-xs font-medium text-accent-primary">
              Copy now -- shown only once
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs text-text-primary">
                {createdKey}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 text-accent-primary hover:text-accent-primary/80"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing keys */}
      {keys.length > 0 ? (
        <div className="space-y-2">
          {keys.map(
            (key: {
              id: string;
              name: string;
              createdAt: string;
              lastUsed?: string | null;
            }) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {key.name}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsed &&
                      ` -- Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate({ id: key.id })}
                  className="text-text-tertiary transition-colors hover:text-accent-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="text-sm text-text-tertiary">No API keys yet.</p>
      )}

      {/* REST API docs */}
      <div className="space-y-2 rounded-xl border border-border p-4 text-sm text-text-secondary">
        <p className="font-medium text-text-primary">REST API endpoint</p>
        <code className="text-xs text-text-tertiary">
          GET /api/context/[contextId]/export?format=json
        </code>
        <p className="mt-2 text-xs">
          Supported formats: <code>json</code>, <code>markdown</code>,{" "}
          <code>prompt_package</code>
        </p>
      </div>
    </div>
  );
}

// ─── Integrations Panel ────────────────────────────────────────────
function IntegrationsPanel() {
  const integrations = [
    {
      name: "Google Calendar",
      desc: "Delegate action units as calendar events",
      icon: "cal",
      status: "coming-soon",
    },
    {
      name: "Todoist",
      desc: "Send action units to your task list",
      icon: "todo",
      status: "coming-soon",
    },
    {
      name: "Slack",
      desc: "Share contexts and assemblies to channels",
      icon: "slack",
      status: "coming-soon",
    },
    {
      name: "Notion",
      desc: "Export assemblies to Notion pages",
      icon: "notion",
      status: "coming-soon",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Integrations
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Connect Flowmind with your existing tools.
        </p>
      </div>
      <div className="space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary text-sm font-medium text-text-secondary">
                {integration.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {integration.name}
                </p>
                <p className="text-sm text-text-secondary">
                  {integration.desc}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-bg-secondary px-3 py-1 text-xs text-text-tertiary">
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Appearance Panel ────────────────────────────────────────────
function AppearancePanel() {
  const [theme, setThemeState] = React.useState<"light" | "natural-dark">("light");

  React.useEffect(() => {
    // Dynamic import to avoid SSR issues
    void import("~/lib/theme").then(({ getTheme }) => {
      setThemeState(getTheme());
    });
  }, []);

  const handleThemeChange = async (mode: "light" | "natural-dark") => {
    const { setTheme } = await import("~/lib/theme");
    setTheme(mode);
    setThemeState(mode);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Choose your preferred visual theme.
        </p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <label className="mb-3 block text-sm font-medium text-text-primary">
          Theme
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleThemeChange("light")}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border p-4 transition-colors",
              theme === "light"
                ? "border-accent-primary bg-accent-primary/5"
                : "border-border hover:bg-bg-hover",
            )}
          >
            <div className="flex h-16 w-full items-center justify-center rounded-lg bg-white border border-gray-200">
              <Sun className="h-6 w-6 text-amber-500" />
            </div>
            <span className="text-sm font-medium text-text-primary">Light</span>
            <span className="text-xs text-text-tertiary">Clean and bright</span>
          </button>
          <button
            type="button"
            onClick={() => void handleThemeChange("natural-dark")}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border p-4 transition-colors",
              theme === "natural-dark"
                ? "border-accent-primary bg-accent-primary/5"
                : "border-border hover:bg-bg-hover",
            )}
          >
            <div className="flex h-16 w-full items-center justify-center rounded-lg bg-[#1a1a17] border border-[#3d3d38]">
              <Moon className="h-6 w-6 text-[#c9a96e]" />
            </div>
            <span className="text-sm font-medium text-text-primary">Natural</span>
            <span className="text-xs text-text-tertiary">Warm earthy tones</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────
export default function SettingsPage() {
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "ai-preferences", label: "AI Preferences", icon: Brain },
    { id: "keyboard-shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "privacy", label: "Privacy & Data", icon: Shield },
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "export", label: "Integrations", icon: Puzzle },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-text-tertiary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-2xl font-semibold text-text-primary">
          Settings
        </h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <ProfilePanel />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearancePanel />
        </TabsContent>
        <TabsContent value="ai-preferences">
          <AIPreferencesPanel />
        </TabsContent>
        <TabsContent value="keyboard-shortcuts">
          <KeyboardShortcutsPanel />
        </TabsContent>
        <TabsContent value="privacy">
          <PrivacyPanel />
        </TabsContent>
        <TabsContent value="api-keys">
          <ApiKeysPanel />
        </TabsContent>
        <TabsContent value="export">
          <IntegrationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
