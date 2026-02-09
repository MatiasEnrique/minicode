# Phase 5 Implementation Spec: Agent Orchestration Core

Phase reference: `roadmap/phase-05-agent-orchestration.md`

## Goal

Implement persistent, owner-safe, project-scoped agent orchestration with deterministic state transitions.

## Dependencies

- Phase 2 repositories available.
- Phase 3 websocket routing and auth context available.

## Desired Files and Content

- `server/agents/types.ts`
  - `AgentState` enum, event payload types, persisted state type aliases.
- `server/agents/state-machine.ts`
  - Transition map and guard function `assertTransition(current, next)`.
- `server/agents/base-agent.ts`
  - Connection set management, typed broadcast helper, cancel controls.
- `server/agents/code-generator-agent.ts`
  - Core lifecycle methods: `generate()`, `stop()`, `load()`, `save()`, `getState()`.
- `server/agents/manager.ts`
  - `getOrCreateAgent(projectId, userId)`, cleanup timer logic, eviction behavior.
- `server/websocket/handler.ts`
  - Route `start_generation`, `stop_generation`, `get_state` to `AgentManager`.

## Implementation Notes

- State machine must reject invalid transitions before mutating state.
- Persist on phase boundaries and final completion/error states.
- Handle websocket disconnect without deleting persistent state.
- Guard against duplicate agent instances per project in same process.

## Test Plan

- `test/agents/state-machine.test.ts`
  - valid and invalid transitions.
- `test/agents/manager-lifecycle.test.ts`
  - singleton behavior per project and cleanup behavior.
- `test/agents/recovery.test.ts`
  - save/load cycle and resume after restart simulation.

## Validation Commands

```bash
bun run typecheck
bun run test
```

## Done Criteria

- Agent instance lifecycle is deterministic and tested.
- Persisted state restores successfully after restart.
- Websocket message routing invokes correct agent methods.
