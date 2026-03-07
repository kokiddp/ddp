# TODO.md

This document is the working development roadmap for Dynamic Destiny Protocol (DDP).

It is written to guide both:
- human contributors
- coding agents operating inside the repository

The roadmap is organized from foundation to progressively more advanced capabilities. It intentionally separates durable product goals from implementation sequencing.

---

## Status legend

- `[ ]` not started
- `[~]` in progress
- `[x]` completed
- `[!]` blocked / needs decision

---

## 0. Project governance and bootstrap

### Identity and legal
- [x] Confirm project name everywhere as **Dynamic Destiny Protocol (DDP)**
- [x] Confirm copyright holder / maintainer metadata as **ELK-Lab**
- [x] Add `LICENSE` file with MIT license
- [ ] Verify dependency license compatibility and record findings in docs
- [ ] Create `CONTRIBUTING.md`
- [ ] Create `CODE_OF_CONDUCT.md`

### Repository bootstrap
- [x] Initialize monorepo with `pnpm`
- [x] Create root `package.json`
- [x] Create `pnpm-workspace.yaml`
- [x] Configure TypeScript project references if adopted
- [x] Configure root `.editorconfig`
- [x] Configure root `.gitignore`
- [x] Configure root `.nvmrc` or toolchain version policy
- [x] Configure shared ESLint setup
- [x] Configure Prettier
- [ ] Configure commit message convention
- [ ] Configure CI pipeline for lint + typecheck + tests

### Initial repository structure
- [x] Create `apps/web`
- [x] Create `apps/colyseus-server`
- [x] Create `apps/integration-api`
- [x] Create `packages/shared-types`
- [x] Create `packages/shared-rules`
- [x] Create `packages/sdk-client`
- [x] Create `packages/ui-kit`
- [x] Create `infra/compose`
- [x] Create `docs/architecture`
- [x] Create `docs/adr`
- [x] Create `docs/protocol`
- [x] Create `docs/api`

---

## 1. Architecture decisions to formalize

- [x] ADR: choose Vue 3 + Vite + TypeScript for primary client (`docs/adr/0001-adopt-vue-capacitor.md`)
- [x] ADR: choose Capacitor for Android/iOS distribution (`docs/adr/0001-adopt-vue-capacitor.md`)
- [x] ADR: choose Appwrite for self-hosted auth/persistence (`docs/adr/0002-use-appwrite-for-persistence.md`)
- [x] ADR: choose Colyseus for authoritative live session engine (`docs/adr/0003-use-colyseus-for-session-state.md`)
- [x] ADR: choose LiveKit for optional voice subsystem (`docs/adr/0004-use-livekit-for-voice.md`)
- [x] ADR: define monorepo boundaries and shared-package strategy (`docs/adr/0005-monorepo-with-pnpm-workspaces.md`)
- [ ] ADR: define persistence vs live-state boundary
- [x] ADR: define command/event modeling strategy (`docs/adr/0006-command-event-modeling.md`)
- [ ] ADR: define session snapshot strategy
- [ ] ADR: define token issuance strategy for voice and live session authorization

---

## 2. Local infrastructure and developer environment

### Docker Compose setup
- [x] Create Docker Compose stack for Appwrite
- [x] Create Docker Compose stack for LiveKit
- [x] Create Docker Compose stack for supporting reverse proxy if needed
- [x] Provide local hostnames or ports convention
- [x] Create bootstrap scripts for local development
- [ ] Document startup order and troubleshooting steps

### Environment management
- [x] Define `.env.example` for root-level shared variables
- [x] Define `apps/web/.env.example`
- [x] Define `apps/colyseus-server/.env.example`
- [x] Define `apps/integration-api/.env.example`
- [ ] Document secret management strategy for local/dev/prod

### Dev experience
- [x] Add `pnpm dev` orchestration script
- [x] Add `pnpm lint`
- [x] Add `pnpm typecheck`
- [x] Add `pnpm test`
- [x] Add `pnpm format`
- [x] Add `pnpm build`
- [x] Add health-check documentation

---

## 3. Shared contracts and protocol primitives

