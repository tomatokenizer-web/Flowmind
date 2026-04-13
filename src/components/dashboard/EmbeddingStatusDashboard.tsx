"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Loader2, Database, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";

export function EmbeddingStatusDashboard() {
  const statusQuery = api.embedding.status.useQuery();

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
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold text-text-primary">Embedding Status</h2>
        {data.dualReadActive && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">
            Dual-Read Active
          </span>
        )}
      </div>

      {/* Active Models */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
          Active Models
        </h3>
        {data.activeModels.length === 0 ? (
          <div className="text-sm text-text-secondary p-3 border border-border rounded">
            No embedding models configured
          </div>
        ) : (
          <div className="space-y-2">
            {data.activeModels.map((model) => (
              <div
                key={model.name}
                className="flex items-center justify-between p-3 border border-border rounded bg-bg-secondary"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-sm font-medium text-text-primary">{model.name}</div>
                    <div className="text-xs text-text-secondary">
                      {model.provider} &middot; {model.dimension}d &middot; {model.scope}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-text-secondary">
                  {model.unitsEmbedded.toLocaleString()} units
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Re-embed */}
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
