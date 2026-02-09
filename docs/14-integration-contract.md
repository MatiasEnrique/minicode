# Frontend-Backend Integration Contract (Phase 1 Baseline)

Status: Accepted baseline for roadmap Phase 1 (2026-02-09)

This document freezes endpoint/event naming conventions between:
- Frontend (TanStack Start on `http://localhost:3000`)
- Backend (Elysia on `http://localhost:3001`)

It defines a stable contract for Phases 2-4 implementation work.

## Contract Version

- Version: `v1`
- Compatibility: additive-only changes until Phase 4 is complete

## Transport and Auth Rules

- REST base URL: `http://localhost:3001`
- WebSocket URL pattern (target): `ws://localhost:3001/ws/:projectId`
- Current WebSocket endpoint in code: `ws://localhost:3001/ws/:projectId`
- Cookie-based auth with Better Auth session (`credentials: include`) for REST.
- WebSocket auth strategy (phase target): session cookie or signed token in handshake/query.

## REST Naming Conventions (Frozen)

- Resources are plural nouns: `/api/projects`, `/api/project-files`.
- Project files are served from the dedicated `project-files` resource and scoped by project ID.
- Route params use `:id` for project endpoints and `:projectId` for project-file endpoints.
- Success responses return raw JSON payloads.
- Error responses return a plain message body, with the error inferred from HTTP status code.

## REST Endpoints (Target v1)

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/project-files/:projectId`
- `PUT /api/project-files/:projectId`
- `GET /api/project-files/:projectId/:fileId`

## REST Response Conventions

- Success response (`2xx`):
  - Return the resource payload directly (object/array/boolean as applicable).
- Error response (`4xx`/`5xx`):
  - Return a plain error message string body.
  - Clients infer error category from status code.

## WebSocket Message Conventions (Frozen)

- Message format:
  - `{ "type": string, "data": object }`
- `type` values are snake_case.
- `data` payload must be an object (empty object `{}` when no fields).
- Unknown `type` should return a typed `error` message.

## Client -> Server Types (from `shared/types/index.ts`)

- `start_generation`
- `stop_generation`
- `user_message`
- `get_state`
- `get_preview_url`

## Server -> Client Types (from `shared/types/index.ts`)

- `agent_connected`
- `state_update`
- `file_start`
- `file_chunk`
- `file_end`
- `phase_start`
- `phase_end`
- `generation_complete`
- `generation_error`
- `preview_url`
- `sandbox_log`
- `error`

## Event Payload Baseline

- `file_start`: `{ path: string }`
- `file_chunk`: `{ path: string, chunk: string }`
- `file_end`: `{ path: string, content: string }`
- `state_update`:
  - `{ currentState: string, currentPhase: number | null, totalPhases: number, generatedFiles: string[], previewUrl: string | null }`
- `sandbox_log`: `{ type: "stdout" | "stderr", content: string }`

## Current Implementation Notes

- REST project and project-file endpoints are implemented and require auth middleware.
- WebSocket endpoint is implemented at `/ws/:projectId` with auth + project ownership checks.
- WebSocket message validation is implemented for known client message types.
- `start_generation` and `stop_generation` currently manage persisted run-state transitions.
- `user_message` currently appends to persisted conversation history and emits a `state_update`.
- Full code-generation pipeline and streaming file events are deferred to later roadmap phases.

## Change Control

- Any contract change must update:
  - `docs/14-integration-contract.md`
  - `shared/types/index.ts` (when type-level changes are needed)
  - `project-state/current-vs-target.md` if implementation status changes
