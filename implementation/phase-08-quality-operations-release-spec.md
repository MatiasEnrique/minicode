# Phase 8 Implementation Spec: Quality, Operations, and Release

Phase reference: `roadmap/phase-08-quality-operations-release.md`

## Goal

Make the system release-safe with enforceable quality gates, observability, and operational runbooks.

## Dependencies

- Phases 2-7 complete and integrated.

## Desired Files and Content

- `.github/workflows/ci.yml` (or platform equivalent)
  - Run lint, typecheck, tests, and migration validation.
- `scripts/ci-verify.sh`
  - Local reproducible CI checks.
- `server/lib/logger.ts`
  - Structured logging utilities with correlation ids.
- `server/middleware/request-context.ts`
  - Request-scoped context and IDs for traceability.
- `server/middleware/rate-limit.ts`
  - Limit high-cost endpoints and websocket command bursts.
- `docs/15-incident-runbook.md`
  - Issue severity classification and triage steps.
- `docs/16-backup-recovery.md`
  - Backup cadence and restore procedure for Postgres.
- `docs/17-deployment-runbook.md`
  - Deploy and rollback procedure.
- `test/integration/e2e-core-flow.test.ts`
  - Validate auth -> project -> generate -> preview core flow.

## Implementation Notes

- CI must fail if migrations are out of sync with schema.
- Logging should include request id, project id, agent id where available.
- Rate limits should return consistent status codes and plain error messages.
- Runbooks should reflect real commands and recovery expectations.

## Validation Commands

```bash
bun run lint
bun run typecheck
bun run test
```

## Done Criteria

- CI passes on clean environment consistently.
- Core end-to-end path is covered by automated tests.
- Operational docs are usable for incident and recovery handling.
