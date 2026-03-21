# Story 8.10: Action Unit External Service Delegation & Result Record Flow

**Status: pending**

## Description
As a user,
I want to delegate Action Units to external services (Google Calendar, Todoist, Slack, etc.) and capture result records when actions complete,
So that my thought-driven actions flow into my existing tools and real-world outcomes feed back into my knowledge graph.

## Acceptance Criteria

**Given** an Action Unit exists (unit_type: "action") with decision-making provenance relations
**When** the user clicks "Delegate" on the Action Unit
**Then** a DelegationDialog presents execution type categories (Schedule, To-do, Communication, Appointment/visit, Purchase) per PRD Section 17
**And** each category maps to specific services: Schedule → Google Calendar/TIMEMINE, To-do → Todoist/Apple Reminders, Communication → Email/KakaoTalk/Slack, Appointment → Google Maps/KakaoMap, Purchase → Coupang/Amazon
**And** the dialog pre-fills relevant fields from the Action Unit's content and AI-extracted metadata (title, date, location, recipient)
**And** on successful delegation, the Unit metadata gains `linked_calendar_event` or `linked_task` reference
**And** a service icon badge appears on the UnitCard and `action_status` updates to "delegated"
**And** when the user marks the Action Unit as "Complete" a CompletionFlowSheet slides up proposing a result record Unit
**And** the result record is pre-filled by AI with `origin_type: "direct_write"` and `unit_type: "observation"` by default
**And** the result record auto-connects to original decision-making Units via `derives_from` and `references` relations per FR57
**And** the user can edit result content and connections before saving, or skip (non-blocking per NFR24)
**And** completed Actions with result records display a FeedbackLoopIndicator (↩) in Graph View and Thread View
**And** the Context Dashboard shows "X of Y Action Units have result records"
**And** a DecisionChainPanel is accessible from any Action Unit showing full provenance path
**And** integration configuration (OAuth tokens, API keys) is managed in Settings → Integrations

## Tasks
- [ ] Add `DelegationTarget` Prisma model: `id`, `unit_id` FK, `service` (enum: google_calendar, todoist, apple_reminders, slack, email, kakao_talk, google_maps, kakao_map, coupang, amazon, timemine), `external_id`, `external_url`, `delegated_at`, `metadata` (Json)
- [ ] Add `IntegrationConfig` Prisma model: `id`, `user_id`, `service`, `access_token` (encrypted), `refresh_token` (encrypted), `expires_at`, `scopes` (Json)
- [ ] Create `server/repositories/delegationRepository.ts` — CRUD for DelegationTarget, query delegated Actions for dashboard metric
- [ ] Create `server/services/delegationService.ts` — AI metadata extraction from Action Unit content (date, location, recipient, title), service-specific API calls via edge functions, OAuth token refresh
- [ ] Create edge functions / Next.js API routes for each integration: `api/integrations/google-calendar.ts`, `api/integrations/todoist.ts`, `api/integrations/slack.ts`
- [ ] Create `server/services/oauthService.ts` — OAuth flow management (authorization URL generation, token exchange, refresh)
- [ ] Add tRPC procedures: `delegation.getAvailableServices`, `delegation.delegate`, `delegation.getDelegationStatus`, `delegation.revoke`
- [ ] Extend `action.complete` from Story 8.6 to trigger CompletionFlowSheet instead of ActionCompletionDialog
- [ ] Create `components/delegation/DelegationDialog.tsx` — category tabs (Schedule/To-do/Communication/Appointment/Purchase), service picker, pre-filled form fields, confirm button
- [ ] Create `components/delegation/CompletionFlowSheet.tsx` — bottom sheet with pre-filled result record form, decision chain preview, save/skip buttons
- [ ] Create `components/delegation/ServiceIconBadge.tsx` — small service icon overlay on UnitCard showing delegation target
- [ ] Create `components/delegation/FeedbackLoopIndicator.tsx` — ↩ icon shown on UnitCard and in Graph View when result record exists
- [ ] Create `components/delegation/DecisionChainPanel.tsx` — full provenance panel reusing relation traversal with action-specific styling
- [ ] Add Settings → Integrations page with OAuth connect/disconnect buttons and API key inputs
- [ ] Add "Feedback Loops" metric to Context Dashboard (from Story 3.7)
- [ ] Write unit tests for AI metadata extraction and service field pre-filling
- [ ] Write integration tests for delegation flow and result record creation

## Dev Notes
- Key files: `server/services/delegationService.ts`, `server/services/oauthService.ts`, `api/integrations/`, `components/delegation/DelegationDialog.tsx`, `components/delegation/CompletionFlowSheet.tsx`
- Dependencies: Story 8.6 (action_status field and basic completion flow), Story 2.4 (Relation types), Story 3.7 (Context Dashboard metrics), Supabase OAuth provider, Trigger.dev (for webhook-based status updates)
- Technical approach: OAuth tokens stored encrypted in IntegrationConfig table (use Supabase Vault or AES-256 encryption key from env). External API calls go through Next.js API routes (never client-side) to keep secrets server-side. AI metadata extraction uses a structured output prompt: `Extract from this action unit: {title, date (ISO), location, recipient, description}`. Flowmind tracks delegation via DelegationTarget but does NOT poll for completion — user manually marks complete. DecisionChainPanel reuses ReasoningChainUI traversal logic (if exists from Epic 4/5) with action-specific node styling.
- Technical Notes (from epics.md): OAuth integration uses Supabase's built-in OAuth provider support where possible. Delegation status can be polled or webhook-updated depending on service capability.

## References
- Epic 8: Feedback Loop & Thought Evolution
- PRD Section 17: Action Unit delegation and completion flow
- FR56: Action Unit external service delegation
- FR57: Result record proposal on completion
- Related: Story 8.6 (base Action completion flow), Story 10.3 (Epic 10 also covers external delegation — coordinate to avoid duplication)
