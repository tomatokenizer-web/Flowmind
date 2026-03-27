"use client";

import * as React from "react";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

export function ApiKeysPanel() {
  const [newKeyName, setNewKeyName] = React.useState("");
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const utils = api.useUtils();

  const { data: keys = [] } = api.apiKey.list.useQuery();

  const createMutation = api.apiKey.create.useMutation({
    onSuccess: () => {
      setNewKeyName("");
      void utils.apiKey.list.invalidate();
    },
    onError: () => {
      // API key management is not yet available
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
