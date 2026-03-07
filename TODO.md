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
- [ ] Confirm project name everywhere as **Dynamic Destiny Protocol (DDP)**
- [ ] Confirm copyright holder / maintainer metadata as **ELK-Lab**
- [ ] Add `LICENSE` file with MIT license
- [ ] Verify dependency license compatibility and record findings in docs
- [ ] Create `CONTRIBUTING.md`
- [ ] Create `CODE_OF_CONDUCT.md`

### Repository bootstrap
- [ ] Initialize monorepo with `pnpm`
- [ ] Create root `package.json`
- [ ] Create `pnpm-workspace.yaml`
- [ ] Configure TypeScript project references if adopted
- [ ] Configure root `.editorconfig`
- [ ] Configure root `.gitignore`
- [ ] Configure root `.nvmrc` or toolchain version policy
- [ ] Configure shared ESLint setup
- [ ] Configure Prettier
- [ ] Configure commit message convention
- [ ] Configure CI pipeline for lint + typecheck + tests

### Initial repository structure
- [ ] Create `apps/web`
- [ ] Create `apps/colyseus-server`
- [ ] Create `apps/integration-api`
- [ ] Create `packages/shared-types`
- [ ] Create `packages/shared-rules`
- [ ] Create `packages/sdk-client`
- [ ] Create `packages/ui-kit`
- [ ] Create `infra/compose`
- [ ] Create `docs/architecture`
- [ ] Create `docs/adr`
- [ ] Create `docs/protocol`
- [ ] Create `docs/api`

---

## 1. Architecture decisions to formalize

- [ ] ADR: choose Vue 3 + Vite + TypeScript for primary client
- [ ] ADR: choose Capacitor for Android/iOS distribution
- [ ] ADR: choose Appwrite for self-hosted auth/persistence
- [ ] ADR: choose Colyseus for authoritative live session engine
- [ ] ADR: choose LiveKit for optional voice subsystem
- [ ] ADR: define monorepo boundaries and shared-package strategy
- [ ] ADR: define persistence vs live-state boundary
- [ ] ADR: define command/event modeling strategy
- [ ] ADR: define session snapshot strategy
- [ ] ADR: define token issuance strategy for voice and live session authorization

---

## 2. Local infrastructure and developer environment

### Docker Compose setup
- [ ] Create Docker Compose stack for Appwrite
- [ ] Create Docker Compose stack for LiveKit
- [ ] Create Docker Compose stack for supporting reverse proxy if needed
- [ ] Provide local hostnames or ports convention
- [ ] Create bootstrap scripts for local development
- [ ] Document startup order and troubleshooting steps

### Environment management
- [ ] Define `.env.example` for root-level shared variables
- [ ] Define `apps/web/.env.example`
- [ ] Define `apps/colyseus-server/.env.example`
- [ ] Define `apps/integration-api/.env.example`
- [ ] Document secret management strategy for local/dev/prod

### Dev experience
- [ ] Add `pnpm dev` orchestration script
- [ ] Add `pnpm lint`
- [ ] Add `pnpm typecheck`
- [ ] Add `pnpm test`
- [ ] Add `pnpm format`
- [ ] Add `pnpm build`
- [ ] Add health-check documentation

---

## 3. Shared contracts and protocol primitives

### Shared types package
- [ ] Define ID types and identity helpers
- [ ] Define `User` model contracts
- [ ] Define `Character` model contracts
- [ ] Define `Campaign` model contracts
- [ ] Define `GameSession` model contracts
- [ ] Define `GamePlayer` model contracts
- [ ] Define `TextMessage` model contracts
- [ ] Define `SessionSnapshot` model contracts
- [ ] Define `RulesProfile` model contracts
- [ ] Define `GameCommunicationSettings`
- [ ] Define `PlayerCommunicationState`

