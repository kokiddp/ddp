# TODO.md

This TODO is an audited status board for Dynamic Destiny Protocol (DDP).

Audit date: 2026-03-09
Evidence used:
- repository docs and ADRs
- current source code in `apps/*` and `packages/*`
- tests currently in `tests/*`

---

## Status legend

- `[ ]` not started
- `[~]` in progress / partial
- `[x]` implemented
- `[!]` needs decision

---

## 1. Governance and repo hygiene

- [x] Monorepo structure and workspace tooling in place (`pnpm`, TypeScript, Prettier, ESLint package)
- [x] Core project docs exist (`README.md`, `CONTRIBUTING.md`, `AGENTS.md`)
- [x] MIT license present
- [ ] Create `CODE_OF_CONDUCT.md`
- [x] Add CI workflow for lint, typecheck, and tests (`.github/workflows/ci.yml`)
- [ ] Define commit message convention and enforcement
- [ ] Record dependency license compatibility audit

## 2. Architecture and ADRs

- [x] ADR 0001: Vue 3 + Capacitor direction
- [x] ADR 0002: Appwrite for auth/persistence
- [x] ADR 0003: Colyseus for authoritative runtime
- [x] ADR 0004: LiveKit for optional voice
- [x] ADR 0005: pnpm monorepo boundaries
- [x] ADR 0006: command/event model strategy
- [~] Add ADR(s) for snapshot policy details and auth/token trust boundaries (currently partly described in code/docs, not isolated as dedicated ADRs)

## 3. Infrastructure and local setup

- [x] Docker compose stack for Appwrite + LiveKit + supporting infra
- [x] Local setup automation (`setup.sh`, infra scripts)
- [x] Health endpoints documented and implemented for Colyseus and integration API
- [x] Root and per-app env templates exist
- [~] Secrets management strategy documented at setup-guide level, but no formal policy doc for environment segregation and rotation

## 4. Shared contracts and rules engine

- [x] `@ddp/shared-types` includes core entities, ids, commands, and events
- [x] `@ddp/shared-rules` includes actor/resource/status/action/scene/trigger primitives
- [x] Rules profile registry and profile-driven handler activation model exist
- [x] Protocol docs include rules profile usage guide (`docs/protocol/rules-profile-guide.md`)
- [ ] Inventory abstraction in shared rules (currently no inventory primitive)
- [~] Explicit mapping layer from raw Appwrite docs to domain DTOs is still mostly ad-hoc

## 5. Web client foundation

- [x] Vue + Vite + TypeScript app scaffolded
- [x] Router with auth guards
- [x] Pinia stores for auth, characters, sessions, active session, text chat, voice, settings
- [x] Major views implemented: dashboard, profile, characters, campaigns, sessions, lobby, play
- [ ] `useProfileStore` (profile currently handled directly in view/service)
- [~] Loading/error conventions exist but are not yet standardized as a shared UI pattern
- [ ] Formal design system and tokenized UI kit (currently mostly ad-hoc component styles)

## 6. Auth and profile

- [x] Sign up, sign in, sign out, session restore
- [x] Profile page with display-name editing
- [x] Auth boundary enforced by route guard and backend checks
- [ ] Password reset flow
- [ ] Avatar upload flow
- [~] Preferences API support exists (`updatePreferences`) but no complete UX
- [ ] Auth/session diagnostics panel

## 7. Characters, campaigns, sessions, lobby

- [x] Character CRUD (create, edit, archive/delete)
- [x] Campaign CRUD basics
- [x] Session list/create/edit/cancel flows
- [x] Session config includes max players, text toggle, voice toggle, campaign selection
- [ ] Rules profile selection in session creation/edit UX
- [x] Lobby supports join/leave, ready toggle, character binding, start action
- [x] Host-driven session status transitions (`lobby`, `active`, `paused`, `ended`)
- [ ] Invite-only/private session model
- [ ] Duplicate membership/join dedup at application layer

## 8. Colyseus authoritative runtime

- [x] Session room auth uses JWT in production and dev fallback userId in development
- [x] Membership check before room join
- [x] Room state schema for players, status, snapshotVersion
- [x] Message handlers for ready/bind/start/pause/end/submit action/chat/history/snapshot
- [x] Reconnection handling via `allowReconnection`
- [x] Snapshot bootstrap and persistence to Appwrite
- [~] Action resolution is currently broadcast-first; deep rules-engine resolution pipeline is still minimal
- [ ] Dedicated doc explaining Appwrite identity to Colyseus auth flow end-to-end

