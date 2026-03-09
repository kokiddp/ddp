# Contributing to Dynamic Destiny Protocol (DDP)

Thank you for your interest in contributing to DDP. This guide covers the essentials for both human contributors and coding agents.

## Prerequisites

- **Node.js** 20+ (we recommend [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 10+ (`npm install -g pnpm`)
- **Docker** and **Docker Compose** (for local Appwrite, LiveKit, etc.)

## Getting started

```bash
# Clone the repository
git clone <repo-url>
cd ddp

# One-command setup (installs deps, starts Docker infra, provisions DB)
cp .env.example .env
# (optional) edit .env to set APPWRITE_API_KEY if you already have one
./setup.sh

# Start all dev servers
pnpm dev
```

Or use `./setup.sh --docker` to run everything (including app services) in Docker.

See [docs/setup/local-setup-guide.md](docs/setup/local-setup-guide.md) for a detailed walkthrough.

## Repository structure

```
apps/
  web/                  # Vue 3 web client
  colyseus-server/      # Authoritative session engine
  integration-api/      # Token issuance, CORS, and backend glue
packages/
  shared-types/         # Shared TypeScript types and contracts
  shared-rules/         # Protocol-level rule primitives
  sdk-client/           # Client SDK (future)
  ui-kit/               # Reusable UI components (future)
infra/                  # Docker Compose, scripts, reverse proxy
docs/                   # Architecture, ADRs, protocol, API docs
tests/
  unit/                 # Unit tests
  integration/          # Integration tests (require running infra)
```

## Development workflow

### Branching

Work on feature branches off `master`. Keep branches small and focused.

### Code style

- TypeScript everywhere
- `strict` mode enabled
- ESLint and Prettier are configured at the root
- Run `pnpm lint` and `pnpm format` before committing

### Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm vitest run tests/unit/

# Run integration tests (requires Docker stack)
pnpm vitest run tests/integration/
```

Tests live in `tests/unit/` and `tests/integration/`. Integration tests require Appwrite and other infrastructure to be running.

### Type checking

```bash
pnpm typecheck
```

Note: `shared-types` must be built before the web app can typecheck:

```bash
cd packages/shared-types && npx tsc --build
cd ../../apps/web && npx vue-tsc --noEmit
```

### Building

```bash
pnpm build
```

## Contribution guidelines

### What makes a good contribution

1. **Respect service boundaries** — Appwrite owns persistence, Colyseus owns live state, LiveKit owns voice. Don't blur these.
2. **Define contracts first** — Shared types and validation schemas before implementation.
3. **Add tests** — Unit tests for logic, integration tests for flows.
4. **Keep it setting-agnostic** — DDP is a framework, not a fantasy game. No elves in the core protocol.
5. **Update docs** — If you change architecture, flows, or environment variables, update the relevant docs.

### What to avoid

- Giant sweeping rewrites without discussion
- Mixing refactors with new features in one commit
- Hard-coding setting-specific concepts into core modules
- Bypassing server authority from client code
- Exposing secrets in frontend bundles

### Commit messages

Use clear, imperative commit messages:

```
Add voice token authorization integration tests

- Test invalid body rejection (400)
- Test invalid JWT rejection (401)
- Test non-member rejection (403)
- Test successful token issuance (200)
- Test voice-disabled session rejection (403)
```

### Pull requests

- Keep PRs focused on a single feature or fix
- Include a summary of what changed and why
- Reference related issues if applicable
- Ensure all tests pass before requesting review

## Architecture decisions

Significant architecture choices are documented as ADRs in `docs/adr/`. When proposing a change that affects:

- Stack selection
- Service boundaries
- Persistence model
- Protocol abstractions
- Deployment topology

...please create or update an ADR.

## Questions?

Open an issue for bugs, feature requests, or architectural questions. For contribution guidance, refer to [AGENTS.md](AGENTS.md) which contains detailed rules for both humans and coding agents.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
