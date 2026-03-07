# ADR 0003: Use Colyseus for Authoritative Session State

## Status
Accepted

## Context
DDP needs real-time rooms with authoritative server logic, action validation, synchronized state, and deterministic mutation for live RPG sessions.

## Decision
Use Colyseus as the authoritative session runtime engine.

## Rationale
- Colyseus provides real-time rooms, authoritative state, session lifecycle management, and synchronization patterns purpose-built for multiplayer state.
- It cleanly separates live session concerns from persistence.
- It runs on Node.js/TypeScript, matching the rest of the stack.

## Consequences
- Active session state lives in Colyseus room memory, not in the database.
- Snapshots are persisted to Appwrite at deliberate checkpoints, not on every mutation.
- Client code requests actions; the server validates and applies them.
