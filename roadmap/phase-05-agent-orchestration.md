# Phase 5: Agent Orchestration Core

## Objective

Implement persistent project-scoped agents with deterministic state transitions, websocket fanout, and cancellation behavior.

## Current State

- No agent classes exist in `server/agents/`.
- No project-scoped runtime lifecycle management.
- No persisted orchestration behavior for generation loops.

## Target State

- `BaseAgent`, `CodeGeneratorAgent`, and `AgentManager` implemented.
- State transitions validated against explicit transition map.
- Agent persistence integrated with `agent_states` repository.

## Inputs

- Phase 2 persistence complete.
- Phase 3 websocket routing complete.

## Concrete Work Items

1. Base agent
- Connection management and typed event dispatch.
- Shared cancel/abort controls.

2. Generator agent
- State machine implementation.
- Persist/load at phase boundaries.
- Broadcast state and lifecycle events to websocket clients.

3. Agent manager
- `getOrCreateAgent(projectId)` behavior.
- Cleanup policy for inactive agents.

4. Websocket integration
- Route `start_generation`, `stop_generation`, `get_state` to agent methods.

5. Tests
- State transition validity.
- Connection add/remove leak checks.
- Resume behavior after process restart simulation.

## Files Expected To Change

- `server/agents/*`
- `server/websocket/*`
- `server/services/agent-states-repository.ts`
- `test/agents/*`

## Validation Commands

```bash
bun run typecheck
bun run test
```

## Exit Criteria

- Agent state survives restart and reloads correctly.
- Invalid transitions are rejected.
- Multiple websocket clients receive consistent agent events.
