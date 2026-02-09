# Phase 7: Sandbox and Preview Runtime

## Objective

Run generated projects inside isolated Docker containers, expose preview URLs, and persist runtime status in project/agent state.

## Current State

- `Dockerfile.sandbox` exists and can be run manually.
- No backend sandbox service exists.
- No automatic preview URL lifecycle in app state.

## Target State

- `DockerSandbox` service manages container lifecycle.
- Generated files are written to sandbox and app server starts.
- Preview URL stored in DB and broadcast to clients.

## Inputs

- Phase 6 generation outputs complete file sets.

## Concrete Work Items

1. Sandbox service
- Implement start/stop/remove/exec methods.
- Support file writes into running container.

2. Agent integration
- After phase implementation, write files to sandbox.
- Install dependencies and start dev server.
- Emit `files_written`, `deps_installed`, `server_started`.

3. Persistence
- Update `projects.preview_url` and `projects.sandbox_id`.
- Keep `agent_states.previewUrl` and `agent_states.sandboxId` synchronized.

4. Operational safety
- Add cleanup behavior for stale containers.
- Handle port conflict and startup failure errors.

5. Tests
- Smoke tests for sandbox lifecycle.
- Failure-path tests for startup and cleanup.

## Files Expected To Change

- `server/sandbox/*`
- `server/agents/code-generator-agent.ts`
- `server/services/*` (project and agent updates)
- `test/sandbox/*`

## Validation Commands

```bash
bun run typecheck
bun run test
```

Manual smoke:
```bash
docker build -t minicode-sandbox -f Dockerfile.sandbox .
```

## Exit Criteria

- Generated app can be launched in sandbox and reached via preview URL.
- Preview URL persists and is broadcast to connected clients.
- Failed startup paths produce actionable errors and cleanup containers.