### Shared types package
- [x] Define ID types and identity helpers
- [x] Define `User` model contracts
- [x] Define `Character` model contracts
- [x] Define `Campaign` model contracts
- [x] Define `GameSession` model contracts
- [x] Define `GamePlayer` model contracts
- [x] Define `TextMessage` model contracts
- [x] Define `SessionSnapshot` model contracts
- [x] Define `RulesProfile` model contracts
- [x] Define `GameCommunicationSettings`
- [x] Define `PlayerCommunicationState`

### Commands and events
- [x] Define command envelope shape
- [x] Define event envelope shape
- [x] Define `CreateSessionCommand`
- [x] Define `JoinSessionCommand`
- [x] Define `LeaveSessionCommand`
- [x] Define `BindCharacterToSessionCommand`
- [x] Define `ToggleReadyCommand`
- [x] Define `SendTextMessageCommand`
- [x] Define `SubmitActionCommand`
- [ ] Define `JoinVoiceCommand` semantic contract
- [ ] Define `LeaveVoiceCommand` semantic contract
- [x] Define matching domain events

### Validation
- [x] Choose runtime validation strategy (`zod`, `valibot`, or equivalent)
- [x] Implement shared schema definitions for external inputs
- [ ] Define mapping rules between raw persistence documents and domain models

---

## 4. Web client foundation

### Core app scaffold
- [x] Scaffold Vue 3 app with TypeScript and Vite
- [x] Configure Vue Router
- [x] Configure Pinia
- [x] Configure basic app layout shell
- [x] Configure route guards for authenticated areas
- [ ] Add error boundary / global error handling approach
- [ ] Add loading state conventions

### Design system
- [ ] Choose UI component strategy (custom, headless, or mixed)
- [ ] Define color tokens / theme tokens
- [ ] Define typography scale
- [ ] Define spacing/radius/shadow tokens
- [ ] Create reusable page shell components
- [ ] Create form components
- [ ] Create list/table/card primitives
- [ ] Create status badges and presence indicators

### App stores
- [x] Create `useAuthStore`
- [ ] Create `useProfileStore`
- [x] Create `useCharacterStore`
- [x] Create `useSessionListStore`
- [x] Create `useActiveSessionStore`
- [x] Create `useTextChatStore`
- [x] Create `useVoiceChatStore`
- [x] Create `useSettingsStore`

---

## 5. Authentication and user profile

### Appwrite auth integration
- [x] Implement sign up flow
- [x] Implement sign in flow
- [x] Implement sign out flow
- [x] Implement session restore on app load
- [ ] Implement password reset flow if supported in milestone
- [x] Implement auth error handling and user-friendly messaging

### Profile features
- [x] Create profile page
- [x] Create editable display name flow
- [ ] Create avatar upload flow
- [ ] Persist user preferences
- [ ] Add account/session diagnostics for debugging

### Security tasks
- [ ] Document Appwrite auth configuration
- [x] Ensure client never relies on UI-only auth assumptions
- [ ] Audit auth-related environment variables and secret handling

---

## 6. Character management

### CRUD
- [x] Create character list page
- [x] Create character creation flow
- [x] Create character edit flow
- [x] Create character archive/delete flow
- [ ] Create character detail view

### Data model
- [x] Define character metadata structure
- [x] Define stats/resources representation strategy
- [x] Define extensible tags/traits model
- [ ] Define portrait attachment strategy
- [x] Define ownership and access control rules

### Future-safe design
- [x] Keep character schema setting-agnostic
- [x] Avoid hard-coded lore concepts in core character model
- [ ] Document extension points for specialized rules packages

---

## 7. Campaigns and rules profiles

### Campaign basics
- [x] Create campaign list page
- [x] Create campaign creation flow
- [x] Create campaign edit flow
- [ ] Associate sessions with campaigns

### Rules profiles
- [x] Define `RulesProfile` persistence model
- [ ] Create rules-profile CRUD basics
- [x] Define config blob strategy for rules profiles
- [ ] Document what belongs in core rules profile vs extension package

### Protocol abstraction work
- [x] Define actor abstraction
- [x] Define resource abstraction
- [ ] Define inventory abstraction
- [x] Define action abstraction
- [x] Define status abstraction
- [x] Define scene abstraction
- [x] Define timeline/turn abstraction
- [ ] Define trigger abstraction

