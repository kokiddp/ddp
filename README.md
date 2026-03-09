# Dynamic Destiny Protocol (DDP)

**Dynamic Destiny Protocol (DDP)** is an open, self-hostable framework for running structured tabletop role-playing game sessions across web and mobile clients.

It is **not a game setting** and **not a single game system**. Instead, DDP is a shared protocol, runtime, and application framework for creating and joining RPG sessions that follow a common interaction model while leaving each party free to define:

- setting
- lore
- tone
- campaign rulesets
- house rules
- character archetypes
- inventories, abilities, scenes, encounters, and narrative structures

DDP aims to provide the digital scaffolding needed to play many kinds of role-playing experiences without locking creators into one universe or one canonical rulebook.

---

## Project identity

- **Project name:** Dynamic Destiny Protocol
- **Acronym:** DDP
- **Maintainer / studio:** ELK-Lab
- **License target:** MIT wherever compatible with dependency licenses
- **Primary goal:** open, extensible, self-hosted RPG session framework with real-time synchronization, optional text chat, optional voice chat, and reusable domain primitives

---

## Vision

DDP should feel like a hybrid between:

- a campaign/session management tool
- a real-time multiplayer tabletop companion
- a protocol for shared state across players and hosts/game masters
- an extensible engine for building multiple RPG experiences on top of common abstractions

The platform must support at least the following user stories:

1. A player registers and authenticates.
2. A player creates one or more characters.
3. A host creates a game session.
4. The host configures optional communication layers such as text and voice.
5. Players join a session.
6. The session state updates in real time across all connected clients.
7. Players can opt into or out of communication features enabled for the session.
8. Sessions can be resumed later using persistent stored state.
9. Different parties can interpret the protocol through different settings, themes, worlds, and narrative systems.

---

## Why this architecture

DDP needs four distinct concerns, and it is healthier not to force one tool to impersonate all of them.

### 1. Identity and persistence
We need authentication, user profiles, characters, campaign metadata, session metadata, persistent chat history, storage, and general app data.

### 2. Real-time authoritative game/session state
We need room/session orchestration, join/leave, authoritative validation of actions, synchronized state snapshots, and deterministic handling of player actions.

### 3. Voice media transport
We need optional low-latency voice communication, independent of game state and resilient enough for web/mobile use.

### 4. Cross-platform client delivery
We need a modern UI stack that reaches web, Android, and iOS with high code reuse.

Trying to make a single product do all of these at once usually ends in architectural soup.

---

## Selected stack

### Frontend
- **Vue 3**
- **TypeScript**
- **Vite**
- **Pinia** for state management
- **Vue Router**
- **Capacitor** for Android and iOS packaging

### Backend / persistence / authentication
- **Appwrite** (self-hosted)

### Real-time session engine
- **Colyseus**
- **Node.js**
- **TypeScript**

### Voice communication
- **LiveKit** (self-hosted)

### Infrastructure
- **Docker Compose** for local development and self-hosted deployments
- **Traefik** reverse proxy for routing Appwrite API, Console, and Realtime
- PostgreSQL only if introduced later for analytics/reporting or if Appwrite internals are not enough for some derived services

### Current service versions
- **Appwrite** 1.6 (self-hosted, with separate console container `appwrite/console:5.2.58`)
- **LiveKit** v1.9
- **MariaDB** 10.11
- **Redis** 7 (Alpine)
- **Traefik** 2.11

---

## Why these choices

### Why Vue instead of Angular
Vue 3 is recommended as the default frontend framework for DDP because:

- it is lightweight and productive
- it fits both app-style dashboards and game/session UIs well
- it works very naturally with TypeScript and Vite
- it keeps friction lower for rapid iteration
- it pairs cleanly with Capacitor for mobile packaging

Angular would also work, but for DDP the ergonomics and lighter operational overhead of Vue are an advantage.

### Why Appwrite
Appwrite is the closest match to a self-hosted “Firebase-like” platform for:

