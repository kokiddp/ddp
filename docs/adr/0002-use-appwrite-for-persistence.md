# ADR 0002: Use Appwrite for Persistence and Auth

## Status
Accepted

## Context
DDP needs authentication, user/character/campaign/session persistence, file storage, access control, and real-time subscriptions for text chat.

## Decision
Use self-hosted Appwrite as the persistence and auth backend.

## Rationale
- Appwrite provides auth, database, storage, permissions, and real-time subscriptions in one self-hostable platform.
- It avoids building custom auth and permission infrastructure.
- It aligns with the self-hosted deployment requirement.

## Consequences
- Persistent data is managed through Appwrite SDKs.
- Appwrite must not be used as the primary runtime for active session state — that is Colyseus's responsibility.
- SDK usage should be centralized and mapping between Appwrite documents and domain models should be explicit.
