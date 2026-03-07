# AGENTS.md

This document defines how coding agents and human contributors should operate within the Dynamic Destiny Protocol (DDP) codebase.

DDP is a multi-service, TypeScript-first, self-hosted framework project. It includes:

- a Vue web/mobile client
- an Appwrite-backed persistence and auth layer
- a Colyseus authoritative live session engine
- a LiveKit-based optional voice layer
- shared domain packages and protocol contracts

This file exists to reduce chaos, prevent architectural drift, and keep automated contributions useful instead of spectacularly cursed.

---

## Mission for agents

Agents working on DDP must optimize for:

- correctness
- explicitness
- maintainability
- modularity
- type safety
- architectural consistency
- minimal surprise for future contributors

Agents must not optimize for:

- cleverness for its own sake
- hidden magic
- premature abstraction
- undocumented coupling
- framework lock-in beyond agreed boundaries

---

## Authoritative project assumptions

Unless a newer ADR supersedes this document, agents must assume the following stack:

### Core stack
- **Frontend:** Vue 3 + TypeScript + Vite + Pinia + Vue Router
- **Mobile packaging:** Capacitor
- **Persistence/Auth:** Appwrite
- **Live session engine:** Colyseus on Node.js + TypeScript
- **Voice/media:** LiveKit
- **Monorepo tooling:** pnpm workspaces
- **Containerization:** Docker Compose for local/dev infra

### Language policy
- Prefer **TypeScript** across frontend, server, shared packages, and tooling wherever practical.
- Avoid introducing additional backend languages unless a clear architectural reason is documented.

---

## First principles

### 1. DDP is a framework, not a setting
Do not hard-code lore, race/class systems, named worlds, or setting-specific assumptions into core protocol modules.

### 2. The server is authoritative for live session logic
Client code may present state and request actions, but it must not become the source of truth for live session mutation.

### 3. Persistence is not the same as active runtime state
Do not use Appwrite as a replacement for Colyseus room state.

### 4. Voice is a separate subsystem
Do not entangle media transport logic with the core game/session engine.

### 5. Explicit contracts beat vibes
Shared types, DTOs, command shapes, event shapes, and invariants must be modeled clearly.

---

## Contribution priorities

Agents should work in this order of preference:

1. strengthen shared contracts
2. preserve service boundaries
3. keep modules small and composable
4. add tests for non-trivial logic
5. document assumptions when adding patterns
6. prefer boring correctness over theatrical architecture

That last one matters. The codebase does not need a wizard; it needs a reliable electrician.

---

## Repository structure expectations

Expected structure:

```text
apps/
  web/
  colyseus-server/
  integration-api/
packages/
  shared-types/
  shared-rules/
  sdk-client/
  ui-kit/
infra/
docs/
```

Agents must place code in the correct area and must not dump shared code into app folders if it is intended for reuse.

### Placement rules
- **shared domain contracts** go into `packages/shared-types`
- **protocol/rules logic** goes into `packages/shared-rules`
- **frontend-only components/composables** go into `apps/web` or `packages/ui-kit`
- **authoritative room logic** goes into `apps/colyseus-server`
- **cross-service glue logic** goes into `apps/integration-api` or documented Appwrite functions

---

## Service boundaries

### Appwrite boundary
Appwrite is responsible for:
- identity
- authentication
- persistent user data
- persistent character data
- campaign/session metadata
- persistent text messages
- access control
- storage
- long-lived snapshots or records

Agents must not:
- turn Appwrite into the primary runtime for active session resolution
- store every transient action as if it were a permanent historical artifact
- make clients bypass permission logic casually

### Colyseus boundary
Colyseus is responsible for:
- active room lifecycle
- authoritative session state
- player presence in live sessions
- command validation
- action application
- event emission for runtime state changes

Agents must not:
- let the frontend mutate authoritative session state directly
- bury session logic inside arbitrary UI components
- couple room logic tightly to Appwrite SDK specifics

