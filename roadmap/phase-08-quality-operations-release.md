# Phase 8: Quality, Operations, and Release

## Objective

Stabilize the full system with reliable testing, operational observability, and release-safe controls.

## Current State

- Test coverage is minimal.
- No CI enforcement for migrations + contract safety.
- Logging and runtime diagnostics are limited.

## Target State

- CI validates lint, typecheck, tests, and migration integrity.
- Critical user flow is covered by integration tests.
- Operational runbooks and debug signals are available.

## Inputs

- Phases 2-7 implemented and integrated.

## Concrete Work Items

1. Automated quality gates
- CI workflow for typecheck, tests, lint.
- Migration verification against fresh DB in CI.

2. Critical-path tests
- Auth and project CRUD integration.
- Agent state transition + cancel behavior.
- Generator-parser-sandbox smoke path.

3. Observability
- Structured logs with request/project/agent IDs.
- Standardized error shapes in API and websocket events.

4. Security and controls
- Request size/time limits on generation endpoints.
- Basic rate limiting for expensive operations.

5. Operations docs
- Incident triage guide.
- Backup/restore steps for DB.
- Deployment and rollback notes.

## Files Expected To Change

- `.github/workflows/*` (if used)
- `test/**/*`
- `docs/*` (operations runbooks)
- `server/**/*` (logging, error handling)

## Validation Commands

```bash
bun run typecheck
bun run test
bun run lint
```

## Exit Criteria

- CI green on clean environments.
- End-to-end flow (auth -> project -> generate -> preview) is validated.
- Onboarding and ops docs reflect real system behavior.
