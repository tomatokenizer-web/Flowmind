# Story 2.12: User Settings Page

**Status: pending**

## Description
As a user,
I want a centralized settings page where I can manage my profile, AI preferences, integrations, and application behavior,
So that I can customize Flowmind to my workflow preferences.

## Acceptance Criteria

**Given** the user is authenticated
**When** they navigate to Settings (via sidebar or Cmd+,)
**Then** a settings page is displayed with tabbed sections: Profile, AI Preferences, Integrations, Privacy, Keyboard Shortcuts

**Given** the Profile tab
**When** viewed
**Then** the user can see their display name, email, avatar, and connected OAuth providers
**And** they can disconnect/reconnect OAuth providers

**Given** the AI Preferences tab
**When** viewed
**Then** the user can configure: default AI Intervention Intensity level (per-project override available in Story 5.9), default AI provider preference, embedding generation toggle
**And** settings are persisted to the user's preferences in the database

**Given** the Integrations tab
**When** viewed
**Then** available integrations are listed with connect/disconnect buttons
**And** API keys for the Context Export API (Story 10.1) can be created, viewed, and revoked here

**Given** the Privacy tab
**When** viewed
**Then** the user can see what data is sent to external AI services
**And** data export and account deletion controls are accessible (Story 10.3)

**Given** the Keyboard Shortcuts tab
**When** viewed
**Then** all keyboard shortcuts are displayed in a searchable, grouped list
**And** this mirrors the Cmd+? shortcut help overlay from Story 1.9

## Tasks
- [ ] Create `src/app/settings/page.tsx` with tabbed layout using Radix Tabs
- [ ] Create `components/settings/ProfileTab.tsx`
- [ ] Create `components/settings/AIPreferencesTab.tsx`
- [ ] Create `components/settings/IntegrationsTab.tsx`
- [ ] Create `components/settings/PrivacyTab.tsx`
- [ ] Create `components/settings/KeyboardShortcutsTab.tsx`
- [ ] Add `userPreferences` tRPC router for reading/updating preferences
- [ ] Add settings link to sidebar footer
- [ ] Add Cmd+, keyboard shortcut for quick settings access

## Dev Notes
- Key files: `src/app/settings/page.tsx`, `components/settings/`, `server/api/routers/userPreferences.ts`
- Dependencies: Story 1.3 (auth), Story 1.9 (keyboard shortcuts), Story 5.9 (AI intensity), Story 10.1 (API keys), Story 10.3 (data export/privacy)
- Technical approach: The settings page serves as the central hub for cross-cutting user configuration. Individual features add their settings UI here. The preferences model extends the existing User model with a `preferences` Json field.

## References
- Cross-cutting concern spanning multiple epics
- Related: Story 5.9 (AI Intensity), Story 8.9 (Energy heatmap), Story 10.1 (API keys), Story 10.3 (Privacy)
