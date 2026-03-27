"use client";

import * as React from "react";
import { User, Check } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

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

export function ProfilePanel() {
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
