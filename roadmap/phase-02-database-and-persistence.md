# Phase 2: Database and Persistence

## Objective

Convert existing Drizzle schema into reproducible migrations and implement a repository layer that enforces ownership and deterministic persistence behavior.

## Current State

- `shared/db/schema.ts` defines auth + projects + project files + agent state tables.
- `migrations/` has no generated migration history yet.
- No repository code exists under `server/services/`.
- Backend does not call persistence for project/file/agent domain.

## Target State

- Migrations committed and runnable from a clean database.
- Repository modules available for projects/files/agent state.
- Uniqueness and ownership rules enforced by DB + service layer.
- Persistence tests covering happy path and access control.

## Inputs

- Phase 1 completed.
- Contract baseline available in `docs/14-integration-contract.md`.

## Implementation Guide

Use: `implementation/phase-02-database-and-persistence-spec.md`

## Concrete Work Items

1. Schema hardening
- Add unique `(project_id, path)` behavior for `project_files`.
- Make `agent_states.project_id` unique.

2. Migration workflow
- Generate migrations via `drizzle-kit`.
- Validate migration replay on a clean Postgres container.

3. Repository implementation
- Create typed repositories in `server/services/`:
- `projects-repository.ts`
- `project-files-repository.ts`
- `agent-states-repository.ts`

4. Test coverage
- Add tests for CRUD, ownership, and upsert semantics.

## Files Expected To Change

- `shared/db/schema.ts`
- `migrations/*`
- `server/services/*`
- `test/persistence/*`
- `project-state/current-vs-target.md`

## Validation Commands

```bash
docker compose up -d postgres
bun run db:migrate
bun run typecheck
bun run test
```

## Risks

- Missing migrations break onboarding and deployment repeatability.
- Missing uniqueness allows duplicate file rows and non-deterministic state.
- Missing ownership checks creates multi-tenant data leakage.

## Exit Criteria

- Fresh DB migration works end-to-end.
- Repository tests pass and enforce ownership.
- Project/file/agent persistence is available for Phase 3 routes.