---

## 8. Session metadata, discovery, and lobby

### Session CRUD
- [x] Create session list/discovery page
- [x] Create session creation form
- [ ] Create session edit/cancel flow
- [x] Define session status lifecycle (`draft`, `open`, `active`, `paused`, `ended`, etc.)

### Session configuration
- [x] Add session title and description fields
- [x] Add max players setting
- [ ] Add campaign association setting
- [ ] Add rules profile setting
- [x] Add text chat enabled toggle
- [x] Add voice chat enabled toggle
- [ ] Add scheduling metadata if desired

### Lobby UX
- [x] Create session lobby page
- [x] Show roster of joined players
- [x] Show selected characters
- [x] Show ready states
- [x] Show communication capabilities
- [x] Implement join/leave lobby actions
- [x] Implement host controls for starting session

### Membership rules
- [ ] Define open vs invite-only session model
- [x] Define role model (`host`, `player`, `observer`, etc.)
- [ ] Define duplicate join handling
- [ ] Define disconnect/reconnect semantics in lobby state

---

## 9. Colyseus authoritative session runtime

### Basic server scaffold
- [x] Initialize Colyseus server app
- [x] Configure room registry
- [x] Create base `SessionRoom`
- [x] Add health endpoint or diagnostics
- [x] Add structured logging

### Join authorization
- [x] Define join handshake contract
- [x] Verify authenticated identity before room join
- [x] Verify session membership before room join
- [ ] Document how Appwrite identity maps into room auth

### Runtime state
- [x] Define base room state structure
- [x] Define player-presence state
- [x] Define selected-character state
- [x] Define readiness state
- [ ] Define generic protocol/session context state
- [x] Define versioning strategy for runtime state

### Action handling
- [x] Define message/command registry for room actions
- [x] Implement command parser and validation layer
- [x] Implement generic action rejection flow
- [x] Implement state patch broadcasting strategy
- [x] Implement reconnect logic

### Persistence bridging
- [x] Load latest snapshot on room bootstrap
- [x] Define checkpoint policy
- [x] Persist milestone snapshots to Appwrite
- [x] Persist end-of-session snapshot
- [ ] Persist major system events if needed

---

## 10. Text chat subsystem

### Data and permissions
- [x] Create `TextMessage` storage model in Appwrite
- [ ] Define permissions so only session members can read/write
- [x] Define message kinds (`user`, `system`, maybe `moderation` later)
- [x] Define message length and rate limits

### Client features
- [x] Create session text chat panel
- [x] Load chat history for session
- [x] Subscribe to realtime new-message updates
- [x] Send text messages
- [x] Display system messages distinctly
- [ ] Handle disabled-text-chat sessions gracefully

### Integration points
- [ ] Allow Colyseus or integration API to emit system messages
- [ ] Add roster-based mention display if desired later
- [ ] Decide whether chat history is session-persistent indefinitely or archived

---

## 11. Voice chat subsystem

### LiveKit infrastructure
- [x] Finalize local LiveKit deployment config
- [ ] Document prod deployment expectations
- [x] Define deterministic room naming convention

### Token issuance
- [x] Implement trusted backend endpoint/function to issue LiveKit tokens
- [x] Validate authenticated identity before issuing token
- [x] Validate session membership before issuing token
- [x] Validate `voiceChatEnabled` before issuing token
- [x] Add expiration strategy for voice tokens

### Client voice features
- [x] Add “Join voice” action
- [x] Add “Leave voice” action
- [x] Add microphone toggle
- [x] Add speaker/deafen toggle
- [x] Show current voice participants
- [ ] Handle reconnect or dropped media connection
- [ ] Handle denied microphone permission gracefully

### State synchronization
- [ ] Decide which voice presence indicators are purely client-side vs persisted
- [x] Keep distinction clear between `voiceChatJoined` and `microphoneEnabled`
- [ ] Surface voice status in session roster UI

---

## 12. Integration API / backend glue

This service may be thin, but it is still useful as a place for trusted orchestration logic.

