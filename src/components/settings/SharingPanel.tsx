"use client";

import * as React from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Loader2,
  Users,
  UserPlus,
  Shield,
  Pencil,
  Eye,
  X,
  Mail,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useProjectId } from "~/contexts/project-context";

const ROLE_CONFIG = {
  viewer: { label: "Viewer", icon: Eye, color: "text-blue-400" },
  editor: { label: "Editor", icon: Pencil, color: "text-green-500" },
} as const;

export function SharingPanel() {
  const projectId = useProjectId();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"viewer" | "editor">("viewer");
  const [showInvite, setShowInvite] = React.useState(false);
  const utils = api.useUtils();

  const sharesQuery = api.sharing.listShares.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const accessQuery = api.sharing.checkAccess.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const shareMutation = api.sharing.shareByEmail.useMutation({
    onSuccess: () => {
      void utils.sharing.listShares.invalidate();
      setEmail("");
      setShowInvite(false);
    },
  });

  const updateRoleMutation = api.sharing.updateRole.useMutation({
    onSuccess: () => void utils.sharing.listShares.invalidate(),
  });

  const revokeMutation = api.sharing.revoke.useMutation({
    onSuccess: () => void utils.sharing.listShares.invalidate(),
  });

  if (!projectId) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm">
        Select a project to manage sharing.
      </div>
    );
  }

  const isOwner = accessQuery.data?.level === "owner";

  if (sharesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // Non-owners see a read-only view
  if (!isOwner && !sharesQuery.error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Sharing</h2>
        </div>
        <div className="rounded border border-border p-4 text-sm text-text-secondary">
          <Shield className="h-4 w-4 inline mr-1" />
          You have <strong>{accessQuery.data?.level ?? "unknown"}</strong> access to this project.
          Only the project owner can manage sharing settings.
        </div>
      </div>
    );
  }

  const shares = sharesQuery.data ?? [];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    shareMutation.mutate({ projectId: projectId!, email: email.trim(), role });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">Sharing</h2>
          {shares.length > 0 && (
            <span className="text-xs text-text-tertiary">{shares.length} collaborator{shares.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        {!showInvite && (
          <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Invite
          </Button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="border border-accent/20 rounded p-4 bg-accent/5 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-10 pr-3 py-2 text-sm border border-border rounded bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
              className="rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={shareMutation.isPending || !email.trim()}>
              {shareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
          </div>
          {shareMutation.error && (
            <p className="text-xs text-red-400">{shareMutation.error.message}</p>
          )}
        </form>
      )}

      {/* Shares list */}
      {shares.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          This project is not shared with anyone yet.
        </div>
      ) : (
        <div className="space-y-2">
          {shares.map((share: { userId: string; role: string; user?: { name?: string | null; email?: string | null } }) => {
            const roleKey = share.role as keyof typeof ROLE_CONFIG;
            const config = ROLE_CONFIG[roleKey] ?? ROLE_CONFIG.viewer;
            const RoleIcon = config.icon;

            return (
              <div
                key={share.userId}
                className="flex items-center justify-between p-3 border border-border rounded bg-bg-secondary"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-bg-primary flex items-center justify-center">
                    <RoleIcon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {share.user?.name ?? share.user?.email ?? share.userId}
                    </div>
                    {share.user?.email && share.user?.name && (
                      <div className="text-xs text-text-tertiary truncate">{share.user.email}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={share.role}
                    onChange={(e) =>
                      updateRoleMutation.mutate({
                        projectId: projectId!,
                        userId: share.userId,
                        role: e.target.value as "viewer" | "editor",
                      })
                    }
                    className="rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Revoke this user's access?")) {
                        revokeMutation.mutate({ projectId: projectId!, userId: share.userId });
                      }
                    }}
                    className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