### Commands and events
- [ ] Define command envelope shape
- [ ] Define event envelope shape
- [ ] Define `CreateSessionCommand`
- [ ] Define `JoinSessionCommand`
- [ ] Define `LeaveSessionCommand`
- [ ] Define `BindCharacterToSessionCommand`
- [ ] Define `ToggleReadyCommand`
- [ ] Define `SendTextMessageCommand`
- [ ] Define `SubmitActionCommand`
- [ ] Define `JoinVoiceCommand` semantic contract
- [ ] Define `LeaveVoiceCommand` semantic contract
- [ ] Define matching domain events

### Validation
- [ ] Choose runtime validation strategy (`zod`, `valibot`, or equivalent)
- [ ] Implement shared schema definitions for external inputs
- [ ] Define mapping rules between raw persistence documents and domain models

---

## 4. Web client foundation

### Core app scaffold
- [ ] Scaffold Vue 3 app with TypeScript and Vite
- [ ] Configure Vue Router
- [ ] Configure Pinia
- [ ] Configure basic app layout shell
- [ ] Configure route guards for authenticated areas
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
- [ ] Create `useAuthStore`
- [ ] Create `useProfileStore`
- [ ] Create `useCharacterStore`
- [ ] Create `useSessionListStore`
- [ ] Create `useActiveSessionStore`
- [ ] Create `useTextChatStore`
- [ ] Create `useVoiceChatStore`
- [ ] Create `useSettingsStore`

---

## 5. Authentication and user profile

### Appwrite auth integration
- [ ] Implement sign up flow
- [ ] Implement sign in flow
- [ ] Implement sign out flow
- [ ] Implement session restore on app load
- [ ] Implement password reset flow if supported in milestone
- [ ] Implement auth error handling and user-friendly messaging

### Profile features
- [ ] Create profile page
- [ ] Create editable display name flow
- [ ] Create avatar upload flow
- [ ] Persist user preferences
- [ ] Add account/session diagnostics for debugging

### Security tasks
- [ ] Document Appwrite auth configuration
- [ ] Ensure client never relies on UI-only auth assumptions
- [ ] Audit auth-related environment variables and secret handling

---

## 6. Character management

### CRUD
- [ ] Create character list page
- [ ] Create character creation flow
- [ ] Create character edit flow
- [ ] Create character archive/delete flow
- [ ] Create character detail view

### Data model
- [ ] Define character metadata structure
- [ ] Define stats/resources representation strategy
- [ ] Define extensible tags/traits model
- [ ] Define portrait attachment strategy
- [ ] Define ownership and access control rules

### Future-safe design
- [ ] Keep character schema setting-agnostic
- [ ] Avoid hard-coded lore concepts in core character model
- [ ] Document extension points for specialized rules packages

---

## 7. Campaigns and rules profiles

### Campaign basics
- [ ] Create campaign list page
- [ ] Create campaign creation flow
- [ ] Create campaign edit flow
- [ ] Associate sessions with campaigns

### Rules profiles
- [ ] Define `RulesProfile` persistence model
- [ ] Create rules-profile CRUD basics
- [ ] Define config blob strategy for rules profiles
- [ ] Document what belongs in core rules profile vs extension package

### Protocol abstraction work
- [ ] Define actor abstraction
- [ ] Define resource abstraction
- [ ] Define inventory abstraction
- [ ] Define action abstraction
- [ ] Define status abstraction
- [ ] Define scene abstraction
- [ ] Define timeline/turn abstraction
- [ ] Define trigger abstraction

---

## 8. Session metadata, discovery, and lobby

### Session CRUD
- [ ] Create session list/discovery page
- [ ] Create session creation form
- [ ] Create session edit/cancel flow
- [ ] Define session status lifecycle (`draft`, `open`, `active`, `paused`, `ended`, etc.)

### Session configuration
- [ ] Add session title and description fields
- [ ] Add max players setting
- [ ] Add campaign association setting
- [ ] Add rules profile setting
- [ ] Add text chat enabled toggle
- [ ] Add voice chat enabled toggle
- [ ] Add scheduling metadata if desired

