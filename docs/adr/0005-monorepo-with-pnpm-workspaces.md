# ADR 0005: Monorepo with pnpm Workspaces

## Status
Accepted

## Context
DDP consists of multiple apps (web client, Colyseus server, integration API) and shared packages (types, rules, SDK, UI kit). Code sharing and development coordination benefit from a monorepo.

## Decision
Use a pnpm workspace monorepo.

## Rationale
- pnpm provides fast installs, strict dependency isolation, and excellent monorepo ergonomics.
- Shared packages are referenced via `workspace:*` protocol.
- TypeScript project references enable incremental builds.
- Clear package boundaries are enforced by the workspace structure.

## Consequences
- All apps and packages live in a single repository.
- Shared contracts are updated atomically with consuming code.
- CI must build/test the full workspace or use change detection.