### LiveKit boundary
LiveKit is responsible for:
- voice room connectivity
- media publication/subscription
- mute/unmute and local media control

Agents must not:
- generate LiveKit tokens in the frontend
- assume voice is always enabled
- intertwine voice presence with session membership in ways that break optionality

---

## Code style and design rules

### General
- Use clear, domain-oriented names.
- Prefer composition over inheritance unless inheritance is clearly superior.
- Avoid giant god-objects and giant stores.
- Keep functions small and intention-revealing.
- Prefer immutable transformations where practical.
- Use explicit return types for exported functions.
- Keep cross-service contracts versionable.

### TypeScript
- `strict` mode should be enabled.
- Avoid `any` except as a temporary, documented escape hatch.
- Prefer discriminated unions for command/event modeling.
- Prefer branded or explicit ID types when helpful.
- Validate external input before it reaches core logic.

### Frontend
- Keep presentational components separate from orchestration logic where possible.
- Use Pinia stores by domain, not one mega-store.
- Avoid API calls directly from deep leaf components unless the design explicitly warrants it.
- Centralize service clients and transport wrappers.

### Server
- Model commands and events explicitly.
- Keep validation close to boundary inputs.
- Separate room lifecycle concerns from domain mutation rules.
- Log meaningfully, not noisily.

---

## Naming conventions

### Files
Use consistent names such as:
- `create-session.command.ts`
- `session-created.event.ts`
- `session-room.service.ts`
- `voice-token.controller.ts`
- `character.repository.ts`

### Symbols
- classes: `PascalCase`
- interfaces/types: `PascalCase`
- functions: `camelCase`
- constants: `UPPER_SNAKE_CASE` only for true constants
- Vue components: `PascalCase.vue`
- composables: `useThing.ts`
- Pinia stores: `useThingStore.ts`

### Commands and events
Commands should read like requests:
- `CreateSessionCommand`
- `JoinSessionCommand`
- `SubmitActionCommand`

Events should read like facts:
- `SessionCreatedEvent`
- `PlayerJoinedEvent`
- `ActionRejectedEvent`

---

## Required workflow for non-trivial changes

For any non-trivial implementation, agents should follow this order:

1. identify the owning boundary
2. define or update shared types/contracts
3. define input validation strategy
4. implement core behavior
5. add or update tests
6. update documentation if behavior or architecture changed

Do not skip straight to code spraying.

---

## Rules for protocol evolution

DDP’s protocol layer is a core product asset. Agents must treat it carefully.

### When adding protocol concepts
Agents should ask, implicitly through design review, whether the concept is:
- setting-agnostic
- reusable across campaigns
- representable without lore assumptions
- truly part of the protocol rather than app UI or a single future plugin

### Good protocol additions
- resource pool abstractions
- actor state transitions
- generic action resolution contracts
- status effects
- narrative flags
- scene transitions

### Bad protocol additions to core
- named fantasy ancestries
- genre-specific magic schools as mandatory primitives
- one true equipment hierarchy
- one canonical initiative formula

If a feature is not generically applicable, it likely belongs in a higher-level rules package, not the core protocol.

---

## Rules for Appwrite usage

Agents may use Appwrite for:
- auth/session handling
- CRUD for persistent records
- subscriptions where persistence and realtime overlap naturally
- storage and file metadata
- permission-scoped data access

Agents should avoid:
- pushing high-frequency transient session mechanics into Appwrite as the main synchronization channel
- embedding large chunks of business logic inside Appwrite-specific code when that logic belongs in shared packages or the session engine

When writing Appwrite integration code:
- centralize SDK usage
- isolate mapping between raw Appwrite documents and domain models
- document permission assumptions

---

## Rules for Colyseus usage

When implementing Colyseus rooms, agents must:
- treat room state as authoritative runtime state
- keep room setup deterministic
- validate all inbound client actions
- preserve session membership rules
- persist snapshots only at deliberate checkpoints

Avoid:
- mixing transport concerns and core domain mutation logic
- adding undocumented side effects in message handlers
- persisting every tiny state mutation

