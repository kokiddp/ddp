# ADR 0006: Command/Event Modeling Strategy

## Status
Accepted

## Context
DDP needs a clear pattern for how clients request actions and how the system communicates state changes.

## Decision
Use explicit discriminated-union command and event types. Commands are requests (imperative). Events are facts (past tense).

## Rationale
- Explicit command/event shapes make the protocol self-documenting.
- Discriminated unions enable exhaustive pattern matching in TypeScript.
- Separating commands from events enforces the boundary between "what a client wants" and "what actually happened."

## Consequences
- All commands and events are defined in `@ddp/shared-types`.
- Commands use `CommandEnvelope<Type, Payload>` shape.
- Events use `EventEnvelope<Type, Payload>` shape.
- New protocol interactions require defining both the command and corresponding event(s).
