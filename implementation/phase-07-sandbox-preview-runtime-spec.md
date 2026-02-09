# Phase 7 Implementation Spec: Sandbox Preview Runtime

Phase reference: `roadmap/phase-07-sandbox-preview-runtime.md`

## Goal

Run generated projects in managed Docker sandboxes and surface persistent preview URLs to clients.

## Dependencies

- Phase 6 file generation pipeline complete.
- Docker runtime available on host.

## Desired Files and Content

- `server/sandbox/types.ts`
  - Sandbox config/status/command result/file payload types.
- `server/sandbox/docker-sandbox.ts`
  - Container lifecycle methods: start/stop/remove/exec/write.
- `server/sandbox/port-manager.ts`
  - Deterministic host port allocation and release.
- `server/agents/code-generator-agent.ts`
  - Invoke sandbox flow after file generation and emit runtime events.
- `server/services/projects-repository.ts`
  - Persist `previewUrl` and `sandboxId` updates.
- `Dockerfile.sandbox`
  - Base image definition used by sandbox service.

## Implementation Notes

- Keep one sandbox per project to simplify lifecycle and persistence.
- Container naming convention should include project id and environment.
- Ensure failure paths always attempt cleanup to avoid resource leaks.
- Emit granular events for user-facing progress:
  - `files_written`
  - `deps_installed`
  - `server_started`

## Test Plan

- `test/sandbox/lifecycle.test.ts`
  - container start/stop/remove behavior.
- `test/sandbox/port-manager.test.ts`
  - no duplicate port allocation under concurrent requests.
- `test/sandbox/failure-paths.test.ts`
  - cleanup behavior on failed install/start.

## Validation Commands

```bash
bun run typecheck
bun run test
docker build -t minicode-sandbox -f Dockerfile.sandbox .
```

## Done Criteria

- Generated files boot in sandbox and preview URL is reachable.
- Preview URL and sandbox id are persisted in DB and restored on reconnect.
- Startup failures produce actionable error events and clean up resources.
