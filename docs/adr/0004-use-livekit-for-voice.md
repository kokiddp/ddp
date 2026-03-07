# ADR 0004: Use LiveKit for Optional Voice Subsystem

## Status
Accepted

## Context
DDP supports optional voice communication for game sessions. Voice transport, microphone state, and room-based audio are separate concerns from game state.

## Decision
Use self-hosted LiveKit as the voice/media transport layer.

## Rationale
- LiveKit is open-source and self-hostable.
- It is purpose-built for WebRTC-based real-time audio/video.
- Token-based access control fits the security model.
- Voice is cleanly separated from session state.

## Consequences
- Voice tokens are issued from trusted backend code only.
- Room naming is deterministic and tied to session IDs.
- Voice participation is always optional and player-controlled.
- Voice state (joined, mic on, speaker on) is tracked separately from session membership.
