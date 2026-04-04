"use client";

import * as React from "react";
import { Archive, BookmarkPlus, Trash2, Layers } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { UnitTypeBadge } from "~/components/unit/unit-type-badge";
import type { UnitType } from "@prisma/client";

export function OrphanRecovery() {
  const utils = api.useUtils();
  const { data: orphans = [], isLoading } = api.feedback.findOrphans.useQuery();

  const recoverMutation = api.feedback.recoverOrphan.useMutation({
    onSuccess: () => utils.feedback.findOrphans.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  }

  if (orphans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Layers className="h-8 w-8 text-text-tertiary" />
        <p className="text-sm font-medium text-text-secondary">No orphaned units</p>
        <p className="text-xs text-text-tertiary">All your thoughts are connected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">{orphans.length} orphaned units</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              orphans.forEach((u) =>
                recoverMutation.mutate({ unitId: u.id, action: "incubate" }),
              )
            }
          >
            Incubate all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              orphans.forEach((u) =>
                recoverMutation.mutate({ unitId: u.id, action: "archive" }),
              )
            }
          >
            Archive all
          </Button>
        </div>
      </div>

      {orphans.map((unit) => (
        <div
          key={unit.id}
          className="group rounded-xl border border-border bg-bg-primary p-3"
        >
          <div className="mb-1.5">
            <UnitTypeBadge unitType={unit.unitType as UnitType} />
          </div>
          <p className="mb-2 line-clamp-2 text-sm text-text-primary">{unit.content}</p>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => recoverMutation.mutate({ unitId: unit.id, action: "incubate" })}
              title="Add to incubation queue"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => recoverMutation.mutate({ unitId: unit.id, action: "archive" })}
              title="Archive"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => recoverMutation.mutate({ unitId: unit.id, action: "delete" })}
              title="Delete permanently"
              className="text-accent-danger hover:text-accent-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