## 9. Text chat

- [x] Text chat UI panel and send flow
- [x] Chat history load from Appwrite via room message
- [x] Character-name display and sender tooltips
- [x] System message rendering path in UI
- [x] Disabled-chat session handling in play view
- [~] Member-only behavior enforced in runtime path, but document-level Appwrite permission model still needs explicit hardening documentation
- [ ] Moderation/system announcement workflows

## 10. Voice chat

- [x] LiveKit room naming convention (`ddp-session-<sessionId>`)
- [x] Integration API token endpoint with identity, membership, and voice-enabled checks
- [x] Join/leave/mic/speaker controls in UI
- [x] Device selection for input/output
- [x] Mic level indicator and active speaker highlight
- [x] Voice participant list + tooltips
- [~] Error handling exists, but dropped-media recovery and permission-denied UX are not fully robust
- [ ] Voice presence surfaced in lobby roster/state model

## 11. Integration API

- [x] Health endpoint
- [x] Voice token issuance endpoint
- [x] Input validation with `zod`
- [ ] Additional orchestration endpoints (system messages, room join helper, snapshot helpers)
- [~] Endpoint/trust-boundary documentation exists in prose but needs tighter API-level reference

## 12. SDK and UI kit packages

- [x] Package scaffolds exist (`packages/sdk-client`, `packages/ui-kit`)
- [ ] Typed client wrappers implemented in `sdk-client`
- [ ] Reusable token-based component library in `ui-kit`

## 13. Mobile (Capacitor)

- [ ] Capacitor not yet added to `apps/web`
- [ ] Android/iOS projects not generated
- [ ] Mobile-specific permission and resume/reconnect behavior not tested

## 14. Observability and diagnostics

- [x] Structured logging in server apps
- [x] Service health endpoints
- [ ] Correlation IDs across request/session boundaries
- [ ] Runtime metrics for room counts, connection counts, token issuance, and errors
- [ ] Developer diagnostics UI in web app

## 15. Testing status

- [x] Unit tests exist and pass locally (`tests/unit/logger.test.ts`, `tests/unit/shared-rules.test.ts`)
- [x] Integration test suite exists for auth, infrastructure, session lifecycle, snapshots, text messages, and voice token authorization
- [~] Integration suite reliability depends on environment readiness (Appwrite/API key/services); not all tests pass in current local state
- [ ] Store-level unit tests for web state logic
- [ ] Component tests for Vue views/components
- [ ] End-to-end journey tests

## 16. Security and moderation

- [x] Core runtime paths validate inbound payloads in Colyseus and integration API
- [~] Security posture needs formal audit pass (secrets, rate limits, permission model verification)
- [ ] Rate limiting for sensitive endpoints
- [ ] Moderation model for chat and participant controls
- [ ] Audit log strategy for security-relevant actions

## 17. Documentation backlog

- [x] Setup docs: local and deployment guides present
- [x] ADR set for key stack decisions present
- [ ] Architecture diagrams (`docs/architecture` is currently empty)
- [ ] Protocol invariants reference beyond current guide
- [ ] Troubleshooting handbook and release checklist

## 18. MVP reality check

Target MVP criteria and current state:

- [x] Register and authenticate
- [x] Create and manage characters
- [x] Create sessions with text/voice toggles
- [x] Join lobby and manage readiness
- [x] Start and participate in real-time session room
- [x] Exchange text chat in-session with persistence path
- [x] Join voice when enabled
- [~] Resume flow via persisted snapshots exists, but broader reconnection and operational hardening remain

## 19. Next prioritized actions

1. [x] Add CI workflow for lint, typecheck, unit tests, and environment-aware integration tests.
2. [ ] Implement missing user-critical profile/auth features: password reset, avatar upload, preferences UX.
3. [ ] Harden session membership and Appwrite permissions (including duplicate join handling).
4. [ ] Add rules profile selection and baseline CRUD path in web + persistence.
5. [ ] Improve voice robustness for permission denial and reconnect behavior.
6. [ ] Add component/store tests and at least one happy-path E2E flow.
7. [ ] Fill `docs/architecture` with boundary and sequence diagrams.

---

Maintenance rule:
When architecture, boundaries, or workflow assumptions change, update this file together with `README.md`, `AGENTS.md`, and relevant ADRs.
