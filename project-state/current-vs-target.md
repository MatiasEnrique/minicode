# Project State: Current vs Target

Date: 2026-02-09

This file is the implementation-truth companion to architecture docs in `docs/`.  
Use this to avoid treating design docs as already implemented behavior.

## Current Implementation (As of 2026-02-09)

### Frontend

- TanStack Start app is running with landing, sign-in/sign-up, protected layout, and chat shell routes.
- Chat UI currently uses static project/file data.
- No frontend WebSocket integration for agent progress yet.

### Backend

- Elysia server exposes `GET /`, `GET /health`, authenticated REST project/project-file routes, and `WS /ws/:projectId`.
- REST routes implemented:
- `GET/POST /api/projects`
- `GET/PATCH/DELETE /api/projects/:id`
- `GET/PUT /api/project-files/:projectId`
- `GET /api/project-files/:projectId/:fileId`
- WebSocket contract handlers implemented for:
- `get_state`
- `get_preview_url`
- `start_generation` (state transition)
- `stop_generation` (state transition)
- `user_message` (conversation history append)
- Auth middleware is integrated in Elysia and route/websocket operations are ownership-scoped by user.
- No agent orchestration, generation, parser, or sandbox runtime integration yet.
- Repository layer exists under `server/services/` for:
- `projects` owner-scoped CRUD
- `project_files` owner-scoped list/upsert/delete
- `agent_states` owner-scoped get/upsert/reset
- Repositories are wired into API routes and websocket handlers.

### Data Layer

- Drizzle schema exists for auth + projects + files + agent state.
- Schema hardening for Phase 2 is implemented:
- `project_files` has unique `(project_id, path)`
- `agent_states.project_id` is unique
- Migrations are committed in `migrations/` (`0000_jittery_dark_beast.sql`, `0001_perpetual_warbound.sql` + meta snapshots).
- Persistence tests exist in `test/persistence/` for projects/files/agent state ownership and upsert semantics.
- API contract tests exist in `test/api/` and websocket contract tests exist in `test/websocket/`.
- Project and agent tables are wired into runtime HTTP/WS code paths for phase-3 scope.

### Infrastructure

- Local PostgreSQL is now defined in root `docker-compose.yml`.
- `Dockerfile.sandbox` exists at repo root for manual sandbox container runs.
- Backend-managed sandbox runtime implementation is still pending.

## Target Architecture (Planned)

- Authenticated REST API for projects/files/agent state in Elysia.
- Project-scoped WebSocket events with agent lifecycle updates.
- Agent manager + persisted state machine (`idle -> designing -> implementing -> install -> start -> complete`).
- LLM integration for phase design + streaming generation (OpenRouter-first).
- SCOF streaming parser with file-level events.
- Docker sandbox lifecycle for writing generated files, installing deps, and exposing preview URL.
- Production-like quality gates (tests, lint/typecheck CI, observability).

## Gap Summary

- Missing: frontend integration with real project/file APIs (phase 4).
- Missing: agent orchestration and persistence loop.
- Missing: generation pipeline and SCOF parser.
- Missing: sandbox runtime and preview URL flow.
- Missing: backend integration that automatically provisions and controls sandbox containers.
- Remaining: end-to-end generation/runtime behavior over existing API/websocket contract.

## Source of Truth Priority

1. Runtime code behavior in `src/`, `server/`, and `shared/`
2. This file (`project-state/current-vs-target.md`)
3. `AGENTS.md` snapshot
4. `docs/` architecture and workflow docs (target design)

If any contradiction appears, treat `docs/` as target intent and update docs or code to re-align.

Related operational runbook:
- `docs/13-sandbox-local-runbook.md`
- `docs/14-integration-contract.md`
