"use client";

import * as React from "react";
import { Download, Search } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

export function PrivacyPanel() {
  const utils = api.useUtils();
  const [exporting, setExporting] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"json" | "markdown">("json");
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");

  const { data: embeddingPref } = api.user.getEmbeddingPreference.useQuery();
  const setEmbeddingMutation = api.user.setEmbeddingPreference.useMutation({
    onSuccess: () => void utils.user.getEmbeddingPreference.invalidate(),
  });

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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const lines: string[] = [
          `# FlowMind Export`,
          ``,
          `**Exported at:** ${result.data.exportedAt}`,
          `**Format version:** ${result.data.version}`,
          ``,
        ];

        const data = result.data as Record<string, unknown>;

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

        const contexts = data.contexts as Array<{ name: string; description?: string; snapshot?: string }> | undefined;
        if (contexts && contexts.length > 0) {
          lines.push(`## Contexts (${contexts.length})`);
          lines.push(``);
          for (const c of contexts) {
            lines.push(`- **${c.name}**${c.description ? `: ${c.description}` : ""}`);
          }
          lines.push(``);
        }

        const relations = data.relations as Array<unknown> | undefined;
        if (relations && relations.length > 0) {
          lines.push(`## Relations`);
          lines.push(``);
          lines.push(`Total relations: ${relations.length}`);
          lines.push(``);
        }

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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