### Lobby UX
- [ ] Create session lobby page
- [ ] Show roster of joined players
- [ ] Show selected characters
- [ ] Show ready states
- [ ] Show communication capabilities
- [ ] Implement join/leave lobby actions
- [ ] Implement host controls for starting session

### Membership rules
- [ ] Define open vs invite-only session model
- [ ] Define role model (`host`, `player`, `observer`, etc.)
- [ ] Define duplicate join handling
- [ ] Define disconnect/reconnect semantics in lobby state

---

## 9. Colyseus authoritative session runtime

### Basic server scaffold
- [ ] Initialize Colyseus server app
- [ ] Configure room registry
- [ ] Create base `SessionRoom`
- [ ] Add health endpoint or diagnostics
- [ ] Add structured logging

### Join authorization
- [ ] Define join handshake contract
- [ ] Verify authenticated identity before room join
- [ ] Verify session membership before room join
- [ ] Document how Appwrite identity maps into room auth

### Runtime state
- [ ] Define base room state structure
- [ ] Define player-presence state
- [ ] Define selected-character state
- [ ] Define readiness state
- [ ] Define generic protocol/session context state
- [ ] Define versioning strategy for runtime state

### Action handling
- [ ] Define message/command registry for room actions
- [ ] Implement command parser and validation layer
- [ ] Implement generic action rejection flow
- [ ] Implement state patch broadcasting strategy
- [ ] Implement reconnect logic

### Persistence bridging
- [ ] Load latest snapshot on room bootstrap
- [ ] Define checkpoint policy
- [ ] Persist milestone snapshots to Appwrite
- [ ] Persist end-of-session snapshot
- [ ] Persist major system events if needed

---

## 10. Text chat subsystem

### Data and permissions
- [ ] Create `TextMessage` storage model in Appwrite
- [ ] Define permissions so only session members can read/write
- [ ] Define message kinds (`user`, `system`, maybe `moderation` later)
- [ ] Define message length and rate limits

### Client features
- [ ] Create session text chat panel
- [ ] Load chat history for session
- [ ] Subscribe to realtime new-message updates
- [ ] Send text messages
- [ ] Display system messages distinctly
- [ ] Handle disabled-text-chat sessions gracefully

### Integration points
- [ ] Allow Colyseus or integration API to emit system messages
- [ ] Add roster-based mention display if desired later
- [ ] Decide whether chat history is session-persistent indefinitely or archived

---

## 11. Voice chat subsystem

### LiveKit infrastructure
- [ ] Finalize local LiveKit deployment config
- [ ] Document prod deployment expectations
- [ ] Define deterministic room naming convention

### Token issuance
- [ ] Implement trusted backend endpoint/function to issue LiveKit tokens
- [ ] Validate authenticated identity before issuing token
- [ ] Validate session membership before issuing token
- [ ] Validate `voiceChatEnabled` before issuing token
- [ ] Add expiration strategy for voice tokens

### Client voice features
- [ ] Add “Join voice” action
- [ ] Add “Leave voice” action
- [ ] Add microphone toggle
- [ ] Add speaker/deafen toggle
- [ ] Show current voice participants
- [ ] Handle reconnect or dropped media connection
- [ ] Handle denied microphone permission gracefully

### State synchronization
- [ ] Decide which voice presence indicators are purely client-side vs persisted
- [ ] Keep distinction clear between `voiceChatJoined` and `microphoneEnabled`
- [ ] Surface voice status in session roster UI

---

## 12. Integration API / backend glue

This service may be thin, but it is still useful as a place for trusted orchestration logic.

### Core responsibilities
- [ ] Implement LiveKit token issuance endpoint
- [ ] Implement room-join authorization helper if needed
- [ ] Implement system-message insertion endpoint if useful
- [ ] Implement snapshot orchestration helpers if needed
- [ ] Expose health and diagnostics endpoints