### Core responsibilities
- [x] Implement LiveKit token issuance endpoint
- [ ] Implement room-join authorization helper if needed
- [ ] Implement system-message insertion endpoint if useful
- [ ] Implement snapshot orchestration helpers if needed
- [x] Expose health and diagnostics endpoints

### Design constraints
- [ ] Keep this service narrow and explicit
- [ ] Avoid turning it into an accidental monolith
- [ ] Document every endpoint and trust boundary

---

## 13. Protocol engine and extensibility

### Shared-rules package
- [x] Create protocol-level rule interfaces
- [x] Create base actor model helpers
- [x] Create resource mutation helpers
- [x] Create generic check/test resolution contracts
- [x] Create status effect lifecycle helpers
- [x] Create scene transition helpers
- [x] Create turn/timeline helpers
- [ ] Create event trigger helpers

### Extensibility strategy
- [x] Define plugin or module loading strategy for future rulesets
- [x] Decide whether rules packages live inside monorepo initially
- [x] Define how a rules profile activates specific rule handlers
- [x] Document boundary between core protocol and custom campaign logic

### Important guardrails
- [x] Do not bake setting-specific terms into core protocol
- [x] Do not create a fake-generic abstraction with no real users yet
- [x] Start with a small, useful set of protocol primitives

---

## 14. SDK and service wrappers

### SDK goals
- [ ] Create typed Appwrite wrapper
- [ ] Create typed Colyseus wrapper
- [ ] Create typed LiveKit wrapper
- [ ] Create session orchestration helper functions
- [ ] Centralize transport/reconnect concerns where sensible

### Benefits
- [ ] Reduce duplicated client logic
- [ ] Keep service integration replaceable
- [ ] Improve typing across apps/packages

---

## 15. Mobile packaging with Capacitor

### Bootstrap
- [ ] Add Capacitor to web app
- [ ] Generate Android project
- [ ] Generate iOS project
- [ ] Document local mobile build prerequisites

### Mobile-specific UX
- [ ] Verify responsive layouts for key pages
- [ ] Ensure active-session screen is usable on small screens
- [ ] Define mobile navigation pattern
- [ ] Test login flows on device/emulator
- [ ] Test text chat usability on device
- [ ] Test voice join/mic permission flows on device

### Platform concerns
- [ ] Document microphone permission strategy
- [ ] Document backgrounding behavior expectations
- [ ] Test reconnection on app resume

---

## 16. Observability and diagnostics

### Logging
- [x] Define structured logging format for server apps
- [ ] Add correlation ids where sensible
- [x] Define log levels and defaults

### Monitoring
- [x] Add health endpoints for services
- [ ] Define minimum runtime metrics worth collecting
- [ ] Consider room count / connection count diagnostics

### Debug tooling
- [ ] Add developer diagnostics panel in web app
- [ ] Add session debug view for non-production environments
- [ ] Add event trace logging toggle for development

---

## 17. Testing strategy

### Tooling
- [x] Choose unit test runner (`vitest` recommended)
- [ ] Choose component test strategy
- [ ] Choose integration/e2e strategy

### Unit tests
- [x] Test shared model mapping and validation
- [x] Test command schema validation
- [x] Test protocol helper logic
- [ ] Test store logic for session/chat/voice state

### Integration tests
- [x] Test auth bootstrap flow
- [x] Test session creation flow
- [x] Test lobby join/leave flow
- [ ] Test room authorization flow
- [ ] Test snapshot load/save flow
- [ ] Test LiveKit token authorization logic

### E2E tests
- [ ] Test sign up -> create character -> create session -> join session path
- [ ] Test text chat enabled/disabled behavior
- [ ] Test voice feature gating behavior

---

## 18. Security and moderation

### Security baseline
- [ ] Audit secret placement
- [ ] Audit token issuance flows
- [ ] Add rate limiting where relevant
- [x] Add validation for all external inputs
- [ ] Sanitize rendered user-generated text

### Moderation readiness
- [ ] Define moderation model for text chat
- [ ] Define audit log strategy for critical actions
- [ ] Decide whether hosts can remove players from sessions
- [ ] Decide whether system should support message deletion/hiding later

---

## 19. Documentation backlog

