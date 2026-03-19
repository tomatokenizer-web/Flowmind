"use client";

import * as React from "react";
import { Key, Download, Puzzle, User, ArrowLeft, Copy, Trash2, Plus, Check } from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

// ─── Tab types ─────────────────────────────────────────────────────
type Tab = "profile" | "api-keys" | "export" | "integrations";

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
        <p className="mb-3 text-sm font-medium text-text-primary">Create new key</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. My App)"
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            onKeyDown={(e) => e.key === "Enter" && newKeyName && createMutation.mutate({ name: newKeyName })}
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
            <p className="mb-1 text-xs font-medium text-accent-primary">⚠ Copy now — shown only once</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs text-text-primary">{createdKey}</code>
              <button onClick={handleCopy} className="shrink-0 text-accent-primary hover:text-accent-primary/80">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing keys */}
      {keys.length > 0 ? (
        <div className="space-y-2">
          {keys.map((key: { id: string; name: string; createdAt: string; lastUsed?: string | null }) => (
            <div key={key.id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{key.name}</p>
                <p className="text-xs text-text-tertiary">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsed && ` · Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate({ id: key.id })}
                className="text-text-tertiary hover:text-accent-danger transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-tertiary">No API keys yet.</p>
      )}

      {/* REST API docs */}
      <div className="rounded-xl border border-border p-4 text-sm text-text-secondary">
        <p className="font-medium text-text-primary mb-1">REST API endpoint</p>
        <code className="text-xs text-text-tertiary">GET /api/context/[contextId]/export?format=json</code>
        <p className="mt-2 text-xs">Supported formats: <code>json</code>, <code>markdown</code>, <code>prompt_package</code></p>
      </div>
    </div>
  );
}

// ─── Data Export Panel ─────────────────────────────────────────────
function DataExportPanel() {
  const [exporting, setExporting] = React.useState(false);

  const { refetch } = api.apiKey.exportAllData.useQuery(undefined, { enabled: false });

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await refetch();
      if (result.data) {
        const json = JSON.stringify(result.data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `flowmind-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Data Export</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Download all your units, contexts, assemblies, and relations.
        </p>
      </div>

      <div className="rounded-xl border border-border p-6 text-center">
        <Download className="mx-auto mb-3 h-10 w-10 text-text-tertiary" />
        <p className="mb-1 font-medium text-text-primary">Export all data</p>
        <p className="mb-4 text-sm text-text-secondary">Downloads as a JSON file you own completely.</p>
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting..." : "Download Export"}
        </Button>
      </div>

      <div className="rounded-xl border border-border p-4 text-sm text-text-secondary space-y-2">
        <p className="font-medium text-text-primary">Privacy</p>
        <p>• Your data is never used for AI training</p>
        <p>• AI features only send content you explicitly submit</p>
        <p>• You can delete your account and all data at any time</p>
      </div>
    </div>
  );
}

// ─── Integrations Panel ────────────────────────────────────────────
function IntegrationsPanel() {
  const integrations = [
    { name: "Google Calendar", desc: "Delegate action units as calendar events", icon: "📅", status: "coming-soon" },
    { name: "Todoist", desc: "Send action units to your task list", icon: "✅", status: "coming-soon" },
    { name: "Slack", desc: "Share contexts and assemblies to channels", icon: "💬", status: "coming-soon" },
    { name: "Notion", desc: "Export assemblies to Notion pages", icon: "📓", status: "coming-soon" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Integrations</h2>
        <p className="mt-1 text-sm text-text-secondary">Connect Flowmind with your existing tools.</p>
      </div>
      <div className="space-y-3">
        {integrations.map((integration) => (
          <div key={integration.name} className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <p className="font-medium text-text-primary">{integration.name}</p>
                <p className="text-sm text-text-secondary">{integration.desc}</p>
              </div>
            </div>
            <span className="rounded-full bg-bg-secondary px-3 py-1 text-xs text-text-tertiary">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>("api-keys");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "export", label: "Data Export", icon: Download },
    { id: "integrations", label: "Integrations", icon: Puzzle },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard" className="text-text-tertiary hover:text-text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Settings</h1>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-48 shrink-0">
          <ul className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    activeTab === id
                      ? "bg-accent-primary/10 text-accent-primary font-medium"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "api-keys" && <ApiKeysPanel />}
          {activeTab === "export" && <DataExportPanel />}
          {activeTab === "integrations" && <IntegrationsPanel />}
        </div>
      </div>
    </div>
  );
}
