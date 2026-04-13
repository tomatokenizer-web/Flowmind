"use client";

import * as React from "react";
import {
  Key,
  Puzzle,
  User,
  ArrowLeft,
  Brain,
  Keyboard,
  Shield,
  Palette,
  Database,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { ProfilePanel } from "~/components/settings/ProfilePanel";
import { AIPreferencesPanel } from "~/components/settings/AIPreferencesPanel";
import { KeyboardShortcutsPanel } from "~/components/settings/KeyboardShortcutsPanel";
import { PrivacyPanel } from "~/components/settings/PrivacyPanel";
import { ApiKeysPanel } from "~/components/settings/ApiKeysPanel";
import { IntegrationsPanel } from "~/components/settings/IntegrationsPanel";
import { AppearancePanel } from "~/components/settings/AppearancePanel";
import { EmbeddingModelManager } from "~/components/settings/EmbeddingModelManager";
import { SharingPanel } from "~/components/settings/SharingPanel";

// ─── Tab types ─────────────────────────────────────────────────────
type Tab =
  | "profile"
  | "appearance"
  | "ai-preferences"
  | "keyboard-shortcuts"
  | "privacy"
  | "api-keys"
  | "export"
  | "integrations"
  | "embeddings"
  | "sharing";

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
    { id: "embeddings", label: "Embeddings", icon: Database },
    { id: "sharing" as Tab, label: "Sharing", icon: Users },
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
        <TabsContent value="embeddings">
          <EmbeddingModelManager />
        </TabsContent>
        <TabsContent value="sharing">
          <SharingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