### Design constraints
- [ ] Keep this service narrow and explicit
- [ ] Avoid turning it into an accidental monolith
- [ ] Document every endpoint and trust boundary

---

## 13. Protocol engine and extensibility

### Shared-rules package
- [ ] Create protocol-level rule interfaces
- [ ] Create base actor model helpers
- [ ] Create resource mutation helpers
- [ ] Create generic check/test resolution contracts
- [ ] Create status effect lifecycle helpers
- [ ] Create scene transition helpers
- [ ] Create turn/timeline helpers
- [ ] Create event trigger helpers

### Extensibility strategy
- [ ] Define plugin or module loading strategy for future rulesets
- [ ] Decide whether rules packages live inside monorepo initially
- [ ] Define how a rules profile activates specific rule handlers
- [ ] Document boundary between core protocol and custom campaign logic

### Important guardrails
- [ ] Do not bake setting-specific terms into core protocol
- [ ] Do not create a fake-generic abstraction with no real users yet
- [ ] Start with a small, useful set of protocol primitives

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
- [ ] Define structured logging format for server apps
- [ ] Add correlation ids where sensible
- [ ] Define log levels and defaults

### Monitoring
- [ ] Add health endpoints for services
- [ ] Define minimum runtime metrics worth collecting
- [ ] Consider room count / connection count diagnostics

### Debug tooling
- [ ] Add developer diagnostics panel in web app
- [ ] Add session debug view for non-production environments
- [ ] Add event trace logging toggle for development

---

## 17. Testing strategy

### Tooling
- [ ] Choose unit test runner (`vitest` recommended)
- [ ] Choose component test strategy
- [ ] Choose integration/e2e strategy

### Unit tests
- [ ] Test shared model mapping and validation
- [ ] Test command schema validation
- [ ] Test protocol helper logic
- [ ] Test store logic for session/chat/voice state

### Integration tests
- [ ] Test auth bootstrap flow
- [ ] Test session creation flow
- [ ] Test lobby join/leave flow
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
- [ ] Add validation for all external inputs
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
- [ ] bootstrap monorepo
- [ ] configure lint/typecheck/test/build
- [ ] create Docker infra
- [ ] scaffold web app and Colyseus server
- [ ] establish shared packages

### Phase B — identity and persistence
- [ ] auth
- [ ] user profile
- [ ] character CRUD
- [ ] campaign CRUD basics

### Phase C — session metadata and lobby
- [ ] create/list/join sessions
- [ ] lobby roster and ready state
- [ ] communication settings on session creation

### Phase D — active runtime
- [ ] room authorization
- [ ] room state bootstrap
- [ ] authoritative actions
- [ ] snapshot persistence

### Phase E — communications
- [ ] text chat
- [ ] voice token issuance
- [ ] LiveKit join/leave/mute/deafen UX

### Phase F — protocol framework maturation
- [ ] shared-rules package expansion
- [ ] rules-profile strategy
- [ ] extensibility docs and examples

### Phase G — hardening
- [ ] tests
- [ ] observability
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
- [ ] Create monorepo skeleton
- [ ] Add MIT license
- [ ] Write first ADRs for stack choices
- [ ] Spin up local Appwrite and LiveKit
- [ ] Scaffold web app
- [ ] Scaffold Colyseus server
- [ ] Define shared entity types

### Immediately after that
- [ ] Implement authentication
- [ ] Implement character CRUD
- [ ] Implement session creation and listing
- [ ] Implement lobby join flow

---

## 25. Maintenance rule

Whenever architecture, boundaries, or workflow assumptions change:
- update this file
- update `README.md`
- update `AGENTS.md`
- add or revise ADRs as needed

Otherwise the docs will drift, and then everyone starts confidently building on stale assumptions, which is how software projects become haunted.
