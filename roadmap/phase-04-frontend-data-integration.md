# Phase 4: Frontend Data Integration

## Objective

Replace hardcoded frontend chat/project/file state with real backend data and websocket-driven runtime updates.

## Current State

- Project selector and file explorer rely on static arrays.
- No frontend API layer for project/file CRUD.
- No websocket client handling project-scoped events.

## Target State

- Project and file views are backend-driven.
- Query/mutation flows handle create/update/delete with loading/error states.
- Websocket client manages connection lifecycle and event dispatch.

## Inputs

- Phase 3 backend routes + websocket contract are stable.

## Concrete Work Items

1. API client
- Add typed frontend client for `/api/projects` and `/api/project-files/:projectId`.
- Centralize status-based response handling (`2xx` data, `4xx/5xx` error message).

2. Query integration
- Replace static `ProjectSelector` data.
- Replace static `FileExplorer` data and file content loading.
- Add query invalidation on mutations.

3. Route behavior
- Ensure auth-required routes handle expired session gracefully.
- Preserve selected project state across reloads (URL params or persisted UI state).

4. Websocket client
- Implement connect/reconnect strategy.
- Register handlers for contract message types.
- Prevent duplicate subscriptions after reconnect.

5. UX state
- Add explicit loading, empty, and error views for all project/file surfaces.

## Files Expected To Change

- `src/components/chat/*`
- `src/routes/_authed/chat.tsx`
- `src/lib/*` (API and websocket client)
- optional new `src/hooks/*` for query + websocket state

## Validation Commands

```bash
bun run typecheck
bun run test
bun run dev
```

## Exit Criteria

- No static placeholder project/file data remains.
- CRUD operations persist and rehydrate from backend.
- Websocket events are visible in UI without manual refresh.
