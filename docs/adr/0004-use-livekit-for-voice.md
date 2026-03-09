# ADR 0004: Use LiveKit for Optional Voice Subsystem

## Status
Accepted

## Context
DDP supports optional voice communication for game sessions. Voice transport, microphone state, and room-based audio are separate concerns from game state.

## Decision
Use self-hosted LiveKit as the voice/media transport layer.

## Current Version
- **LiveKit Server:** v1.9 (Docker image `livekit/livekit-server:v1.9`)
- **livekit-client (web):** v2.17.2
- **livekit-server-sdk (integration API):** for token issuance

## Rationale
- LiveKit is open-source and self-hostable.
- It is purpose-built for WebRTC-based real-time audio/video.
- Token-based access control fits the security model.
- Voice is cleanly separated from session state.

## Implementation Details

### Room naming
Deterministic: `ddp-session-<sessionId>`

### Token issuance
- Integration API endpoint: `POST /voice/token`
- Validates: authenticated identity (JWT or dev userId), session membership, `voiceChatEnabled` flag
- Tokens expire after 4 hours

### Client features (implemented)
- Join/leave voice room
- Mute/unmute microphone
- Deafen/undeafen speaker
- Input/output audio device selection (`Room.getLocalDevices`, `switchActiveDevice`)
- Real-time mic level indicator (Web Audio API `AnalyserNode`, 8-bar visualizer)
- Active speaker detection (`RoomEvent.ActiveSpeakersChanged`)
- Voice participant list shows character names with speaking highlight
- Tooltips on participant names (character name, user name, ID)

### ICE configuration
For local Docker development, `node_ip: 127.0.0.1` must be set in `livekit.yaml` so ICE candidates resolve to localhost (Docker port-forwards handle the rest).

For production, set `node_ip` to the server's public IP or use `use_external_ip: true`.

## Consequences
- Voice tokens are issued from trusted backend code only (integration API).
- Room naming is deterministic and tied to session IDs.
- Voice participation is always optional and player-controlled.
- Voice state (joined, mic on, speaker on) is tracked separately from session membership.
- Active speaker state is purely client-side (LiveKit event-driven), not persisted.
