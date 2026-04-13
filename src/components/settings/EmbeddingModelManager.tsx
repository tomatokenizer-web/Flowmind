"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Loader2,
  Database,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";

// ─── Register Model Form ─────────────────────────────────────────

function RegisterModelForm({ onRegistered, onCancel }: { onRegistered: () => void; onCancel: () => void }) {
  const [name, setName] = React.useState("");
  const [provider, setProvider] = React.useState("openai");
  const [dimension, setDimension] = React.useState(1536);

  const utils = api.useUtils();
  const registerMutation = api.embedding.registerModel.useMutation({
    onSuccess: () => {
      void utils.embedding.status.invalidate();
      onRegistered();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    registerMutation.mutate({
      name: name.trim(),
      provider,
      dimension,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text-secondary">Model Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. text-embedding-3-small"
          className="mt-1 w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-text-secondary">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="cohere">Cohere</option>
            <option value="local">Local</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Dimension</label>
          <input
            type="number"
            value={dimension}
            onChange={(e) => setDimension(parseInt(e.target.value) || 0)}
            min={1}
            max={4096}
            className="mt-1 w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={registerMutation.isPending || !name.trim()}>
          {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
      {registerMutation.error && (
        <p className="text-xs text-red-400">{registerMutation.error.message}</p>
      )}
    </form>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────

export function EmbeddingModelManager() {
  const [showRegister, setShowRegister] = React.useState(false);
  const utils = api.useUtils();

  const statusQuery = api.embedding.status.useQuery();

  const deactivateMutation = api.embedding.deactivateModel.useMutation({
    onSuccess: () => void utils.embedding.status.invalidate(),
  });

  const reembedMutation = api.embedding.markForReembed.useMutation({
    onSuccess: () => void utils.embedding.status.invalidate(),
  });

  if (statusQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (statusQuery.error) {
    return (
      <div className="text-center py-8 text-red-400 text-sm">
        Failed to load embedding status
        <Button variant="outline" size="sm" className="mt-2" onClick={() => statusQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const data = statusQuery.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Embedding Models</h2>
          {data.dualReadActive && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
              Dual-Read Active
            </span>
          )}
        </div>
        {!showRegister && (
          <Button size="sm" variant="outline" onClick={() => setShowRegister(true)}>
            <Plus className="h-4 w-4 mr-1" /> Register Model
          </Button>
        )}
      </div>

      {showRegister && (
        <div className="border border-accent/20 rounded p-4 bg-accent/5">
          <RegisterModelForm
            onRegistered={() => setShowRegister(false)}
            onCancel={() => setShowRegister(false)}
          />
        </div>
      )}

      {/* Active Models */}
      {data.activeModels.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No embedding models registered yet.
        </div>
      ) : (
        <div className="space-y-3">
          {data.activeModels.map((model) => (
            <div
              key={model.name}
              className="flex items-center justify-between p-4 border border-border rounded bg-bg-secondary"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary">{model.name}</div>
                  <div className="text-xs text-text-tertiary">
                    {model.provider} &middot; {model.dimension}d &middot; {model.scope}
                    &middot; {model.unitsEmbedded.toLocaleString()} units embedded
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reembedMutation.mutate({ fromModel: model.name })}
                  disabled={reembedMutation.isPending}
                  title="Mark all units for re-embedding"
                >
                  <RefreshCw className={cn("h-4 w-4", reembedMutation.isPending && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Deactivate "${model.name}"? Existing embeddings will be preserved.`)) {
                      deactivateMutation.mutate({ modelName: model.name });
                    }
                  }}
                  disabled={deactivateMutation.isPending}
                  className="text-red-400 hover:bg-red-400/10"
                  title="Deactivate model"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending re-embed */}
      {data.unitsPendingReembed > 0 && (
        <div className="flex items-center gap-2 p-3 border border-amber-500/20 rounded bg-amber-500/5">
          <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
          <span className="text-sm text-amber-500">
            {data.unitsPendingReembed.toLocaleString()} units pending re-embedding
          </span>
        </div>
      )}
    </div>
  );
}
