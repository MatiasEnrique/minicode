# Phase 3 Implementation Spec: Backend API and WebSocket

Phase reference: `roadmap/phase-03-backend-api-contract.md`

## Phase Status

Completed on February 9, 2026.

## Goal

Implement authenticated, ownership-safe backend routes and typed WebSocket routing on Elysia.

## Dependencies

- Phase 2 complete (migrations + repositories + tests)
- Contract baseline frozen in `docs/14-integration-contract.md`

## Final Status Snapshot (As of February 9, 2026)

- `server/index.ts` composes modular routes, websocket plugin, and auth error mapping.
- Auth middleware exists in `server/middleware/auth.ts` and injects `userId` via Better Auth session lookup.
- Project routes exist in `server/routes/projects.ts` with authenticated CRUD handlers.
- Project file routes exist in `server/routes/project-files.ts` with authenticated handlers under `/api/project-files`.
- WebSocket plugin at `server/websocket/handler.ts` is project-scoped and ownership-aware.
- `server/websocket/validators.ts` and `server/websocket/types.ts` are implemented and enforced.
- API and WebSocket phase-3 test suites are present and passing.

## Implemented REST Endpoints

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/project-files/:projectId`
- `PUT /api/project-files/:projectId`
- `GET /api/project-files/:projectId/:fileId`

Response behavior follows `docs/14-integration-contract.md`:
- `2xx`: return resource data directly
- `4xx`/`5xx`: return plain error message string

## Implemented WebSocket Behavior

Endpoint:
- `WS /ws/:projectId`

Guards and validation:
- Requires authenticated user context.
- Enforces project ownership before connection/message handling.
- Validates incoming envelope (`{ type, data }`) and known client `type` values.
- Emits typed `error` messages for unknown/invalid payloads.

Implemented message handling:
- `get_state` -> `state_update`
- `get_preview_url` -> `preview_url`
- `start_generation` -> transitions run state to `generating`, resets run-scoped file list
- `stop_generation` -> transitions run state to `idle`, preserves persisted context fields (generated files/history/preview/sandbox)
- `user_message` -> appends user message to conversation history and emits updated `state_update`

## Security Rules (Implemented)

- Auth required for `/api/projects*`, `/api/project-files*`, and `/ws/:projectId`.
- Project/file/state operations are scoped by `userId`.
- WebSocket errors are typed and do not leak DB internals.

## Phase 3 Test Coverage

Implemented files:
- `test/api/projects-routes.test.ts`
- `test/api/project-files-routes.test.ts`
- `test/websocket/ws-contract.test.ts`

Coverage includes:
- 401 unauthenticated route behavior
- owner vs non-owner access controls
- request payload validation (`422`)
- websocket unknown/invalid message behavior
- websocket project access denial
- websocket state/preview lifecycle and start/stop/user-message behavior

## Validation

```bash
bun run typecheck
bun run test
```

Latest verification:
- Typecheck: pass
- Tests: pass (`29 passed`)

## Done Criteria Check

- REST endpoints are functional and ownership-safe: complete
- WebSocket contract implemented and validated: complete
- Frontend can switch to real API in Phase 4 without backend contract changes: complete

## Out of Scope for Phase 3

- Full generation orchestration pipeline and streaming file events (`file_start/file_chunk/file_end`, etc.)
- Sandbox lifecycle execution and preview runtime management

Those move to later phases (5-7).