A useful pattern is:
- parse input
- validate membership and permissions
- validate domain rules
- apply mutation
- broadcast event/patch
- checkpoint if needed

---

## Rules for LiveKit usage

LiveKit integration must follow these invariants:
- room naming must be deterministic
- token issuance must happen on trusted backend code only
- voice join is optional and controlled by session configuration plus player choice
- microphone state and voice-room presence are not the same thing

Agents should ensure UI models reflect the distinction between:
- feature enabled for session
- player joined voice room
- player microphone active
- player speaker active

---

## Testing expectations

### Minimum expectations
- unit tests for non-trivial shared logic
- unit tests for session validation logic
- integration tests for key orchestration flows when feasible
- smoke tests for client auth/session flows

### Priority test targets
1. session join authorization
2. command validation and rejection paths
3. snapshot loading/saving
4. communication feature gating
5. voice token authorization
6. reconnection flows

### Test anti-patterns
- snapshot tests as a substitute for actual logic tests
- brittle UI tests for behavior that belongs in store/service tests
- giant integration tests with unclear failure causes

---

## Documentation requirements for agents

Agents must update documentation when they:
- introduce a new service boundary decision
- change a major flow
- add a new shared domain concept
- alter repository structure
- introduce a new required environment variable

Relevant docs to update may include:
- `README.md`
- `TODO.md`
- `docs/architecture/*`
- `docs/adr/*`
- API or protocol docs

---

## Architectural decision records

Agents should propose or create an ADR when a change affects:
- stack selection
- persistence model
- session state model
- transport model
- package boundaries
- major protocol abstractions
- deployment topology

Suggested ADR naming:
- `0001-adopt-vue-capacitor.md`
- `0002-use-appwrite-for-persistence.md`
- `0003-use-colyseus-for-authoritative-session-state.md`

---

## Performance and scaling posture

Agents should optimize for sensible scale, not premature distributed-systems fan fiction.

Reasonable priorities:
- avoid pathological over-fetching
- avoid unnecessary writes
- ensure room logic stays efficient
- keep payloads compact
- support reconnect gracefully

Not reasonable priorities for early milestones:
- designing for millions of concurrent users before the first real session exists
- inventing bespoke distributed event buses without evidence

The cosmos is vast, but your MVP still needs to boot.

---

## Security posture

Agents must treat security-related code as high-scrutiny.

### Required habits
- validate all external input
- never trust client membership claims
- never expose secret keys to frontend bundles
- ensure permission checks exist at service boundaries
- sanitize user-generated text where rendered
- log security-relevant decisions appropriately

### Sensitive areas
- auth/session handling
- LiveKit token issuance
- session join authorization
- snapshot access
- moderation/audit actions

---

## Human/agent collaboration model

Humans and agents should collaborate through small, reviewable changes.

### Agents should produce
- clean commits or patches
- focused scope
- rationale in commit/PR descriptions
- updated docs for meaningful architectural changes

### Agents should avoid
- giant sweeping rewrites without migration strategy
- mixing refactors with new features in one patch
- silent changes to cross-service contracts

---

## When uncertain

When an agent is uncertain, it should prefer one of these outcomes:
1. implement the smallest correct and documented version
2. leave a precise TODO with context
3. add an ADR stub or design note

It should not:
- guess wildly
- introduce hidden assumptions
- fake genericity by creating useless abstraction layers

---

## Definition of done

A task is not done merely because some code exists.

A change is done when, where applicable:
- the owning boundary is respected
- contracts are typed
- validation exists
- tests exist or the reason they do not is explicit
- docs are updated
- no unrelated architecture drift was introduced

---

## Final instruction to agents

Build DDP as a disciplined protocol framework.

Do not turn it into:
- a setting-specific game
- a bloated CMS with dice decorations
- a realtime spaghetti cauldron
- a monument to clever abstractions nobody can maintain

Prefer sturdy beams, explicit contracts, and boringly correct systems. Future contributors will thank you instead of inventing new profanities.
