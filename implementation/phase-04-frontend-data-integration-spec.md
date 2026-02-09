# Phase 4 Implementation Spec: Frontend Data Integration

Phase reference: `roadmap/phase-04-frontend-data-integration.md`

## Goal

Replace static chat/project/file UI state with API-driven data and typed websocket event handling.

## Dependencies

- Phase 3 backend routes and websocket contract implemented.
- `docs/14-integration-contract.md` remains authoritative.

## Desired Files and Content

- `src/lib/api-client.ts`
  - Fetch wrapper with status-based error parsing, `credentials: "include"`, and typed API error class.
- `src/lib/api/projects.ts`
  - Methods for list/create/get/update/delete projects.
- `src/lib/api/project-files.ts`
  - Methods for list/upsert project files.
- `src/lib/ws-client.ts`
  - Connect/reconnect logic, event subscription API, cleanup on route change.
- `src/hooks/use-projects.ts`
  - Query + mutation hooks, cache invalidation strategy.
- `src/hooks/use-project-files.ts`
  - File list/query hooks and optimistic update support where safe.
- `src/hooks/use-project-websocket.ts`
  - Hook for ws status and event callback registration.
- `src/components/chat/project-selector.tsx`
  - Replace static list with hook-driven project list + loading/empty/error states.
- `src/components/chat/file-explorer.tsx`
  - Replace static tree with backend file list and selected file model.
- `src/routes/_authed/chat.tsx`
  - Compose project/files/ws hooks, drive editor content and action handlers.

## Implementation Notes

- Query key convention:
  - `['projects']`
  - `['project', projectId]`
  - `['project-files', projectId]`
- Avoid duplicate websocket listeners on reconnect by centralizing subscriptions in `useEffect` cleanup.
- Keep UI responsive with explicit pending states for write actions.

## Test Plan

- `test/frontend/projects-data-flow.test.tsx`
  - render projects from API and create/delete mutation behavior.
- `test/frontend/project-files-data-flow.test.tsx`
  - render file tree from API and update selected file content.
- `test/frontend/ws-reconnect.test.tsx`
  - reconnect behavior and single-subscription guarantee.

## Validation Commands

```bash
bun run typecheck
bun run test
bun run dev
```

## Done Criteria

- No static project/file arrays remain in primary chat flow.
- Data is loaded through backend API and reflected in UI without refresh.
- Websocket status and server events are visible in UI state.