### Core docs
- [ ] Keep `README.md` updated as architecture evolves
- [ ] Keep `AGENTS.md` updated with contribution rules
- [ ] Keep `TODO.md` aligned with actual progress

### Architecture docs
- [ ] Create system context diagram
- [ ] Create container/component diagrams
- [ ] Document service boundaries in depth
- [ ] Document key sequence flows

### Protocol docs
- [ ] Document domain vocabulary
- [ ] Document command/event model
- [ ] Document invariants
- [ ] Document extension strategy

### Setup docs
- [ ] Create local setup guide
- [ ] Create production deployment guide
- [ ] Create troubleshooting guide
- [ ] Create release checklist

---

## 20. Suggested implementation order

This is the recommended execution sequence for development.

### Phase A — make the project exist
- [x] bootstrap monorepo
- [x] configure lint/typecheck/test/build
- [x] create Docker infra
- [x] scaffold web app and Colyseus server
- [x] establish shared packages

### Phase B — identity and persistence
- [x] auth
- [x] user profile
- [x] character CRUD
- [x] campaign CRUD basics

### Phase C — session metadata and lobby
- [x] create/list/join sessions
- [x] lobby roster and ready state
- [x] communication settings on session creation

### Phase D — active runtime
- [x] room authorization
- [x] room state bootstrap
- [x] authoritative actions
- [x] snapshot persistence

### Phase E — communications
- [x] text chat
- [x] voice token issuance
- [x] LiveKit join/leave/mute/deafen UX

### Phase F — protocol framework maturation
- [x] shared-rules package expansion
- [x] rules-profile strategy
- [x] extensibility docs and examples

### Phase G — hardening
- [~] tests
- [x] observability
- [ ] mobile polish
- [ ] deployment documentation

---

## 21. Open questions / decisions needed

- [ ] Do we want a separate integration API from day one, or only Appwrite functions plus Colyseus server?
- [ ] Should session discovery support invite-only/private sessions in MVP?
- [ ] What is the first minimal protocol feature set for `shared-rules`?
- [ ] How generic should character stats/resources be in MVP before over-abstraction kicks in?
- [ ] Should text chat history be permanent, archived, or host-configurable?
- [ ] Do we want observers/spectators in MVP?
- [ ] Do we want campaign-level default communication settings that sessions inherit?
- [ ] Do we want host-only system announcements in chat?

---

## 22. Nice-to-have later

- [ ] Presence outside active sessions
- [ ] Invitations and friend lists
- [ ] Rich character sheet widgets
- [ ] Rules-package marketplace or registry
- [ ] Session templates
- [ ] Team/subgroup voice channels
- [ ] Push-to-talk
- [ ] Accessibility enhancements for assistive technologies
- [ ] Offline-capable read-only character sheets
- [ ] Export/import for campaigns and rules profiles

---

## 23. Definition of MVP

The MVP should be considered achieved when a small group can:

- [ ] register and authenticate
- [ ] create characters
- [ ] create a session
- [ ] enable or disable text chat per session
- [ ] enable or disable voice chat per session
- [ ] join the session lobby
- [ ] start/join an active real-time session
- [ ] see synchronized session state changes
- [ ] send text messages if text chat is enabled
- [ ] join voice if voice chat is enabled
- [ ] leave and later resume from persisted session state

That is enough to prove DDP is a real framework and not just a handsome pile of architectural intentions.

---

## 24. Immediate next actions

### Right now
- [x] Create monorepo skeleton
- [x] Add MIT license
- [x] Write first ADRs for stack choices
- [x] Spin up local Appwrite and LiveKit (Docker Compose defined)
- [x] Scaffold web app
- [x] Scaffold Colyseus server
- [x] Define shared entity types

### Immediately after that
- [x] Implement authentication
- [x] Implement character CRUD
- [x] Implement session creation and listing
- [x] Implement lobby join flow

---

## 25. Maintenance rule

Whenever architecture, boundaries, or workflow assumptions change:
- update this file
- update `README.md`
- update `AGENTS.md`
- add or revise ADRs as needed

Otherwise the docs will drift, and then everyone starts confidently building on stale assumptions, which is how software projects become haunted.
