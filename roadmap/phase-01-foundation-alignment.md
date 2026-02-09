# Phase 1: Foundation Alignment

## Status

- Completed on 2026-02-09.
- Contract baseline: `docs/14-integration-contract.md`
- Current vs target source: `project-state/current-vs-target.md`

## Objective

Establish one reliable source of truth for architecture, environment, and local runtime so implementation work does not drift between docs and code.

## Scope

- Align `README.md`, `AGENTS.md`, and `docs/` around current vs target behavior.
- Define the integration contract between TanStack Start (`:3000`) and Elysia (`:3001`).
- Prepare local infrastructure prerequisites for upcoming phases.

## Tasks

- Document "current implementation" and "target implementation" in a single contributor-facing guide.
- Freeze API and WebSocket naming conventions for projects, files, and agent events.
- Add `docker-compose.yml` for PostgreSQL and confirm local boot sequence.
- Validate and normalize `.env.example` keys used by frontend, backend, and generator providers.
- Create missing folder conventions for `server/routes`, `server/services`, `server/agents`, `server/parser`, and `server/sandbox`.

## Deliverables

- Updated architecture/docs alignment notes.
- Local infra bootstrap instructions that work from a clean machine.
- A written backend/frontend contract reference used by later phases.

## Risks

- Continuing doc-code divergence will create rework in all later phases.
- Unclear API naming now will cause client/server rewrite churn later.

## Exit Criteria

- Team can run database and app services from documented commands only.
- Contract document exists and is accepted for REST + WebSocket payloads.
- No contradictory statements remain between key onboarding docs.

## Completion Checklist

- [x] Documented current vs target implementation in `project-state/current-vs-target.md`.
- [x] Froze REST/WebSocket naming and payload baseline in `docs/14-integration-contract.md`.
- [x] Added root `docker-compose.yml` and local boot instructions in `README.md`.
- [x] Normalized env validation (`src/config/env.ts`, `src/config/env.client.ts`) with `.env.example`.
- [x] Created server folder conventions:
  - `server/routes/`
  - `server/services/`
  - `server/agents/`
  - `server/parser/`
  - `server/sandbox/`
- [x] Reconciled onboarding docs (`README.md`, `docs/00-README.md`, `AGENTS.md`) to remove contradictory current-state statements.
