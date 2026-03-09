# Session Play Sequence

This document captures the high-level sequence when a player joins and plays in a live session.

## Join and play flow

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant W as Web Client
  participant A as Appwrite
  participant C as Colyseus Room
  participant I as Integration API
  participant L as LiveKit

  U->>W: Sign in
  W->>A: Account session / JWT
  A-->>W: Authenticated identity

  U->>W: Open session lobby/play
  W->>A: Read game_session + game_players
  A-->>W: Session metadata + membership

  W->>C: joinOrCreate(sessionId, jwt|dev userId)
  C->>A: verify JWT + membership
  A-->>C: user allowed
  C-->>W: room joined + current state

  U->>W: Send chat / ready / action
  W->>C: room message
  C->>C: validate + mutate authoritative state
  C-->>W: broadcast state/event patch
  C->>A: persist snapshots/chat at checkpoints

  U->>W: Join voice
  W->>I: POST /voice/token (jwt|dev userId, sessionId)
  I->>A: verify identity + session membership + voice enabled
  A-->>I: approved
  I-->>W: LiveKit token
  W->>L: connect(room token)
  L-->>W: media connected

  note over W,L: On network disruption, LiveKit reconnect events drive UI reconnect state.
```

## Validation checkpoints

- Auth validation: Appwrite account identity via JWT (or dev user fallback in development mode).
- Membership validation: game player membership must exist and not be `left`/`kicked`.
- Voice gating: session must have `voiceChatEnabled` before token issuance.
- Runtime authority: Colyseus remains source of truth for active session mutation.

## Failure modes and expected behavior

- Invalid session join auth: room join rejected.
- Duplicate join attempts: existing membership reused or reactivated when previously left.
- Session capacity exceeded: join request rejected in web join flow.
- Voice permission denied: user receives explicit microphone-permission error.
- Voice transport interruption: UI surfaces reconnecting status and recovers on `Reconnected`.
