# Story 10.3: Action Unit External Service Delegation

**Status: pending**

## Description
As a user,
I want to delegate Action Unit execution to external services like Google Calendar, Todoist, or Slack,
So that my thought-driven action items flow into my existing productivity tools.

## Acceptance Criteria

**Given** an Action Unit exists (unit_type: "action")
**When** the user selects "Delegate to External Service"
**Then** a dialog shows available integrations: Google Calendar (create event), Todoist (create task), Slack (send message) per FR56
**And** each integration pre-fills relevant fields from the Action Unit's content and metadata
**And** upon successful delegation, the Action Unit is tagged with the external service reference (URL, ID)
**And** the delegation is logged in the Unit's metadata for traceability
**And** integration configuration (API keys, OAuth tokens) is managed in user settings
**And** Flowmind tracks the delegation but doesn't manage execution — external service owns the task lifecycle per FR56

## Tasks
- [ ] Verify `DelegationTarget` model from Story 8.10 exists (if Story 8.10 is implemented first, reuse; otherwise define here)
- [ ] Verify `IntegrationConfig` model from Story 8.10 exists (same — coordinate to avoid duplication)
- [ ] Create Next.js API routes for MVP integrations: `app/api/integrations/google-calendar/route.ts`, `app/api/integrations/todoist/route.ts`, `app/api/integrations/slack/route.ts`
- [ ] Implement OAuth flow for Google Calendar: authorization URL generation, token exchange, token storage in IntegrationConfig
- [ ] Implement Todoist API integration: personal access token auth, `POST /tasks` with pre-filled title and description
- [ ] Implement Slack integration: OAuth app install flow or webhook URL, `chat.postMessage` with pre-filled message text
- [ ] Create `server/services/integrationService.ts` — service routing: given `DelegationTarget.service`, dispatches to the correct integration handler, handles pre-fill logic, stores DelegationTarget on success
- [ ] Add tRPC procedures: `integration.getConfigured`, `integration.connectOAuth`, `integration.disconnectOAuth`, `integration.delegateAction`
- [ ] Create `components/integration/DelegationDialog.tsx` — shows configured integrations as cards; each card shows service icon, connection status, pre-filled form fields; confirm button calls `integration.delegateAction`
- [ ] Create `components/integration/IntegrationCard.tsx` — service card with connect/disconnect button and status indicator
- [ ] Create `components/integration/IntegrationsSettingsPage.tsx` — settings page section listing all supported services with connect/disconnect
- [ ] Add "Delegate" button to Action Unit cards (action_type === "action")
- [ ] Show delegation badge (service icon) on UnitCard after successful delegation
- [ ] Write unit tests for pre-fill extraction logic per service
- [ ] Write integration tests for delegation flow with mocked external service APIs

## Dev Notes
- Key files: `app/api/integrations/`, `server/services/integrationService.ts`, `server/api/routers/integration.ts`, `components/integration/DelegationDialog.tsx`
- Dependencies: Story 8.10 (defines DelegationTarget and IntegrationConfig models — coordinate to avoid schema duplication), Story 2.1 (Unit model with action_status field)
- Technical approach: Story 10.3 and Story 8.10 both cover external service delegation — they should share the same DB models and service layer. Story 8.10 includes the full CompletionFlowSheet and result record flow; Story 10.3 focuses on the delegation mechanism itself (Epic 10 = External Integration layer). If implementing in order, Story 8.10 creates the models and Story 10.3 adds the API routes and additional integrations. OAuth tokens are encrypted at rest using AES-256-GCM with key from `INTEGRATION_ENCRYPTION_KEY` env var. Pre-fill for Google Calendar: extract date/time with regex or AI from Unit content. Pre-fill for Todoist: use Unit content as task title, truncated to 500 chars. Pre-fill for Slack: Unit content as message text with action context.

## References
- Epic 10: External Integration & Context Export API
- FR56: Action Unit external service delegation
- Related: Story 8.10 (full Action delegation and result record flow — coordinate to avoid model duplication), Story 10.4 (integration config is part of privacy controls)