- authentication
- user management
- database/documents
- storage
- permissions
- real-time subscriptions
- server-side functions

It is a strong fit for DDP’s persistent application layer.

### Why Colyseus
Colyseus is chosen for the live session/game engine because it gives us:

- real-time rooms
- authoritative server logic
- predictable session lifecycle management
- synchronization patterns better suited to multiplayer state than generic database subscriptions

DDP is not a twitch-action video game, but it still benefits from a dedicated authoritative session runtime.

### Why LiveKit
Voice is a separate beast. Media transport, microphone state, speaker state, reconnect behavior, and room-based voice communication are better handled by a dedicated real-time media platform.

LiveKit is selected because it is:

- open and self-hostable
- designed for WebRTC-based real-time audio/video
- suitable for room-based voice sessions
- cleanly tokenized and backend-controllable

---

## High-level architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                       Client Applications                     │
│                                                               │
│  Web (Vue)        Android (Capacitor)       iOS (Capacitor)   │
└───────────────┬───────────────────────┬───────────────────────┘
                │                       │
                │ HTTPS / WebSocket     │
                │                       │
    ┌───────────▼───────────┐   ┌──────▼──────────────────────┐
    │       Appwrite        │   │         Colyseus            │
    │ auth, users, chars,   │   │ session rooms, state,       │
    │ game metadata, chat,  │   │ turn logic, action          │
    │ permissions, storage  │   │ validation, synchronization │
    └───────────┬───────────┘   └──────────────┬──────────────┘
                │                              │
                │ issues signed room access    │
                │ and stores persistent data   │
                │                              │
                └──────────────┬───────────────┘
                               │
                      ┌────────▼────────┐
                      │    LiveKit      │
                      │ room-based      │
                      │ optional voice  │
                      └─────────────────┘
