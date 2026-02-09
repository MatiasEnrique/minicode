# Minicode Construction Roadmap

This roadmap is phase sequencing.
Use `implementation/` for concrete coding instructions.

## Human-First Execution Model

This project should be implementable by a developer with minimal AI help.
For each phase you should have:

- explicit inputs (what must already exist)
- explicit file edits to make
- verification commands
- done criteria that can be checked without interpretation

## Source of Truth Priority

1. Runtime code in `src/`, `server/`, `shared/`
2. `project-state/current-vs-target.md`
3. `docs/14-integration-contract.md`
4. `roadmap/` and `implementation/`
5. Remaining `docs/` architecture material

## Current Baseline

- Frontend shell exists, but project/file/agent data is static.
- Backend now includes authenticated project/project-file REST routes and typed project-scoped websocket handlers.
- Schema exists in Drizzle and migrations are committed.
- Agent/generator/parser/sandbox behavior is designed but not implemented.

## Phase Order

1. `phase-01-foundation-alignment.md` (completed)
2. `phase-02-database-and-persistence.md`
3. `phase-03-backend-api-contract.md`
4. `phase-04-frontend-data-integration.md`
5. `phase-05-agent-orchestration.md`
6. `phase-06-generation-streaming-parser.md`
7. `phase-07-sandbox-preview-runtime.md`
8. `phase-08-quality-operations-release.md`

## Implementation Guides

- `implementation/README.md`
- `implementation/current-to-target-matrix.md`
- `implementation/phase-02-database-and-persistence-spec.md`
- `implementation/phase-03-backend-api-spec.md`

## Dependency Chain

- Phase 2 unlocks safe persistence for every later phase.
- Phase 3 defines stable backend contracts used by frontend and agents.
- Phase 4 removes static UI state.
- Phases 5-7 add generation and runtime.
- Phase 8 hardens quality and operations.

## Execution Rule

Do not start a phase until previous phase done criteria are fully satisfied and documented.