```

---

## System boundaries

### Appwrite owns
- authentication and sessions
- user records
- player profiles
- character persistence
- campaign persistence
- game/session metadata persistence
- chat persistence for text channels
- file/media storage where needed
- permission checks at data layer
- serverless or backend function triggers for integration glue

### Colyseus owns
- active room lifecycle
- connected player registry for an active session
- authoritative in-memory session state
- validation of actions submitted by clients
- real-time broadcasting of session changes
- deterministic mutation of session state
- temporary runtime-only state that should not be written on every micro-change

### LiveKit owns
- room voice presence
- media transport
- mute/unmute behavior
- audio publish/subscribe
- optional future support for video or spatial audio if desired

### Client owns
- rendering
- user interaction
- local UI state
- optimistic UI only where safe
- connecting/disconnecting from Appwrite, Colyseus, and LiveKit according to permissions and session configuration

---

## Core product principles

1. **Protocol first, setting second**
   DDP should never hard-code a fantasy universe, sci-fi canon, or narrative theme.

2. **Server-authoritative session logic**
   Clients request actions; server validates and applies them.

3. **Persistence is not the same thing as live state**
   The active session runtime should not treat the database as the single source of truth for every transient interaction.

4. **Communication layers are optional modules**
   Text chat and voice chat are features, not assumptions.

5. **Everything is self-hostable**
   The architecture must remain deployable on infrastructure owned by the operator.

6. **Extensibility matters more than early micro-optimizations**
   DDP is a framework and protocol, so modularity wins.

---

## Domain model overview

The exact schema may evolve, but the following entities form the foundation.

### User
Represents an authenticated human account.

Suggested fields:
- id
- email
- displayName
- avatarUrl
- createdAt
- updatedAt
- preferences
- status

### Character
Represents a playable entity owned by a user.

Suggested fields:
- id
- ownerUserId
- name
- archetype
- summary
- portraitUrl
- metadata
- stats
- tags
- createdAt
- updatedAt
- archivedAt

### Campaign
Represents a reusable narrative container or long-lived progression context.

Suggested fields:
- id
- ownerUserId
- title
- description
- settingDescriptor
- rulesetDescriptor
- metadata
- createdAt
- updatedAt

### GameSession
Represents a concrete play session or live room.

Suggested fields:
- id
- campaignId
- hostUserId
- title
- status
- textChatEnabled
- voiceChatEnabled
- maxPlayers
- rulesProfile
- currentSnapshotId
- createdAt
- scheduledAt
- startedAt
- endedAt

### GamePlayer
Join table between session and user/character.

Suggested fields:
- id
- gameSessionId
- userId
- characterId
- role
- status
- textChatJoined
- voiceChatJoined
- microphoneEnabled
- speakerEnabled
- joinedAt
- leftAt

### TextMessage
Persistent text chat message for a session.

Suggested fields:
- id
- gameSessionId
- senderUserId
- senderCharacterId
- senderDisplayName
- kind
- body
- createdAt

### SessionSnapshot
Persistent representation of important session state.

Suggested fields:
- id
- gameSessionId
- version
- stateBlob
- createdAt
- createdBy

### RulesProfile
Represents the structured protocol/rules configuration for a specific campaign or session.

Suggested fields:
- id
- name
- description
- version
- configBlob
- createdAt
- updatedAt

---

## Communication model

DDP supports optional communication features configured at game-session creation time.

### Session-level communication configuration
At creation time, a host can decide:

- whether text chat is enabled for the session
- whether voice chat is enabled for the session

This produces session-level flags:

```ts
export type GameCommunicationSettings = {
  textChatEnabled: boolean;
  voiceChatEnabled: boolean;
};
```

### Player-level communication state
Even if a feature is enabled globally for the session, a player can choose whether to participate.

```ts
export type PlayerCommunicationState = {
  textChatJoined: boolean;
  voiceChatJoined: boolean;
  microphoneEnabled: boolean;
  speakerEnabled: boolean;
};
```

### Meaning of the states
- `textChatEnabled`: this session supports text chat
- `voiceChatEnabled`: this session supports voice chat
- `textChatJoined`: this player is actively using/receiving text chat UI for the session
- `voiceChatJoined`: this player is connected to the voice room
- `microphoneEnabled`: this player is transmitting microphone audio
- `speakerEnabled`: this player is receiving remote audio locally

These states must not be conflated. They are different concerns.

---

## How the components interact

### Authentication flow
1. User signs up or signs in through Appwrite.
2. Client stores the Appwrite session securely.
3. Client fetches user profile and available characters from Appwrite.
4. Client can now create or join sessions according to permissions.

### Session creation flow
1. Host creates a new `GameSession` in Appwrite.
2. Host chooses title, rules profile, communication settings, max players, and other metadata.
3. Appwrite stores the persistent session record.
4. When the session becomes active, client or backend orchestrator creates or joins the corresponding Colyseus room.
5. If voice is enabled, a LiveKit room is logically associated with the same session id.

### Session join flow
1. Player discovers session metadata from Appwrite.
2. Player requests to join.
3. Appwrite persists membership intent or accepted membership.
4. Client obtains authorization to join the relevant Colyseus room.
5. Client loads initial snapshot or state seed.
6. If voice is enabled and player opts in, backend issues a LiveKit token for the mapped room.

### Real-time play flow
1. Client sends an action command to Colyseus.
2. Colyseus validates the action against authoritative session state.
3. Colyseus mutates state if valid.
4. Colyseus broadcasts new state or patches to room participants.
5. Significant milestones are snapshotted back to Appwrite for persistence.

### Text chat flow
1. If session text chat is enabled, client can send a text message via Colyseus.
2. Colyseus server resolves the sender's character display name and broadcasts the message to all room participants.
3. Message is persisted in Appwrite with sender metadata (userId, characterId, displayName).
4. Chat history is loaded from Appwrite when a client joins, so messages persist across reconnections.
5. Colyseus may also inject system messages into the text log if useful.

### Voice chat flow
1. If session voice chat is enabled, player can opt into voice.
2. Client requests a voice token from the integration API.
3. Integration API verifies authenticated identity, session membership, and `voiceChatEnabled` flag.
4. Integration API issues a time-limited LiveKit token for the deterministic room (`ddp-session-<sessionId>`).
5. Client connects to LiveKit and manages mic/speaker state locally.
6. Client can select input/output audio devices and see a real-time mic level indicator.
7. Active speakers are detected via LiveKit events and highlighted in the voice participant list.

---

## Proposed service map

### Frontend app modules
- auth
- profile
- characters
- campaigns
- session-discovery
- session-lobby
- active-session
- text-chat
- voice-chat
- settings
- admin/debug tools

### Backend integration modules
- appwrite client wrapper
- colyseus client wrapper
- livekit client wrapper
- session authorization API adapter
- event/logging adapter

### Colyseus room modules
- room bootstrap
- membership validation
- state serializer
- action handler registry
- turn engine or timeline engine
- encounter subsystem
- scene subsystem
- inventory subsystem
- dice/check subsystem
- snapshot/export subsystem

### Appwrite functions or backend glue services
- issue LiveKit token
- authorize Colyseus join
- create session runtime record
- persist snapshots
- post system messages
- housekeeping tasks

---

## Repository strategy

A monorepo is recommended.

### Suggested layout

```text
ddp/
├─ apps/
│  ├─ web/                     # Vue web client
│  ├─ colyseus-server/         # authoritative session engine
│  └─ integration-api/         # optional glue API / token issuer
├─ packages/
│  ├─ shared-types/            # shared TS types and contracts
│  ├─ shared-rules/            # protocol/rules primitives
│  ├─ ui-kit/                  # reusable UI components
│  ├─ sdk-client/              # internal DDP client SDK
│  └─ eslint-config/           # shared linting config
├─ infra/
│  ├─ docker/
│  ├─ compose/
│  ├─ reverse-proxy/
│  └─ scripts/
├─ docs/
│  ├─ architecture/
│  ├─ adr/
│  ├─ protocol/
│  └─ api/
├─ AGENTS.md
├─ README.md
├─ TODO.md
├─ package.json
└─ pnpm-workspace.yaml
```

### Package manager
Use **pnpm workspaces**.

Reason:
- excellent monorepo ergonomics
- fast installs
- clear package boundaries
- good TypeScript support

---

## Suggested shared packages

### `@ddp/shared-types`
Contains:
- entity types
- DTOs
- event contracts
- API request/response contracts
- validation shapes
- communication state types

### `@ddp/shared-rules`
Contains:
- abstract rule interfaces
- protocol-level mechanics
- reusable validation helpers
- common status effect/state transition logic

### `@ddp/sdk-client`
Contains:
- typed wrappers for Appwrite, Colyseus, and LiveKit interactions
- client-side orchestration helpers
- reconnect logic

### `@ddp/ui-kit`
Contains:
- design system primitives
- session UI widgets
- form controls
- reusable panels for character sheets, player roster, chat, etc.

---

## Frontend architecture notes

### State management
Use Pinia stores separated by concern:

- `useAuthStore`
- `useProfileStore`
- `useCharacterStore`
- `useSessionListStore`
- `useActiveSessionStore`
- `useTextChatStore`
- `useVoiceChatStore`
- `useSettingsStore`

### Routing
Suggested top-level route groups:
- `/auth/*`
- `/app/dashboard`
- `/app/characters`
- `/app/campaigns`
- `/app/sessions`
- `/app/sessions/:sessionId/lobby`
- `/app/sessions/:sessionId/play`

### UI philosophy
The UI should prioritize:
- readability
- low-friction session management
- clear player presence indicators
- responsive mobile-safe layout
- accessibility for chat and session controls
- minimal assumptions about visual theme

Because DDP is a framework, visual skinning should remain possible.

---

## Colyseus design notes

DDP should treat Colyseus rooms as authoritative live session containers.

### Colyseus responsibilities in practice
- validate that joining users belong to the session
- load initial session state from the latest snapshot when room starts
- keep authoritative in-memory state
- apply actions such as:
  - join slot
  - leave slot
  - ready state toggle
  - character bind/unbind
  - scene transition
  - turn progression
  - ability invocation
  - item use
  - initiative change
  - generic protocol event dispatch
- periodically or eventfully persist snapshots to Appwrite

### Important design rule
Do not persist every tiny state mutation immediately unless required.

Use a combination of:
- periodic checkpoint snapshots
- milestone-based snapshots
- explicit save actions

This avoids turning the persistence layer into a panic room for every keystroke.

---

## LiveKit design notes

### Room naming
Each active session maps to a deterministic voice room name:

```text
ddp-session-<sessionId>
```

### Token issuance
Never issue LiveKit tokens from the client. Tokens must be issued from trusted backend logic after verifying:
- authenticated user identity
- session membership
- session voice capability

### Voice UX
Implemented controls:
- Join voice / Leave voice
- Mute/unmute microphone
- Deafen/undeafen local speaker
- Input device (microphone) selection
- Output device (speaker) selection
- Real-time mic level indicator (8-bar visualizer)
- Voice participant list with character names
- Active speaker highlighting (green glow)
- Tooltips on participant names showing character name, user name, and ID

### Future voice features
Possible future extensions:
- GM priority channel
- team/subgroup channels
- push-to-talk
- ambient audio/music channels
- session recording if legally and ethically acceptable

---

## Appwrite data strategy

Not every piece of DDP state belongs in Appwrite in the same way.

### Best uses of Appwrite
- durable user and app records
- access-controlled text messages
- profile and character storage
- campaign metadata
- session metadata
- snapshots
- attachments
- admin and audit data

### Avoid using Appwrite as
- the only runtime state engine for active multiplayer interactions
- the authoritative arbiter of every live action timing issue
- a replacement for a session room runtime

This distinction is crucial.

---

## Protocol abstraction strategy

Because DDP is a framework rather than a single game, the protocol layer should define abstractions instead of lore.

### Examples of abstractions DDP should expose
- actors
- parties
- attributes
- resources
- inventories
- abilities
- checks/tests
- statuses
- scenes
- encounters
- timelines or turns
- triggers
- narrative flags
- rule profiles

### Examples of things DDP should *not* hard-code
- elves, dwarves, spaceships, vampires, gods, dragons, etc.
- alignment systems
- specific stat names
- setting-specific classes
- one canonical spell list
- one canonical item taxonomy

Instead, DDP should provide structures that can host these concepts.

---

## API and event design guidance

DDP should prefer explicit commands and events.

### Commands
Examples:
- `CreateSession`
- `JoinSession`
- `LeaveSession`
- `BindCharacterToSession`
- `ToggleReady`
- `SendTextMessage`
- `JoinVoice`
- `LeaveVoice`
- `SubmitAction`
- `AdvanceTurn`

### Events
Examples:
- `SessionCreated`
- `PlayerJoined`
- `PlayerLeft`
- `CharacterBound`
- `SessionStarted`
- `ActionAccepted`
- `ActionRejected`
- `TurnAdvanced`
- `SnapshotPersisted`
- `TextMessageSent`
- `VoiceStateChanged`

Commands are requests. Events are facts.

That distinction matters.

---

## Security considerations

- Never trust the client for authoritative gameplay changes.
- Separate persistent identity from live session presence.
- Issue voice tokens only from trusted backend logic.
- Validate every session join against membership rules.
- Enforce access controls for text chat history.
- Sanitize user-generated content.
- Rate-limit sensitive operations.
- Log moderation-relevant actions.
- Design for reconnects and duplicate submissions.

---

## Mobile considerations

### Capacitor-specific concerns
- microphone permissions must be requested contextually, not on app launch
- mobile navigation must keep active session controls reachable
- reconnect states must be visible and recoverable
- network degradation must not destroy session clarity

### Voice on mobile
Voice participation should be opt-in and robust against:
- app backgrounding
- temporary network dropouts
- microphone permission denial
- audio route changes

---

## Non-goals for the first milestone

To avoid building a cathedral made of TODOs, the first milestone should **not** include:

- video chat
- marketplace/plugin ecosystem
- scripting language for rules
- automated battle maps with heavy graphics
- AI game master features
- fully decentralized hosting
- federation across multiple operators
- complex mod portals

Those can come later if the core protocol earns them.

---

## Milestone roadmap

### Milestone 0 — Foundation
- monorepo bootstrap
- linting, formatting, CI basics
- local Docker environment
- shared types package
- Vue app scaffold
- Colyseus server scaffold
- Appwrite local setup
- LiveKit local setup

### Milestone 1 — Identity and characters
- authentication flows
- profile page
- character CRUD
- basic dashboard

### Milestone 2 — Session metadata and lobby
- create session
- list sessions
- join/leave session
- lobby roster
- communication settings per session

### Milestone 3 — Active session runtime
- Colyseus room lifecycle
- room join authorization
- authoritative session state
- basic action dispatch
- persistent snapshots

### Milestone 4 — Communication layers
- text chat persistence and realtime subscription
- voice token issuing
- LiveKit room connectivity
- player-level comm controls

### Milestone 5 — Protocol/rules extensibility
- generic actor/resource/action abstractions
- rules profile support
- reusable protocol engine pieces

### Milestone 6 — Hardening
- testing
- reconnect handling
- moderation hooks
- observability
- deployment guides

---

## Development philosophy

DDP should be developed as both:
- a human-maintainable software project
- an agent-friendly codebase where AI agents can contribute safely and predictably

This means:
- strong naming conventions
- explicit boundaries
- small composable modules
- architecture decision records
- shared contracts before implementation sprawl
- ruthless avoidance of mystery meat abstractions

---

## Documentation requirements

The project should maintain:
- architecture decision records (ADR)
- API contracts
- protocol specifications
- entity documentation
- environment setup guides
- deployment guides
- test strategy docs
- contribution rules for humans and coding agents

---

## License

The project should be released under the **MIT License** unless a later compatibility review reveals a compelling reason to choose another permissive license.

The guiding rule is simple:
- prefer the most open and permissive licensing model compatible with the chosen dependencies and business goals

At the time of writing, the stack selected here is compatible with a permissive top-level application license strategy, but dependency-level review must still be part of release governance.

---

## Local development

### Prerequisites
- Node.js 20+ (via nvm)
- pnpm 10+
- Docker and Docker Compose

### Quick start

```bash
# Start infrastructure (Appwrite, LiveKit, MariaDB, Redis, Traefik)
infra/scripts/dev-up.sh

# Install dependencies
pnpm install

# Start all dev servers
pnpm dev
```

### Services (local)

| Service | URL |
|---|---|
| Appwrite Console | http://localhost/console |
| Appwrite API | http://localhost/v1 |
| Appwrite Realtime | ws://localhost/v1/realtime |
| LiveKit (v1.9) | ws://localhost:7880 |
| Colyseus (dev) | ws://localhost:2567 |
| Integration API (dev) | http://localhost:3100 |
| Web client (dev) | http://localhost:5173 |

### Running tests

```bash
# Run all tests
pnpm test

# Run integration tests only (requires docker stack running)
pnpm test:integration
```

### Infrastructure scripts

- `infra/scripts/dev-up.sh` — Start all Docker services
- `infra/scripts/dev-down.sh` — Stop all Docker services
- `infra/scripts/dev-reset.sh` — Stop and remove all volumes (full reset)

---

## Final note

DDP should resist two classic engineering traps:

1. becoming a generic CRUD app that happens to have a room screen
2. becoming an overengineered fake game engine before the protocol is proven

The sweet spot is a disciplined framework: persistent where needed, authoritative where needed, extensible by design, and humble enough not to hard-code someone else’s fantasy novel into its bones.
